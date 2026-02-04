import { NextRequest, NextResponse } from 'next/server';
import { crossValidator } from '@/lib/ml/cross-validation';
import { monitoring, logError } from '@/lib/monitoring';
import { validateBoneCount } from '@/lib/validation';

// POST /api/ml/cross-validation - Perform cross-validation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { boneCount = 3, kFolds = 5, minSamplesPerFold = 50 } = body;

    // Validate inputs
    const validatedBoneCount = validateBoneCount(boneCount);
    
    if (!Number.isInteger(kFolds) || kFolds < 2 || kFolds > 10) {
      return NextResponse.json({
        error: 'Invalid kFolds: must be integer between 2 and 10'
      }, { status: 400 });
    }

    if (!Number.isInteger(minSamplesPerFold) || minSamplesPerFold < 10 || minSamplesPerFold > 1000) {
      return NextResponse.json({
        error: 'Invalid minSamplesPerFold: must be integer between 10 and 1000'
      }, { status: 400 });
    }

    console.log(`Starting cross-validation: boneCount=${validatedBoneCount}, kFolds=${kFolds}`);

    // Perform cross-validation
    const performance = await crossValidator.performCrossValidation(
      validatedBoneCount,
      kFolds,
      minSamplesPerFold
    );

    // Log results
    await monitoring.logMetric('cross_validation_completed', 1, validatedBoneCount, {
      kFolds,
      accuracy: performance.overall.accuracy,
      f1Score: performance.overall.f1Score,
    });

    return NextResponse.json({
      success: true,
      boneCount: validatedBoneCount,
      kFolds,
      performance,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logError(error as Error, { endpoint: 'cross-validation' });
    
    return NextResponse.json({
      error: 'Cross-validation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// GET /api/ml/cross-validation - Get recent cross-validation results
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const boneCount = searchParams.get('boneCount');
    
    const validatedBoneCount = boneCount ? validateBoneCount(parseInt(boneCount)) : undefined;

    // Get recent cross-validation metrics from monitoring
    const recentMetrics = await monitoring.calculateAccuracy(168, validatedBoneCount); // Last week

    return NextResponse.json({
      success: true,
      boneCount: validatedBoneCount,
      recentPerformance: recentMetrics,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logError(error as Error, { endpoint: 'cross-validation-get' });
    
    return NextResponse.json({
      error: 'Failed to get cross-validation results',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}