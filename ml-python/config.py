"""
Configuración global del microservicio ML Python.
"""
import os
from pathlib import Path

# ── Rutas ─────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
DB_PATH = PROJECT_ROOT / "db" / "custom.db"
MODELS_DIR = BASE_DIR / "saved_models"
LOGS_DIR = BASE_DIR / "logs"
DATA_DIR = BASE_DIR / "data_cache"

# Crear directorios necesarios
MODELS_DIR.mkdir(exist_ok=True)
LOGS_DIR.mkdir(exist_ok=True)
DATA_DIR.mkdir(exist_ok=True)

# ── Juego ─────────────────────────────────────────────────
GRID_SIZE = 25          # Tablero 5x5
GRID_ROWS = 5
GRID_COLS = 5
DEFAULT_BONE_COUNT = 4  # 4 huesos por partida

# ── Ventanas temporales para features ─────────────────────
WINDOW_SIZES = [3, 5, 10, 20, 50]
SEQUENCE_LENGTH = 5     # Últimas N partidas como input del LSTM (ajustado a 150 partidas limpias)

# ── Modelos ───────────────────────────────────────────────
# Random Forest (ajustado para evitar overfitting con 150 partidas)
RF_N_ESTIMATORS = 200
RF_MAX_DEPTH = 8
RF_MIN_SAMPLES_LEAF = 10

# XGBoost (ajustado para evitar overfitting con 150 partidas)
XGB_N_ESTIMATORS = 200
XGB_MAX_DEPTH = 5
XGB_LEARNING_RATE = 0.03
XGB_SUBSAMPLE = 0.7
XGB_COLSAMPLE = 0.7

# LSTM (ajustado para dataset pequeño ~150 partidas)
LSTM_HIDDEN_SIZE = 64
LSTM_NUM_LAYERS = 1
LSTM_DROPOUT = 0.4
LSTM_EPOCHS = 80
LSTM_BATCH_SIZE = 8
LSTM_LEARNING_RATE = 0.0005
LSTM_PATIENCE = 20      # Early stopping

# Ensemble
ENSEMBLE_INITIAL_WEIGHTS = {
    "random_forest": 0.30,
    "xgboost": 0.35,
    "lstm": 0.35,
}

# ── Auto-aprendizaje ─────────────────────────────────────
RETRAIN_EVERY_N_GAMES = 10       # Reentrenar cada N partidas nuevas
MIN_GAMES_FOR_TRAINING = 15      # Mínimo de partidas para entrenar (ajustado post-limpieza)
PERFORMANCE_WINDOW = 50          # Ventana para evaluar rendimiento reciente
WEIGHT_ADAPTATION_RATE = 0.05    # Velocidad de adaptación de pesos del ensemble
ERROR_MEMORY_SIZE = 200          # Cuántos errores recordar para auto-análisis

# ── Servidor ──────────────────────────────────────────────
HOST = os.getenv("ML_HOST", "127.0.0.1")
PORT = int(os.getenv("ML_PORT", "8100"))
