"""
Clase base abstracta para todos los modelos ML del sistema.
"""
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional
import numpy as np
from loguru import logger


class BaseModel(ABC):
    """Interfaz común para todos los modelos de predicción."""
    
    def __init__(self, name: str):
        self.name = name
        self.is_trained = False
        self.train_games_count = 0
        self.last_metrics: dict = {}
    
    @abstractmethod
    def train(self, X: np.ndarray, y: np.ndarray, **kwargs) -> dict:
        """
        Entrena el modelo.
        
        Args:
            X: Features (n_samples, n_features)
            y: Targets (n_samples,) — 1=bone, 0=chicken
        
        Returns:
            dict con métricas de entrenamiento
        """
        pass
    
    @abstractmethod
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """
        Predice probabilidad de hueso para cada posición.
        
        Args:
            X: Features (25, n_features)
        
        Returns:
            Probabilidades (25,) — prob de ser hueso
        """
        pass
    
    @abstractmethod
    def save(self, path: Path) -> None:
        """Guarda el modelo a disco."""
        pass
    
    @abstractmethod
    def load(self, path: Path) -> bool:
        """Carga el modelo desde disco. Retorna True si tuvo éxito."""
        pass
    
    def predict_safe_positions(
        self, 
        X: np.ndarray, 
        n_positions: int = 5,
        revealed: Optional[list[int]] = None
    ) -> list[dict]:
        """
        Retorna las N posiciones más seguras (menor probabilidad de hueso).
        
        Args:
            X: Features (25, n_features)
            n_positions: Número de posiciones a sugerir
            revealed: Posiciones ya reveladas (1-25) a excluir
        
        Returns:
            Lista de dicts: [{position, confidence, bone_probability}, ...]
        """
        if not self.is_trained:
            logger.warning(f"[{self.name}] Modelo no entrenado, predicción aleatoria")
            return self._random_positions(n_positions, revealed)
        
        bone_probs = self.predict_proba(X)
        
        # Crear ranking de posiciones (menor prob de hueso = más segura)
        positions = []
        revealed_set = set(revealed or [])
        
        for i in range(25):
            pos = i + 1  # Posiciones 1-25
            if pos in revealed_set:
                continue
            positions.append({
                'position': pos,
                'bone_probability': float(bone_probs[i]),
                'confidence': float((1.0 - bone_probs[i]) * 100),
                'is_safe': bone_probs[i] < 0.16  # Threshold teórico: 4/25
            })
        
        # Ordenar por seguridad (menor prob de hueso primero)
        positions.sort(key=lambda x: x['bone_probability'])
        
        return positions[:n_positions]
    
    def _random_positions(
        self, n: int, revealed: Optional[list[int]] = None
    ) -> list[dict]:
        """Posiciones aleatorias como fallback."""
        available = [i for i in range(1, 26) if i not in (revealed or [])]
        selected = np.random.choice(available, min(n, len(available)), replace=False)
        return [
            {'position': int(p), 'bone_probability': 0.16, 'confidence': 84.0, 'is_safe': True}
            for p in selected
        ]
