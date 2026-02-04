import { NextRequest, NextResponse } from "next/server";
import { selectPositionML, getMLStats } from "@/lib/ml/reinforcement-learning";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { revealedPositions = [] } = body;
    const mlResult = await selectPositionML(revealedPositions);
    const mlStats = getMLStats();
    console.log(\ ML V5: Pos \\);
    return NextResponse.json({
      success: true,
      suggestion: {
        position: mlResult.position,
        confidence: mlResult.confidence,
        strategy: mlResult.strategy,
        zone: mlResult.zone,
        qValue: mlResult.qValue.toFixed(3),
      },
      ml: {
        epsilon: mlResult.epsilon.toFixed(3),
        totalGames: mlStats.totalGames,
      },
      analysis: {
        version: 'V5_ML_REINFORCEMENT_LEARNING',
      }
    });
  } catch (error) {
    console.error(' Error ML:', error);
    return NextResponse.json({ error: 'Prediction failed' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const mlStats = getMLStats();
    return NextResponse.json({
      status: 'ready',
      version: 'V5_ML_REINFORCEMENT_LEARNING',
      ml: mlStats,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get ML stats' }, { status: 500 });
  }
}
