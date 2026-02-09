"""
Predictor de Dispersión Espacial.

Basado en el hallazgo: 85.3% de partidas tienen huesos adyacentes.
Los huesos tienden a NO estar completamente dispersos ni completamente agrupados.

Usa la distribución espacial esperada de huesos para predecir
configuraciones realistas, penalizando configuraciones estadísticamente improbables.

Patrones aprovechados:
- Migración bordes→bordes 49.7%, bordes→centro 38.2%
- Columna 2 tiene 18.9% huesos vs columna 1 con 13.5%
- Pares adyacentes son la norma (85.3%)
"""
import numpy as np
import json
from pathlib import Path
from loguru import logger

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import GRID_SIZE
from models.base_model import BaseModel


def _get_neighbors_5x5(pos_idx: int) -> list[int]:
    """Vecinos ortogonales + diagonales en tablero 5x5."""
    r, c = pos_idx // 5, pos_idx % 5
    neighbors = []
    for dr in [-1, 0, 1]:
        for dc in [-1, 0, 1]:
            if dr == 0 and dc == 0:
                continue
            nr, nc = r + dr, c + dc
            if 0 <= nr < 5 and 0 <= nc < 5:
                neighbors.append(nr * 5 + nc)
    return neighbors


NEIGHBOR_MAP = {i: _get_neighbors_5x5(i) for i in range(25)}


def _get_zone(pos_idx: int) -> int:
    """0=esquina, 1=borde, 2=centro."""
    r, c = pos_idx // 5, pos_idx % 5
    if (r in (0, 4)) and (c in (0, 4)):
        return 0
    elif r in (0, 4) or c in (0, 4):
        return 1
    else:
        return 2


