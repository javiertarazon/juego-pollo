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
# Random Forest (más regularizado para 182 partidas)
RF_N_ESTIMATORS = 300
RF_MAX_DEPTH = 6
RF_MIN_SAMPLES_LEAF = 15

# XGBoost (más regularizado para 182 partidas)
XGB_N_ESTIMATORS = 250
XGB_MAX_DEPTH = 4
XGB_LEARNING_RATE = 0.02
XGB_SUBSAMPLE = 0.6
XGB_COLSAMPLE = 0.6

# LSTM (conservador para dataset pequeño)
LSTM_HIDDEN_SIZE = 48
LSTM_NUM_LAYERS = 1
LSTM_DROPOUT = 0.5
LSTM_EPOCHS = 100
LSTM_BATCH_SIZE = 8
LSTM_LEARNING_RATE = 0.0003
LSTM_PATIENCE = 25      # Early stopping

# Feature Selection
FEATURE_SELECTION_ENABLED = True
FEATURE_SELECTION_TOP_K = 35  # Seleccionar top 35 features de ~68 total

# Ensemble (6 modelos v2.0)
ENSEMBLE_INITIAL_WEIGHTS = {
    "random_forest": 0.20,
    "xgboost": 0.25,
    "lstm": 0.20,
    "anti_repeat": 0.15,
    "markov": 0.10,
    "dispersion": 0.10,
}

# ── Auto-aprendizaje ─────────────────────────────────────
RETRAIN_EVERY_N_GAMES = 10       # Reentrenar cada N partidas nuevas
MIN_GAMES_FOR_TRAINING = 15      # Mínimo de partidas para entrenar (ajustado post-limpieza)
PERFORMANCE_WINDOW = 30          # Ventana para evaluar rendimiento reciente (reducida para reaccionar más rápido)
WEIGHT_ADAPTATION_RATE = 0.12    # Velocidad de adaptación de pesos del ensemble (aumentada)
ERROR_MEMORY_SIZE = 200          # Cuántos errores recordar para auto-análisis
RECENT_WEIGHT_BOOST = 2.0        # Multiplicador de peso para partidas recientes en entrenamiento
RECENT_WINDOW = 30               # Cuántas partidas recientes pesar más

# ── Servidor ──────────────────────────────────────────────
HOST = os.getenv("ML_HOST", "127.0.0.1")
PORT = int(os.getenv("ML_PORT", "8100"))
