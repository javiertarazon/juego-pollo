#!/usr/bin/env python3
"""
🔗 PREDICTOR DE MARKOV - JUEGO DEL POLLO
==========================================
Cadenas de Markov para predecir transiciones de estados
y probabilidad de posiciones seguras basándose en historial.

Características:
- Matriz de transición 25x25
- Distribución estacionaria
- Predicción de próxima posición basada en estado actual
- Cadena de segundo orden (bi-gramas)
"""

import numpy as np
from collections import defaultdict
from typing import Optional


class MarkovPredictor:
    """Predictor basado en cadenas de Markov"""

    def __init__(self):
        self.transition_matrix = np.zeros((25, 25))  # Matriz de transición
        self.bi_transition = defaultdict(lambda: defaultdict(int))  # 2do orden
        self.stationary_dist = np.ones(25) / 25  # Distribución estacionaria
        self.bone_transition = np.zeros((25, 25))  # Transición de huesos
        self.is_trained = False
        self.total_transitions = 0
        self.last_positions = []  # Últimas posiciones para contexto

    def train(self, game_data: list[dict]) -> dict:
        """Entrenar cadena de Markov con datos de partidas"""
        for game in game_data:
            bone_positions = sorted(game["bone_positions"])
            chicken_positions = sorted(game["chicken_positions"])

            # Transiciones entre huesos consecutivos
            for i in range(len(bone_positions) - 1):
                from_pos = bone_positions[i] - 1  # 0-indexed
                to_pos = bone_positions[i + 1] - 1
                self.bone_transition[from_pos][to_pos] += 1
                self.total_transitions += 1

            # Transiciones entre posiciones reveladas (si hay orden)
            revealed = game.get("revealed_positions", [])
            if len(revealed) >= 2:
                for i in range(len(revealed) - 1):
                    from_pos = revealed[i] - 1
                    to_pos = revealed[i + 1] - 1
                    if 0 <= from_pos < 25 and 0 <= to_pos < 25:
                        self.transition_matrix[from_pos][to_pos] += 1

                # Cadenas de segundo orden
                for i in range(len(revealed) - 2):
                    key = (revealed[i] - 1, revealed[i + 1] - 1)
                    next_pos = revealed[i + 2] - 1
                    self.bi_transition[key][next_pos] += 1

        # Normalizar matrices
        self._normalize_matrix(self.transition_matrix)
        self._normalize_matrix(self.bone_transition)
        self._calculate_stationary_distribution()

        self.is_trained = True

        return {
            "total_transitions": self.total_transitions,
            "matrix_entropy": self._calculate_entropy(),
            "is_trained": True,
        }

    def _normalize_matrix(self, matrix: np.ndarray):
        """Normalizar matriz para que cada fila sume 1"""
        row_sums = matrix.sum(axis=1)
        row_sums[row_sums == 0] = 1  # Evitar división por cero
        matrix /= row_sums[:, np.newaxis]

    def _calculate_stationary_distribution(self):
        """Calcular distribución estacionaria usando método de potencias"""
        dist = np.ones(25) / 25
        for _ in range(100):
            new_dist = dist @ self.transition_matrix
            if np.allclose(dist, new_dist, atol=1e-8):
                break
            dist = new_dist
        self.stationary_dist = dist / dist.sum()  # Normalizar

    def _calculate_entropy(self) -> float:
        """Calcular entropía de la matriz de transición (medida de predictibilidad)"""
        entropy = 0.0
        for i in range(25):
            for j in range(25):
                p = self.transition_matrix[i][j]
                if p > 0:
                    entropy -= p * np.log2(p)
        return round(float(entropy / 25), 4)

    def predict(self, revealed_positions: list[int] = None,
                bone_count: int = 4, recent_bones: list[list[int]] = None) -> dict:
        """Predecir posiciones seguras usando Markov"""

        if not self.is_trained:
            return self._fallback_predict(revealed_positions)

        all_positions = list(range(1, 26))
        available = [p for p in all_positions if p not in (revealed_positions or [])]

        if not available:
            return {"position": 1, "confidence": 0.0, "strategy": "NO_AVAILABLE"}

        # Scores de seguridad basados en Markov
        scores = {}

        for pos in available:
            idx = pos - 1
            score = 1.0 - self.stationary_dist[idx]  # Inverso de probabilidad estacionaria

            # Si hay posición anterior, usar transición
            if revealed_positions and len(revealed_positions) > 0:
                last_pos = revealed_positions[-1] - 1
                if 0 <= last_pos < 25:
                    # Probabilidad de que esta posición sea la próxima (menor = más seguro)
                    transition_prob = self.transition_matrix[last_pos][idx]
                    score = 1.0 - transition_prob

            # Segundo orden si hay suficientes posiciones
            if revealed_positions and len(revealed_positions) >= 2:
                key = (revealed_positions[-2] - 1, revealed_positions[-1] - 1)
                bi_transitions = self.bi_transition.get(key, {})
                total_bi = sum(bi_transitions.values()) if bi_transitions else 1
                bi_prob = bi_transitions.get(idx, 0) / max(total_bi, 1)
                score = score * (1.0 - bi_prob)  # Combinar

            # Transición de huesos: si la posición anterior fue hueso, predecir próxima
            if recent_bones and len(recent_bones) > 0:
                last_game_bones = recent_bones[-1]
                for bone_pos in last_game_bones:
                    bone_idx = bone_pos - 1
                    if 0 <= bone_idx < 25:
                        # Penalizar posiciones que suelen seguir a huesos
                        bone_follow_prob = self.bone_transition[bone_idx][idx]
                        score -= bone_follow_prob * 0.3

            scores[pos] = max(0.0, min(1.0, score))

        # Seleccionar mejor posición
        best_position = max(scores, key=scores.get)
        best_confidence = scores[best_position]

        # Safe y dangerous
        sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        safe_positions = [pos for pos, score in sorted_scores[:5]]
        dangerous_positions = [pos for pos, score in sorted_scores[-5:]]

        return {
            "position": best_position,
            "confidence": best_confidence,
            "strategy": "MARKOV_CHAIN",
            "model": "markov",
            "safe_positions": safe_positions,
            "dangerous_positions": dangerous_positions,
            "transition_entropy": self._calculate_entropy(),
            "scores": {pos: round(score, 3) for pos, score in sorted_scores[:10]},
        }

    def update(self, position: int, was_chicken: bool):
        """Actualizar cadena con nuevo resultado"""
        self.last_positions.append(position)

        if len(self.last_positions) >= 2:
            from_pos = self.last_positions[-2] - 1
            to_pos = self.last_positions[-1] - 1
            if 0 <= from_pos < 25 and 0 <= to_pos < 25:
                self.transition_matrix[from_pos][to_pos] += 1
                self._normalize_matrix(self.transition_matrix)
                self.total_transitions += 1

        # Mantener solo últimas 50 posiciones
        if len(self.last_positions) > 50:
            self.last_positions = self.last_positions[-50:]

    def _fallback_predict(self, revealed_positions: list[int] = None) -> dict:
        """Predicción fallback sin entrenamiento"""
        available = [p for p in range(1, 26) if p not in (revealed_positions or [])]
        if available:
            return {"position": available[0], "confidence": 0.5, "strategy": "MARKOV_FALLBACK"}
        return {"position": 1, "confidence": 0.0, "strategy": "NO_AVAILABLE"}

    def get_stats(self) -> dict:
        """Obtener estadísticas del predictor"""
        return {
            "is_trained": self.is_trained,
            "total_transitions": self.total_transitions,
            "entropy": self._calculate_entropy(),
            "top_stationary": [
                {"position": i + 1, "probability": round(float(self.stationary_dist[i]), 4)}
                for i in np.argsort(self.stationary_dist)[-5:]
            ][::-1],
        }
