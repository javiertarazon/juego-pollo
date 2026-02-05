import { NextRequest, NextResponse } from "next/server";
import { selectPositionML, getMLStats } from "@/lib/ml/reinforcement-learning";

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const positions = requestBody.revealedPositions || [];

    const prediction = await selectPositionML(positions);
    const statistics = getMLStats();

    console.log("ML V5 Prediction - Position:", prediction.position, "Strategy:", prediction.strategy);

    const responseData = {
      success: true,
      suggestion: {
        position: prediction.position,
        confidence: prediction.confidence,
        strategy: prediction.strategy,
        zone: prediction.zone,
        qValue: prediction.qValue.toFixed(3),
      },
      ml: {
        epsilon: prediction.epsilon.toFixed(3),
        totalGames: statistics.totalGames,
        explorationRate: statistics.explorationCount > 0 
          ? ((statistics.explorationCount / statistics.totalGames) * 100).toFixed(1) + '%'
          : '0%',
        lastZoneUsed: statistics.lastZoneUsed,
        consecutiveSafePositions: statistics.consecutiveSafePositions,
        topPositions: statistics.topPositions.slice(0, 5),
      },
      analysis: {
        version: 'V5_ML_REINFORCEMENT_LEARNING',
        features: [
          'Epsilon-greedy con degradacion',
          'Zonas frias opuestas alternadas',
          'Memoria de secuencia (7 posiciones)',
          'Q-Learning',
        ],
      }
    };

    return NextResponse.json(responseData);

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error en prediccion ML:', errorMessage);
    
    return NextResponse.json(
      { 
        error: 'Prediction failed', 
        details: errorMessage,
        version: 'V5_ML'
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
