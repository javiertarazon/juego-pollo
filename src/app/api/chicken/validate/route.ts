import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
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

    // Calculate accuracy for this game
    const predictions = await db.predictionLog.findMany({
      where: { gameId },
    });

    let correctPredictions = 0;
    let totalPredictions = predictions.length;

    predictions.forEach(pred => {
      const actualResult = actualResults.find((r: any) => r.position === pred.position);
      if (actualResult && pred.actualResult === actualResult.isChicken) {
        correctPredictions++;
      }
    });

    const gameAccuracy = totalPredictions > 0 ? correctPredictions / totalPredictions : 0;

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
      message: `Validated ${totalPredictions} predictions with ${Math.round(gameAccuracy * 100)}% accuracy`,
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

    // Get recent prediction logs for analysis
    const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
    const recentPredictions = await db.predictionLog.findMany({
      where: {
        timestamp: { gte: since },
        boneCount: validatedBoneCount || undefined,
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    // Analyze prediction distribution
    const scoreDistribution = {
      high: recentPredictions.filter(p => p.predictedScore > 80).length,
      medium: recentPredictions.filter(p => p.predictedScore >= 60 && p.predictedScore <= 80).length,
      low: recentPredictions.filter(p => p.predictedScore < 60).length,
    };

    // Position accuracy analysis
    const positionAccuracy: Record<number, { correct: number; total: number; accuracy: number }> = {};
    
    for (let pos = 1; pos <= 25; pos++) {
      const positionPreds = recentPredictions.filter(p => p.position === pos);
      const correct = positionPreds.filter(p => {
        const predicted = p.predictedScore > 65;
        return predicted === p.actualResult;
      }).length;
      
      positionAccuracy[pos] = {
        correct,
        total: positionPreds.length,
        accuracy: positionPreds.length > 0 ? correct / positionPreds.length : 0,
      };
    }

    return NextResponse.json({
      success: true,
      timeframe: `${hoursBack} hours`,
      boneCount: validatedBoneCount,
      overall: metrics,
      distribution: scoreDistribution,
      positionAccuracy,
      recentPredictionsCount: recentPredictions.length,
    });

  } catch (error) {
    logError(error as Error, { endpoint: 'validate-get' });
    
    return NextResponse.json({
      error: 'Failed to get validation statistics',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}