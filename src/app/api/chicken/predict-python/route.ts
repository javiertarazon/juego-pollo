import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

/**
 * Proxy al microservicio Python ML Ensemble.
 * Reenvía la petición de predicción al servidor FastAPI en localhost:8100
 * y formatea la respuesta para que sea compatible con el frontend.
 */

const PYTHON_ML_URL = process.env.PYTHON_ML_URL || "http://127.0.0.1:8100";

const requestSchema = z.object({
  revealedPositions: z
    .array(z.number().int().min(1).max(25))
    .max(24)
    .optional()
    .default([]),
  nPositions: z.number().int().min(1).max(25).optional().default(5),
});

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const validated = requestSchema.parse(requestBody);

    // Llamar al microservicio Python
    const pythonResponse = await fetch(`${PYTHON_ML_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        revealedPositions: validated.revealedPositions,
        nPositions: validated.nPositions,
      }),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!pythonResponse.ok) {
      const errorData = await pythonResponse.json().catch(() => ({}));
      console.error("Python ML error:", errorData);

      return NextResponse.json(
        {
          success: false,
          error: errorData.detail || "Servicio Python ML no disponible",
          fallback: true,
        },
        { status: 503 }
      );
    }

    const pythonData = await pythonResponse.json();

    // Formatear respuesta compatible con el frontend existente
    const responseData = {
      success: true,
      tipoAsesor: "python-ensemble",
      suggestion: pythonData.suggestion || {
        position: pythonData.safe_positions?.[0]?.position || 0,
        confidence: pythonData.safe_positions?.[0]?.confidence || 0,
        strategy: "ENSEMBLE_ADAPTIVE",
        zone: "N/A",
        qValue: "N/A",
      },
      ml: pythonData.ml || {
        epsilon: "N/A",
        totalGames: 0,
        explorationRate: "0%",
        lastZoneUsed: "N/A",
        consecutiveSafePositions: 0,
        topPositions: [],
        posicionesSeguras: 0,
        posicionesPeligrosas: 0,
      },
      analysis: pythonData.analysis || {
        version: "Python ML Ensemble v1.0",
        features: [],
      },
      // Datos extra del Python ML
      pythonML: {
        safePositions: pythonData.safe_positions || [],
        dangerousPositions: pythonData.dangerous_positions || [],
        allPositions: pythonData.all_positions || [],
        modelContributions: pythonData.model_contributions || {},
        ensembleWeights: pythonData.ensemble_weights || {},
        inferenceTimeMs: pythonData.inference_time_ms || 0,
      },
    };

    return NextResponse.json(responseData);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validación fallida", details: err.issues },
        { status: 400 }
      );
    }

    console.error("Error en proxy Python ML:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Error conectando con servicio Python ML. ¿Está ejecutándose en puerto 8100?",
        fallback: true,
      },
      { status: 503 }
    );
  }
}

/**
 * GET /api/chicken/predict-python — Estado del servicio Python ML
 */
export async function GET() {
  try {
    const healthResponse = await fetch(`${PYTHON_ML_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });

    if (!healthResponse.ok) {
      return NextResponse.json({
        available: false,
        error: "Servicio no responde",
      });
    }

    const healthData = await healthResponse.json();

    return NextResponse.json({
      available: true,
      ...healthData,
    });
  } catch {
    return NextResponse.json({
      available: false,
      error: "Servicio Python ML no está ejecutándose",
    });
  }
}
