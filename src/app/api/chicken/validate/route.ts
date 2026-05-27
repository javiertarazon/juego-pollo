import { NextRequest, NextResponse } from 'next/server';
import { monitoring, logError } from '@/lib/monitoring';
import { validatePositions, validateBoneCount } from '@/lib/validation';

// POST /api/chicken/validate - Validate predictions against actual results
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gameId, actualResults, boneCount } = body;

    // Validate input
    if (!gameId || typeof gameId !== 'string') {
      return NextResponse.json({ 
        error: 'Invalid gameId: must be a string' 
      }, { status: 400 });
    }

    if (!actualResults || !Array.isArray(actualResults)) {
      return NextResponse.json({ 
        error: 'Invalid actualResults: must be an array' 
      }, { status: 400 });
    }

    const validatedBoneCount = validateBoneCount(boneCount);

    // Update prediction results
    const updatePromises = actualResults.map(async (result: any) => {
      const { position, isChicken } = result;
      
      try {
        validatePositions([position]);
        await monitoring.updatePredictionResult(position, isChicken, gameId);
      } catch (error) {
        console.warn(`Failed to update prediction for position ${position}:`, error);
      }
    });

    await Promise.all(updatePromises);

    // Nota: El repositorio no tiene tabla de persistencia de predicciones (predictionLog).
    // Se reportan métricas agregadas vía `monitoring.calculateAccuracy`.
    const correctPredictions = 0;
    const totalPredictions = 0;
    const gameAccuracy = 0;

    // Log game accuracy metric
    await monitoring.logMetric('game_accuracy', gameAccuracy, validatedBoneCount, {
      gameId,
      totalPredictions,
      correctPredictions,
    });

    return NextResponse.json({
      success: true,
      gameId,
      accuracy: Math.round(gameAccuracy * 100) / 100,
      totalPredictions,
      correctPredictions,
      message: 'Validación registrada (sin logs de predicción persistidos)',
    });

  } catch (error) {
    logError(error as Error, { endpoint: 'validate' });
    
    return NextResponse.json({
      error: 'Failed to validate predictions',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// GET /api/chicken/validate - Get validation statistics
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const boneCount = searchParams.get('boneCount');
    const hoursBack = parseInt(searchParams.get('hoursBack') || '24');

    const validatedBoneCount = boneCount ? validateBoneCount(parseInt(boneCount)) : undefined;

    // Get recent validation metrics
    const metrics = await monitoring.calculateAccuracy(hoursBack, validatedBoneCount);

    return NextResponse.json({
      success: true,
      timeframe: `${hoursBack} hours`,
      boneCount: validatedBoneCount,
      overall: metrics,
      note: 'Desglose por predicción no disponible (sin tabla predictionLog)',
    });

  } catch (error) {
    logError(error as Error, { endpoint: 'validate-get' });
    
    return NextResponse.json({
      error: 'Failed to get validation statistics',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
