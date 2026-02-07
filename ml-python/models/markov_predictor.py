"""
Predictor basado en Cadenas de Markov de 2do Orden.

Usa transiciones de (t-2, t-1) → t en lugar de solo t-1 → t.
Captura patrones como: "si la posición X fue hueso 2 partidas seguidas,
¿cuál es la probabilidad de ser hueso en la siguiente?"

Hallazgos del análisis que explota:
- Inversión: ~13.34% pollo→hueso, 13.34% hueso→pollo por partida
- Solo 0.66 huesos se repiten entre partidas consecutivas
- Ciertas posiciones tienen patrones de alternancia más fuertes
"""
import numpy as np
import json
from pathlib import Path
from loguru import logger

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import GRID_SIZE
from models.base_model import BaseModel


class MarkovPredictor(BaseModel):
    """
    Predictor basado en cadenas de Markov de 2do orden.
    
    Para cada posición, mantiene una matriz de transición 2D:
    - Estado (t-2, t-1) → P(t)
    - 4 estados posibles: (0,0), (0,1), (1,0), (1,1)
    - Para cada estado, P(bone en t)
    
    También calcula transiciones entre pares de posiciones
    para capturar migración de huesos.
    """
    
    def __init__(self):
        super().__init__("Markov2ndOrder")
        # Transición por posición: [pos][prev2_state][prev1_state] → P(bone)
        # prev_state: 0=chicken, 1=bone
        self.transition_probs = np.full((GRID_SIZE, 2, 2), 0.16, dtype=np.float32)
        self.transition_counts = np.zeros((GRID_SIZE, 2, 2, 2), dtype=np.float32)  # [..., outcome]
        
        # Transición entre posiciones: P(pos_j=bone | pos_i fue bone en t-1)
        self.cross_transition = np.full((GRID_SIZE, GRID_SIZE), 0.16, dtype=np.float32)
        
        # Contexto global: P(n_changes | prev_n_changes)
        self.change_momentum = np.zeros(10, dtype=np.float32)  # bins de 0-9 cambios
        
        self.bone_matrix_cache = None
        self.n_games_trained = 0
    
    def train(self, X: np.ndarray, y: np.ndarray, **kwargs) -> dict:
        """Aprende las probabilidades de transición de 2do orden."""
        bone_matrix = kwargs.get('bone_matrix')
        if bone_matrix is None:
            return {'error': 'bone_matrix required'}
        
        self.bone_matrix_cache = bone_matrix.copy()
        n_games = len(bone_matrix)
        
        if n_games < 5:
            return {'error': 'need at least 5 games'}
        
        # Reset
        self.transition_counts = np.zeros((GRID_SIZE, 2, 2, 2), dtype=np.float32)
        cross_counts = np.zeros((GRID_SIZE, GRID_SIZE), dtype=np.float32)
        cross_totals = np.zeros(GRID_SIZE, dtype=np.float32)
        
        # ── Transiciones de 2do orden por posición ──
        for g in range(2, n_games):
            for pos in range(GRID_SIZE):
                prev2 = int(bone_matrix[g-2, pos])
                prev1 = int(bone_matrix[g-1, pos])
                curr = int(bone_matrix[g, pos])
                self.transition_counts[pos, prev2, prev1, curr] += 1
        
        # Calcular probabilidades
        for pos in range(GRID_SIZE):
            for p2 in range(2):
                for p1 in range(2):
                    total = self.transition_counts[pos, p2, p1].sum()
                    if total >= 3:  # Mínimo de observaciones
                        self.transition_probs[pos, p2, p1] = (
                            self.transition_counts[pos, p2, p1, 1] / total
                        )
                    else:
                        # Smoothing: usar prior uniforme con evidencia
                        self.transition_probs[pos, p2, p1] = (
                            (self.transition_counts[pos, p2, p1, 1] + 1) / (total + 2)
                        )
        
        # ── Transiciones cruzadas entre posiciones ──
        for g in range(1, n_games):
            prev_bones = np.where(bone_matrix[g-1] == 1)[0]
            curr_bones = np.where(bone_matrix[g] == 1)[0]
            
            for pi in prev_bones:
                cross_totals[pi] += 1
                for pj in curr_bones:
                    cross_counts[pj, pi] += 1
        
        for pi in range(GRID_SIZE):
            if cross_totals[pi] > 0:
                self.cross_transition[:, pi] = cross_counts[:, pi] / cross_totals[pi]
        
        # ── Momentum de cambios ──
        for g in range(1, n_games):
            n_changes = int(np.sum(bone_matrix[g] != bone_matrix[g-1]))
            bin_idx = min(n_changes, 9)
            self.change_momentum[bin_idx] += 1
        if self.change_momentum.sum() > 0:
            self.change_momentum /= self.change_momentum.sum()
        
        self.is_trained = True
        self.n_games_trained = n_games
        
        # Métricas
        # Evaluar accuracy en últimas 20 partidas
        correct_predictions = 0
        total_positions = 0
        for g in range(max(2, n_games - 20), n_games):
            pred = self._predict_single(bone_matrix, g)
            actual = bone_matrix[g]
            pred_binary = (pred > 0.16).astype(float)
            correct_predictions += np.sum(pred_binary == actual)
            total_positions += GRID_SIZE
        
        accuracy = correct_predictions / max(total_positions, 1)
        
        metrics = {
            'accuracy_last_20': float(accuracy),
            'n_games': n_games,
            'avg_transition_prob': float(self.transition_probs.mean()),
            'change_momentum_distribution': self.change_momentum.tolist(),
            'most_predictable_positions': [
                int(p + 1) for p in np.argsort(
                    np.max(self.transition_probs, axis=(1, 2)) - 
                    np.min(self.transition_probs, axis=(1, 2))
                )[-5:][::-1]
            ],
        }
        self.last_metrics = metrics
        
        logger.info(
            f"[{self.name}] Accuracy últimas 20: {accuracy:.3f}, "
            f"Avg transition prob: {self.transition_probs.mean():.3f}"
        )
        
        return metrics
    
    def _predict_single(self, bone_matrix: np.ndarray, game_idx: int) -> np.ndarray:
        """Predice una sola partida usando el historial hasta game_idx-1."""
        if game_idx < 2:
            return np.full(GRID_SIZE, 0.16, dtype=np.float32)
        
        probs = np.zeros(GRID_SIZE, dtype=np.float32)
        
        for pos in range(GRID_SIZE):
            prev2 = int(bone_matrix[game_idx - 2, pos])
            prev1 = int(bone_matrix[game_idx - 1, pos])
            
            # Probabilidad Markov 2do orden
            markov_prob = self.transition_probs[pos, prev2, prev1]
            
            # Cross-transition: influencia de huesos de la partida anterior
            prev_bones = np.where(bone_matrix[game_idx - 1] == 1)[0]
            if len(prev_bones) > 0:
                cross_prob = np.mean([self.cross_transition[pos, pb] for pb in prev_bones])
            else:
                cross_prob = 0.16
            
            # Combinar: 70% Markov + 30% cross-transition
            probs[pos] = 0.7 * markov_prob + 0.3 * cross_prob
        
        # Normalizar a 4 huesos
        s = probs.sum()
        if s > 0:
            probs = probs * (4.0 / s)
        
        return np.clip(probs, 0.01, 0.99)
    
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """Predice P(hueso) para la próxima partida."""
        if not self.is_trained or self.bone_matrix_cache is None:
            return np.full(GRID_SIZE, 0.16)
        
        return self._predict_single(self.bone_matrix_cache, len(self.bone_matrix_cache))
    
    def update_cache(self, new_bone_vector: np.ndarray):
        if self.bone_matrix_cache is not None:
            self.bone_matrix_cache = np.vstack([
                self.bone_matrix_cache,
                new_bone_vector.reshape(1, -1)
            ])
            
            # Actualizar transiciones incrementalmente
            n = len(self.bone_matrix_cache)
            if n >= 3:
                g = n - 1
                for pos in range(GRID_SIZE):
                    prev2 = int(self.bone_matrix_cache[g-2, pos])
                    prev1 = int(self.bone_matrix_cache[g-1, pos])
                    curr = int(self.bone_matrix_cache[g, pos])
                    self.transition_counts[pos, prev2, prev1, curr] += 1
                    total = self.transition_counts[pos, prev2, prev1].sum()
                    if total > 0:
                        self.transition_probs[pos, prev2, prev1] = (
                            self.transition_counts[pos, prev2, prev1, 1] / total
                        )
    
    def save(self, path: Path) -> None:
        path.mkdir(parents=True, exist_ok=True)
        np.save(path / "markov_transition_probs.npy", self.transition_probs)
        np.save(path / "markov_transition_counts.npy", self.transition_counts)
        np.save(path / "markov_cross_transition.npy", self.cross_transition)
        np.save(path / "markov_change_momentum.npy", self.change_momentum)
        
        state = {
            'n_games_trained': self.n_games_trained,
        }
        with open(path / "markov_state.json", 'w') as f:
            json.dump(state, f, indent=2)
        
        if self.bone_matrix_cache is not None:
            np.save(path / "markov_cache.npy", self.bone_matrix_cache)
        
        logger.info(f"[{self.name}] Guardado en {path}")
    
    def load(self, path: Path) -> bool:
        try:
            probs_path = path / "markov_transition_probs.npy"
            if not probs_path.exists():
                return False
            
            self.transition_probs = np.load(probs_path)
            self.transition_counts = np.load(path / "markov_transition_counts.npy")
            self.cross_transition = np.load(path / "markov_cross_transition.npy")
            self.change_momentum = np.load(path / "markov_change_momentum.npy")
            
            state_path = path / "markov_state.json"
            if state_path.exists():
                with open(state_path) as f:
                    state = json.load(f)
                self.n_games_trained = state.get('n_games_trained', 0)
            
            cache_path = path / "markov_cache.npy"
            if cache_path.exists():
                self.bone_matrix_cache = np.load(cache_path)
            
            self.is_trained = True
            logger.info(f"[{self.name}] Cargado desde {path}")
            return True
        except Exception as e:
            logger.error(f"[{self.name}] Error cargando: {e}")
            return False
