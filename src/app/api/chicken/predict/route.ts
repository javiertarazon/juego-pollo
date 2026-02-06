import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { selectPositionML, getMLStats } from "@/lib/ml/reinforcement-learning";
import { 
  selectPositionMLRentable, 
  getMLStatsRentable 
} from "@/lib/ml/reinforcement-learning-rentable";

// Schema de validación
const requestSchema = z.object({
  revealedPositions: z
    .array(z.number().int().min(1).max(25))
    .max(24)
    .optional()
    .default([]),
  tipoAsesor: z
    .enum(['original', 'rentable'])
    .optional()
    .default('original'),
  objetivoRentable: z
    .union([z.literal(2), z.literal(3)])
    .optional()
    .default(2),
});

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    
    // Validar entrada
    const validated = requestSchema.parse(requestBody);
    const { revealedPositions, tipoAsesor, objetivoRentable } = validated;

    let prediction;
    let statistics;

    // Seleccionar asesor según configuración
    if (tipoAsesor === 'rentable') {
      prediction = await selectPositionMLRentable(revealedPositions, objetivoRentable);
      statistics = getMLStatsRentable();
      console.log(`ML RENTABLE Prediction - Position: ${prediction.position} | Strategy: ${prediction.strategy} | Objetivo: ${objetivoRentable} pos`);
    } else {
      prediction = await selectPositionML(revealedPositions);
      statistics = getMLStats();
      console.log("ML ORIGINAL Prediction - Position:", prediction.position, "Strategy:", prediction.strategy);
    }

    const responseData = {
      success: true,
      tipoAsesor,
      objetivoRentable: tipoAsesor === 'rentable' ? objetivoRentable : undefined,
      suggestion: {
        position: prediction.position,
        confidence: prediction.confidence,
        strategy: prediction.strategy,
        zone: prediction.zone || 'N/A',
        qValue: prediction.qValue?.toFixed(3) || 'N/A',
      },
      ml: {
        epsilon: prediction.epsilon?.toFixed(3) || statistics.epsilon?.toFixed(3) || 'N/A',
        totalGames: statistics.totalGames,
        explorationRate: statistics.explorationCount > 0 
          ? ((statistics.explorationCount / statistics.totalGames) * 100).toFixed(1) + '%'
          : '0%',
        lastZoneUsed: statistics.lastZoneUsed || 'N/A',
        consecutiveSafePositions: statistics.consecutiveSafePositions || 0,
        topPositions: statistics.topPositions?.slice(0, 5) || [],
        posicionesSeguras: statistics.posicionesSeguras || 0,
        posicionesPeligrosas: statistics.posicionesPeligrosas || 0,
      },
      analysis: {
        version: tipoAsesor === 'rentable' ? 'RENTABLE_2-3_POSICIONES' : 'V5_ML_REINFORCEMENT_LEARNING',
        features: tipoAsesor === 'rentable' ? [
          'Solo posiciones ultra seguras (93%+ pollos)',
          'Exploración reducida (25%)',
          'Objetivo: 2-3 posiciones',
          'Rentabilidad: 41-71% por partida',
          'Q-Learning optimizado',
        ] : [
          'Epsilon-greedy con degradacion',
          'Zonas frias opuestas alternadas',
          'Memoria de secuencia (7 posiciones)',
          'Q-Learning',
        ],
      }
    };

    return NextResponse.json(responseData);

  } catch (err) {
    // Manejo de errores de validación
    if (err instanceof z.ZodError) {
      console.error('Error de validación:', err.errors);
      return NextResponse.json(
        { 
          error: 'Validación fallida', 
          details: err.errors,
          message: 'Los parámetros de entrada no son válidos'
        },
        { status: 400 }
      );
    }
    
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error en prediccion ML:', errorMessage);
    
    return NextResponse.json(
      { 
        error: 'Prediction failed', 
        details: errorMessage,
        version: 'ML'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const statistics = getMLStats();
    
    const responseData = {
      status: 'ready',
      version: 'V5_ML_REINFORCEMENT_LEARNING',
      strategy: 'Machine Learning with Q-Learning',
      ml: statistics,
      features: [
        'Epsilon-greedy con degradacion automatica (30% -> 5%)',
        'Zonas frias opuestas (A/B) alternadas',
        'Memoria de secuencia: no repetir hasta 7 posiciones seguras despues',
        'Q-Learning: aprende de victorias y derrotas',
        'Variedad mejorada: seleccion entre top 3 posiciones',
      ],
    };

    return NextResponse.json(responseData);
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error obteniendo stats ML:', errorMessage);
    
    return NextResponse.json(
      { 
        error: 'Failed to get ML stats', 
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}
