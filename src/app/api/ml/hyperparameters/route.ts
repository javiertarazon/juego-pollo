import { NextRequest, NextResponse } from 'next/server';
import { hyperparameterOptimizer } from '@/lib/ml/hyperparameter-optimization';
import { monitoring, logError } from '@/lib/monitoring';
import { validateBoneCount } from '@/lib/validation';

// POST /api/ml/hyperparameters - Optimize hyperparameters
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      boneCount = 3, 
      maxTrials = 50, 
      optimizationType = 'bayesian',
      paramGrid 
    } = body;

    // Validate inputs
    const validatedBoneCount = validateBoneCount(boneCount);
    
    if (!Number.isInteger(maxTrials) || maxTrials < 5 || maxTrials > 200) {
      return NextResponse.json({
        error: 'Invalid maxTrials: must be integer between 5 and 200'
      }, { status: 400 });
    }

    if (!['bayesian', 'grid'].includes(optimizationType)) {
      return NextResponse.json({
        error: 'Invalid optimizationType: must be "bayesian" or "grid"'
      }, { status: 400 });
    }

    console.log(`Starting hyperparameter optimization: ${optimizationType}, boneCount=${validatedBoneCount}, maxTrials=${maxTrials}`);

    let result;
    
    if (optimizationType === 'bayesian') {
      result = await hyperparameterOptimizer.optimizeHyperparameters(
        validatedBoneCount,
        maxTrials
      );
    } else {
      if (!paramGrid) {
        return NextResponse.json({
          error: 'paramGrid is required for grid search'
        }, { status: 400 });
      }
      
      result = await hyperparameterOptimizer.gridSearch(
        validatedBoneCount,
        paramGrid
      );
    }

    // Log optimization results
    await monitoring.logMetric('hyperparameter_optimization_completed', 1, validatedBoneCount, {
      optimizationType,
      maxTrials,
      bestScore: result.bestScore,
      optimizationTime: result.optimizationTime,
      trialsCompleted: result.allTrials.length,
    });

    return NextResponse.json({
      success: true,
      boneCount: validatedBoneCount,
      optimizationType,
      result,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logError(error as Error, { endpoint: 'hyperparameter-optimization' });
    
    return NextResponse.json({
      error: 'Hyperparameter optimization failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// GET /api/ml/hyperparameters - Get recommended hyperparameters
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const boneCount = searchParams.get('boneCount');
    
    const validatedBoneCount = boneCount ? validateBoneCount(parseInt(boneCount)) : 3;

    // Get recommended parameters
    const recommendedParams = hyperparameterOptimizer.getRecommendedParams(validatedBoneCount);

    return NextResponse.json({
      success: true,
      boneCount: validatedBoneCount,
      recommendedParams,
      description: 'Pre-optimized hyperparameters based on historical performance',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logError(error as Error, { endpoint: 'hyperparameters-get' });
    
    return NextResponse.json({
      error: 'Failed to get hyperparameters',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}