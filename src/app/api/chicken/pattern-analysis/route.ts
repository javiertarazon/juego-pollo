import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/chicken/pattern-analysis - Analyze Mystake server behavior patterns
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { boneCount = 4, minGames = 10 } = body;

    // Get recent real games
    const recentGames = await db.chickenGame.findMany({
      where: {
        isSimulated: false,
        boneCount,
        revealedCount: { gte: 3 }, // Only analyze games that revealed at least 3 positions
      },
      include: {
        positions: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200, // Analyze last 200 games
    });

    if (recentGames.length < minGames) {
      return NextResponse.json({
        success: false,
        error: `Insufficient games. Need at least ${minGames} games, found ${recentGames.length}.`,
      }, { status: 400 });
    }

    // Analyze bone positions
    const bonePositionFrequency = new Array(25).fill(0);
    const bonePositionWinRate = new Array(25).fill(0);
    const bonePositionLastSeen = new Array(25).fill<Date | null>(null);

    recentGames.forEach((game) => {
      const bones = game.positions.filter(p => !p.isChicken).map(p => p.position);
      
      bones.forEach(bonePos => {
        bonePositionFrequency[bonePos - 1]++;
        bonePositionLastSeen[bonePos - 1] = game.createdAt;
      });
    });

    // Calculate win rate for each position (chicken vs total)
    const positionChickenCount = new Array(25).fill(0);
    const positionTotalCount = new Array(25).fill(0);

    recentGames.forEach((game) => {
      game.positions.forEach(pos => {
        positionTotalCount[pos.position - 1]++;
        if (pos.isChicken) {
          positionChickenCount[pos.position - 1]++;
        }
      });
    });

    // Calculate win rates
    for (let i = 0; i < 25; i++) {
      bonePositionWinRate[i] = positionTotalCount[i] > 0 
        ? positionChickenCount[i] / positionTotalCount[i] 
        : 0;
    }

    // Find consistently risky positions
    const riskyPositions = bonePositionFrequency
      .map((freq, idx) => ({ position: idx + 1, frequency: freq, winRate: bonePositionWinRate[idx] }))
      .filter(p => p.frequency >= recentGames.length * 0.3) // Appeared in 30%+ of games as bone
      .sort((a, b) => b.frequency - a.frequency);

    // Find consistently safe positions
    const safePositions = bonePositionWinRate
      .map((rate, idx) => ({ position: idx + 1, winRate: rate, frequency: bonePositionFrequency[idx] }))
      .filter(p => p.winRate > 0 && positionTotalCount[p.position - 1] >= 5) // At least 5 occurrences
      .sort((a, b) => b.winRate - a.winRate);

    // Analyze temporal patterns (do bone positions repeat over time?)
    const recentBoneSets = recentGames.slice(0, 50).map(game => {
      const bones = game.positions
        .filter(p => !p.isChicken)
        .map(p => p.position)
        .sort((a, b) => a - b)
        .join(',');
      return {
        boneSet: bones,
        date: game.createdAt,
      };
    });

    // Find repeating bone sets
    const boneSetFrequency = new Map<string, { count: number; dates: Date[] }>();
    recentBoneSets.forEach(set => {
      const key = set.boneSet;
      if (boneSetFrequency.has(key)) {
        const existing = boneSetFrequency.get(key)!;
        boneSetFrequency.set(key, {
          count: existing.count + 1,
          dates: [...existing.dates, set.date],
        });
      } else {
        boneSetFrequency.set(key, { count: 1, dates: [set.date] });
      }
    });

    const repeatingBoneSets = Array.from(boneSetFrequency.entries())
      .filter(([_, data]) => data.count >= 2) // Appeared at least twice
      .map(([setKey, data]) => ({
        boneSet: setKey,
        count: data.count,
        dates: data.dates,
        avgGap: data.dates.length > 1 
          ? (data.dates[data.dates.length - 1].getTime() - data.dates[0].getTime()) / (1000 * 60 * 60 * 24) 
          : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Analyze "hot streaks" (consecutive games with bones in similar positions)
    let hotStreaks: { position: number; consecutiveBones: number; streakLength: number }[] = [];
    let currentStreak: { position: number; streakLength: number }[] = [];

    recentGames.slice(0, 50).forEach((game, idx) => {
      const bones = game.positions.filter(p => !p.isChicken).map(p => p.position);
      bones.forEach(bonePos => {
        if (currentStreak.some(s => s.position === bonePos)) {
          currentStreak = currentStreak.map(s => 
            s.position === bonePos 
              ? { ...s, streakLength: s.streakLength + 1 }
              : s
          );
        } else {
          currentStreak.push({ position: bonePos, streakLength: 1 });
        }
      });
    });

    hotStreaks = currentStreak
      .filter(s => s.streakLength >= 3)
      .sort((a, b) => b.streakLength - a.streakLength)
      .slice(0, 10);

    // Calculate predictive insights
    const insights = [];

    if (riskyPositions.length > 0) {
      const topRisk = riskyPositions[0];
      insights.push({
        type: 'HIGH_RISK_POSITION',
        severity: 'critical',
        message: `Posición ${topRisk.position} es hueso en ${Math.round((topRisk.frequency / recentGames.length) * 100)}% de las partidas`,
        data: { position: topRisk.position, frequency: topRisk.frequency, winRate: topRisk.winRate },
      });
    }

    if (repeatingBoneSets.length > 0) {
      const topRepeat = repeatingBoneSets[0];
      insights.push({
        type: 'REPEATING_PATTERN',
        severity: 'high',
        message: `El patrón de huesos ${topRepeat.boneSet} se repite ${topRepeat.count} veces en las últimas 50 partidas`,
        data: { boneSet: topRepeat.boneSet, count: topRepeat.count },
      });
    }

    if (safePositions.length > 0) {
      const topSafe = safePositions[0];
      insights.push({
        type: 'SAFE_POSITION',
        severity: 'info',
        message: `Posición ${topSafe.position} tiene ${Math.round(topSafe.winRate * 100)}% de probabilidad de ser pollo`,
        data: { position: topSafe.position, winRate: topSafe.winRate },
      });
    }

    // Analyze server predictability
    const predictabilityScore = riskyPositions.length > 0 
      ? Math.min(100, (riskyPositions[0].frequency / recentGames.length) * 100)
      : 0;

    const serverBehavior = {
      isPredictable: predictabilityScore > 25,
      predictabilityLevel: predictabilityScore > 50 ? 'HIGH' : predictabilityScore > 25 ? 'MEDIUM' : 'LOW',
      topRiskyPositions: riskyPositions.slice(0, 5),
      topSafePositions: safePositions.slice(0, 5),
      repeatingPatterns: repeatingBoneSets,
      hotStreaks,
    };

    return NextResponse.json({
      success: true,
      analysis: {
        gamesAnalyzed: recentGames.length,
        boneCount,
        serverBehavior,
        insights,
      },
      positionAnalysis: {
        boneFrequency: bonePositionFrequency.map((freq, idx) => ({
          position: idx + 1,
          timesAsBone: freq,
          percentage: Math.round((freq / recentGames.length) * 100),
          winRate: Math.round(bonePositionWinRate[idx] * 100),
        })),
        riskyPositions: riskyPositions.slice(0, 10),
        safePositions: safePositions.slice(0, 10),
      },
      patternAnalysis: {
        repeatingBoneSets,
        hotStreaks,
      },
    });
  } catch (error) {
    console.error('Error analyzing patterns:', error);
    return NextResponse.json(
      { error: 'Failed to analyze patterns', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET /api/chicken/pattern-analysis - Get current pattern analysis
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const boneCount = parseInt(searchParams.get('boneCount') || '4');

    const recentGames = await db.chickenGame.count({
      where: {
        isSimulated: false,
        boneCount,
      },
    });

    return NextResponse.json({
      status: 'ready',
      boneCount,
      totalRealGames: recentGames,
      minGamesForAnalysis: 10,
      recommendedGamesForAnalysis: Math.max(10, recentGames),
    });
  } catch (error) {
    console.error('Error getting analysis status:', error);
    return NextResponse.json(
      { error: 'Failed to get analysis status' },
      { status: 500 }
    );
  }
}
