import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy para entrenar/registrar resultados en el ML Python.
 * 
 * POST /api/chicken/python-ml/train — Iniciar entrenamiento
 * POST /api/chicken/python-ml/result — Registrar resultado de partida
 * GET /api/chicken/python-ml/status — Estado del sistema
 * GET /api/chicken/python-ml/metrics — Métricas detalladas
 */

const PYTHON_ML_URL = process.env.PYTHON_ML_URL || "http://127.0.0.1:8100";

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "result";
    const body = await request.json().catch(() => ({}));

    let endpoint: string;
    switch (action) {
      case "train":
        endpoint = "/train";
        break;
      case "result":
        endpoint = "/result";
        break;
      default:
        return NextResponse.json({ error: `Acción desconocida: ${action}` }, { status: 400 });
    }

    const pythonResponse = await fetch(`${PYTHON_ML_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(action === "train" ? 300000 : 10000), // 5min para train
    });

    const data = await pythonResponse.json();

    return NextResponse.json(data, { status: pythonResponse.status });
  } catch (err) {
    console.error("Error en proxy Python ML:", err);
    return NextResponse.json(
      { error: "Error conectando con servicio Python ML" },
      { status: 503 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action") || "status";

    let endpoint: string;
    switch (action) {
      case "status":
        endpoint = "/status";
        break;
      case "metrics":
        endpoint = "/metrics";
        break;
      case "health":
        endpoint = "/health";
        break;
      default:
        endpoint = "/status";
    }

    const pythonResponse = await fetch(`${PYTHON_ML_URL}${endpoint}`, {
      signal: AbortSignal.timeout(5000),
    });

    const data = await pythonResponse.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Servicio Python ML no disponible" },
      { status: 503 }
    );
  }
}
