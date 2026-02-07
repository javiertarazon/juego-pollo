"""
Feature Engineering Avanzado para Chicken Game.

Genera features temporales, espaciales y de transición para cada posición
del tablero 5x5, basándose en el historial de partidas anteriores.

Cada fila del dataset resultante corresponde a UNA posición en UNA partida,
con el target siendo si esa posición fue hueso (1) o pollo (0).
"""
import numpy as np
import pandas as pd
from typing import Optional
from loguru import logger

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import GRID_SIZE, GRID_ROWS, GRID_COLS, WINDOW_SIZES
from data.pattern_features import (
    compute_pattern_features, PATTERN_FEATURE_NAMES,
    compute_hot_streak_features, HOT_STREAK_FEATURE_NAMES,
    compute_dynamic_pair_features, DYNAMIC_PAIR_FEATURE_NAMES,
)


# ═══════════════════════════════════════════════════════════
# FEATURES ESPACIALES (estáticas por posición)
# ═══════════════════════════════════════════════════════════

def _position_to_row_col(pos_idx: int) -> tuple[int, int]:
    """Convierte índice 0-24 a (fila, columna) 0-4."""
    return pos_idx // GRID_COLS, pos_idx % GRID_COLS


def compute_spatial_features() -> np.ndarray:
    """
    Features estáticas para cada posición (no cambian entre partidas).
    Shape: (25, n_spatial_features)
    
    Features:
        - row, col (normalizados 0-1)
        - is_corner, is_edge, is_center
        - distance_to_center (normalizada)
        - quadrant (0-3 one-hot)
        - diagonal (principal, secundaria)
    """
    features = []
    center_r, center_c = 2, 2  # Centro del tablero 5x5
    
    for idx in range(GRID_SIZE):
        r, c = _position_to_row_col(idx)
        
        # Posición normalizada
        row_norm = r / (GRID_ROWS - 1)
        col_norm = c / (GRID_COLS - 1)
        
        # Tipo de posición
        is_corner = float(r in (0, 4) and c in (0, 4))
        is_edge = float((r in (0, 4) or c in (0, 4)) and not is_corner)
        is_center = float(r == 2 and c == 2)
        is_near_center = float(abs(r - 2) <= 1 and abs(c - 2) <= 1 and not is_center)
        
        # Distancia al centro (Manhattan y Euclidiana)
        dist_manhattan = (abs(r - center_r) + abs(c - center_c)) / 4.0
        dist_euclidean = np.sqrt((r - center_r)**2 + (c - center_c)**2) / (2 * np.sqrt(2))
        
        # Cuadrante (one-hot: 4 features)
        quad = [0.0, 0.0, 0.0, 0.0]
        qi = (0 if r < 2 else (2 if r > 2 else -1)) + (0 if c < 2 else (1 if c > 2 else -1))
        if qi >= 0 and qi < 4:
            quad[qi] = 1.0
        
        # Diagonales
        on_main_diag = float(r == c)
        on_anti_diag = float(r + c == 4)
        
        # Posición en anillo (0=centro, 1=anillo interno, 2=anillo externo)
        ring = max(abs(r - 2), abs(c - 2)) / 2.0
        
        feat = [
            row_norm, col_norm,
            is_corner, is_edge, is_center, is_near_center,
            dist_manhattan, dist_euclidean,
            *quad,
            on_main_diag, on_anti_diag,
            ring
        ]
        features.append(feat)
    
    return np.array(features, dtype=np.float32)


SPATIAL_FEATURE_NAMES = [
    'row_norm', 'col_norm',
    'is_corner', 'is_edge', 'is_center', 'is_near_center',
    'dist_manhattan', 'dist_euclidean',
    'quad_0', 'quad_1', 'quad_2', 'quad_3',
    'on_main_diag', 'on_anti_diag',
    'ring'
]


# ═══════════════════════════════════════════════════════════
# FEATURES TEMPORALES (basadas en historial)
# ═══════════════════════════════════════════════════════════

