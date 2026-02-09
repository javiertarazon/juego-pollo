"""
Modelo Anti-Repetición para predicción de huesos.

Basado en el hallazgo clave del análisis:
- 46.3% de las veces NINGÚN hueso se repite de la partida anterior
- Solo 0.66 huesos promedio se repiten
- Solo 0.7% tiene 3+ huesos repetidos
- Los 4 huesos se repiten = evento casi imposible

Estrategia: Penalizar posiciones que fueron hueso en la partida anterior.
"""
import numpy as np
from pathlib import Path
from loguru import logger
import json

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import GRID_SIZE
from models.base_model import BaseModel


class AntiRepeatModel(BaseModel):
    """
    Predictor basado en anti-repetición de huesos.
    
    Fortalezas:
    - Explota el patrón más fuerte descubierto: 46.3% veces 0 huesos se repiten
    - Muy rápido de calcular (no requiere entrenamiento pesado)
    - Alta precisión para descartar posiciones que fueron hueso
    
    Aprende los factores de repetición por posición del historial.
    """
    
    def __init__(self):
        super().__init__("AntiRepeat")
        self.position_repeat_rates = np.full(GRID_SIZE, 0.16, dtype=np.float32)
        self.global_repeat_rate = 0.165  # 0.66/4 = probabilidad base de repetición
        self.position_non_repeat_bonus = np.zeros(GRID_SIZE, dtype=np.float32)
        self.bone_matrix_cache = None
        self.n_games_trained = 0
    
    def train(self, X: np.ndarray, y: np.ndarray, **kwargs) -> dict:
        """
        Aprende las tasas de repetición por posición del historial.
        X, y se ignoran — usa bone_matrix directamente.
        """
        bone_matrix = kwargs.get('bone_matrix')
        if bone_matrix is None:
            return {'error': 'bone_matrix required'}
        
        self.bone_matrix_cache = bone_matrix.copy()
        n_games = len(bone_matrix)
        
        if n_games < 5:
            return {'error': 'need at least 5 games'}
        
        # Calcular tasa de repetición por posición
        repeat_counts = np.zeros(GRID_SIZE, dtype=np.float32)
        bone_in_prev_counts = np.zeros(GRID_SIZE, dtype=np.float32)
        
        # Cuántas veces fue hueso en total
        total_bone_counts = bone_matrix.sum(axis=0)
        
        for g in range(1, n_games):
            prev_bones = set(np.where(bone_matrix[g-1] == 1)[0])
            curr_bones = set(np.where(bone_matrix[g] == 1)[0])
            
            for pos in prev_bones:
                bone_in_prev_counts[pos] += 1
                if pos in curr_bones:
                    repeat_counts[pos] += 1
        
        # Tasa de repetición por posición
        for pos in range(GRID_SIZE):
            if bone_in_prev_counts[pos] > 0:
                self.position_repeat_rates[pos] = repeat_counts[pos] / bone_in_prev_counts[pos]
            else:
                self.position_repeat_rates[pos] = 0.16  # Prior uniforme
        
        # Global repeat rate
        total_repeats = repeat_counts.sum()
        total_from_prev = bone_in_prev_counts.sum()
        if total_from_prev > 0:
            self.global_repeat_rate = total_repeats / total_from_prev
        
        # Bonus por no-repetición: posiciones que rara vez repiten hueso
        for pos in range(GRID_SIZE):
            self.position_non_repeat_bonus[pos] = 1.0 - self.position_repeat_rates[pos]
        
        self.is_trained = True
        self.n_games_trained = n_games
        
        metrics = {
            'global_repeat_rate': float(self.global_repeat_rate),
            'avg_position_repeat_rate': float(self.position_repeat_rates.mean()),
            'max_repeat_rate': float(self.position_repeat_rates.max()),
            'min_repeat_rate': float(self.position_repeat_rates.min()),
            'n_games': n_games,
            'positions_high_repeat': [
                int(p + 1) for p in np.argsort(self.position_repeat_rates)[-5:][::-1]
            ],
            'positions_low_repeat': [
                int(p + 1) for p in np.argsort(self.position_repeat_rates)[:5]
            ],
        }
        self.last_metrics = metrics
        
        logger.info(
            f"[{self.name}] Global repeat rate: {self.global_repeat_rate:.3f}, "
            f"Avg position rate: {self.position_repeat_rates.mean():.3f}"
        )
        
        return metrics
    
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """
        Predice P(hueso) penalizando posiciones que fueron hueso recientemente.
        """
        if not self.is_trained or self.bone_matrix_cache is None:
            return np.full(GRID_SIZE, 0.16)
        
        bone_matrix = self.bone_matrix_cache
        n_games = len(bone_matrix)
        
        # Probabilidad base uniforme
        probs = np.full(GRID_SIZE, 0.16, dtype=np.float32)
        
        if n_games < 1:
            return probs
        
        last_game = bone_matrix[-1]
        last_bones = set(np.where(last_game == 1)[0])
        
        # Para cada posición
        for pos in range(GRID_SIZE):
            if pos in last_bones:
                # Fue hueso → aplicar tasa de repetición (generalmente baja)
                probs[pos] = self.position_repeat_rates[pos] * 0.8
            else:
                # No fue hueso → probabilidad base + ajuste
                # Considerar cuántas partidas lleva sin ser hueso
                streak = 0
                for g in range(n_games - 1, -1, -1):
                    if bone_matrix[g, pos] == 0:
                        streak += 1
                    else:
                        break
                
                # A más partidas sin hueso, más probabilidad
                # Pero con límite (no puede ser >0.5)
                base = 0.16
                streak_bonus = min(streak * 0.02, 0.15)
                probs[pos] = base + streak_bonus
        
        # Si vemos 2 partidas atrás, doble penalización a repetidores
        if n_games >= 2:
            prev2_bones = set(np.where(bone_matrix[-2] == 1)[0])
            double_repeaters = last_bones & prev2_bones
            for pos in double_repeaters:
                probs[pos] *= 0.5  # Muy improbable triple repetición
        
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
            'position_repeat_rates': self.position_repeat_rates.tolist(),
            'global_repeat_rate': float(self.global_repeat_rate),
            'position_non_repeat_bonus': self.position_non_repeat_bonus.tolist(),
            'n_games_trained': self.n_games_trained,
        }
        with open(path / "anti_repeat_state.json", 'w') as f:
            json.dump(state, f, indent=2)
        if self.bone_matrix_cache is not None:
            np.save(path / "anti_repeat_cache.npy", self.bone_matrix_cache)
        logger.info(f"[{self.name}] Guardado en {path}")
    
    def load(self, path: Path) -> bool:
        state_path = path / "anti_repeat_state.json"
        if not state_path.exists():
            return False
        try:
            with open(state_path) as f:
                state = json.load(f)
            self.position_repeat_rates = np.array(state['position_repeat_rates'], dtype=np.float32)
            self.global_repeat_rate = state['global_repeat_rate']
            self.position_non_repeat_bonus = np.array(state['position_non_repeat_bonus'], dtype=np.float32)
            self.n_games_trained = state.get('n_games_trained', 0)
            
            cache_path = path / "anti_repeat_cache.npy"
            if cache_path.exists():
                self.bone_matrix_cache = np.load(cache_path)
            
            self.is_trained = True
            logger.info(f"[{self.name}] Cargado desde {path}")
            return True
        except Exception as e:
            logger.error(f"[{self.name}] Error cargando: {e}")
            return False
