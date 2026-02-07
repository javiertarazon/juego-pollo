"""
NUEVAS FEATURES BASADAS EN ANÁLISIS DE PATRONES - Chicken Game
═══════════════════════════════════════════════════════════════

Estas features se derivan del análisis profundo de 150 partidas reales limpias.
Deben integrarse al feature_engineering.py existente para mejorar la predicción.

HALLAZGOS CLAVE del análisis:
─────────────────────────────────────────────────────────────
1. Inversión Pollo↔Hueso: 13.34% por transición (~3.3 posiciones cambian/partida)
2. Solo 0.66 huesos promedio se repiten de partida anterior
3. 46.3% de las veces NO se repite ningún hueso
4. 85.3% de partidas tienen al menos 2 huesos adyacentes
5. Posiciones más volátiles: 24, 2, 8, 14, 13 (>32% cambio)
6. Posiciones más estables: 19, 6, 1, 25, 5 (<22% cambio)
7. Pares de huesos frecuentes: 2-22, 8-12, 7-14, 14-23
8. Columna 2 tiene 18.9% huesos vs Columna 1 con 13.5%
9. Cash out tras 3 pollos: 78.9% de los retiros exitosos
10. Huesos tienden a migrar de bordes a bordes (49.7%)
"""

import json
import numpy as np
from pathlib import Path
from loguru import logger

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def load_exported_patterns():
    """Carga los patrones exportados por export-ml-data.js"""
    patterns = {}
    for fname in ["position_stats.json", "bone_patterns.json", "transitions.json"]:
        fpath = DATA_DIR / fname
        if fpath.exists():
            with open(fpath) as f:
                patterns[fname.replace(".json", "")] = json.load(f)
            logger.info(f"Cargado {fname}")
    return patterns


