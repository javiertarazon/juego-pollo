"""
FastAPI Microservicio ML — Chicken Game Predictor

Endpoints:
    POST /predict       — Predecir posiciones seguras
    POST /train         — Entrenar/re-entrenar modelos
    POST /result        — Registrar resultado de partida (auto-aprendizaje)
    GET  /status        — Estado del sistema
    GET  /metrics       — Métricas detalladas
    GET  /health        — Health check
"""
import time
import asyncio
import numpy as np
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel as PydanticModel, Field
from loguru import logger


def numpy_safe(obj):
    """Convierte recursivamente tipos numpy a tipos nativos Python para JSON."""
    if isinstance(obj, dict):
        return {k: numpy_safe(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [numpy_safe(v) for v in obj]
    elif isinstance(obj, (np.integer,)):
        return int(obj)
    elif isinstance(obj, (np.floating,)):
        return float(obj)
    elif isinstance(obj, (np.bool_,)):
        return bool(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from config import HOST, PORT, LOGS_DIR
from models.ensemble import EnsemblePredictor

# ── Logging ──
logger.add(
    LOGS_DIR / "ml-server.log",
    rotation="10 MB",
    retention="7 days",
    level="INFO",
)

# ── Estado global ──
ensemble = EnsemblePredictor()
training_lock = asyncio.Lock()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown del servidor."""
    logger.info("🚀 Iniciando ML Python Server...")
    loaded = ensemble.load()
    if loaded:
        logger.info(f"✓ Modelos cargados. Partidas: {len(ensemble.bone_matrix) if ensemble.bone_matrix is not None else 0}")
    else:
        logger.info("⚠ No hay modelos guardados. Ejecuta POST /train para entrenar.")
    yield
    logger.info("🛑 Cerrando ML Python Server...")
    if ensemble.is_trained:
        ensemble.save()


app = FastAPI(
    title="Chicken ML Predictor",
    description="Microservicio ML avanzado con ensemble RF+XGBoost+LSTM para predicción de posiciones seguras",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════
# Schemas
# ═══════════════════════════════════════════════════════════

class PredictRequest(PydanticModel):
    revealed_positions: list[int] = Field(default_factory=list, alias="revealedPositions")
    n_positions: int = Field(default=5, alias="nPositions")
    
    class Config:
        populate_by_name = True


class ResultRequest(PydanticModel):
    bone_positions: list[int] = Field(..., alias="bonePositions")
    hit_bone: bool = Field(default=False, alias="hitBone")
    revealed_positions: list[int] = Field(default_factory=list, alias="revealedPositions")
    cash_out_position: int = Field(default=0, alias="cashOutPosition")
    
    class Config:
        populate_by_name = True


# ═══════════════════════════════════════════════════════════
# Endpoints
# ═══════════════════════════════════════════════════════════

@app.get("/health")
async def health_check():
    """Health check simple."""
    return {
        "status": "ok",
        "trained": ensemble.is_trained,
        "total_games": len(ensemble.bone_matrix) if ensemble.bone_matrix is not None else 0,
    }


@app.post("/predict")
async def predict(request: PredictRequest):
    """
    Predice las posiciones más seguras para la próxima jugada.
    
    Compatible con el formato del frontend Next.js.
    """
    start = time.time()
    
    result = ensemble.predict(
        revealed_positions=request.revealed_positions,
        n_positions=request.n_positions,
    )
    
    if 'error' in result and not result.get('positions'):
        raise HTTPException(status_code=503, detail=result['error'])
    
    elapsed = time.time() - start
    result['inference_time_ms'] = round(elapsed * 1000, 2)
    
    # Formato compatible con el frontend
    return JSONResponse(content=numpy_safe({
        "success": True,
        "tipoAsesor": "python-ensemble",
        **result,
    }))


@app.post("/train")
async def train():
    """
    Entrena todos los modelos con las partidas reales de la BD.
    Puede tardar 1-5 minutos dependiendo de los datos.
    """
    if training_lock.locked():
        raise HTTPException(
            status_code=409,
            detail="Ya hay un entrenamiento en curso"
        )
    
    async with training_lock:
        logger.info("Iniciando entrenamiento...")
        start = time.time()
        
        # Ejecutar en thread pool para no bloquear
        loop = asyncio.get_event_loop()
        metrics = await loop.run_in_executor(None, ensemble.train_all)
        
        elapsed = time.time() - start
        
        if 'error' in metrics:
            raise HTTPException(status_code=400, detail=metrics['error'])
        
        return JSONResponse(content=numpy_safe({
            "success": True,
            "training_time_seconds": round(elapsed, 2),
            "metrics": metrics,
        }))


@app.post("/result")
async def register_result(request: ResultRequest):
    """
    Registra el resultado de una partida real para auto-aprendizaje.
    El sistema actualiza pesos del ensemble y puede re-entrenar si es necesario.
    """
    start = time.time()
    
    result = ensemble.register_result(request.bone_positions)
    
    elapsed = time.time() - start
    result['processing_time_ms'] = round(elapsed * 1000, 2)
    
    return JSONResponse(content=numpy_safe({
        "success": True,
        **result,
    }))


@app.get("/status")
async def get_status():
    """Estado completo del sistema ML."""
    return JSONResponse(content=numpy_safe({
        "success": True,
        **ensemble.get_status(),
    }))


@app.get("/metrics")
async def get_metrics():
    """Métricas detalladas para dashboard."""
    return JSONResponse(content=numpy_safe({
        "success": True,
        **ensemble.get_metrics(),
    }))


# ═══════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    logger.info(f"Iniciando servidor en {HOST}:{PORT}")
    uvicorn.run(
        "main:app",
        host=HOST,
        port=PORT,
        reload=False,
        log_level="info",
    )
