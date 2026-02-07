"""
Ensemble Adaptativo con Auto-Aprendizaje.

Combina Random Forest, XGBoost y LSTM con pesos dinámicos que se
ajustan según el rendimiento reciente de cada modelo.

Incluye sistema de tracking de errores y auto-corrección.
"""
import json
import time
import numpy as np
from pathlib import Path
from collections import deque
from typing import Optional
from loguru import logger

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import (
    GRID_SIZE, MODELS_DIR,
    ENSEMBLE_INITIAL_WEIGHTS,
    WEIGHT_ADAPTATION_RATE,
    ERROR_MEMORY_SIZE,
    PERFORMANCE_WINDOW,
    MIN_GAMES_FOR_TRAINING,
    RETRAIN_EVERY_N_GAMES,
)
from models.base_model import BaseModel
from models.random_forest_model import RandomForestModel
from models.xgboost_model import XGBoostModel
from models.lstm_model import LSTMModel
from models.anti_repeat_model import AntiRepeatModel
from models.markov_predictor import MarkovPredictor
from models.dispersion_predictor import DispersionPredictor
from data.feature_engineering import (
    build_dataset, build_features_for_prediction, ALL_FEATURE_NAMES
)
from data.extractor import load_real_games, games_to_bone_matrix


class ErrorTracker:
    """
    Rastrea errores de predicción para auto-aprendizaje.
    Analiza DÓNDE y CUÁNDO falla cada modelo para ajustar pesos.
    """
    
    def __init__(self, max_size: int = ERROR_MEMORY_SIZE):
        self.errors = deque(maxlen=max_size)
        self.per_model_errors = {
            'random_forest': deque(maxlen=max_size),
            'xgboost': deque(maxlen=max_size),
            'lstm': deque(maxlen=max_size),
            'anti_repeat': deque(maxlen=max_size),
            'markov': deque(maxlen=max_size),
            'dispersion': deque(maxlen=max_size),
        }
        self.position_error_counts = np.zeros(GRID_SIZE, dtype=np.float32)
        self.total_evaluations = 0
        
        # Fase 5: Tracking granular de predicciones
        self.prediction_history = deque(maxlen=max_size)
        self.recall_at_k_history = deque(maxlen=max_size)
    
    def record(
        self,
        predictions: dict[str, np.ndarray],
        actual: np.ndarray,
        ensemble_pred: np.ndarray,
        game_idx: int,
    ):
        """Registra las predicciones vs. realidad para una partida."""
        self.total_evaluations += 1
        timestamp = time.time()
        
        # Error del ensemble
        ensemble_error = float(np.mean((ensemble_pred - actual) ** 2))
        
        # Identificar qué posiciones falló
        bone_positions = np.where(actual == 1)[0]
        predicted_safe = np.argsort(ensemble_pred)[:21]  # Top 21 más seguros
        
        # Posiciones peligrosas que predijo como seguras (peor error)
        false_safes = [int(p) for p in predicted_safe if actual[p] == 1]
        
        self.errors.append({
            'game_idx': game_idx,
            'timestamp': timestamp,
            'ensemble_mse': ensemble_error,
            'false_safe_positions': false_safes,
            'actual_bones': [int(p) for p in bone_positions],
        })
        
        # Fase 5: recall@K — de las K posiciones sugeridas como seguras, ¿cuántas lo eran?
        sorted_by_safety = np.argsort(ensemble_pred)  # ascending = más seguro primero
        for K in [5, 10, 15, 21]:
            top_k_safe = sorted_by_safety[:K]
            true_safes_in_k = sum(1 for p in top_k_safe if actual[p] == 0)
            recall_k = true_safes_in_k / K
            self.recall_at_k_history.append({
                'game_idx': game_idx, 'K': K, 'recall': recall_k
            })
        
        # Guardar predicción completa
        self.prediction_history.append({
            'game_idx': game_idx,
            'timestamp': timestamp,
            'ensemble_pred': ensemble_pred.tolist(),
            'actual': actual.tolist(),
            'bones_in_top4_dangerous': sum(1 for p in np.argsort(ensemble_pred)[-4:] if actual[p] == 1),
        })
        
        # Actualizar conteo de errores por posición
        for pos in false_safes:
            self.position_error_counts[pos] += 1
        
        # Error por modelo
        for model_name, pred in predictions.items():
            if model_name in self.per_model_errors:
                mse = float(np.mean((pred - actual) ** 2))
                # Bonus metric: ¿cuántos de los 4 huesos identificó correctamente?
                top_4_dangerous = np.argsort(pred)[-4:]
                bones_found = sum(1 for p in top_4_dangerous if actual[p] == 1)
                
                self.per_model_errors[model_name].append({
                    'mse': mse,
                    'bones_found': bones_found,
                    'timestamp': timestamp,
                })
    
    def get_model_scores(self, window: int = PERFORMANCE_WINDOW) -> dict[str, float]:
        """
        Calcula scores recientes de cada modelo para ajustar pesos.
        Mayor score = mejor rendimiento = más peso.
        """
        scores = {}
        for model_name, errors in self.per_model_errors.items():
            recent = list(errors)[-window:]
            if not recent:
                scores[model_name] = 0.5
                continue
            
            # Combinación de MSE inverso y bones_found
            avg_mse = np.mean([e['mse'] for e in recent])
            avg_bones = np.mean([e['bones_found'] for e in recent])
            
            # Score: bones encontrados normalizado + penalización MSE
            score = (avg_bones / 4.0) * 0.7 + (1.0 - min(avg_mse * 5, 1.0)) * 0.3
            scores[model_name] = float(np.clip(score, 0.05, 0.95))
        
        return scores
    
    def get_problematic_positions(self, top_n: int = 5) -> list[dict]:
        """Posiciones donde el modelo falla más frecuentemente."""
        if self.total_evaluations == 0:
            return []
        
        error_rates = self.position_error_counts / max(self.total_evaluations, 1)
        top_positions = np.argsort(error_rates)[-top_n:][::-1]
        
        return [
            {
                'position': int(p + 1),
                'error_rate': float(error_rates[p]),
                'total_errors': int(self.position_error_counts[p]),
            }
            for p in top_positions
        ]
    
    def to_dict(self) -> dict:
        return {
            'total_evaluations': self.total_evaluations,
            'position_error_counts': self.position_error_counts.tolist(),
            'recent_errors': list(self.errors)[-20:],
            'recall_at_k': self.get_recall_at_k(),
        }
    
    def get_recall_at_k(self, window: int = 50) -> dict:
        """Calcula recall@K promedio en las últimas N evaluaciones."""
        recalls = {}
        for K in [5, 10, 15, 21]:
            recent = [r for r in self.recall_at_k_history if r['K'] == K]
            recent = recent[-window:]
            if recent:
                recalls[f'recall@{K}'] = float(np.mean([r['recall'] for r in recent]))
            else:
                recalls[f'recall@{K}'] = 0.0
        return recalls


