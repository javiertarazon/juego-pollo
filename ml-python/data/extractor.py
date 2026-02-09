"""
Extracción de datos desde SQLite (Prisma).
Lee las 388 partidas reales con todas sus posiciones de huesos.
"""
import sqlite3
import numpy as np
import pandas as pd
from pathlib import Path
from loguru import logger

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import DB_PATH, GRID_SIZE


def get_connection() -> sqlite3.Connection:
    """Conexión a la base de datos SQLite."""
    if not DB_PATH.exists():
        raise FileNotFoundError(f"Base de datos no encontrada: {DB_PATH}")
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def load_real_games() -> pd.DataFrame:
    """
    Carga todas las partidas reales (no simuladas) ordenadas cronológicamente.
    Usa RealBonePositions (367 partidas completas) como fuente principal,
    y ChickenPosition como fallback (solo partidas con exactamente 4 huesos).
    
    Retorna DataFrame con columnas:
        game_id, created_at, bone_count, revealed_count, hit_bone,
        cash_out_position, multiplier, bone_positions (list[int])
    """
    conn = get_connection()
    
    # Obtener partidas reales ordenadas por fecha
    games_df = pd.read_sql_query("""
        SELECT 
            id as game_id,
            createdAt as created_at,
            boneCount as bone_count,
            revealedCount as revealed_count,
            hitBone as hit_bone,
            cashOutPosition as cash_out_position,
            multiplier
        FROM ChickenGame 
        WHERE isSimulated = 0
        ORDER BY createdAt ASC
    """, conn)
    
    bone_positions_map = {}
    
    # Fuente 1: RealBonePositions (datos completos, 367 partidas)
    try:
        real_bones_df = pd.read_sql_query("""
            SELECT gameId as game_id, posiciones
            FROM RealBonePositions
        """, conn)
        
        for _, row in real_bones_df.iterrows():
            try:
                import json
                positions = json.loads(row['posiciones'])
                if isinstance(positions, list) and len(positions) >= 3:
                    bone_positions_map[row['game_id']] = sorted(positions)
            except (json.JSONDecodeError, TypeError):
                pass
        
        logger.info(f"RealBonePositions: {len(bone_positions_map)} partidas con datos completos")
    except Exception as e:
        logger.warning(f"RealBonePositions no disponible: {e}")
    
    # Fuente 2: ChickenPosition (fallback, solo partidas con exactamente 4 huesos)
    positions_df = pd.read_sql_query("""
        SELECT 
            cp.gameId as game_id,
            cp.position,
            cp.isChicken
        FROM ChickenPosition cp
        JOIN ChickenGame cg ON cp.gameId = cg.id
        WHERE cg.isSimulated = 0
    """, conn)
    
    conn.close()
    
    # Complementar con ChickenPosition donde no tengamos RealBonePositions
    for game_id, group in positions_df.groupby('game_id'):
        if game_id not in bone_positions_map:
            bones = group[group['isChicken'] == 0]['position'].tolist()
            if len(bones) == 4:  # Solo partidas completas
                bone_positions_map[game_id] = sorted(bones)
    
    games_df['bone_positions'] = games_df['game_id'].map(bone_positions_map)
    
    # Limpiar partidas sin posiciones válidas
    games_df = games_df.dropna(subset=['bone_positions'])
    games_df = games_df[games_df['bone_positions'].apply(lambda x: len(x) == 4)]
    
    logger.info(f"Cargadas {len(games_df)} partidas reales con posiciones de huesos completas")
    return games_df.reset_index(drop=True)


def games_to_bone_matrix(games_df: pd.DataFrame) -> np.ndarray:
    """
    Convierte las partidas en una matriz binaria de huesos.
    Shape: (n_games, 25) donde 1 = hueso, 0 = pollo.
    Las partidas están en orden cronológico.
    """
    n_games = len(games_df)
    matrix = np.zeros((n_games, GRID_SIZE), dtype=np.float32)
    
    for i, (_, row) in enumerate(games_df.iterrows()):
        for pos in row['bone_positions']:
            if 1 <= pos <= GRID_SIZE:
                matrix[i, pos - 1] = 1.0  # Posiciones 1-25 → índices 0-24
    
    logger.info(f"Matriz de huesos: {matrix.shape}, promedio huesos/partida: {matrix.sum(axis=1).mean():.1f}")
    return matrix


def load_new_games_since(last_game_id: str) -> pd.DataFrame:
    """
    Carga partidas reales nuevas desde un game_id dado (para auto-aprendizaje).
    """
    conn = get_connection()
    
    # Obtener la fecha del último juego procesado
    cursor = conn.execute(
        "SELECT createdAt FROM ChickenGame WHERE id = ?", (last_game_id,)
    )
    row = cursor.fetchone()
    if not row:
        conn.close()
        return pd.DataFrame()
    
    last_date = row['createdAt']
    
    games_df = pd.read_sql_query("""
        SELECT 
            id as game_id,
            createdAt as created_at,
            boneCount as bone_count,
            revealedCount as revealed_count,
            hitBone as hit_bone,
            cashOutPosition as cash_out_position,
            multiplier
        FROM ChickenGame 
        WHERE isSimulated = 0 AND createdAt > ?
        ORDER BY createdAt ASC
    """, conn, params=(last_date,))
    
    if games_df.empty:
        conn.close()
        return games_df
    
    positions_df = pd.read_sql_query("""
        SELECT cp.gameId as game_id, cp.position, cp.isChicken
        FROM ChickenPosition cp
        JOIN ChickenGame cg ON cp.gameId = cg.id
        WHERE cg.isSimulated = 0 AND cg.createdAt > ?
    """, conn, params=(last_date,))
    
    conn.close()
    
    bone_positions_map = {}
    for game_id, group in positions_df.groupby('game_id'):
        bones = group[group['isChicken'] == 0]['position'].tolist()
        bone_positions_map[game_id] = sorted(bones)
    
    games_df['bone_positions'] = games_df['game_id'].map(bone_positions_map)
    games_df = games_df.dropna(subset=['bone_positions'])
    
    logger.info(f"Cargadas {len(games_df)} partidas nuevas desde {last_game_id}")
    return games_df.reset_index(drop=True)


def get_total_real_games_count() -> int:
    """Retorna el total de partidas reales en la BD."""
    conn = get_connection()
    cursor = conn.execute("SELECT COUNT(*) FROM ChickenGame WHERE isSimulated = 0")
    count = cursor.fetchone()[0]
    conn.close()
    return count