def compute_pattern_features(bone_matrix: np.ndarray, game_idx: int) -> np.ndarray:
    """
    Features NUEVAS basadas en los patrones descubiertos en el análisis.
    Complementan las features existentes en feature_engineering.py.
    
    Shape: (25, n_pattern_features)
    
    Nuevas features por posición:
    1. volatility_score: Qué tan volátil es esta posición (cambios históricos)
    2. pair_danger_score: Score basado en pares frecuentes de huesos
    3. adjacency_bone_pressure: Presión de huesos adyacentes en partida anterior
    4. zone_migration_prob: Probabilidad de migración de huesos desde la zona
    5. inversion_momentum: Tendencia de inversión pollo↔hueso
    6. repetition_score: Probabilidad de que el hueso se repita
    7. cluster_score: ¿Los huesos tienden a agruparse en esta zona?
    8. column_bias: Sesgo de columna (col 2 tiene más huesos que col 1)
    """
    history = bone_matrix[:game_idx]
    n_past = len(history)
    GRID = 25
    
    if n_past < 3:
        return np.zeros((GRID, 8), dtype=np.float32)
    
    features = np.zeros((GRID, 8), dtype=np.float32)
    
    # Pre-computar
    last_game = history[-1]
    last_bones = set(np.where(last_game == 1)[0])
    
    # ── 1. Volatility Score ──
    # Cuántas veces cambió de estado en las últimas 20 partidas
    window = history[-min(20, n_past):]
    for pos in range(GRID):
        changes = sum(1 for i in range(1, len(window)) if window[i, pos] != window[i-1, pos])
        features[pos, 0] = changes / max(len(window) - 1, 1)
    
    # ── 2. Pair Danger Score ──
    # Si pos X fue hueso, ¿cuántas veces pos Y también fue hueso?
    pair_matrix = np.zeros((GRID, GRID), dtype=np.float32)
    for g in range(n_past):
        bones = np.where(history[g] == 1)[0]
        for i in range(len(bones)):
            for j in range(i + 1, len(bones)):
                pair_matrix[bones[i], bones[j]] += 1
                pair_matrix[bones[j], bones[i]] += 1
    
    pair_matrix /= max(n_past, 1)
    
    for pos in range(GRID):
        # Score: si algún vecino frecuente fue hueso en la última partida
        danger = sum(pair_matrix[pos, b] for b in last_bones if b != pos)
        features[pos, 1] = danger / max(len(last_bones), 1)
    
    # ── 3. Adjacency Bone Pressure ──
    for pos in range(GRID):
        r, c = pos // 5, pos % 5
        adj_bone_count = 0
        adj_total = 0
        for dr in [-1, 0, 1]:
            for dc in [-1, 0, 1]:
                if dr == 0 and dc == 0:
                    continue
                nr, nc = r + dr, c + dc
                if 0 <= nr < 5 and 0 <= nc < 5:
                    adj_idx = nr * 5 + nc
                    adj_total += 1
                    if last_game[adj_idx] == 1:
                        adj_bone_count += 1
        features[pos, 2] = adj_bone_count / max(adj_total, 1)
    
    # ── 4. Zone Migration Probability ──
    # Esquinas=0, Bordes=1, Centro=2
    def get_zone(idx):
        r, c = idx // 5, idx % 5
        if (r in (0, 4)) and (c in (0, 4)):
            return 0  # esquina
        elif r in (0, 4) or c in (0, 4):
            return 1  # borde
        else:
            return 2  # centro
    
    if n_past >= 2:
        migration = np.zeros((3, 3), dtype=np.float32)
        for g in range(1, n_past):
            prev_bones = np.where(history[g-1] == 1)[0]
            curr_bones = np.where(history[g] == 1)[0]
            for pb in prev_bones:
                for cb in curr_bones:
                    migration[get_zone(pb), get_zone(cb)] += 1
        
        # Normalizar por fila
        for z in range(3):
            row_sum = migration[z].sum()
            if row_sum > 0:
                migration[z] /= row_sum
        
        # Para cada posición, probabilidad de recibir hueso desde zona de huesos anteriores
        for pos in range(GRID):
            target_zone = get_zone(pos)
            prob = sum(migration[get_zone(b), target_zone] for b in last_bones)
            features[pos, 3] = prob / max(len(last_bones), 1)
    
    # ── 5. Inversion Momentum ──
    # En las últimas N partidas, ¿esta posición viene alternando?
    window = history[-min(10, n_past):]
    for pos in range(GRID):
        inversions = sum(1 for i in range(1, len(window)) if window[i, pos] != window[i-1, pos])
        # Momentum alto = cambia mucho = difícil predecir
        features[pos, 4] = inversions / max(len(window) - 1, 1)
        # Si terminó en hueso y viene alternando mucho, próxima prob es chicken
        if len(window) >= 2 and window[-1, pos] == 1 and inversions > len(window) * 0.4:
            features[pos, 4] *= -1  # Señal de que va a cambiar
    
    # ── 6. Repetition Score ──
    # ¿Qué tan probable es que el hueso se repita en esta posición?
    if n_past >= 2:
        for pos in range(GRID):
            repeats = sum(1 for i in range(1, n_past) if history[i, pos] == 1 and history[i-1, pos] == 1)
            bone_occasions = sum(1 for i in range(n_past - 1) if history[i, pos] == 1)
            features[pos, 5] = repeats / max(bone_occasions, 1)
    
    # ── 7. Cluster Score ──
    # ¿Los huesos de la última partida estaban agrupados? Si sí, ¿tendencia a dispersarse?
    if last_bones:
        bone_coords = np.array([(b // 5, b % 5) for b in last_bones])
        centroid = bone_coords.mean(axis=0)
        for pos in range(GRID):
            r, c = pos // 5, pos % 5
            dist_to_centroid = np.sqrt((r - centroid[0])**2 + (c - centroid[1])**2)
            # Si los huesos estaban agrupados, los nuevos tienden a ir lejos
            spread = np.mean(np.sqrt(np.sum((bone_coords - centroid)**2, axis=1)))
            if spread < 1.5:  # Agrupados
                features[pos, 6] = 1.0 - min(dist_to_centroid / 3.0, 1.0)  # Lejos = menos prob
            else:  # Dispersos
                features[pos, 6] = dist_to_centroid / 4.0  # Puede ir a cualquier lado
    
    # ── 8. Column Bias ──
    # Sesgo histórico de la columna (columna 2 = más huesos históricamente)
    for pos in range(GRID):
        col = pos % 5
        col_positions = [r * 5 + col for r in range(5)]
        col_bone_rate = history[:, col_positions].mean()
        features[pos, 7] = col_bone_rate
    
    return features


PATTERN_FEATURE_NAMES = [
    'volatility_score',
    'pair_danger_score',
    'adjacency_bone_pressure',
    'zone_migration_prob',
    'inversion_momentum',
    'repetition_score',
    'cluster_score',
    'column_bias',
]


# ═══════════════════════════════════════════════════════════
# FEATURES DE HOT STREAKS TEMPORALES (Tarea 2.2)
# ═══════════════════════════════════════════════════════════

def compute_hot_streak_features(bone_matrix: np.ndarray, game_idx: int) -> np.ndarray:
    """
    Features de "rachas calientes/frías" por posición.
    
    Hallazgo clave: las posiciones que llevan N partidas sin hueso 
    tienen mayor probabilidad de recibirlo (racha promedio sin hueso = 3-5 partidas).
    
    Features (por posición):
    1. cold_streak_length: Cuántas partidas consecutivas SIN hueso (normalizado)
    2. hot_streak_length: Cuántas partidas consecutivas CON hueso (normalizado)
    3. streak_break_probability: P(que se rompa la racha actual)
    4. avg_streak_length: Longitud promedio de rachas históricas
    5. time_since_last_flip: Partidas desde último cambio de estado
    6. flip_frequency_recent: Frecuencia de cambios en últimas 10 partidas
    
    Shape: (25, 6)
    """
    history = bone_matrix[:game_idx]
    n_past = len(history)
    GRID = 25
    
    if n_past < 2:
        return np.zeros((GRID, 6), dtype=np.float32)
    
    features = np.zeros((GRID, 6), dtype=np.float32)
    
    for pos in range(GRID):
        col = history[:, pos]
        
        # 1. Cold streak: partidas consecutivas SIN hueso desde el final
        cold_streak = 0
        for g in range(n_past - 1, -1, -1):
            if col[g] == 0:
                cold_streak += 1
            else:
                break
        features[pos, 0] = min(cold_streak / 10.0, 1.0)
        
        # 2. Hot streak: partidas consecutivas CON hueso desde el final
        hot_streak = 0
        for g in range(n_past - 1, -1, -1):
            if col[g] == 1:
                hot_streak += 1
            else:
                break
        features[pos, 1] = min(hot_streak / 5.0, 1.0)
        
        # 3. Streak break probability: basado en rachas históricas
        # Calcular todas las rachas de "sin hueso"
        streaks_no_bone = []
        streaks_bone = []
        current_streak = 0
        current_val = col[0]
        for g in range(1, n_past):
            if col[g] == current_val:
                current_streak += 1
            else:
                if current_val == 0:
                    streaks_no_bone.append(current_streak + 1)
                else:
                    streaks_bone.append(current_streak + 1)
                current_streak = 0
                current_val = col[g]
        
        # Probabilidad de que la racha actual se rompa
        if col[-1] == 0 and streaks_no_bone:
            avg_no_bone_streak = np.mean(streaks_no_bone)
            # Si la racha actual supera el promedio, mayor prob de romperse
            features[pos, 2] = min(cold_streak / max(avg_no_bone_streak, 1), 1.0)
        elif col[-1] == 1 and streaks_bone:
            avg_bone_streak = np.mean(streaks_bone)
            features[pos, 2] = min(hot_streak / max(avg_bone_streak, 1), 1.0)
        
        # 4. Longitud promedio de rachas
        all_streaks = streaks_no_bone + streaks_bone
        features[pos, 3] = np.mean(all_streaks) / 10.0 if all_streaks else 0.3
        
        # 5. Time since last flip (cambio de estado)
        time_since_flip = 0
        for g in range(n_past - 1, 0, -1):
            if col[g] != col[g-1]:
                break
            time_since_flip += 1
        features[pos, 4] = min(time_since_flip / 10.0, 1.0)
        
        # 6. Flip frequency en últimas 10 partidas
        window = col[-min(10, n_past):]
        flips = sum(1 for i in range(1, len(window)) if window[i] != window[i-1])
        features[pos, 5] = flips / max(len(window) - 1, 1)
    
    return features


HOT_STREAK_FEATURE_NAMES = [
    'cold_streak_length',
    'hot_streak_length', 
    'streak_break_probability',
    'avg_streak_length',
    'time_since_last_flip',
    'flip_frequency_recent',
]


# ═══════════════════════════════════════════════════════════
# FEATURES DE PARES DINÁMICOS (Tarea 2.3)
# ═══════════════════════════════════════════════════════════

# Top 20 pares de huesos más frecuentes (pre-computados del análisis)
TOP_BONE_PAIRS = [
    (2, 22), (8, 12), (7, 14), (14, 23), (22, 24),
    (2, 8), (7, 22), (12, 14), (2, 14), (8, 24),
    (13, 22), (2, 13), (7, 24), (8, 22), (12, 22),
    (14, 24), (2, 7), (13, 14), (7, 12), (8, 14),
]


def compute_dynamic_pair_features(bone_matrix: np.ndarray, game_idx: int) -> np.ndarray:
    """
    Features basadas en pares frecuentes de huesos.
    
    Si la posición A fue hueso en la partida anterior y (A, B) es un par frecuente,
    entonces B tiene mayor probabilidad de ser hueso.
    
    Features (por posición):
    1. pair_trigger_score: Cuántos pares frecuentes se "activan" desde la partida anterior
    2. pair_co_occurrence_recent: Co-ocurrencia con huesos de la partida anterior en últimas 20
    3. pair_conditional_prob: P(pos es hueso | algún compañero de par fue hueso)
    4. top_pair_active: ¿El par más frecuente de esta posición está activo?
    
    Shape: (25, 4)
    """
    history = bone_matrix[:game_idx]
    n_past = len(history)
    GRID = 25
    
    if n_past < 3:
        return np.zeros((GRID, 4), dtype=np.float32)
    
    features = np.zeros((GRID, 4), dtype=np.float32)
    last_bones = set(np.where(history[-1] == 1)[0])
    
    # Pre-computar pares dinámicos actualizados del historial
    pair_counts = np.zeros((GRID, GRID), dtype=np.float32)
    for g in range(n_past):
        bones = np.where(history[g] == 1)[0]
        for i in range(len(bones)):
            for j in range(i + 1, len(bones)):
                pair_counts[bones[i], bones[j]] += 1
                pair_counts[bones[j], bones[i]] += 1
    pair_counts /= max(n_past, 1)
    
    # Pre-computar probabilidad condicional
    # P(pos=hueso | companion=hueso en partida anterior)
    cond_counts = np.zeros((GRID, GRID), dtype=np.float32)  # [pos, companion]
    cond_totals = np.zeros(GRID, dtype=np.float32)
    
    for g in range(1, n_past):
        prev_bones = set(np.where(history[g-1] == 1)[0])
        curr_bones = set(np.where(history[g] == 1)[0])
        for comp in prev_bones:
            cond_totals[comp] += 1
            for pos in curr_bones:
                cond_counts[pos, comp] += 1
    
    for pos in range(GRID):
        # 1. Pair trigger score
        trigger_score = 0
        for (a, b) in TOP_BONE_PAIRS:
            a_idx, b_idx = a - 1, b - 1  # Convert 1-indexed to 0-indexed
            if pos == a_idx and b_idx in last_bones:
                trigger_score += pair_counts[a_idx, b_idx]
            elif pos == b_idx and a_idx in last_bones:
                trigger_score += pair_counts[a_idx, b_idx]
        features[pos, 0] = min(trigger_score, 1.0)
        
        # 2. Co-occurrence score con huesos de la partida anterior
        window = history[-min(20, n_past):]
        co_occ = 0
        for b in last_bones:
            if b != pos:
                # En cuántas partidas de la ventana ambos fueron hueso
                both_bone = np.sum((window[:, pos] == 1) & (window[:, b] == 1))
                co_occ += both_bone / len(window)
        features[pos, 1] = co_occ / max(len(last_bones), 1)
        
        # 3. Conditional probability
        if last_bones:
            cond_probs = []
            for comp in last_bones:
                if cond_totals[comp] > 0:
                    cond_probs.append(cond_counts[pos, comp] / cond_totals[comp])
            features[pos, 2] = np.mean(cond_probs) if cond_probs else 0.16
        
        # 4. Top pair active
        best_pair_score = 0
        for (a, b) in TOP_BONE_PAIRS[:5]:  # Solo top 5
            a_idx, b_idx = a - 1, b - 1
            if pos == a_idx and b_idx in last_bones:
                best_pair_score = max(best_pair_score, pair_counts[a_idx, b_idx])
            elif pos == b_idx and a_idx in last_bones:
                best_pair_score = max(best_pair_score, pair_counts[a_idx, b_idx])
        features[pos, 3] = min(best_pair_score, 1.0)
    
    return features


DYNAMIC_PAIR_FEATURE_NAMES = [
    'pair_trigger_score',
    'pair_co_occurrence_recent',
    'pair_conditional_prob',
    'top_pair_active',
]
