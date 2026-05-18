#!/usr/bin/env python3
"""
📥 ENTRENAR MODELO DESDE BASE DE DATOS
======================================
Lee las partidas almacenadas en SQLite y entrena el servicio ML Python.
Se ejecuta automáticamente al iniciar o manualmente.
"""

import sys
import os
import json
import sqlite3
import asyncio

# Agregar directorio actual al path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from neural_network import ChickenNeuralNetwork
from pattern_analyzer import PatternAnalyzer
from markov_predictor import MarkovPredictor
from ensemble import EnsemblePredictor

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'prisma', 'dev.db')


def load_games_from_db(limit: int = 500) -> list[dict]:
    """Cargar partidas desde la base de datos SQLite"""
    if not os.path.exists(DB_PATH):
        print(f"⚠️ Base de datos no encontrada en: {DB_PATH}")
        return []

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Obtener partidas con sus posiciones
    cursor.execute("""
        SELECT g.id, g.boneCount, g.revealedCount, g.hitBone, 
               g.cashOutPosition, g.isSimulated
        FROM ChickenGame g
        ORDER BY g.createdAt DESC
        LIMIT ?
    """, (limit,))

    games = cursor.fetchall()
    game_data = []

    for game in games:
        game_id = game['id']
        bone_count = game['boneCount']

        # Obtener posiciones de esta partida
        cursor.execute("""
            SELECT position, isChicken, revealed, revealOrder
            FROM ChickenPosition
            WHERE gameId = ?
            ORDER BY position
        """, (game_id,))

        positions = cursor.fetchall()

        bone_positions = [p['position'] for p in positions if not p['isChicken']]
        chicken_positions = [p['position'] for p in positions if p['isChicken']]
        revealed_positions = [p['position'] for p in positions 
                            if p['revealed'] and p['revealOrder'] > 0]
        revealed_positions.sort(key=lambda pos: next(
            (p['revealOrder'] for p in positions if p['position'] == pos), 0
        ))

        game_data.append({
            "bone_positions": bone_positions,
            "chicken_positions": chicken_positions,
            "revealed_positions": revealed_positions,
            "hit_bone": bool(game['hitBone']),
            "bone_count": bone_count,
            "cash_out_position": game['cashOutPosition'],
            "is_simulated": bool(game['isSimulated']),
        })

    conn.close()
    print(f"✅ {len(game_data)} partidas cargadas desde BD")
    return game_data


def train_from_db(epochs: int = 150, real_only: bool = True):
    """Entrenar modelos con datos de la BD"""
    print("\n🧠 ===== ENTRENAMIENTO DESDE BD =====\n")

    # Cargar datos
    all_games = load_games_from_db(1000)

    if not all_games:
        print("❌ No hay partidas en la BD para entrenar")
        return None

    # Filtrar solo partidas reales si se solicita
    if real_only:
        games = [g for g in all_games if not g['is_simulated']]
        print(f"📊 Partidas reales: {len(games)} de {len(all_games)}")
    else:
        games = all_games
        print(f"📊 Total de partidas: {len(games)}")

    if len(games) < 5:
        print(f"⚠️ Pocas partidas para entrenar ({len(games)}). Se necesitan al menos 5.")
        games = all_games  # Usar todas incluyendo simuladas
        print(f"📊 Usando todas las partidas: {len(games)}")

    # Inicializar modelos
    nn = ChickenNeuralNetwork()
    pa = PatternAnalyzer()
    mk = MarkovPredictor()
    ens = EnsemblePredictor()

    # Entrenar red neuronal
    print("\n🧠 Entrenando red neuronal...")
    nn_metrics = nn.train(games, epochs=epochs)
    print(f"   ✅ NN Accuracy: {nn_metrics.get('nn_accuracy', 'N/A')}")
    print(f"   ✅ RF Accuracy: {nn_metrics.get('rf_accuracy', 'N/A')}")
    print(f"   ✅ GB Accuracy: {nn_metrics.get('gb_accuracy', 'N/A')}")
    print(f"   ✅ Ensemble Accuracy: {nn_metrics.get('ensemble_accuracy', 'N/A')}")

    # Entrenar pattern analyzer
    print("\n🔍 Entrenando pattern analyzer...")
    pa_metrics = pa.train(games)
    print(f"   ✅ Juegos analizados: {pa_metrics.get('games_analyzed', 'N/A')}")
    print(f"   ✅ Posiciones calientes: {pa_metrics.get('hot_positions', 'N/A')}")
    print(f"   ✅ Rotación activa: {pa_metrics.get('rotation_active', 'N/A')}")

    # Entrenar Markov
    print("\n🔗 Entrenando cadenas de Markov...")
    mk_metrics = mk.train(games)
    print(f"   ✅ Transiciones: {mk_metrics.get('total_transitions', 'N/A')}")
    print(f"   ✅ Entropía: {mk_metrics.get('matrix_entropy', 'N/A')}")

    # Entrenar ensemble
    print("\n🎯 Configurando ensemble...")
    ens_metrics = ens.train(games, nn_model=nn, pattern_model=pa, markov_model=mk)
    print(f"   ✅ Pesos: {ens_metrics.get('weights', 'N/A')}")

    # Probar predicción
    print("\n🧪 Probando predicción...")
    test_pred = ens.predict(
        revealed_positions=[5, 10],
        bone_count=4,
        advisor_type="original",
        target_positions=2,
    )
    print(f"   Posición sugerida: {test_pred.get('position')}")
    print(f"   Confianza: {test_pred.get('confidence'):.3f}")
    print(f"   Estrategia: {test_pred.get('strategy')}")

    # Guardar modelos
    import joblib
    from pathlib import Path
    model_dir = Path(__file__).parent / "models"
    model_dir.mkdir(exist_ok=True)

    model_data = {
        "neural_network": nn,
        "pattern_analyzer": pa,
        "markov": mk,
        "ensemble": ens,
        "total_games": len(games),
        "last_training_time": str(os.popen('date').read().strip()),
        "version": "2.0.0",
    }
    joblib.dump(model_data, model_dir / "ensemble_model.pkl")
    print(f"\n💾 Modelos guardados en {model_dir}")

    print("\n✅ ===== ENTRENAMIENTO COMPLETADO =====\n")
    return nn_metrics


if __name__ == "__main__":
    epochs = int(sys.argv[1]) if len(sys.argv) > 1 else 150
    real_only = "--all" not in sys.argv
    train_from_db(epochs=epochs, real_only=real_only)