class DispersionPredictor(BaseModel):
    """
    Predictor basado en patrones de dispersión espacial.
    
    Aprende la distribución espacial típica de huesos:
    - Distancia inter-huesos habitual
    - Patrones de agrupamiento vs dispersión
    - Sesgo por zonas (esquinas, bordes, centro)
    - Sesgo por columnas
    
    Fortalezas:
    - Captura restricciones geométricas del tablero 5x5
    - Explota el sesgo de columna descubierto
    - Modela la tendencia a la adyacencia (85.3%)
    """
    
    def __init__(self):
        super().__init__("Dispersion")
        # Probabilidad por zona: [esquina, borde, centro]
        self.zone_probs = np.array([0.16, 0.16, 0.16], dtype=np.float32)
        # Probabilidad por columna
        self.column_probs = np.full(5, 0.16, dtype=np.float32)
        # Probabilidad por fila
        self.row_probs = np.full(5, 0.16, dtype=np.float32)
        # Probabilidad base por posición (histórica)
        self.position_probs = np.full(GRID_SIZE, 0.16, dtype=np.float32)
        # Patrón de adyacencia: P(pos=bone | al menos 1 vecino=bone)
        self.adjacency_boost = 0.0
        # Distribución de distancias inter-huesos
        self.avg_inter_bone_distance = 2.5
        self.std_inter_bone_distance = 1.0
        # Migración entre zonas
        self.zone_transition = np.full((3, 3), 1.0/3, dtype=np.float32)
        
        self.bone_matrix_cache = None
        self.n_games_trained = 0
    
    def train(self, X: np.ndarray, y: np.ndarray, **kwargs) -> dict:
        """Aprende los patrones de dispersión espacial del historial."""
        bone_matrix = kwargs.get('bone_matrix')
        if bone_matrix is None:
            return {'error': 'bone_matrix required'}
        
        self.bone_matrix_cache = bone_matrix.copy()
        n_games = len(bone_matrix)
        
        if n_games < 5:
            return {'error': 'need at least 5 games'}
        
        # ── Probabilidad por posición ──
        self.position_probs = bone_matrix.mean(axis=0).astype(np.float32)
        
        # ── Probabilidad por zona ──
        zone_bones = [0.0, 0.0, 0.0]
        zone_total = [0.0, 0.0, 0.0]
        for pos in range(GRID_SIZE):
            z = _get_zone(pos)
            zone_bones[z] += bone_matrix[:, pos].sum()
            zone_total[z] += n_games
        for z in range(3):
            if zone_total[z] > 0:
                self.zone_probs[z] = zone_bones[z] / zone_total[z]
        
        # ── Probabilidad por columna y fila ──
        for col in range(5):
            col_positions = [r * 5 + col for r in range(5)]
            self.column_probs[col] = bone_matrix[:, col_positions].mean()
        
        for row in range(5):
            row_positions = [row * 5 + c for c in range(5)]
            self.row_probs[row] = bone_matrix[:, row_positions].mean()
        
        # ── Patrón de adyacencia ──
        adjacency_bone = 0
        adjacency_total = 0
        for g in range(n_games):
            bones = set(np.where(bone_matrix[g] == 1)[0])
            for pos in range(GRID_SIZE):
                has_bone_neighbor = any(n in bones for n in NEIGHBOR_MAP[pos])
                if has_bone_neighbor:
                    adjacency_total += 1
                    if pos in bones:
                        adjacency_bone += 1
        
        self.adjacency_boost = adjacency_bone / max(adjacency_total, 1) - 0.16
        
        # ── Distancia inter-huesos ──
        distances = []
        for g in range(n_games):
            bones = np.where(bone_matrix[g] == 1)[0]
            if len(bones) >= 2:
                coords = np.array([(b // 5, b % 5) for b in bones])
                for i in range(len(coords)):
                    for j in range(i + 1, len(coords)):
                        d = np.sqrt(np.sum((coords[i] - coords[j])**2))
                        distances.append(d)
        
        if distances:
            self.avg_inter_bone_distance = np.mean(distances)
            self.std_inter_bone_distance = np.std(distances)
        
        # ── Migración entre zonas ──
        migration = np.zeros((3, 3), dtype=np.float32)
        for g in range(1, n_games):
            prev_bones = np.where(bone_matrix[g-1] == 1)[0]
            curr_bones = np.where(bone_matrix[g] == 1)[0]
            for pb in prev_bones:
                for cb in curr_bones:
                    migration[_get_zone(pb), _get_zone(cb)] += 1
        
        for z in range(3):
            s = migration[z].sum()
            if s > 0:
                migration[z] /= s
        self.zone_transition = migration
        
        self.is_trained = True
        self.n_games_trained = n_games
        
        metrics = {
            'zone_probs': self.zone_probs.tolist(),
            'column_probs': self.column_probs.tolist(),
            'row_probs': self.row_probs.tolist(),
            'adjacency_boost': float(self.adjacency_boost),
            'avg_inter_bone_distance': float(self.avg_inter_bone_distance),
            'n_games': n_games,
        }
        self.last_metrics = metrics
        
        logger.info(
            f"[{self.name}] Zone probs: {self.zone_probs.tolist()}, "
            f"Col probs: {self.column_probs.tolist()}, "
            f"Adjacency boost: {self.adjacency_boost:.3f}"
        )
        
        return metrics
    
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Predice P(hueso) basado en dispersión espacial."""
        if not self.is_trained or self.bone_matrix_cache is None:
            return np.full(GRID_SIZE, 0.16)
        
        bone_matrix = self.bone_matrix_cache
        n_games = len(bone_matrix)
        
        if n_games < 1:
            return np.full(GRID_SIZE, 0.16)
        
        probs = np.copy(self.position_probs)
        last_bones = set(np.where(bone_matrix[-1] == 1)[0])
        
        # Factor 1: Sesgo por columna y fila (no incluir zona, ya está en position_probs)
        # Usamos solo col/row como ajuste multiplicativo suave
        for pos in range(GRID_SIZE):
            row, col = pos // 5, pos % 5
            col_factor = self.column_probs[col] / max(self.position_probs.mean(), 0.01)
            row_factor = self.row_probs[row] / max(self.position_probs.mean(), 0.01)
            # Media geométrica suave: sqrt(col * row) para evitar doble conteo
            combined = np.sqrt(col_factor * row_factor)
            probs[pos] *= combined
        
        # Factor 2: Migración desde zonas de huesos anteriores
        if last_bones:
            migration_score = np.zeros(GRID_SIZE, dtype=np.float32)
            for pos in range(GRID_SIZE):
                target_zone = _get_zone(pos)
                for bone in last_bones:
                    source_zone = _get_zone(bone)
                    migration_score[pos] += self.zone_transition[source_zone, target_zone]
                migration_score[pos] /= len(last_bones)
            
            # Normalizar migration_score a misma escala que probs
            if migration_score.sum() > 0:
                migration_score = migration_score * (probs.sum() / migration_score.sum())
            probs = probs * 0.7 + migration_score * 0.3
        
        # Factor 3: Adyacencia boost - si vecinos fueron hueso, esta pos es más probable
        adj_boost = np.zeros(GRID_SIZE, dtype=np.float32)
        for pos in range(GRID_SIZE):
            bone_neighbors = sum(1 for n in NEIGHBOR_MAP[pos] if n in last_bones)
            if bone_neighbors > 0:
                adj_boost[pos] = self.adjacency_boost * (bone_neighbors / len(NEIGHBOR_MAP[pos]))
        
        probs += adj_boost * 0.3
        
        # v2.2: SIN normalización a 4 - el ensemble normaliza una sola vez
        return np.clip(probs, 0.01, 0.99)
    
    def update_cache(self, new_bone_vector: np.ndarray):
        if self.bone_matrix_cache is not None:
            self.bone_matrix_cache = np.vstack([
                self.bone_matrix_cache,
                new_bone_vector.reshape(1, -1)
            ])
    
    def save(self, path: Path) -> None:
        path.mkdir(parents=True, exist_ok=True)
        state = {
            'zone_probs': self.zone_probs.tolist(),
            'column_probs': self.column_probs.tolist(),
            'row_probs': self.row_probs.tolist(),
            'position_probs': self.position_probs.tolist(),
            'adjacency_boost': float(self.adjacency_boost),
            'avg_inter_bone_distance': float(self.avg_inter_bone_distance),
            'std_inter_bone_distance': float(self.std_inter_bone_distance),
            'zone_transition': self.zone_transition.tolist(),
            'n_games_trained': self.n_games_trained,
        }
        with open(path / "dispersion_state.json", 'w') as f:
            json.dump(state, f, indent=2)
        if self.bone_matrix_cache is not None:
            np.save(path / "dispersion_cache.npy", self.bone_matrix_cache)
        logger.info(f"[{self.name}] Guardado en {path}")
    
    def load(self, path: Path) -> bool:
        state_path = path / "dispersion_state.json"
        if not state_path.exists():
            return False
        try:
            with open(state_path) as f:
                state = json.load(f)
            self.zone_probs = np.array(state['zone_probs'], dtype=np.float32)
            self.column_probs = np.array(state['column_probs'], dtype=np.float32)
            self.row_probs = np.array(state['row_probs'], dtype=np.float32)
            self.position_probs = np.array(state['position_probs'], dtype=np.float32)
            self.adjacency_boost = state['adjacency_boost']
            self.avg_inter_bone_distance = state['avg_inter_bone_distance']
            self.std_inter_bone_distance = state['std_inter_bone_distance']
            self.zone_transition = np.array(state['zone_transition'], dtype=np.float32)
            self.n_games_trained = state.get('n_games_trained', 0)
            
            cache_path = path / "dispersion_cache.npy"
            if cache_path.exists():
                self.bone_matrix_cache = np.load(cache_path)
            
            self.is_trained = True
            logger.info(f"[{self.name}] Cargado desde {path}")
            return True
        except Exception as e:
            logger.error(f"[{self.name}] Error cargando: {e}")
            return False