class EnsemblePredictor:
    """
    Ensemble Adaptativo que combina RF, XGBoost y LSTM.
    
    Features:
    - Pesos dinámicos basados en rendimiento reciente
    - Auto-reentrenamiento cuando llegan suficientes datos nuevos
    - Tracking de errores para auto-corrección
    - Walk-forward validation
    """
    
    def __init__(self):
        self.rf = RandomForestModel()
        self.xgb = XGBoostModel()
        self.lstm = LSTMModel()
        self.anti_repeat = AntiRepeatModel()
        self.markov = MarkovPredictor()
        self.dispersion = DispersionPredictor()
        
        self.weights = {
            'random_forest': 0.20,
            'xgboost': 0.25,
            'lstm': 0.20,
            'anti_repeat': 0.15,
            'markov': 0.10,
            'dispersion': 0.10,
        }
        self.error_tracker = ErrorTracker()
        
        self.bone_matrix: Optional[np.ndarray] = None
        self.last_game_id: Optional[str] = None
        self.games_since_retrain = 0
        self.total_predictions = 0
        self.is_trained = False
        
        self.training_metrics: dict = {}
        self.validation_metrics: dict = {}
    
    def train_all(self) -> dict:
        """
        Entrena todos los modelos con los datos actuales de la BD.
        Usa walk-forward validation para evaluar.
        """
        logger.info("═══ ENTRENAMIENTO COMPLETO DEL ENSEMBLE ═══")
        
        # Cargar datos
        games_df = load_real_games()
        if len(games_df) < MIN_GAMES_FOR_TRAINING:
            return {
                'error': f'Necesitas al menos {MIN_GAMES_FOR_TRAINING} partidas reales. '
                         f'Tienes {len(games_df)}.'
            }
        
        self.bone_matrix = games_to_bone_matrix(games_df)
        self.last_game_id = games_df.iloc[-1]['game_id']
        n_games = len(self.bone_matrix)
        
        # Split temporal: train (70%), val (15%), test (15%)
        train_end = int(n_games * 0.70)
        val_end = int(n_games * 0.85)
        
        logger.info(
            f"Split temporal: train=0-{train_end}, "
            f"val={train_end}-{val_end}, test={val_end}-{n_games}"
        )
        
        # ── Construir datasets ──
        min_start = max(5, min(20, n_games // 10))
        X_train, y_train, _ = build_dataset(self.bone_matrix, min_start, train_end)
        X_val, y_val, _ = build_dataset(self.bone_matrix, train_end, val_end)
        X_test, y_test, test_game_indices = build_dataset(self.bone_matrix, val_end, n_games)
        
        all_metrics = {}
        
        # ── Entrenar Random Forest ──
        try:
            rf_metrics = self.rf.train(X_train, y_train)
            all_metrics['random_forest'] = rf_metrics
            logger.info(f"✓ Random Forest: AUC={rf_metrics.get('auc_roc', 0):.4f}")
        except Exception as e:
            logger.error(f"✗ Random Forest falló: {e}")
            all_metrics['random_forest'] = {'error': str(e)}
        
        # ── Entrenar XGBoost ──
        try:
            xgb_metrics = self.xgb.train(
                X_train, y_train, X_val=X_val, y_val=y_val
            )
            all_metrics['xgboost'] = xgb_metrics
            logger.info(f"✓ XGBoost: AUC={xgb_metrics.get('auc_roc', 0):.4f}")
        except Exception as e:
            logger.error(f"✗ XGBoost falló: {e}")
            all_metrics['xgboost'] = {'error': str(e)}
        
        # ── Entrenar LSTM ──
        try:
            lstm_metrics = self.lstm.train(
                X_train, y_train, bone_matrix=self.bone_matrix[:train_end]
            )
            all_metrics['lstm'] = lstm_metrics
            logger.info(f"✓ LSTM: val_loss={lstm_metrics.get('best_val_loss', 0):.4f}")
        except Exception as e:
            logger.error(f"✗ LSTM falló: {e}")
            all_metrics['lstm'] = {'error': str(e)}
        
        # ── Entrenar Anti-Repeat ──
        try:
            ar_metrics = self.anti_repeat.train(
                X_train, y_train, bone_matrix=self.bone_matrix[:train_end]
            )
            all_metrics['anti_repeat'] = ar_metrics
            logger.info(f"✓ AntiRepeat: global_repeat_rate={ar_metrics.get('global_repeat_rate', 0):.3f}")
        except Exception as e:
            logger.error(f"✗ AntiRepeat falló: {e}")
            all_metrics['anti_repeat'] = {'error': str(e)}
        
        # ── Entrenar Markov 2do Orden ──
        try:
            mk_metrics = self.markov.train(
                X_train, y_train, bone_matrix=self.bone_matrix[:train_end]
            )
            all_metrics['markov'] = mk_metrics
            logger.info(f"✓ Markov: accuracy_last_20={mk_metrics.get('accuracy_last_20', 0):.3f}")
        except Exception as e:
            logger.error(f"✗ Markov falló: {e}")
            all_metrics['markov'] = {'error': str(e)}
        
        # ── Entrenar Dispersion ──
        try:
            dp_metrics = self.dispersion.train(
                X_train, y_train, bone_matrix=self.bone_matrix[:train_end]
            )
            all_metrics['dispersion'] = dp_metrics
            logger.info(f"✓ Dispersion: adjacency_boost={dp_metrics.get('adjacency_boost', 0):.3f}")
        except Exception as e:
            logger.error(f"✗ Dispersion falló: {e}")
            all_metrics['dispersion'] = {'error': str(e)}
        
        # ── Walk-Forward Validation en test set ──
        val_results = self._walk_forward_validate(val_end, n_games)
        all_metrics['validation'] = val_results
        
        # ── Ajustar pesos basados en validación ──
        self._adapt_weights()
        
        self.is_trained = True
        self.games_since_retrain = 0
        self.training_metrics = all_metrics
        
        # Guardar modelos
        self.save()
        
        logger.info(
            f"═══ ENTRENAMIENTO COMPLETO ═══\n"
            f"Pesos finales: {self.weights}\n"
            f"Partidas entrenadas: {n_games}"
        )
        
        return all_metrics
    
    def _walk_forward_validate(self, start_idx: int, end_idx: int) -> dict:
        """
        Walk-forward validation: predice cada partida del test set
        usando solo datos anteriores.
        """
        total_bones_found = 0
        total_games = 0
        position_accuracy = np.zeros(GRID_SIZE)
        
        for g in range(start_idx, end_idx):
            actual = self.bone_matrix[g]
            
            # Predecir con cada modelo
            X_pred = build_features_for_prediction(self.bone_matrix[:g])
            
            preds = {}
            if self.rf.is_trained:
                preds['random_forest'] = self.rf.predict_proba(X_pred)
            if self.xgb.is_trained:
                preds['xgboost'] = self.xgb.predict_proba(X_pred)
            if self.lstm.is_trained:
                self.lstm.bone_matrix_cache = self.bone_matrix[:g]
                preds['lstm'] = self.lstm.predict_proba(X_pred)
            if self.anti_repeat.is_trained:
                self.anti_repeat.bone_matrix_cache = self.bone_matrix[:g]
                preds['anti_repeat'] = self.anti_repeat.predict_proba(X_pred)
            if self.markov.is_trained:
                self.markov.bone_matrix_cache = self.bone_matrix[:g]
                preds['markov'] = self.markov.predict_proba(X_pred)
            if self.dispersion.is_trained:
                self.dispersion.bone_matrix_cache = self.bone_matrix[:g]
                preds['dispersion'] = self.dispersion.predict_proba(X_pred)
            
            if not preds:
                continue
            
            # Ensemble
            ensemble_pred = self._combine_predictions(preds)
            
            # Evaluar
            top_4_danger = np.argsort(ensemble_pred)[-4:]
            bones_found = sum(1 for p in top_4_danger if actual[p] == 1)
            total_bones_found += bones_found
            total_games += 1
            
            # Accuracy por posición
            pred_binary = (ensemble_pred > 0.16).astype(float)
            position_accuracy += (pred_binary == actual).astype(float)
            
            # Registrar para error tracking
            self.error_tracker.record(preds, actual, ensemble_pred, g)
        
        if total_games == 0:
            return {'error': 'No hay datos de validación'}
        
        avg_bones_found = total_bones_found / total_games
        position_accuracy /= total_games
        
        results = {
            'total_games_validated': total_games,
            'avg_bones_identified': avg_bones_found,
            'bone_identification_rate': avg_bones_found / 4.0,
            'avg_position_accuracy': float(position_accuracy.mean()),
            'best_positions': [
                int(p + 1) for p in np.argsort(position_accuracy)[-5:][::-1]
            ],
            'worst_positions': [
                int(p + 1) for p in np.argsort(position_accuracy)[:5]
            ],
            'problematic_positions': self.error_tracker.get_problematic_positions(),
        }
        
        self.validation_metrics = results
        logger.info(
            f"Walk-Forward Validation: "
            f"Huesos identificados {avg_bones_found:.2f}/4, "
            f"Accuracy por posición: {position_accuracy.mean():.3f}"
        )
        
        return results
    
    def _combine_predictions(self, preds: dict[str, np.ndarray]) -> np.ndarray:
        """Combina predicciones de modelos con pesos adaptativos."""
        combined = np.zeros(GRID_SIZE, dtype=np.float32)
        total_weight = 0
        
        for model_name, pred in preds.items():
            w = self.weights.get(model_name, 0.1)
            combined += pred * w
            total_weight += w
        
        if total_weight > 0:
            combined /= total_weight
        
        # Normalizar suma a 4
        s = combined.sum()
        if s > 0:
            combined = combined * (4.0 / s)
        
        return np.clip(combined, 0.01, 0.99)
    
    def _adapt_weights(self):
        """Ajusta pesos del ensemble según rendimiento reciente."""
        scores = self.error_tracker.get_model_scores()
        
        if not scores:
            return
        
        # Normalizar scores a pesos
        total_score = sum(scores.values())
        if total_score > 0:
            for model_name in self.weights:
                if model_name in scores:
                    target_weight = scores[model_name] / total_score
                    # Suavizar cambio
                    current = self.weights[model_name]
                    self.weights[model_name] = (
                        current * (1 - WEIGHT_ADAPTATION_RATE) +
                        target_weight * WEIGHT_ADAPTATION_RATE
                    )
        
        # Asegurar que suman 1
        total = sum(self.weights.values())
        if total > 0:
            for k in self.weights:
                self.weights[k] /= total
        
        logger.info(f"Pesos adaptados: {self.weights}")
    
    def predict(
        self,
        revealed_positions: list[int] | None = None,
        n_positions: int = 5,
    ) -> dict:
        """
        Predicción principal del ensemble.
        
        Returns:
            dict con suggestion, positions, confidence, model_contributions
        """
        if not self.is_trained or self.bone_matrix is None:
            return {
                'error': 'Modelo no entrenado. Ejecuta /train primero.',
                'positions': [],
            }
        
        self.total_predictions += 1
        revealed_set = set(revealed_positions or [])
        
        # Features para la próxima partida
        X_pred = build_features_for_prediction(self.bone_matrix)
        
        # Predicciones individuales
        preds = {}
        model_details = {}
        
        # Modelos basados en features
        for model_name, model in [('random_forest', self.rf), ('xgboost', self.xgb)]:
            if model.is_trained:
                preds[model_name] = model.predict_proba(X_pred)
                model_details[model_name] = {
                    'weight': self.weights.get(model_name, 0.1),
                    'top_dangerous': [
                        int(p + 1) for p in np.argsort(preds[model_name])[-4:][::-1]
                    ]
                }
        
        # Modelos basados en secuencia/patrón
        if self.lstm.is_trained:
            preds['lstm'] = self.lstm.predict_proba(X_pred)
            model_details['lstm'] = {
                'weight': self.weights.get('lstm', 0.1),
                'top_dangerous': [
                    int(p + 1) for p in np.argsort(preds['lstm'])[-4:][::-1]
                ]
            }
        
        if self.anti_repeat.is_trained:
            preds['anti_repeat'] = self.anti_repeat.predict_proba(X_pred)
            model_details['anti_repeat'] = {
                'weight': self.weights.get('anti_repeat', 0.1),
                'top_dangerous': [
                    int(p + 1) for p in np.argsort(preds['anti_repeat'])[-4:][::-1]
                ]
            }
        
        if self.markov.is_trained:
            preds['markov'] = self.markov.predict_proba(X_pred)
            model_details['markov'] = {
                'weight': self.weights.get('markov', 0.1),
                'top_dangerous': [
                    int(p + 1) for p in np.argsort(preds['markov'])[-4:][::-1]
                ]
            }
        
        if self.dispersion.is_trained:
            preds['dispersion'] = self.dispersion.predict_proba(X_pred)
            model_details['dispersion'] = {
                'weight': self.weights.get('dispersion', 0.1),
                'top_dangerous': [
                    int(p + 1) for p in np.argsort(preds['dispersion'])[-4:][::-1]
                ]
            }
        
        if not preds:
            return {'error': 'Ningún modelo disponible', 'positions': []}
        
        # Combinar
        ensemble = self._combine_predictions(preds)
        
        # Fase 5: Calcular incertidumbre (varianza entre modelos)
        if len(preds) >= 2:
            pred_stack = np.array(list(preds.values()))
            uncertainty = pred_stack.std(axis=0)  # Desacuerdo entre modelos
        else:
            uncertainty = np.full(GRID_SIZE, 0.5)
        
        # Ranking de seguridad con confianza calibrada
        positions = []
        for i in range(GRID_SIZE):
            pos = i + 1
            if pos in revealed_set:
                continue
            # Confianza calibrada: penalizar si hay alta incertidumbre
            raw_confidence = (1.0 - ensemble[i]) * 100
            uncertainty_penalty = uncertainty[i] * 30  # Reducir confianza si modelos discrepan
            calibrated_confidence = max(raw_confidence - uncertainty_penalty, 5.0)
            
            positions.append({
                'position': pos,
                'bone_probability': round(float(ensemble[i]), 4),
                'confidence': round(float(calibrated_confidence), 1),
                'uncertainty': round(float(uncertainty[i]), 4),
                'is_safe': ensemble[i] < 0.16,
                'risk_level': (
                    'BAJO' if ensemble[i] < 0.12 else
                    'MEDIO' if ensemble[i] < 0.20 else
                    'ALTO' if ensemble[i] < 0.30 else
                    'MUY ALTO'
                ),
            })
        
        positions.sort(key=lambda x: x['bone_probability'])
        
        # Sugerencia principal
        safe_positions = positions[:n_positions]
        best = safe_positions[0] if safe_positions else None
        
        # Posiciones peligrosas
        dangerous = sorted(positions, key=lambda x: x['bone_probability'], reverse=True)[:4]
        
        return {
            'suggestion': {
                'position': best['position'] if best else 0,
                'confidence': best['confidence'] if best else 0,
                'strategy': 'ENSEMBLE_ADAPTIVE',
                'zone': self._get_zone(best['position']) if best else 'N/A',
                'qValue': str(round(1.0 - best['bone_probability'], 4)) if best else '0',
            },
            'safe_positions': safe_positions,
            'dangerous_positions': dangerous,
            'all_positions': positions,
            'model_contributions': model_details,
            'ensemble_weights': dict(self.weights),
            'ml': {
                'totalGames': len(self.bone_matrix),
                'totalPredictions': self.total_predictions,
                'gamesSinceRetrain': self.games_since_retrain,
                'modelsActive': list(preds.keys()),
            },
            'analysis': {
                'version': 'Python ML Ensemble v2.0',
                'features': [
                    'RandomForest_calibrado',
                    'XGBoost_regularizado',
                    'LSTM_bidireccional_atencion_augmented',
                    'AntiRepeat_exploit_no_repetition',
                    'Markov_2nd_order_transitions',
                    'Dispersion_spatial_patterns',
                    'auto_aprendizaje',
                    'walk_forward_validation',
                    'confidence_calibration',
                    'recall_at_k_tracking',
                ],
            }
        }
    
    def register_result(self, bone_positions: list[int]) -> dict:
        """
        Registra el resultado de una partida real para auto-aprendizaje.
        
        Args:
            bone_positions: Lista de posiciones (1-25) donde había huesos
        
        Returns:
            dict con info del update
        """
        # Crear vector de huesos
        bone_vector = np.zeros(GRID_SIZE, dtype=np.float32)
        for pos in bone_positions:
            if 1 <= pos <= GRID_SIZE:
                bone_vector[pos - 1] = 1.0
        
        # Añadir a la matriz
        if self.bone_matrix is not None:
            self.bone_matrix = np.vstack([self.bone_matrix, bone_vector.reshape(1, -1)])
        else:
            self.bone_matrix = bone_vector.reshape(1, -1)
        
        # Actualizar caches de todos los modelos secuenciales
        if self.lstm.is_trained:
            self.lstm.update_cache(bone_vector)
        if self.anti_repeat.is_trained:
            self.anti_repeat.update_cache(bone_vector)
        if self.markov.is_trained:
            self.markov.update_cache(bone_vector)
        if self.dispersion.is_trained:
            self.dispersion.update_cache(bone_vector)
        
        self.games_since_retrain += 1
        
        # Evaluar predicciones anteriores contra realidad
        if self.is_trained:
            X_pred = build_features_for_prediction(self.bone_matrix[:-1])
            preds = {}
            if self.rf.is_trained:
                preds['random_forest'] = self.rf.predict_proba(X_pred)
            if self.xgb.is_trained:
                preds['xgboost'] = self.xgb.predict_proba(X_pred)
            if self.lstm.is_trained:
                preds['lstm'] = self.lstm.predict_proba(X_pred)
            if self.anti_repeat.is_trained:
                preds['anti_repeat'] = self.anti_repeat.predict_proba(X_pred)
            if self.markov.is_trained:
                preds['markov'] = self.markov.predict_proba(X_pred)
            if self.dispersion.is_trained:
                preds['dispersion'] = self.dispersion.predict_proba(X_pred)
            
            if preds:
                ensemble = self._combine_predictions(preds)
                self.error_tracker.record(
                    preds, bone_vector, ensemble, len(self.bone_matrix) - 1
                )
                self._adapt_weights()
        
        # ¿Necesita reentrenamiento?
        needs_retrain = self.games_since_retrain >= RETRAIN_EVERY_N_GAMES
        
        result = {
            'games_since_retrain': self.games_since_retrain,
            'total_games': len(self.bone_matrix),
            'needs_retrain': needs_retrain,
            'weights_updated': True,
            'current_weights': dict(self.weights),
        }
        
        if needs_retrain:
            logger.info(f"Reentrenamiento automático ({self.games_since_retrain} partidas nuevas)")
            retrain_metrics = self.train_all()
            result['retrain_metrics'] = retrain_metrics
            result['retrained'] = True
        
        return result
    
    def get_status(self) -> dict:
        """Estado completo del sistema."""
        return {
            'is_trained': self.is_trained,
            'total_games': len(self.bone_matrix) if self.bone_matrix is not None else 0,
            'total_predictions': self.total_predictions,
            'games_since_retrain': self.games_since_retrain,
            'weights': dict(self.weights),
            'models': {
                'random_forest': {
                    'trained': self.rf.is_trained,
                    'metrics': self.rf.last_metrics,
                },
                'xgboost': {
                    'trained': self.xgb.is_trained,
                    'metrics': self.xgb.last_metrics,
                },
                'lstm': {
                    'trained': self.lstm.is_trained,
                    'metrics': self.lstm.last_metrics,
                },
                'anti_repeat': {
                    'trained': self.anti_repeat.is_trained,
                    'metrics': self.anti_repeat.last_metrics,
                },
                'markov': {
                    'trained': self.markov.is_trained,
                    'metrics': self.markov.last_metrics,
                },
                'dispersion': {
                    'trained': self.dispersion.is_trained,
                    'metrics': self.dispersion.last_metrics,
                },
            },
            'error_tracking': {
                'total_evaluations': self.error_tracker.total_evaluations,
                'model_scores': self.error_tracker.get_model_scores(),
                'problematic_positions': self.error_tracker.get_problematic_positions(),
            },
            'training_metrics': self.training_metrics,
            'validation_metrics': self.validation_metrics,
        }
    
    def get_metrics(self) -> dict:
        """Métricas detalladas para el dashboard."""
        scores = self.error_tracker.get_model_scores()
        
        return {
            'ensemble_weights': dict(self.weights),
            'model_scores': scores,
            'feature_importance': {
                'random_forest': self.rf.get_feature_importance(ALL_FEATURE_NAMES) if self.rf.is_trained else [],
                'xgboost': self.xgb.get_feature_importance(ALL_FEATURE_NAMES) if self.xgb.is_trained else [],
            },
            'error_analysis': {
                'problematic_positions': self.error_tracker.get_problematic_positions(10),
                'total_evaluations': self.error_tracker.total_evaluations,
                'recent_errors': list(self.error_tracker.errors)[-10:],
            },
            'recall_at_k': self.error_tracker.get_recall_at_k(),
            'validation': self.validation_metrics,
            'total_models': 6,
            'models_active': sum([
                self.rf.is_trained, self.xgb.is_trained, self.lstm.is_trained,
                self.anti_repeat.is_trained, self.markov.is_trained, self.dispersion.is_trained
            ]),
        }
    
    def save(self):
        """Guarda todos los modelos y estado."""
        path = MODELS_DIR
        self.rf.save(path / "random_forest")
        self.xgb.save(path / "xgboost")
        self.lstm.save(path / "lstm")
        self.anti_repeat.save(path / "anti_repeat")
        self.markov.save(path / "markov")
        self.dispersion.save(path / "dispersion")
        
        # Estado del ensemble
        state = {
            'weights': self.weights,
            'last_game_id': self.last_game_id,
            'games_since_retrain': self.games_since_retrain,
            'total_predictions': self.total_predictions,
            'error_tracker': self.error_tracker.to_dict(),
            'training_metrics': self.training_metrics,
            'validation_metrics': self.validation_metrics,
        }
        with open(path / "ensemble_state.json", 'w') as f:
            json.dump(state, f, indent=2, default=str)
        
        if self.bone_matrix is not None:
            np.save(path / "bone_matrix.npy", self.bone_matrix)
        
        logger.info(f"Ensemble guardado en {path}")
    
    def load(self) -> bool:
        """Carga todos los modelos y estado."""
        path = MODELS_DIR
        state_path = path / "ensemble_state.json"
        
        if not state_path.exists():
            logger.info("No hay estado guardado del ensemble")
            return False
        
        try:
            with open(state_path) as f:
                state = json.load(f)
            
            self.weights = state.get('weights', dict(ENSEMBLE_INITIAL_WEIGHTS))
            self.last_game_id = state.get('last_game_id')
            self.games_since_retrain = state.get('games_since_retrain', 0)
            self.total_predictions = state.get('total_predictions', 0)
            self.training_metrics = state.get('training_metrics', {})
            self.validation_metrics = state.get('validation_metrics', {})
            
            bone_path = path / "bone_matrix.npy"
            if bone_path.exists():
                self.bone_matrix = np.load(bone_path)
            
            # Cargar modelos individuales
            rf_loaded = self.rf.load(path / "random_forest")
            xgb_loaded = self.xgb.load(path / "xgboost")
            lstm_loaded = self.lstm.load(path / "lstm")
            ar_loaded = self.anti_repeat.load(path / "anti_repeat")
            mk_loaded = self.markov.load(path / "markov")
            dp_loaded = self.dispersion.load(path / "dispersion")
            
            self.is_trained = rf_loaded or xgb_loaded or lstm_loaded
            
            logger.info(
                f"Ensemble cargado: RF={rf_loaded}, XGB={xgb_loaded}, "
                f"LSTM={lstm_loaded}, AR={ar_loaded}, MK={mk_loaded}, "
                f"DP={dp_loaded}, games={len(self.bone_matrix) if self.bone_matrix is not None else 0}"
            )
            return self.is_trained
        except Exception as e:
            logger.error(f"Error cargando ensemble: {e}")
            return False
    
    @staticmethod
    def _get_zone(position: int) -> str:
        """Determina la zona del tablero."""
        if position <= 0:
            return 'N/A'
        r, c = (position - 1) // 5, (position - 1) % 5
        if r < 2 and c < 3:
            return 'A'
        elif r >= 3 and c >= 2:
            return 'B'
        return 'C'