def compute_temporal_features(bone_matrix: np.ndarray, game_idx: int) -> np.ndarray:
    """
    Features temporales para TODAS las 25 posiciones de una partida específica.
    Basadas en las partidas anteriores (0..game_idx-1).
    
    Shape: (25, n_temporal_features)
    
    Args:
        bone_matrix: Matriz (n_games, 25) de huesos
        game_idx: Índice de la partida actual (features usan partidas < game_idx)
    """
    history = bone_matrix[:game_idx]  # Solo partidas anteriores
    n_past = len(history)
    features = np.zeros((GRID_SIZE, 0), dtype=np.float32)
    feature_names = []
    
    if n_past == 0:
        # Sin historial, retornar zeros
        n_feats = len(WINDOW_SIZES) * 2 + 10  # Aproximación
        return np.zeros((GRID_SIZE, n_feats), dtype=np.float32)
    
    # ── Frecuencia de huesos en ventanas rolling ──
    for w in WINDOW_SIZES:
        window = history[-w:] if n_past >= w else history
        freq = window.mean(axis=0).reshape(-1, 1)
        features = np.hstack([features, freq])
        feature_names.append(f'bone_freq_last_{w}')
        
        # Tendencia: diferencia entre primera y segunda mitad de la ventana
        if len(window) >= 4:
            half = len(window) // 2
            first_half = window[:half].mean(axis=0)
            second_half = window[half:].mean(axis=0)
            trend = (second_half - first_half).reshape(-1, 1)
        else:
            trend = np.zeros((GRID_SIZE, 1), dtype=np.float32)
        features = np.hstack([features, trend])
        feature_names.append(f'bone_trend_last_{w}')
    
    # ── Frecuencia global ──
    global_freq = history.mean(axis=0).reshape(-1, 1)
    features = np.hstack([features, global_freq])
    feature_names.append('bone_freq_global')
    
    # ── Partidas desde el último hueso ──
    games_since_bone = np.zeros((GRID_SIZE, 1), dtype=np.float32)
    for pos in range(GRID_SIZE):
        bone_games = np.where(history[:, pos] == 1)[0]
        if len(bone_games) > 0:
            games_since_bone[pos, 0] = (n_past - 1 - bone_games[-1]) / max(n_past, 1)
        else:
            games_since_bone[pos, 0] = 1.0  # Nunca tuvo hueso
    features = np.hstack([features, games_since_bone])
    feature_names.append('games_since_last_bone_norm')
    
    # ── Racha actual (consecutiva sin hueso / con hueso) ──
    streak_no_bone = np.zeros((GRID_SIZE, 1), dtype=np.float32)
    streak_bone = np.zeros((GRID_SIZE, 1), dtype=np.float32)
    for pos in range(GRID_SIZE):
        col = history[:, pos]
        # Racha sin hueso desde el final
        streak = 0
        for g in range(n_past - 1, -1, -1):
            if col[g] == 0:
                streak += 1
            else:
                break
        streak_no_bone[pos, 0] = streak / max(n_past, 1)
        
        # Racha con hueso desde el final
        streak = 0
        for g in range(n_past - 1, -1, -1):
            if col[g] == 1:
                streak += 1
            else:
                break
        streak_bone[pos, 0] = streak / max(n_past, 1)
    
    features = np.hstack([features, streak_no_bone, streak_bone])
    feature_names.extend(['streak_no_bone_norm', 'streak_bone_norm'])
    
    # ── Was bone in last game ──
    last_game = history[-1].reshape(-1, 1)
    features = np.hstack([features, last_game])
    feature_names.append('was_bone_last_game')
    
    # ── Was bone in last 2 games (count) ──
    if n_past >= 2:
        last_2 = history[-2:].sum(axis=0).reshape(-1, 1) / 2.0
    else:
        last_2 = last_game.copy()
    features = np.hstack([features, last_2])
    feature_names.append('bone_in_last_2_games')
    
    # ── Varianza en ventana ──
    if n_past >= 5:
        variance = history[-min(20, n_past):].var(axis=0).reshape(-1, 1)
    else:
        variance = np.zeros((GRID_SIZE, 1), dtype=np.float32)
    features = np.hstack([features, variance])
    feature_names.append('bone_variance_recent')
    
    return features


TEMPORAL_FEATURE_NAMES_TEMPLATE = []
for w in WINDOW_SIZES:
    TEMPORAL_FEATURE_NAMES_TEMPLATE.extend([f'bone_freq_last_{w}', f'bone_trend_last_{w}'])
TEMPORAL_FEATURE_NAMES_TEMPLATE.extend([
    'bone_freq_global', 'games_since_last_bone_norm',
    'streak_no_bone_norm', 'streak_bone_norm',
    'was_bone_last_game', 'bone_in_last_2_games',
    'bone_variance_recent'
])


# ═══════════════════════════════════════════════════════════
# FEATURES DE VECINDAD (relaciones espaciales dinámicas)
# ═══════════════════════════════════════════════════════════

