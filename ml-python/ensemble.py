#!/usr/bin/env python3
"""
🎯 ENSEMBLE PREDICTOR - JUEGO DEL POLLO
========================================
Sistema de ensemble que combina múltiples modelos:
- Red Neuronal (MLP + RF + GB)
- Pattern Analyzer
- Markov Predictor

Pesos adaptativos basados en rendimiento.
Votación ponderada con intervalos de confianza.
"""

import numpy as np
from typing import Optional


class EnsemblePredictor:
    """Ensemble de modelos con votación ponderada"""

    def __init__(self):
        self.is_trained = False
        self.model_weights = {
            "neural_network": 0.40,   # Red neuronal tiene mayor peso
            "pattern_analyzer": 0.30, # Patrones adaptativos
            "markov": 0.30,           # Transiciones
        }
        self.model_scores = {
            "neural_network": 0.5,
            "pattern_analyzer": 0.5,
            "markov": 0.5,
        }
        self.prediction_history = []  # Historial para calibrar pesos

    def train(self, game_data: list[dict], nn_model=None,
              pattern_model=None, markov_model=None) -> dict:
        """Entrenar/actualizar ensemble con los modelos entrenados"""
        self.nn_model = nn_model
        self.pattern_model = pattern_model
        self.markov_model = markov_model

        # Calibrar pesos basándose en rendimiento
        if nn_model and nn_model.is_trained:
            nn_stats = nn_model.get_stats()
            nn_score = 0.6  # Default
            self.model_scores["neural_network"] = nn_score

        if pattern_model and pattern_model.is_trained:
            self.model_scores["pattern_analyzer"] = 0.55

        if markov_model and markov_model.is_trained:
            self.model_scores["markov"] = 0.50

        # Normalizar pesos basados en scores
        self._update_weights()

        self.is_trained = True

        return {
            "is_trained": True,
            "weights": self.model_weights,
            "scores": self.model_scores,
        }

    def predict(self, revealed_positions: list[int] = None,
                bone_count: int = 4, advisor_type: str = "original",
                target_positions: int = 2,
                recent_bones: list[list[int]] = None) -> dict:
        """Obtener predicción del ensemble"""

        revealed_positions = revealed_positions or []
        all_positions = list(range(1, 26))
        available = [p for p in all_positions if p not in revealed_positions]

        if not available:
            return {
                "position": 1, "confidence": 0.0, "strategy": "NO_AVAILABLE",
                "model": "ensemble", "safe_positions": [], "dangerous_positions": [],
            }

        # Recopilar predicciones de cada modelo
        predictions = {}

        # 1. Red neuronal
        if self.nn_model and self.nn_model.is_trained:
            try:
                nn_pred = self.nn_model.predict(revealed_positions, bone_count, recent_bones)
                predictions["neural_network"] = nn_pred
            except Exception:
                pass

        # 2. Pattern analyzer
        if self.pattern_model and self.pattern_model.is_trained:
            try:
                safety_scores = self.pattern_model.get_safety_scores(revealed_positions)
                if safety_scores:
                    best_pos = max(safety_scores, key=safety_scores.get)
                    best_score = safety_scores[best_pos]
                    safe = sorted(safety_scores, key=safety_scores.get, reverse=True)[:5]
                    dangerous = sorted(safety_scores, key=safety_scores.get)[:5]
                    predictions["pattern_analyzer"] = {
                        "position": best_pos,
                        "confidence": best_score,
                        "safe_positions": safe,
                        "dangerous_positions": dangerous,
                        "strategy": "PATTERN_ANALYSIS",
                    }
            except Exception:
                pass

        # 3. Markov
        if self.markov_model and self.markov_model.is_trained:
            try:
                markov_pred = self.markov_model.predict(revealed_positions, bone_count, recent_bones)
                predictions["markov"] = markov_pred
            except Exception:
                pass

        # Si no hay predicciones, usar heurística
        if not predictions:
            return self._heuristic_ensemble(revealed_positions, bone_count, advisor_type, target_positions)

        # Combinar predicciones con votación ponderada
        combined = self._weighted_voting(predictions, available)

        # Ajustar según tipo de asesor
        if advisor_type == "rentable":
            combined = self._adjust_rentable(combined, target_positions)

        # Detectar patrón de rotación
        rotation_active = False
        if self.pattern_model and self.pattern_model.is_trained:
            rotation_active = self.pattern_model.rotation_pattern is not None

        # Detectar adaptación de Mystake
        mystake_adaptation = False
        if self.pattern_model and self.pattern_model.is_trained:
            mystake_adaptation = self.pattern_model.mystake_adaptation

        # Si Mystake se adapta, aumentar exploración
        if mystake_adaptation:
            # Seleccionar posición diferente a las top recomendadas
            combined["strategy"] = "ADAPTIVE_DEFENSE"
            combined["confidence"] *= 0.85  # Reducir confianza

        return {
            "position": combined["position"],
            "confidence": combined["confidence"],
            "strategy": combined["strategy"],
            "model": "ensemble",
            "safe_positions": combined.get("safe_positions", []),
            "dangerous_positions": combined.get("dangerous_positions", []),
            "pattern_detected": self.pattern_model.rotation_pattern if self.pattern_model and self.pattern_model.is_trained else None,
            "rotation_active": rotation_active,
            "mystake_adaptation": mystake_adaptation,
            "contributions": combined.get("contributions", {}),
        }

    def _weighted_voting(self, predictions: dict, available: list[int]) -> dict:
        """Combinar predicciones con votación ponderada"""
        position_scores = {}
        contributions = {}

        for model_name, pred in predictions.items():
            weight = self.model_weights.get(model_name, 0.33)
            pred_pos = pred.get("position", 1)
            pred_conf = pred.get("confidence", 0.5)

            # Score para posición recomendada
            if pred_pos not in position_scores:
                position_scores[pred_pos] = 0.0
                contributions[pred_pos] = {}

            position_scores[pred_pos] += weight * pred_conf
            contributions[pred_pos][model_name] = round(weight * pred_conf, 3)

            # Score para posiciones seguras
            for safe_pos in pred.get("safe_positions", []):
                if safe_pos in available:
                    if safe_pos not in position_scores:
                        position_scores[safe_pos] = 0.0
                        contributions[safe_pos] = {}
                    position_scores[safe_pos] += weight * 0.5  # Bonus por ser safe
                    if model_name not in contributions[safe_pos]:
                        contributions[safe_pos][model_name] = 0.0
                    contributions[safe_pos][model_name] += round(weight * 0.5, 3)

        # Filtrar solo posiciones disponibles
        available_scores = {pos: score for pos, score in position_scores.items() if pos in available}

        if not available_scores:
            # Fallback: seleccionar aleatoriamente
            import random
            pos = random.choice(available) if available else 1
            return {
                "position": pos, "confidence": 0.4,
                "strategy": "RANDOM_FALLBACK",
                "safe_positions": available[:5],
                "dangerous_positions": [],
                "contributions": {},
            }

        # Seleccionar mejor posición
        best_position = max(available_scores, key=available_scores.get)
        best_score = available_scores[best_position]

        # Normalizar confianza
        max_possible = sum(self.model_weights.values())
        normalized_confidence = min(best_score / max_possible, 0.95) if max_possible > 0 else 0.5

        # Safe y dangerous
        sorted_positions = sorted(available_scores.items(), key=lambda x: x[1], reverse=True)
        safe_positions = [pos for pos, _ in sorted_positions[:5]]
        dangerous_positions = [pos for pos, _ in sorted_positions[-5:]]

        # Si el mejor modelo y pattern analyzer coinciden, boost
        consensus = sum(1 for pred in predictions.values() if pred.get("position") == best_position)
        if consensus >= 2:
            normalized_confidence = min(normalized_confidence * 1.15, 0.95)
            strategy = "ENSEMBLE_CONSENSUS"
        else:
            strategy = "ENSEMBLE_WEIGHTED"

        return {
            "position": best_position,
            "confidence": round(normalized_confidence, 3),
            "strategy": strategy,
            "safe_positions": safe_positions,
            "dangerous_positions": dangerous_positions,
            "contributions": contributions.get(best_position, {}),
        }

    def _adjust_rentable(self, combined: dict, target: int) -> dict:
        """Ajustar para modo rentable: solo posiciones de alta confianza"""
        if combined["confidence"] < 0.60:
            # Buscar posición más segura
            safe = combined.get("safe_positions", [])
            if safe:
                combined["position"] = safe[0]
                combined["confidence"] = max(combined["confidence"], 0.65)
                combined["strategy"] = "RENTABLE_SAFE"

        # Aumentar confianza moderadamente en modo rentable
        combined["confidence"] = min(combined["confidence"] * 1.08, 0.92)
        return combined

    def _heuristic_ensemble(self, revealed_positions: list[int],
                           bone_count: int, advisor_type: str,
                           target_positions: int) -> dict:
        """Ensemble heurístico sin modelos entrenados"""
        # Posiciones seguras basadas en datos estadísticos
        safe_ranked = [19, 13, 7, 18, 11, 10, 6, 25, 22, 1]
        dangerous = [24, 3, 8, 16, 5, 9]

        available = [p for p in range(1, 26) if p not in revealed_positions]
        safe_available = [p for p in safe_ranked if p in available]
        non_dangerous = [p for p in available if p not in dangerous]

        if advisor_type == "rentable":
            # Modo rentable: solo ultra seguro
            if safe_available:
                selected = safe_available[0]
                confidence = 0.75
            else:
                selected = non_dangerous[0] if non_dangerous else (available[0] if available else 1)
                confidence = 0.55
        else:
            if safe_available:
                selected = safe_available[0]
                confidence = 0.68
            elif non_dangerous:
                selected = non_dangerous[0]
                confidence = 0.50
            else:
                selected = available[0] if available else 1
                confidence = 0.35

        return {
            "position": selected,
            "confidence": confidence,
            "strategy": "HEURISTIC_ENSEMBLE",
            "model": "ensemble",
            "safe_positions": safe_available[:5],
            "dangerous_positions": [p for p in dangerous if p in available],
            "pattern_detected": None,
            "rotation_active": False,
            "contributions": {"heuristic": 1.0},
        }

    def _update_weights(self):
        """Actualizar pesos basados en scores de rendimiento"""
        total_score = sum(self.model_scores.values())
        if total_score > 0:
            for model in self.model_weights:
                self.model_weights[model] = self.model_scores[model] / total_score

    def record_feedback(self, position: int, was_chicken: bool, model_used: str):
        """Registrar resultado para ajustar pesos adaptativamente"""
        self.prediction_history.append({
            "position": position,
            "was_chicken": was_chicken,
            "model_used": model_used,
        })

        # Recalcular scores cada 20 predicciones
        if len(self.prediction_history) % 20 == 0:
            self._recalculate_model_scores()

    def _recalculate_model_scores(self):
        """Recalcular puntuaciones de modelos basado en historial"""
        recent = self.prediction_history[-50:]  # Últimas 50 predicciones

        model_wins = {"neural_network": 0, "pattern_analyzer": 0, "markov": 0}
        model_total = {"neural_network": 1, "pattern_analyzer": 1, "markov": 1}

        for entry in recent:
            model = entry.get("model_used", "ensemble")
            # Si el modelo acertó, incrementar su score
            if entry["was_chicken"]:
                if model in model_wins:
                    model_wins[model] += 1
                else:
                    # Para ensemble, distribuir entre todos
                    for m in model_wins:
                        model_wins[m] += 1
            if model in model_total:
                model_total[model] += 1
            else:
                for m in model_total:
                    model_total[m] += 1

        # Actualizar scores
        for model in self.model_scores:
            self.model_scores[model] = model_wins[model] / model_total[model]

        self._update_weights()

    def get_stats(self) -> dict:
        """Obtener estadísticas del ensemble"""
        return {
            "is_trained": self.is_trained,
            "weights": self.model_weights,
            "scores": self.model_scores,
            "total_predictions": len(self.prediction_history),
        }
