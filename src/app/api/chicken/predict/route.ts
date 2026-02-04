import { NextRequest, NextResponse } from "next/server";
import { selectPositionML, getMLStats } from "@/lib/ml/reinforcement-learning";

export async function POST(request: NextRequest) {
  const requestBody = await request.json();
  const positions = requestBody.revealedPositions || [];
  const prediction = await selectPositionML(positions);
  const statistics = getMLStats();
  return NextResponse.json({
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
    },
  });
}

export async function GET() {
  const statistics = getMLStats();
  return NextResponse.json({
    status: 'ready',
    version: 'V5_ML',
    ml: statistics,
  });
}
