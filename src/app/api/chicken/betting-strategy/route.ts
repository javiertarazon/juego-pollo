import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Growth factors for each position (from advanced analysis)
const GROWTH_FACTORS: Record<number, number> = {
  1: 1.17, 2: 1.41, 3: 1.71, 4: 2.09, 5: 2.58,
  6: 3.17, 7: 3.90, 8: 4.79, 9: 5.88, 10: 7.22,
  11: 8.87, 12: 10.89, 13: 13.37, 14: 16.42, 15: 20.16,
  16: 24.76, 17: 30.41, 18: 37.35, 19: 45.88, 20: 56.32,
};

export async function POST(request: NextRequest) {
  try {
    const { boneCount = 4 } = await request.json();

    // Get last 50 REAL games for win/loss streak analysis
    const recentGames = await db.chickenGame.findMany({
      where: {
        boneCount,
        isSimulated: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Get user's current streak
    const streakData = calculateCurrentStreak(recentGames);

    // Get advanced analysis data
    const advancedAnalysisResponse = await fetch(
      `${request.nextUrl.origin}/api/chicken/advanced-analysis`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boneCount }),
      }
    );

    let advancedAnalysis: any = null;
    if (advancedAnalysisResponse.ok) {
      advancedAnalysis = await advancedAnalysisResponse.json();
    }

    // Calculate betting recommendation based on streak
    const bettingRecommendation = calculateBettingRecommendation(
      streakData,
      advancedAnalysis?.riskManagement || {}
    );

    // Get position stats
    const positionStats = await db.chickenPositionStats.findMany({
      where: { isSimulated: false },
    });

    // Calculate position recommendations
    const positionRecommendations = calculatePositionRecommendations(
      positionStats,
      advancedAnalysis,
      recentGames
    );

    return NextResponse.json({
      streak: {
        currentWins: streakData.consecutiveWins,
        currentLosses: streakData.consecutiveLosses,
        last5Games: streakData.last5Games,
        last10Games: streakData.last10Games,
      },
      betting: bettingRecommendation,
      positions: positionRecommendations,
      optimalStrategy: advancedAnalysis?.optimalStrategy || null,
      riskManagement: advancedAnalysis?.riskManagement || null,
    });
  } catch (error) {
    console.error('Error in betting strategy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

interface StreakData {
  consecutiveWins: number;
  consecutiveLosses: number;
  last5Games: { wins: number; losses: number };
  last10Games: { wins: number; losses: number };
}

function calculateCurrentStreak(games: any[]): StreakData {
  let consecutiveWins = 0;
  let consecutiveLosses = 0;

  for (const game of games) {
    const isWin = game.cashOutPosition !== null && game.cashOutPosition >= 3;
    const isLoss = game.hitBone || (game.cashOutPosition !== null && game.cashOutPosition < 3);

    if (isWin) {
      consecutiveLosses = 0;
      consecutiveWins++;
    } else if (isLoss) {
      consecutiveWins = 0;
      consecutiveLosses++;
    }
  }

  // Calculate last 5 and 10 games
  const last5Games = games.slice(0, 5).reduce(
    (acc: any, game: any) => {
      const isWin = game.cashOutPosition !== null && game.cashOutPosition >= 3;
      if (isWin) acc.wins++;
      else acc.losses++;
      return acc;
    },
    { wins: 0, losses: 0 }
  );

  const last10Games = games.slice(0, 10).reduce(
    (acc: any, game: any) => {
      const isWin = game.cashOutPosition !== null && game.cashOutPosition >= 3;
      if (isWin) acc.wins++;
      else acc.losses++;
      return acc;
    },
    { wins: 0, losses: 0 }
  );

  return {
    consecutiveWins,
    consecutiveLosses,
    last5Games,
    last10Games,
  };
}

function calculateBettingRecommendation(
  streakData: StreakData,
  riskManagement: any
) {
  let multiplier = 1.0;
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY' = 'LOW';
  let explanation = '';
  let action = 'APUESTA BASE';

  // Emergency stop after 3 consecutive losses
  if (streakData.consecutiveLosses >= 3) {
    return {
      multiplier: 0,
      riskLevel: 'EMERGENCY',
      explanation: '⚠️ EMERGENCIA: 3 o más pérdidas consecutivas. DETENER por hoy.',
      action: 'DETENER',
      recommendedBet: 0,
      minBet: 0,
      maxBet: 0,
    };
  }

  // Adjust based on consecutive wins
  if (streakData.consecutiveWins > 0) {
    multiplier = Math.min(2.0, 1.0 + (streakData.consecutiveWins * 0.15));
    riskLevel = streakData.consecutiveWins <= 2 ? 'LOW' : 'MEDIUM';
    explanation = `📈 ${streakData.consecutiveWins} victoria(s) consecutiva(s). Aumentar apuesta para aprovechar racha.`;
    action = streakData.consecutiveWins <= 2 ? 'APUESTA MODERADA' : 'APUESTA AGRESIVA';
  }

  // Adjust based on consecutive losses
  if (streakData.consecutiveLosses > 0 && streakData.consecutiveLosses < 3) {
    multiplier = Math.max(0.5, 1.0 - (streakData.consecutiveLosses * 0.2));
    riskLevel = streakData.consecutiveLosses <= 1 ? 'LOW' : 'MEDIUM';
    explanation = `📉 ${streakData.consecutiveLosses} pérdida(s) consecutiva(s). Reducir apuesta para minimizar pérdidas.`;
    action = streakData.consecutiveLosses === 1 ? 'APUESTA CONSERVADORA' : 'APUESTA MÍNIMA';
  }

  // Calculate recommended bet range based on capital
  const recommendedMinBet = riskManagement.recommendedMinBet || 0.01; // 1% of capital
  const recommendedMaxBet = riskManagement.recommendedMaxBet || 0.05; // 5% of capital

  return {
    multiplier: Math.round(multiplier * 100) / 100,
    riskLevel,
    explanation,
    action,
    recommendedBet: Math.round(multiplier * 100) / 100, // For calculation
    minBet: recommendedMinBet,
    maxBet: recommendedMaxBet,
  };
}

function calculatePositionRecommendations(
  positionStats: any[],
  advancedAnalysis: any,
  recentGames: any[]
) {
  if (!advancedAnalysis || !advancedAnalysis.cashOutAnalysis) {
    return {
      nextPosition: {
        suggested: null,
        avoid: [],
        reasons: 'Insufficient data for advanced recommendations.',
      },
      targetPositions: {
        optimal: 4,
        expectedReturn: 1.0,
        growthFactor: 2.09,
        successRate: 50,
        recommendation: 'NEUTRAL',
        alternatives: [],
      },
      explanation: 'Insufficient data for advanced recommendations.',
    };
  }

  const cashOutAnalysis = advancedAnalysis.cashOutAnalysis;
  const boneFrequency = advancedAnalysis.bonePositionFrequency || [];
  const chickenFrequency = advancedAnalysis.chickenPositionFrequency || [];

  // Find optimal cash-out position
  const optimalCashOut = cashOutAnalysis
    .filter((c: any) => c.recommendation === 'EXCELENTE' || c.recommendation === 'BUENA')
    .sort((a: any, b: any) => b.expectedReturn - a.expectedReturn)[0] || cashOutAnalysis[0];

  // Get top positions to avoid (high bone frequency)
  const positionsToAvoid = boneFrequency.slice(0, 5).map((b: any) => b.position);

  // Get top safe positions (high chicken frequency)
  const safePositions = chickenFrequency.slice(0, 10).map((c: any) => c.position);

  return {
    nextPosition: {
      suggested: safePositions[0] || null,
      avoid: positionsToAvoid,
      reasons: safePositions[0]
        ? `Posición ${safePositions[0]} tiene alta probabilidad de ser pollo. Evitar: ${positionsToAvoid.join(', ')}`
        : 'Usar estadísticas generales.',
    },
    targetPositions: {
      optimal: optimalCashOut.position,
      expectedReturn: optimalCashOut.expectedReturn,
      growthFactor: optimalCashOut.growthFactor,
      successRate: optimalCashOut.successRate,
      recommendation: optimalCashOut.recommendation,
      alternatives: cashOutAnalysis
        .filter((c: any) => c.position !== optimalCashOut.position)
        .slice(0, 2)
        .map((c: any) => ({
          position: c.position,
          expectedReturn: c.expectedReturn,
          growthFactor: c.growthFactor,
          successRate: c.successRate,
        })),
    },
    explanation: `Objetivo: Retirarse en posición ${optimalCashOut.position} con retorno esperado de ${optimalCashOut.expectedReturn}x. Esto significa que por cada $1 apostado, puedes esperar ganar $${optimalCashOut.expectedReturn.toFixed(2)} en promedio.`,
  };
}