def _get_neighbors(pos_idx: int) -> list[int]:
    """Obtiene los vecinos (ortogonales + diagonales) de una posición."""
    r, c = _position_to_row_col(pos_idx)
    neighbors = []
    for dr in [-1, 0, 1]:
        for dc in [-1, 0, 1]:
            if dr == 0 and dc == 0:
                continue
            nr, nc = r + dr, c + dc
            if 0 <= nr < GRID_ROWS and 0 <= nc < GRID_COLS:
                neighbors.append(nr * GRID_COLS + nc)
    return neighbors


# Pre-computar vecinos
NEIGHBOR_MAP = {i: _get_neighbors(i) for i in range(GRID_SIZE)}


def compute_neighbor_features(bone_matrix: np.ndarray, game_idx: int) -> np.ndarray:
    """
    Features basadas en los vecinos de cada posición en partidas anteriores.
    Shape: (25, n_neighbor_features)
    """
    history = bone_matrix[:game_idx]
    n_past = len(history)
    
    if n_past == 0:
        return np.zeros((GRID_SIZE, 4), dtype=np.float32)
    
    features = []
    
    for pos in range(GRID_SIZE):
        neighbors = NEIGHBOR_MAP[pos]
        n_neighbors = len(neighbors)
        
        # Huesos de vecinos en última partida
        if n_past > 0:
            neighbor_bones_last = sum(history[-1, n] for n in neighbors) / n_neighbors
        else:
            neighbor_bones_last = 0.0
        
        # Promedio huesos de vecinos en últimas 5 partidas
        window = history[-min(5, n_past):]
        neighbor_bone_avg = np.mean([window[:, n].mean() for n in neighbors])
        
        # Correlación con vecinos (¿tienden a ser hueso juntos?)
        if n_past >= 5:
            col = history[-20:, pos] if n_past >= 20 else history[:, pos]
            neighbor_cols = np.array([
                history[-20:, n] if n_past >= 20 else history[:, n]
                for n in neighbors
            ])
            # Correlación promedio
            if col.std() > 0 and neighbor_cols.std() > 0:
                correlations = []
                for nc in neighbor_cols:
                    if nc.std() > 0:
                        correlations.append(np.corrcoef(col, nc)[0, 1])
                neighbor_corr = np.mean(correlations) if correlations else 0.0
            else:
                neighbor_corr = 0.0
        else:
            neighbor_corr = 0.0
        
        # Densidad de huesos en la fila/columna
        r, c = _position_to_row_col(pos)
        row_positions = [r * GRID_COLS + cc for cc in range(GRID_COLS)]
        col_positions = [rr * GRID_COLS + c for rr in range(GRID_ROWS)]
        
        if n_past > 0:
            row_density = np.mean([history[-1, p] for p in row_positions])
            col_density = np.mean([history[-1, p] for p in col_positions])
        else:
            row_density = 0.0
            col_density = 0.0
        
        features.append([
            neighbor_bones_last,
            neighbor_bone_avg,
            float(np.clip(neighbor_corr, -1, 1)),
            (row_density + col_density) / 2.0
        ])
    
    return np.array(features, dtype=np.float32)


NEIGHBOR_FEATURE_NAMES = [
    'neighbor_bones_last_game',
    'neighbor_bones_avg_5',
    'neighbor_correlation',
    'row_col_density_last'
]


# ═══════════════════════════════════════════════════════════
# FEATURES DE TRANSICIÓN (patrones entre partidas consecutivas)
# ═══════════════════════════════════════════════════════════

