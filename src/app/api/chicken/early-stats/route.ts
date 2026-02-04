import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/chicken/early-stats - Get statistics for first 6 positions
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const boneCount = parseInt(searchParams.get('boneCount') || '3');

    // Get all REAL games with positions
    const games = await db.chickenGame.findMany({
      where: { isSimulated: false, boneCount },
      include: { positions: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    if (games.length === 0) {
      return NextResponse.json({
        message: 'No hay datos suficientes',
        positionStats: {},
        earlySuccessRate: 0,
      });
    }

    // Analyze success rate for each position in first 6 reveals
    const positionEarlyStats: Record<number, {
      earlyReveals: number;
      earlyChicken: number;
      earlyWinRate: number;
      earlyBonus: number;
    }> = {};

    for (let pos = 1; pos <= 25; pos++) {
      let earlyReveals = 0;
      let earlyChicken = 0;

      games.forEach(game => {
        const position = game.positions.find(p => p.position === pos);
        if (!position) return;

        // Check if this position was revealed in first 6
        const isEarlyReveal = position.revealOrder && position.revealOrder <= 6;

        if (isEarlyReveal) {
          earlyReveals++;
          if (position.isChicken) {
            earlyChicken++;
          }
        }
      });

      const earlyWinRate = earlyReveals > 0 ? earlyChicken / earlyReveals : 0;

      // Calculate bonus: higher win rate in early positions = more bonus
      const earlyBonus = earlyReveals >= 3 && earlyWinRate > 0.65
        ? (earlyWinRate - 0.5) * 40  // Up to +20 bonus
        : earlyReveals >= 5 && earlyWinRate > 0.6
        ? (earlyWinRate - 0.5) * 30  // Up to +15 bonus
        : 0;

      positionEarlyStats[pos] = {
        earlyReveals,
        earlyChicken,
        earlyWinRate,
        earlyBonus,
      };
    }

    // Calculate overall early success rate
    let totalEarlyReveals = 0;
    let totalEarlyChickens = 0;

    games.forEach(game => {
      game.positions.forEach(pos => {
        if (pos.revealOrder && pos.revealOrder <= 6) {
          totalEarlyReveals++;
          if (pos.isChicken) {
            totalEarlyChickens++;
          }
        }
      });
    });

    const overallEarlyWinRate = totalEarlyReveals > 0
      ? totalEarlyChickens / totalEarlyReveals
      : 0;

    // Find best positions for early game (first 6)
    const bestEarlyPositions = Object.entries(positionEarlyStats)
      .filter(([_, stats]) => stats.earlyReveals >= 5)
      .map(([pos, stats]) => ({
        position: parseInt(pos),
        ...stats,
        overallScore: stats.earlyWinRate * 60 + stats.earlyBonus + stats.earlyReveals * 2,
      }))
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 10);

    // Analyze positions that are BONES in early reveals (to avoid)
    const earlyBoneFrequency: Record<number, number> = {};
    games.forEach(game => {
      game.positions.forEach(pos => {
        if (pos.revealOrder && pos.revealOrder <= 6 && !pos.isChicken) {
          earlyBoneFrequency[pos.position] = (earlyBoneFrequency[pos.position] || 0) + 1;
        }
      });
    });

    const worstEarlyPositions = Object.entries(earlyBoneFrequency)
      .map(([pos, count]) => ({
        position: parseInt(pos),
        boneCount: count,
        bonePercentage: (count / games.length) * 100,
      }))
      .sort((a, b) => b.boneCount - a.boneCount)
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      boneCount,
      totalGames: games.length,
      overallEarlyWinRate: Math.round(overallEarlyWinRate * 10000) / 10000,
      positionEarlyStats,
      bestEarlyPositions,
      worstEarlyPositions,
      recommendation: {
        message: overallEarlyWinRate > 0.65
          ? 'El sistema está aprendiendo bien las primeras 6 posiciones'
          : overallEarlyWinRate > 0.55
          ? 'El aprendizaje de primeras posiciones es moderado'
          : 'Se necesitan más partidas para aprender las primeras posiciones',
        priorityPositions: bestEarlyPositions.slice(0, 3).map(p => p.position),
        avoidPositions: worstEarlyPositions.slice(0, 3).map(p => p.position),
      },
    });
  } catch (error) {
    console.error('Error getting early stats:', error);
    return NextResponse.json(
      { error: 'Failed to get early stats' },
      { status: 500 }
    );
  }
}
