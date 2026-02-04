import { NextRequest, NextResponse } from 'next/server';
import { abTestManager } from '@/lib/ml/ab-testing';
import { monitoring, logError } from '@/lib/monitoring';

// POST /api/ml/ab-test - Create or manage A/B tests
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...params } = body;

    switch (action) {
      case 'create':
        return await createABTest(params);
      case 'start':
        return await startABTest(params);
      case 'stop':
        return await stopABTest(params);
      case 'analyze':
        return await analyzeABTest(params);
      default:
        return NextResponse.json({
          error: 'Invalid action. Supported actions: create, start, stop, analyze'
        }, { status: 400 });
    }

  } catch (error) {
    logError(error as Error, { endpoint: 'ab-test' });
    
    return NextResponse.json({
      error: 'A/B test operation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// GET /api/ml/ab-test - Get A/B test information
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const testId = searchParams.get('testId');
    const status = searchParams.get('status');

    if (testId) {
      // Get specific test summary
      const summary = await abTestManager.getTestSummary(testId);
      return NextResponse.json({
        success: true,
        test: summary,
        timestamp: new Date().toISOString(),
      });
    }

    if (status === 'active') {
      // Get all active tests
      const activeTests = await abTestManager.getActiveTests();
      return NextResponse.json({
        success: true,
        activeTests,
        count: activeTests.length,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      error: 'Please specify testId or status=active'
    }, { status: 400 });

  } catch (error) {
    logError(error as Error, { endpoint: 'ab-test-get' });
    
    return NextResponse.json({
      error: 'Failed to get A/B test information',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// Helper functions
async function createABTest(params: any) {
  const {
    name,
    description,
    trafficSplit = 0.5,
    primaryMetric = 'f1Score',
    minimumSampleSize = 100,
    controlModel,
    variantModel,
  } = params;

  if (!name || !description) {
    return NextResponse.json({
      error: 'name and description are required'
    }, { status: 400 });
  }

  if (!controlModel || !variantModel) {
    return NextResponse.json({
      error: 'controlModel and variantModel configurations are required'
    }, { status: 400 });
  }

  const testConfig = {
    id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    startDate: new Date(),
    trafficSplit,
    status: 'draft' as const,
    controlModel,
    variantModel,
    primaryMetric,
    secondaryMetrics: ['accuracy', 'precision', 'recall'],
    minimumSampleSize,
    minimumDetectableEffect: 0.05, // 5%
    statisticalPower: 0.8,
    significanceLevel: 0.05,
  };

  const testId = await abTestManager.createTest(testConfig);

  return NextResponse.json({
    success: true,
    testId,
    message: `A/B test "${name}" created successfully`,
    config: testConfig,
  });
}

async function startABTest(params: any) {
  const { testId } = params;

  if (!testId) {
    return NextResponse.json({
      error: 'testId is required'
    }, { status: 400 });
  }

  await abTestManager.startTest(testId);

  return NextResponse.json({
    success: true,
    testId,
    message: 'A/B test started successfully',
    startTime: new Date().toISOString(),
  });
}

async function stopABTest(params: any) {
  const { testId } = params;

  if (!testId) {
    return NextResponse.json({
      error: 'testId is required'
    }, { status: 400 });
  }

  const result = await abTestManager.stopTest(testId);

  return NextResponse.json({
    success: true,
    testId,
    message: 'A/B test stopped successfully',
    result,
    endTime: new Date().toISOString(),
  });
}

async function analyzeABTest(params: any) {
  const { testId } = params;

  if (!testId) {
    return NextResponse.json({
      error: 'testId is required'
    }, { status: 400 });
  }

  const result = await abTestManager.analyzeTestResults(testId);

  return NextResponse.json({
    success: true,
    testId,
    analysis: result,
    timestamp: new Date().toISOString(),
  });
}