def compute_transition_features(bone_matrix: np.ndarray, game_idx: int) -> np.ndarray:
    """
    Patrones de cómo se mueven los huesos entre partidas consecutivas.
    Shape: (25, n_transition_features)
    """
    history = bone_matrix[:game_idx]
    n_past = len(history)
    
    if n_past < 2:
        return np.zeros((GRID_SIZE, 6), dtype=np.float32)
    
    features = []
    
    for pos in range(GRID_SIZE):
        col = history[:, pos]
        
        # Probabilidad de transición: P(bone_t | bone_{t-1})
        transitions_bb = 0  # bone → bone
        transitions_bc = 0  # bone → chicken
        transitions_cb = 0  # chicken → bone
        transitions_cc = 0  # chicken → chicken
        
        for t in range(1, n_past):
            prev, curr = col[t-1], col[t]
            if prev == 1 and curr == 1:
                transitions_bb += 1
            elif prev == 1 and curr == 0:
                transitions_bc += 1
            elif prev == 0 and curr == 1:
                transitions_cb += 1
            else:
                transitions_cc += 1
        
        total_from_bone = transitions_bb + transitions_bc
        total_from_chicken = transitions_cb + transitions_cc
        
        p_bone_given_bone = transitions_bb / max(total_from_bone, 1)
        p_bone_given_chicken = transitions_cb / max(total_from_chicken, 1)
        p_stay = (transitions_bb + transitions_cc) / max(n_past - 1, 1)
        p_change = 1.0 - p_stay
        
        # Entropía de transición
        probs = [p for p in [p_bone_given_bone, 1 - p_bone_given_bone] if p > 0]
        entropy_bone = -sum(p * np.log2(p) for p in probs) if probs else 0
        
        probs = [p for p in [p_bone_given_chicken, 1 - p_bone_given_chicken] if p > 0]
        entropy_chicken = -sum(p * np.log2(p) for p in probs) if probs else 0
        
        features.append([
            p_bone_given_bone,
            p_bone_given_chicken,
            p_stay,
            p_change,
            entropy_bone,
            entropy_chicken
        ])
    
    return np.array(features, dtype=np.float32)


TRANSITION_FEATURE_NAMES = [
    'p_bone_given_bone',
    'p_bone_given_chicken',
    'p_stay_same',
    'p_change',
    'transition_entropy_from_bone',
    'transition_entropy_from_chicken'
]


# ═══════════════════════════════════════════════════════════
# FEATURES GLOBALES DE LA PARTIDA (contexto general)
# ═══════════════════════════════════════════════════════════

def compute_global_features(bone_matrix: np.ndarray, game_idx: int) -> np.ndarray:
    """
    Features globales (no específicas de posición, se repiten para las 25).
    Capturan el estado general del sistema.
    Shape: (25, n_global_features) - mismos valores para las 25 posiciones.
    """
    history = bone_matrix[:game_idx]
    n_past = len(history)
    
    if n_past == 0:
        return np.zeros((GRID_SIZE, 8), dtype=np.float32)
    
    # Entropía global de la última partida (dispersión de huesos)
    last = history[-1]
    bone_count = last.sum()
    positions_entropy = 0.0
    if bone_count > 0:
        # Entropía de la distribución de huesos
        p = last / max(last.sum(), 1)
        p = p[p > 0]
        positions_entropy = -np.sum(p * np.log2(p))
    
    # Similitud entre últimas partidas (¿los huesos se repiten?)
    if n_past >= 2:
        similarity_last_2 = np.sum(history[-1] == history[-2]) / GRID_SIZE
    else:
        similarity_last_2 = 0.5
    
    if n_past >= 3:
        similarity_last_3 = np.mean([
            np.sum(history[-1] == history[-i]) / GRID_SIZE
            for i in range(2, min(4, n_past + 1))
        ])
    else:
        similarity_last_3 = 0.5
    
    # Concentración espacial (¿están los huesos agrupados o dispersos?)
    if n_past > 0:
        bone_positions = np.where(history[-1] == 1)[0]
        if len(bone_positions) >= 2:
            coords = np.array([_position_to_row_col(p) for p in bone_positions])
            centroid = coords.mean(axis=0)
            spread = np.mean(np.sqrt(np.sum((coords - centroid)**2, axis=1))) / 3.0
        else:
            spread = 0.5
    else:
        spread = 0.5
    
    # Cambio total entre últimas partidas
    if n_past >= 2:
        hamming_dist = np.sum(history[-1] != history[-2]) / GRID_SIZE
    else:
        hamming_dist = 0.5
    
    # Proporción de posiciones "calientes" (>20% bone rate en últimas 10)
    window = history[-min(10, n_past):]
    hot_ratio = np.sum(window.mean(axis=0) > 0.25) / GRID_SIZE
    cold_ratio = np.sum(window.mean(axis=0) < 0.10) / GRID_SIZE
    
    # Game index normalizado (progreso temporal)
    game_progress = game_idx / max(n_past + 50, 1)
    
    # Autocorrelación global (¿las partidas son más parecidas a las recientes?)
    if n_past >= 5:
        auto_corr = np.corrcoef(
            history[-1].flatten(), 
            history[-2].flatten()
        )[0, 1] if history[-1].std() > 0 and history[-2].std() > 0 else 0.0
    else:
        auto_corr = 0.0
    
    global_feats = np.array([
        positions_entropy,
        similarity_last_2,
        similarity_last_3,
        spread,
        hamming_dist,
        hot_ratio,
        cold_ratio,
        float(np.clip(auto_corr, -1, 1))
    ], dtype=np.float32)
    
    # Repetir para las 25 posiciones
    return np.tile(global_feats, (GRID_SIZE, 1))


