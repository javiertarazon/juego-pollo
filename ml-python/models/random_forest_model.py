"""
Modelo Random Forest para detección de patrones espaciales/temporales.
"""
import numpy as np
import joblib
from pathlib import Path
from sklearn.ensemble import RandomForestClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    roc_auc_score, brier_score_loss, log_loss, 
    precision_score, recall_score, f1_score
)
from loguru import logger

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import RF_N_ESTIMATORS, RF_MAX_DEPTH, RF_MIN_SAMPLES_LEAF
from models.base_model import BaseModel


class RandomForestModel(BaseModel):
    """
    Random Forest Classifier calibrado para predicción de posiciones de hueso.
    
    Fortalezas:
    - Robusto a overfitting con pocos datos
    - Maneja bien features no lineales
    - Feature importance interpretable
    - No requiere normalización de features
    """
    
    def __init__(self):
        super().__init__("RandomForest")
        self.model = None
        self.calibrated_model = None
        self.feature_importances_ = None
    
    def train(self, X: np.ndarray, y: np.ndarray, **kwargs) -> dict:
        """Entrena Random Forest con calibración de probabilidades."""
        logger.info(f"[{self.name}] Entrenando con {X.shape[0]} muestras, {X.shape[1]} features")
        
        # Class weights para desbalance (hay más pollos que huesos)
        bone_ratio = y.mean()
        weight_bone = (1 - bone_ratio) / bone_ratio if bone_ratio > 0 else 1.0
        
        self.model = RandomForestClassifier(
            n_estimators=RF_N_ESTIMATORS,
            max_depth=RF_MAX_DEPTH,
            min_samples_leaf=RF_MIN_SAMPLES_LEAF,
            class_weight={0: 1.0, 1: weight_bone},
            random_state=42,
            n_jobs=-1,
            oob_score=True,
        )
        
        sample_weight = kwargs.get('sample_weight', None)
        self.model.fit(X, y, sample_weight=sample_weight)
        self.feature_importances_ = self.model.feature_importances_
        
        # Calibración isotónica para mejores probabilidades
        if len(X) > 100:
            try:
                self.calibrated_model = CalibratedClassifierCV(
                    self.model, method='isotonic', cv=3
                )
                self.calibrated_model.fit(X, y)
            except Exception as e:
                logger.warning(f"[{self.name}] Calibración falló: {e}, usando modelo base")
                self.calibrated_model = None
        
        self.is_trained = True
        self.train_games_count = len(X) // 25
        
        # Métricas
        y_pred_proba = self.predict_proba_raw(X)
        y_pred = (y_pred_proba > 0.16).astype(int)
        
        metrics = {
            'oob_score': self.model.oob_score_,
            'auc_roc': roc_auc_score(y, y_pred_proba) if len(np.unique(y)) > 1 else 0.0,
            'brier_score': brier_score_loss(y, y_pred_proba),
            'log_loss': log_loss(y, np.clip(y_pred_proba, 1e-7, 1-1e-7)),
            'precision_bone': precision_score(y, y_pred, zero_division=0),
            'recall_bone': recall_score(y, y_pred, zero_division=0),
            'f1_bone': f1_score(y, y_pred, zero_division=0),
            'train_samples': len(X),
            'bone_rate': float(y.mean()),
        }
        self.last_metrics = metrics
        
        logger.info(
            f"[{self.name}] OOB: {metrics['oob_score']:.4f}, "
            f"AUC: {metrics['auc_roc']:.4f}, "
            f"Brier: {metrics['brier_score']:.4f}"
        )
        
        return metrics
    
    def predict_proba_raw(self, X: np.ndarray) -> np.ndarray:
        """Predicción interna (sin reshape)."""
        if self.calibrated_model is not None:
            return self.calibrated_model.predict_proba(X)[:, 1]
        return self.model.predict_proba(X)[:, 1]
    
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """
        Predice P(hueso) para cada posición.
        Input: (25, n_features) → Output: (25,)
        """
        if not self.is_trained:
            return np.full(25, 0.16)
        
        probs = self.predict_proba_raw(X)
        
        # Normalizar para que sumen ~4 huesos (restricción del juego)
        probs = self._normalize_to_bone_count(probs, target_bones=4)
        
        return probs
    
    def _normalize_to_bone_count(
        self, probs: np.ndarray, target_bones: int = 4
    ) -> np.ndarray:
        """
        Normaliza probabilidades para que la suma esperada = target_bones.
        Mantiene el ranking relativo pero ajusta la escala.
        """
        current_sum = probs.sum()
        if current_sum > 0:
            probs = probs * (target_bones / current_sum)
        return np.clip(probs, 0.01, 0.99)
    
    def get_feature_importance(self, feature_names: list[str]) -> list[dict]:
        """Retorna las features más importantes."""
        if self.feature_importances_ is None:
            return []
        
        importance_pairs = list(zip(feature_names, self.feature_importances_))
        importance_pairs.sort(key=lambda x: x[1], reverse=True)
        
        return [
            {'feature': name, 'importance': float(imp)}
            for name, imp in importance_pairs[:20]
        ]
    
    def save(self, path: Path) -> None:
        """Guarda modelo a disco."""
        path.mkdir(parents=True, exist_ok=True)
        joblib.dump(self.model, path / "rf_model.joblib")
        if self.calibrated_model is not None:
            joblib.dump(self.calibrated_model, path / "rf_calibrated.joblib")
        if self.feature_importances_ is not None:
            np.save(path / "rf_importances.npy", self.feature_importances_)
        logger.info(f"[{self.name}] Modelo guardado en {path}")
    
    def load(self, path: Path) -> bool:
        """Carga modelo desde disco."""
        model_path = path / "rf_model.joblib"
        if not model_path.exists():
            return False
        
        try:
            self.model = joblib.load(model_path)
            cal_path = path / "rf_calibrated.joblib"
            if cal_path.exists():
                self.calibrated_model = joblib.load(cal_path)
            imp_path = path / "rf_importances.npy"
            if imp_path.exists():
                self.feature_importances_ = np.load(imp_path)
            self.is_trained = True
            logger.info(f"[{self.name}] Modelo cargado desde {path}")
            return True
        except Exception as e:
            logger.error(f"[{self.name}] Error cargando modelo: {e}")
            return False
