"""
Modelo XGBoost para detección de patrones con gradient boosting.
"""
import numpy as np
import joblib
from pathlib import Path
from loguru import logger

try:
    import xgboost as xgb
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False
    logger.warning("XGBoost no disponible, se usará GradientBoosting de sklearn")

from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import roc_auc_score, brier_score_loss, log_loss

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import (
    XGB_N_ESTIMATORS, XGB_MAX_DEPTH, XGB_LEARNING_RATE,
    XGB_SUBSAMPLE, XGB_COLSAMPLE
)
from models.base_model import BaseModel


class XGBoostModel(BaseModel):
    """
    XGBoost Classifier para predicción de huesos.
    
    Fortalezas:
    - Mayor capacidad de detección de interacciones complejas entre features
    - Regularización L1/L2 para evitar overfitting
    - Manejo nativo de valores faltantes
    - Mejor rendimiento con features temporales
    """
    
    def __init__(self):
        super().__init__("XGBoost")
        self.model = None
        self.feature_importances_ = None
    
    def train(self, X: np.ndarray, y: np.ndarray, **kwargs) -> dict:
        """Entrena XGBoost con parámetros optimizados."""
        logger.info(f"[{self.name}] Entrenando con {X.shape[0]} muestras, {X.shape[1]} features")
        
        bone_ratio = y.mean()
        scale_pos_weight = (1 - bone_ratio) / bone_ratio if bone_ratio > 0 else 1.0
        
        # Datos de validación opcionales
        X_val = kwargs.get('X_val')
        y_val = kwargs.get('y_val')
        
        if HAS_XGBOOST:
            self.model = xgb.XGBClassifier(
                n_estimators=XGB_N_ESTIMATORS,
                max_depth=XGB_MAX_DEPTH,
                learning_rate=XGB_LEARNING_RATE,
                subsample=XGB_SUBSAMPLE,
                colsample_bytree=XGB_COLSAMPLE,
                scale_pos_weight=scale_pos_weight,
                reg_alpha=0.1,      # L1 regularization
                reg_lambda=1.0,     # L2 regularization
                min_child_weight=5,
                eval_metric='logloss',
                random_state=42,
                n_jobs=-1,
                verbosity=0,
            )
            
            fit_params = {}
            sample_weight = kwargs.get('sample_weight', None)
            if sample_weight is not None:
                fit_params['sample_weight'] = sample_weight
            if X_val is not None and y_val is not None:
                fit_params['eval_set'] = [(X_val, y_val)]
                # XGBoost nativo soporta early stopping
                self.model.set_params(early_stopping_rounds=20)
            
            self.model.fit(X, y, **fit_params)
            self.feature_importances_ = self.model.feature_importances_
        else:
            # Fallback a sklearn GradientBoosting
            self.model = GradientBoostingClassifier(
                n_estimators=min(XGB_N_ESTIMATORS, 150),
                max_depth=min(XGB_MAX_DEPTH, 6),
                learning_rate=XGB_LEARNING_RATE,
                subsample=XGB_SUBSAMPLE,
                min_samples_leaf=10,
                random_state=42,
            )
            self.model.fit(X, y)
            self.feature_importances_ = self.model.feature_importances_
        
        self.is_trained = True
        self.train_games_count = len(X) // 25
        
        # Métricas
        y_pred_proba = self._raw_predict(X)
        y_pred = (y_pred_proba > 0.16).astype(int)
        
        metrics = {
            'auc_roc': roc_auc_score(y, y_pred_proba) if len(np.unique(y)) > 1 else 0.0,
            'brier_score': brier_score_loss(y, y_pred_proba),
            'log_loss': log_loss(y, np.clip(y_pred_proba, 1e-7, 1-1e-7)),
            'train_samples': len(X),
            'bone_rate': float(y.mean()),
            'using_xgboost': HAS_XGBOOST,
        }
        
        # Métricas de validación si hay datos
        if X_val is not None and y_val is not None:
            y_val_proba = self._raw_predict(X_val)
            metrics['val_auc_roc'] = roc_auc_score(y_val, y_val_proba) if len(np.unique(y_val)) > 1 else 0.0
            metrics['val_brier'] = brier_score_loss(y_val, y_val_proba)
        
        self.last_metrics = metrics
        logger.info(
            f"[{self.name}] AUC: {metrics['auc_roc']:.4f}, "
            f"Brier: {metrics['brier_score']:.4f}"
        )
        
        return metrics
    
    def _raw_predict(self, X: np.ndarray) -> np.ndarray:
        """Predicción de probabilidades sin normalizar."""
        return self.model.predict_proba(X)[:, 1]
    
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Predice P(hueso) normalizado para 4 huesos esperados."""
        if not self.is_trained:
            return np.full(25, 0.16)
        
        probs = self._raw_predict(X)
        
        # Normalizar suma a 4 (huesos esperados)
        current_sum = probs.sum()
        if current_sum > 0:
            probs = probs * (4.0 / current_sum)
        
        return np.clip(probs, 0.01, 0.99)
    
    def get_feature_importance(self, feature_names: list[str]) -> list[dict]:
        """Top features por importancia."""
        if self.feature_importances_ is None:
            return []
        pairs = sorted(
            zip(feature_names, self.feature_importances_),
            key=lambda x: x[1], reverse=True
        )
        return [{'feature': n, 'importance': float(i)} for n, i in pairs[:20]]
    
    def save(self, path: Path) -> None:
        path.mkdir(parents=True, exist_ok=True)
        if HAS_XGBOOST and isinstance(self.model, xgb.XGBClassifier):
            self.model.save_model(str(path / "xgb_model.json"))
        else:
            joblib.dump(self.model, path / "xgb_model.joblib")
        if self.feature_importances_ is not None:
            np.save(path / "xgb_importances.npy", self.feature_importances_)
        logger.info(f"[{self.name}] Modelo guardado en {path}")
    
    def load(self, path: Path) -> bool:
        try:
            if HAS_XGBOOST and (path / "xgb_model.json").exists():
                self.model = xgb.XGBClassifier()
                self.model.load_model(str(path / "xgb_model.json"))
            elif (path / "xgb_model.joblib").exists():
                self.model = joblib.load(path / "xgb_model.joblib")
            else:
                return False
            
            imp_path = path / "xgb_importances.npy"
            if imp_path.exists():
                self.feature_importances_ = np.load(imp_path)
            
            self.is_trained = True
            logger.info(f"[{self.name}] Modelo cargado desde {path}")
            return True
        except Exception as e:
            logger.error(f"[{self.name}] Error cargando: {e}")
            return False