GLOBAL_FEATURE_NAMES = [
    'global_entropy', 'similarity_last_2', 'similarity_last_3',
    'bone_spread', 'hamming_dist_last',
    'hot_positions_ratio', 'cold_positions_ratio',
    'autocorrelation_lag1'
]


# ═══════════════════════════════════════════════════════════
# GENERADOR DE DATASET COMPLETO
# ═══════════════════════════════════════════════════════════

ALL_FEATURE_NAMES = (
    SPATIAL_FEATURE_NAMES +
    TEMPORAL_FEATURE_NAMES_TEMPLATE +
    NEIGHBOR_FEATURE_NAMES +
    TRANSITION_FEATURE_NAMES +
    GLOBAL_FEATURE_NAMES +
    PATTERN_FEATURE_NAMES +
    HOT_STREAK_FEATURE_NAMES +
    DYNAMIC_PAIR_FEATURE_NAMES
)


def build_dataset(
    bone_matrix: np.ndarray,
    start_idx: int = 1,
    end_idx: Optional[int] = None
) -> tuple[np.ndarray, np.ndarray, list[int]]:
    """
    Construye el dataset completo de features para entrenar/evaluar modelos.
    
    Cada fila = (features de posición P en partida G) → target (¿es hueso?)
    
    Args:
        bone_matrix: Matriz (n_games, 25) de huesos
        start_idx: Primera partida a incluir como target (usa anteriores como historial)
        end_idx: Última partida (exclusive)
    
    Returns:
        X: Features (n_samples, n_features) donde n_samples = n_games_used * 25
        y: Targets (n_samples,) — 1=bone, 0=chicken
        game_indices: Índice de partida de cada muestra
    """
    if end_idx is None:
        end_idx = len(bone_matrix)
    
    spatial = compute_spatial_features()  # (25, 15) — estáticas
    
    all_X = []
    all_y = []
    all_game_idx = []
    
    for g in range(max(start_idx, 1), end_idx):
        temporal = compute_temporal_features(bone_matrix, g)
        neighbor = compute_neighbor_features(bone_matrix, g)
        transition = compute_transition_features(bone_matrix, g)
        global_feat = compute_global_features(bone_matrix, g)
        pattern_feat = compute_pattern_features(bone_matrix, g)
        hot_streak_feat = compute_hot_streak_features(bone_matrix, g)
        dynamic_pair_feat = compute_dynamic_pair_features(bone_matrix, g)
        
        # Concatenar todas las features para las 25 posiciones
        X_game = np.hstack([spatial, temporal, neighbor, transition, global_feat, pattern_feat, hot_streak_feat, dynamic_pair_feat])
        y_game = bone_matrix[g]  # Target: configuración real de huesos
        
        all_X.append(X_game)
        all_y.append(y_game)
        all_game_idx.extend([g] * GRID_SIZE)
    
    X = np.vstack(all_X)
    y = np.concatenate(all_y)
    
    logger.info(
        f"Dataset construido: {X.shape[0]} muestras, {X.shape[1]} features, "
        f"partidas {start_idx}→{end_idx-1}, bone_rate={y.mean():.3f}"
    )
    
    return X, y, all_game_idx


def build_features_for_prediction(
    bone_matrix: np.ndarray,
) -> np.ndarray:
    """
    Genera features para predecir la PRÓXIMA partida (la que aún no se jugó).
    Usa todo el historial disponible.
    
    Returns:
        X: (25, n_features) — una fila por posición
    """
    n_games = len(bone_matrix)
    spatial = compute_spatial_features()
    temporal = compute_temporal_features(bone_matrix, n_games)
    neighbor = compute_neighbor_features(bone_matrix, n_games)
    transition = compute_transition_features(bone_matrix, n_games)
    global_feat = compute_global_features(bone_matrix, n_games)
    pattern_feat = compute_pattern_features(bone_matrix, n_games)
    hot_streak_feat = compute_hot_streak_features(bone_matrix, n_games)
    dynamic_pair_feat = compute_dynamic_pair_features(bone_matrix, n_games)
    
    X = np.hstack([spatial, temporal, neighbor, transition, global_feat, pattern_feat, hot_streak_feat, dynamic_pair_feat])
    return X
