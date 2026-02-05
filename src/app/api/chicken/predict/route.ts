import { NextRequest, NextResponse } from "next/server";
import { selectPositionML, getMLStats } from "@/lib/ml/reinforcement-learning";
import { 
  selectPositionMLRentable, 
  getMLStatsRentable 
} from "@/lib/ml/reinforcement-learning-rentable";

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const positions = requestBody.revealedPositions || [];
    const tipoAsesor = requestBody.tipoAsesor || 'original'; // 'original' o 'rentable'
    const objetivoRentable = requestBody.objetivoRentable || 2; // 2 o 3 posiciones

    let prediction;
    let statistics;

    // Seleccionar asesor según configuración
    if (tipoAsesor === 'rentable') {
      prediction = await selectPositionMLRentable(positions, objetivoRentable);
      statistics = getMLStatsRentable();
      console.log(`ML RENTABLE Prediction - Position: ${prediction.position} | Strategy: ${prediction.strategy} | Objetivo: ${objetivoRentable} pos`);
    } else {
      prediction = await selectPositionML(positions);
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
