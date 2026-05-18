#!/usr/bin/env python3
"""
🔍 ANALIZADOR DE PATRONES - JUEGO DEL POLLO
============================================
Detección avanzada de patrones en tiempo real:
- Patrones de rotación de huesos
- Zonas calientes/frías
- Detección de adaptación de Mystake
- Análisis de secuencias
- Patrones espaciales (clusters, diagonales)
"""

import numpy as np
from collections import defaultdict
from typing import Optional


class PatternAnalyzer:
    """Analizador de patrones adaptativo"""

    def __init__(self):
        self.position_history = []  # Historial de posiciones de huesos
        self.chicken_history = []   # Historial de posiciones de pollos
        self.zone_history = []      # Historial de zonas activas
        self.is_trained = False
        self.games_analyzed = 0

        # Estadísticas
        self.bone_frequency = defaultdict(int)    # Frecuencia de huesos por posición
        self.chicken_frequency = defaultdict(int)  # Frecuencia de pollos por posición
        self.position_transitions = defaultdict(lambda: defaultdict(int))  # Transiciones
        self.streak_data = {"wins": 0, "losses": 0, "current_streak": 0}

        # Patrones detectados
        self.hot_positions = []      # Posiciones con más huesos recientemente
        self.cold_positions = []     # Posiciones con menos huesos recientemente
        self.rotation_pattern = None # Patrón de rotación detectado
        self.mystake_adaptation = False  # Mystake se está adaptando?

        # Configuración
        self.window_size = 10        # Ventana de análisis
        self.adaptation_threshold = 0.7  # Umbral para detectar adaptación

    def train(self, game_data: list[dict]) -> dict:
        """Entrenar analizador con datos históricos"""
        for game in game_data:
            bone_positions = game["bone_positions"]
            chicken_positions = game["chicken_positions"]

            self.position_history.append(bone_positions)
            self.chicken_history.append(chicken_positions)
            self.games_analyzed += 1

            # Actualizar frecuencias
            for pos in bone_positions:
                self.bone_frequency[pos] += 1
            for pos in chicken_positions:
                self.chicken_frequency[pos] += 1

            # Actualizar transiciones
            if len(self.position_history) >= 2:
                prev_bones = self.position_history[-2]
                for prev_pos in prev_bones:
                    for curr_pos in bone_positions:
                        self.position_transitions[prev_pos][curr_pos] += 1

        # Analizar patrones
        self._detect_hot_cold_positions()
        self._detect_rotation_pattern()
        self._detect_mystake_adaptation()

        self.is_trained = True

        return {
            "games_analyzed": self.games_analyzed,
            "hot_positions": self.hot_positions[:5],
            "cold_positions": self.cold_positions[:5],
            "rotation_active": self.rotation_pattern is not None,
            "mystake_adaptation": self.mystake_adaptation,
        }

    def update(self, position: int, was_chicken: bool):
        """Actualizar con resultado de una posición"""
        if was_chicken:
            self.chicken_frequency[position] += 1
            self.streak_data["wins"] += 1
            self.streak_data["current_streak"] = max(0, self.streak_data["current_streak"] + 1)
        else:
            self.bone_frequency[position] += 1
            self.streak_data["losses"] += 1
            self.streak_data["current_streak"] = min(0, self.streak_data["current_streak"] - 1)

        # Re-analizar si hay suficientes datos
        if self.games_analyzed % 5 == 0:
            self._detect_hot_cold_positions()
            self._detect_mystake_adaptation()

    def analyze(self, recent_games: list[dict] = None) -> dict:
        """Analizar patrones actuales"""
        result = {
            "hot_positions": self.hot_positions[:5],
            "cold_positions": self.cold_positions[:5],
            "rotation_active": self.rotation_pattern is not None,
            "rotation_description": self.rotation_pattern,
            "mystake_adaptation": self.mystake_adaptation,
            "safe_zones": self._identify_safe_zones(),
            "danger_clusters": self._detect_bone_clusters(),
            "streak": self.streak_data,
        }

        if recent_games:
            result["recent_analysis"] = self._analyze_recent(recent_games)

        return result

    def get_safety_scores(self, revealed_positions: list[int] = None) -> dict[int, float]:
        """Obtener puntuaciones de seguridad para cada posición"""
        scores = {}
        for pos in range(1, 26):
            if revealed_positions and pos in revealed_positions:
                continue

            # Puntuación base: inversa de frecuencia de huesos
            bone_freq = self.bone_frequency.get(pos, 0)
            total = bone_freq + self.chicken_frequency.get(pos, 0)
            base_score = 1.0 - (bone_freq / max(total, 1))

            # Bonus por posición fría
            cold_bonus = 0.1 if pos in self.cold_positions else 0.0

            # Penalización por posición caliente
            hot_penalty = -0.15 if pos in self.hot_positions else 0.0

            # Bonus por zona segura
            zone_bonus = self._zone_safety_bonus(pos)

            scores[pos] = max(0.0, min(1.0, base_score + cold_bonus + hot_penalty + zone_bonus))

        return scores

    def _detect_hot_cold_positions(self):
        """Detectar posiciones calientes (muchos huesos) y frías (pocos huesos)"""
        if not self.bone_frequency:
            return

        # Analizar solo las últimas N partidas
        recent = self.position_history[-self.window_size:] if self.position_history else []

        if not recent:
            return

        # Contar huesos recientes por posición
        recent_bone_count = defaultdict(int)
        for game_bones in recent:
            for pos in game_bones:
                recent_bone_count[pos] += 1

        # Ordenar por frecuencia de huesos
        sorted_positions = sorted(recent_bone_count.items(), key=lambda x: x[1], reverse=True)

        # Top 5 caliente (más huesos)
        self.hot_positions = [pos for pos, count in sorted_positions[:5]]

        # Bottom 5 fría (menos huesos) - de las posiciones que aparecieron
        all_positions = set(range(1, 26))
        positions_with_few_bones = [(pos, recent_bone_count.get(pos, 0)) for pos in all_positions]
        positions_with_few_bones.sort(key=lambda x: x[1])
        self.cold_positions = [pos for pos, count in positions_with_few_bones[:10]]

    def _detect_rotation_pattern(self):
        """Detectar patrón de rotación de Mystake"""
        if len(self.position_history) < 3:
            self.rotation_pattern = None
            return

        recent = self.position_history[-5:]

        # Calcular overlap entre partidas consecutivas
        overlaps = []
        for i in range(1, len(recent)):
            prev_set = set(recent[i-1])
            curr_set = set(recent[i])
            overlap = len(prev_set & curr_set)
            overlaps.append(overlap)

        avg_overlap = np.mean(overlaps) if overlaps else 0

        if avg_overlap < 1.0:
            self.rotation_pattern = "HIGH_ROTATION"
        elif avg_overlap < 2.0:
            self.rotation_pattern = "MODERATE_ROTATION"
        else:
            self.rotation_pattern = "LOW_ROTATION"

    def _detect_mystake_adaptation(self):
        """Detectar si Mystake está adaptándose a nuestra estrategia"""
        if len(self.position_history) < 10:
            self.mystake_adaptation = False
            return

        # Comparar tasa de éxito reciente vs general
        recent = self.position_history[-5:]
        older = self.position_history[-10:-5]

        # Posiciones que usamos frecuentemente
        our_common_positions = set()
        for game_chickens in self.chicken_history[-5:]:
            our_common_positions.update(game_chickens[:3])  # Primeras 3 reveladas

        # Verificar si huesos recientes se mueven hacia nuestras posiciones comunes
        recent_bones_in_our_zone = 0
        for game_bones in recent:
            recent_bones_in_our_zone += len(set(game_bones) & our_common_positions)

        older_bones_in_our_zone = 0
        for game_bones in older:
            older_bones_in_our_zone += len(set(game_bones) & our_common_positions)

        recent_rate = recent_bones_in_our_zone / max(len(recent) * 4, 1)
        older_rate = older_bones_in_our_zone / max(len(older) * 4, 1)

        # Si la tasa aumentó significativamente, Mystake se está adaptando
        self.mystake_adaptation = recent_rate > older_rate * 1.5 and recent_rate > self.adaptation_threshold

    def _identify_safe_zones(self) -> list[dict]:
        """Identificar zonas seguras del tablero"""
        zones = {
            "top_left": [1, 2, 6, 7],
            "top_right": [4, 5, 9, 10],
            "center": [7, 8, 12, 13, 17, 18],
            "bottom_left": [16, 17, 21, 22],
            "bottom_right": [19, 20, 24, 25],
        }

        safe_zones = []
        for zone_name, positions in zones.items():
            total_bones = sum(self.bone_frequency.get(p, 0) for p in positions)
            avg_bone_rate = total_bones / max(len(positions), 1)
            safe_zones.append({
                "zone": zone_name,
                "positions": positions,
                "safety_score": round(1.0 - avg_bone_rate / max(self.games_analyzed, 1), 3),
            })

        safe_zones.sort(key=lambda x: x["safety_score"], reverse=True)
        return safe_zones[:3]

    def _detect_bone_clusters(self) -> list[list[int]]:
        """Detectar clusters de huesos (huesos adyacentes)"""
        clusters = []

        if not self.position_history:
            return clusters

        # Analizar últimas partidas
        for game_bones in self.position_history[-5:]:
            bone_set = set(game_bones)
            visited = set()

            for pos in game_bones:
                if pos in visited:
                    continue

                # BFS para encontrar cluster
                cluster = []
                queue = [pos]
                while queue:
                    current = queue.pop(0)
                    if current in visited or current not in bone_set:
                        continue
                    visited.add(current)
                    cluster.append(current)

                    # Agregar adyacentes
                    row = ((current - 1) // 5) + 1
                    col = ((current - 1) % 5) + 1
                    for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                        nr, nc = row + dr, col + dc
                        if 1 <= nr <= 5 and 1 <= nc <= 5:
                            adj = (nr - 1) * 5 + nc
                            if adj in bone_set and adj not in visited:
                                queue.append(adj)

                if len(cluster) >= 2:
                    clusters.append(sorted(cluster))

        return clusters[:5]

    def _analyze_recent(self, recent_games: list[dict]) -> dict:
        """Analizar partidas recientes"""
        if not recent_games:
            return {}

        win_rate = sum(1 for g in recent_games if not g.get("hit_bone", True)) / len(recent_games)
        avg_revealed = np.mean([len(g.get("revealed_positions", [])) for g in recent_games])

        return {
            "games": len(recent_games),
            "win_rate": round(win_rate, 3),
            "avg_revealed": round(float(avg_revealed), 2),
        }

    def _zone_safety_bonus(self, position: int) -> float:
        """Bonus de seguridad por zona"""
        # Basado en datos reales: filas centrales son más seguras
        row = ((position - 1) // 5) + 1
        row_safety = {1: 0.05, 2: 0.03, 3: 0.02, 4: 0.04, 5: 0.05}

        col = ((position - 1) % 5) + 1
        col_safety = {1: 0.04, 2: 0.03, 3: 0.01, 4: 0.05, 5: 0.03}

        return row_safety.get(row, 0.03) + col_safety.get(col, 0.03)

    def get_stats(self) -> dict:
        """Obtener estadísticas del analizador"""
        return {
            "is_trained": self.is_trained,
            "games_analyzed": self.games_analyzed,
            "hot_positions": self.hot_positions[:5],
            "cold_positions": self.cold_positions[:5],
            "rotation": self.rotation_pattern,
            "mystake_adaptation": self.mystake_adaptation,
            "streak": self.streak_data,
        }
