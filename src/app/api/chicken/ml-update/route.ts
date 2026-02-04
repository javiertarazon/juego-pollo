import { NextRequest, NextResponse } from "next/server";
import { updateMLFromGame, getMLStats } from "@/lib/ml/reinforcement-learning";

/**
 * Endpoint para actualizar el ML después de una partida
 * POST /api/chicken/ml-update
 * Body: { position: number, wasSuccess: boolean, reward?: number }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { position, wasSuccess, reward = 1.0 } = body;

    if (!position || typeof wasSuccess !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: position, wasSuccess' },
        { status: 400 }
      );
    }

    // Actualizar ML con resultado de la partida
    await updateMLFromGame(position, wasSuccess, reward);

    // Obtener estadísticas actualizadas
    const mlStats = getMLStats();

    return NextResponse.json({
      success: true,
      message: `ML actualizado: Posición ${position} ${wasSuccess ? 'exitosa' : 'fallida'}`,
      ml: mlStats,
    });
  } catch (error) {
    console.error('Error actualizando ML:', error);
    return NextResponse.json(
      { error: 'ML update failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chicken/ml-update
 * Obtener estadísticas del ML
 */
export async function GET() {
  try {
    const mlStats = getMLStats();
    
    return NextResponse.json({
      success: true,
      ml: mlStats,
    });
  } catch (error) {
    console.error('Error obteniendo stats ML:', error);
    return NextResponse.json(
      { error: 'Failed to get ML stats', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
