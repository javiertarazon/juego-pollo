import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Growth factors for each position
const GROWTH_FACTORS: Record<number, number> = {
  1: 1.17,
  2: 1.41,
  3: 1.71,
  4: 2.09,
  5: 2.58,
  6: 3.17,
  7: 3.90,
  8: 4.79,
  9: 5.88,
  10: 7.22,
  11: 8.87,
  12: 10.89,
  13: 13.37,
  14: 16.42,
  15: 20.16,
  16: 24.76,
  17: 30.41,
  18: 37.35,
  19: 45.88,
  20: 56.32,
  21: 69.15,
  22: 84.94,
  23: 104.34,
  24: 128.13,
  25: 157.27,
};

// Calculate board distance between two positions (5x5 grid)
function getDistance(pos1: number, pos2: number): number {
  const row1 = Math.floor((pos1 - 1) / 5);
  const col1 = (pos1 - 1) % 5;
  const row2 = Math.floor((pos2 - 1) / 5);
  const col2 = (pos2 - 1) % 5;
  return Math.sqrt(Math.pow(row2 - row1, 2) + Math.pow(col2 - col1, 2));
}

// Get adjacent positions
function getAdjacentPositions(pos: number): number[] {
  const row = Math.floor((pos - 1) / 5);
  const col = (pos - 1) % 5;
  const adjacent: number[] = [];

  // Check all 8 neighbors
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const newRow = row + dr;
      const newCol = col + dc;
      if (newRow >= 0 && newRow < 5 && newCol >= 0 && newCol < 5) {
        const newPos = newRow * 5 + newCol + 1;
        adjacent.push(newPos);
      }
    }
  }
  return adjacent;
}

export async function POST(request: NextRequest) {
  try {
    const { boneCount } = await request.json();

    if (!boneCount || boneCount < 1 || boneCount > 5) {
      return NextResponse.json(
        { error: 'Invalid bone count' },
        { status: 400 }
      );
    }

    // Get last 200 real games
    const games = await db.chickenGame.findMany({
      where: {
        boneCount,
        isSimulated: false,
      },
      include: {
        positions: {
          orderBy: { revealOrder: 'asc' },
        },
      },
      orderBy: { id: 'asc' },
      take: 200,
    });

    if (games.length < 10) {
      return NextResponse.json({
        error: 'Insufficient data - need at least 10 real games',
        analysis: null,
      });
    }

    const recentGames = games.slice(-40); // Last 40 games
    const allBones = new Map<number, number>(); // position -> frequency
    const allChickens = new Map<number, number>(); // position -> frequency

    // Analyze bone position frequency (last 40 games)
    recentGames.forEach((game) => {
      game.positions.forEach((pos) => {
        if (!pos.isChicken) {
          allBones.set(pos.position, (allBones.get(pos.position) || 0) + 1);
        } else {
          allChickens.set(pos.position, (allChickens.get(pos.position) || 0) + 1);
        }
      });
    });

    // Find patterns between consecutive games
    const transitionPatterns: Map<string, {
      count: number;
      from: string;
      to: string;
      examples: Array<{ gameId: number; from: number[]; to: number[] }>;
    }> = new Map();

    for (let i = 0; i < games.length - 1; i++) {
      const game1 = games[i];
      const game2 = games[i + 1];

      const bones1 = game1.positions.filter(p => !p.isChicken).map(p => p.position).sort();
      const bones2 = game2.positions.filter(p => !p.isChicken).map(p => p.position).sort();

      const bones1Str = bones1.join(',');
      const bones2Str = bones2.join(',');
      const key = `${bones1Str}|${bones2Str}`;

      if (!transitionPatterns.has(key)) {
        transitionPatterns.set(key, {
          count: 0,
          from: bones1Str,
          to: bones2Str,
          examples: [],
        });
      }

      const pattern = transitionPatterns.get(key)!;
      pattern.count++;
      if (pattern.examples.length < 3) {
        pattern.examples.push({
          gameId: game2.id,
          from: bones1,
          to: bones2,
        });
      }
    }

    // Analyze position transitions (safe -> bone, bone -> safe)
    const positionTransitions: Map<number, {
      safeToBone: number;
      boneToSafe: number;
      safeToSafe: number;
      boneToBone: number;
    }> = new Map();

    for (let i = 0; i < games.length - 1; i++) {
      const game1 = games[i];
      const game2 = games[i + 1];

      for (let pos = 1; pos <= 25; pos++) {
        const pos1State = game1.positions.find(p => p.position === pos);
        const pos2State = game2.positions.find(p => p.position === pos);

        if (!pos1State || !pos2State) continue;

        const isBone1 = !pos1State.isChicken;
        const isBone2 = !pos2State.isChicken;

        if (!positionTransitions.has(pos)) {
          positionTransitions.set(pos, {
            safeToBone: 0,
            boneToSafe: 0,
            safeToSafe: 0,
            boneToBone: 0,
          });
        }

        const transitions = positionTransitions.get(pos)!;
        if (!isBone1 && isBone2) {
          transitions.safeToBone++;
        } else if (isBone1 && !isBone2) {
          transitions.boneToSafe++;
        } else if (!isBone1 && !isBone2) {
          transitions.safeToSafe++;
        } else {
          transitions.boneToBone++;
        }
      }
    }

    // Analyze bone proximity to chickens
    const proximityAnalysis: Array<{
      distance: number;
      count: number;
      percentage: number;
    }> = [];
    const totalBonesProx = recentGames.reduce((sum, game) => {
      return sum + game.positions.filter(p => !p.isChicken).length;
    }, 0);

    for (let dist = 1; dist <= 5; dist++) {
      let count = 0;
      recentGames.forEach((game) => {
        const bones = game.positions.filter(p => !p.isChicken).map(p => p.position);
        const chickens = game.positions.filter(p => p.isChicken).map(p => p.position);

        bones.forEach((bonePos) => {
          chickens.forEach((chickenPos) => {
            if (getDistance(bonePos, chickenPos) === dist) {
              count++;
            }
          });
        });
      });

      proximityAnalysis.push({
        distance: dist,
        count,
        percentage: totalBonesProx > 0 ? (count / totalBonesProx) * 100 : 0,
      });
    }

    // Analyze adjacent bone patterns
    const adjacentBonePatterns: Map<string, {
      count: number;
      positions: number[];
    }> = new Map();

    recentGames.forEach((game) => {
      const bones = game.positions.filter(p => !p.isChicken).map(p => p.position).sort();

      for (let i = 0; i < bones.length; i++) {
        for (let j = i + 1; j < bones.length; j++) {
          const pos1 = bones[i];
          const pos2 = bones[j];
          const distance = getDistance(pos1, pos2);

          if (distance <= 1.5) { // Adjacent
            const pair = [pos1, pos2].sort().join('-');
            if (!adjacentBonePatterns.has(pair)) {
              adjacentBonePatterns.set(pair, {
                count: 0,
                positions: [pos1, pos2],
              });
            }
            adjacentBonePatterns.get(pair)!.count++;
          }
        }
      }
    });

    // Calculate optimal cash-out positions based on historical data
    const cashOutAnalysis: Array<{
      position: number;
      growthFactor: number;
      successRate: number;
      expectedReturn: number;
      gamesReached: number;
      gamesWon: number;
      recommendation: string;
    }> = [];

    for (let pos = 3; pos <= 8; pos++) {
      const gamesAtPos = games.filter(g => g.revealedCount >= pos);
      const gamesWonAtPos = gamesAtPos.filter(g => {
        // Check if player could have won at this position
        const hitBoneBefore = gameHitBoneBeforePos(g, pos);
        return !hitBoneBefore;
      });

      const successRate = gamesAtPos.length > 0 ? gamesWonAtPos.length / gamesAtPos.length : 0;
      const growthFactor = GROWTH_FACTORS[pos] || GROWTH_FACTORS[8];
      const expectedReturn = successRate * growthFactor;

      let recommendation = 'NEUTRAL';
      if (expectedReturn > 1.3 && successRate > 0.4) {
        recommendation = 'EXCELENTE';
      } else if (expectedReturn > 1.1 && successRate > 0.35) {
        recommendation = 'BUENA';
      } else if (expectedReturn < 0.8) {
        recommendation = 'EVITAR';
      }

      cashOutAnalysis.push({
        position: pos,
        growthFactor,
        successRate: Math.round(successRate * 1000) / 10,
        expectedReturn: Math.round(expectedReturn * 100) / 100,
        gamesReached: gamesAtPos.length,
        gamesWon: gamesWonAtPos.length,
        recommendation,
      });
    }

    // Betting strategy based on consecutive wins/losses
    const bettingStrategy: {
      consecutiveWins: number;
      consecutiveLosses: number;
      recommendedMultiplier: number;
      explanation: string;
      riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    }[] = [];

    const winStreaks = calculateWinStreaks(games);
    const lossStreaks = calculateLossStreaks(games);

    for (let wins = 1; wins <= 5; wins++) {
      const winRate = winStreaks.filter(s => s >= wins).length / winStreaks.length;
      const multiplier = Math.min(2.0, 1 + (wins * 0.1)); // Cap at 2x

      bettingStrategy.push({
        consecutiveWins: wins,
        consecutiveLosses: 0,
        recommendedMultiplier: Math.round(multiplier * 100) / 100,
        explanation: wins <= 2
          ? 'Apostar base + 10% por cada victoria'
          : 'Aumentar moderadamente aprovechando racha',
        riskLevel: wins <= 2 ? 'LOW' : 'MEDIUM',
      });
    }

    for (let losses = 1; losses <= 4; losses++) {
      const lossRate = lossStreaks.filter(s => s >= losses).length / lossStreaks.length;
      const multiplier = Math.max(0.4, 1 - (losses * 0.15)); // Min 0.4x

      bettingStrategy.push({
        consecutiveWins: 0,
        consecutiveLosses: losses,
        recommendedMultiplier: Math.round(multiplier * 100) / 100,
        explanation: losses === 1
          ? 'Reducir apuesta 15% para recuperar'
          : losses === 2
          ? 'Reducir apuesta 30% y ser conservador'
          : 'Minimizar riesgo, apostar mínimo',
        riskLevel: losses <= 1 ? 'LOW' : losses === 2 ? 'MEDIUM' : 'HIGH',
      });
    }

    // Find most profitable patterns
    const profitablePatterns: Array<{
      pattern: string;
      frequency: number;
      successRate: number;
      expectedGrowth: number;
      confidence: 'ALTA' | 'MEDIA' | 'BAJA';
    }> = [];

    for (let i = 3; i <= 5; i++) {
      const pattern = games.filter(g => g.revealedCount >= i && !gameHitBoneBeforePos(g, i));
      const freq = pattern.length;
      const rate = games.filter(g => g.revealedCount >= i).length > 0
        ? freq / games.filter(g => g.revealedCount >= i).length
        : 0;
      const growth = GROWTH_FACTORS[i] * rate;

      profitablePatterns.push({
        pattern: `${i} posiciones seguras`,
        frequency: freq,
        successRate: Math.round(rate * 1000) / 10,
        expectedGrowth: Math.round(growth * 100) / 100,
        confidence: freq >= 10 ? 'ALTA' : freq >= 5 ? 'MEDIA' : 'BAJA',
      });
    }

    // Calculate overall win probabilities for optimal betting
    const overallWinProb = games.length > 0
      ? games.filter(g => g.cashOutPosition !== null).length / games.length
      : 0;

    const safePositionProb = allChickens.size > 0
      ? Array.from(allChickens.values()).reduce((a, b) => a + b, 0) /
        (Array.from(allChickens.values()).reduce((a, b) => a + b, 0) +
         Array.from(allBones.values()).reduce((a, b) => a + b, 0))
      : 0.5;

    return NextResponse.json({
      analysis: {
        gamesAnalyzed: games.length,
        recentGamesAnalyzed: recentGames.length,
        overallWinProbability: Math.round(overallWinProb * 1000) / 10,
        safePositionProbability: Math.round(safePositionProb * 1000) / 10,
      },
      bonePositionFrequency: Array.from(allBones.entries())
        .map(([pos, count]) => ({
          position: pos,
          count,
          percentage: Math.round((count / recentGames.length) * 1000) / 10,
          gamesBetweenOccurrence: recentGames.length > 1
            ? Math.round((recentGames.length / count) * 10) / 10
            : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      chickenPositionFrequency: Array.from(allChickens.entries())
        .map(([pos, count]) => ({
          position: pos,
          count,
          percentage: Math.round((count / (recentGames.length * (25 - boneCount))) * 1000) / 10,
          gamesBetweenOccurrence: recentGames.length > 1
            ? Math.round((recentGames.length / count) * 10) / 10
            : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      transitionPatterns: Array.from(transitionPatterns.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      positionTransitions: Array.from(positionTransitions.entries())
        .filter(([_, t]) => t.safeToBone + t.boneToSafe + t.safeToSafe + t.boneToBone > 0)
        .map(([pos, transitions]) => ({
          position: pos,
          ...transitions,
          total: transitions.safeToBone + transitions.boneToSafe + transitions.safeToSafe + transitions.boneToBone,
          boneProbability: Math.round(
            ((transitions.safeToBone + transitions.boneToBone) / transitions.total) * 1000
          ) / 10,
          transitionProbability: {
            safeToBone: Math.round((transitions.safeToBone / transitions.total) * 1000) / 10,
            boneToSafe: Math.round((transitions.boneToSafe / transitions.total) * 1000) / 10,
          },
        }))
        .sort((a, b) => b.boneProbability - a.boneProbability)
        .slice(0, 10),
      proximityAnalysis,
      adjacentBonePatterns: Array.from(adjacentBonePatterns.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      cashOutAnalysis,
      bettingStrategy: bettingStrategy.sort((a, b) => {
        if (a.consecutiveWins > 0 && b.consecutiveWins > 0) {
          return a.consecutiveWins - b.consecutiveWins;
        }
        if (a.consecutiveLosses > 0 && b.consecutiveLosses > 0) {
          return a.consecutiveLosses - b.consecutiveLosses;
        }
        return 0;
      }),
      profitablePatterns,
      optimalStrategy: calculateOptimalStrategy(cashOutAnalysis, bettingStrategy, overallWinProb),
      riskManagement: {
        maxConsecutiveLosses: Math.max(...lossStreaks),
        maxConsecutiveWins: Math.max(...winStreaks),
        recommendedMaxBet: Math.round(0.05 * 100) / 100, // 5% of capital
        recommendedMinBet: Math.round(0.01 * 100) / 100, // 1% of capital
        emergencyStopThreshold: 3, // Stop after 3 consecutive losses
      },
    });
  } catch (error) {
    console.error('Error in advanced analysis:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function gameHitBoneBeforePos(game: any, pos: number): boolean {
  const positionsBeforePos = game.positions.filter((p: any) => p.revealOrder < pos);
  return positionsBeforePos.some((p: any) => !p.isChicken);
}

function calculateWinStreaks(games: any[]): number[] {
  const streaks: number[] = [];
  let currentStreak = 0;

  games.forEach((game) => {
    if (game.cashOutPosition !== null && game.cashOutPosition >= 3) {
      currentStreak++;
    } else {
      if (currentStreak > 0) {
        streaks.push(currentStreak);
      }
      currentStreak = 0;
    }
  });

  if (currentStreak > 0) {
    streaks.push(currentStreak);
  }

  return streaks.length > 0 ? streaks : [0];
}

function calculateLossStreaks(games: any[]): number[] {
  const streaks: number[] = [];
  let currentStreak = 0;

  games.forEach((game) => {
    if (game.hitBone || (game.cashOutPosition !== null && game.cashOutPosition < 3)) {
      currentStreak++;
    } else {
      if (currentStreak > 0) {
        streaks.push(currentStreak);
      }
      currentStreak = 0;
    }
  });

  if (currentStreak > 0) {
    streaks.push(currentStreak);
  }

  return streaks.length > 0 ? streaks : [0];
}

function calculateOptimalStrategy(
  cashOutAnalysis: any[],
  bettingStrategy: any[],
  overallWinProb: number
): any {
  const bestCashOut = cashOutAnalysis
    .filter(c => c.recommendation === 'EXCELENTE' || c.recommendation === 'BUENA')
    .sort((a, b) => b.expectedReturn - a.expectedReturn)[0] || cashOutAnalysis[0];

  const conservativeBet = bettingStrategy.find(b => b.consecutiveLosses === 1);
  const aggressiveBet = bettingStrategy.find(b => b.consecutiveWins === 3);

  return {
    targetCashOutPosition: bestCashOut?.position || 4,
    expectedReturn: bestCashOut?.expectedReturn || 1.0,
    baseBetMultiplier: 1.0,
    conservativeBetMultiplier: conservativeBet?.recommendedMultiplier || 0.85,
    aggressiveBetMultiplier: aggressiveBet?.recommendedMultiplier || 1.3,
    strategyType: overallWinProb > 0.5 ? 'MODERADO' : 'CONSERVADOR',
    explanation: overallWinProb > 0.5
      ? 'Probabilidad de victoria superior al 50%. Apostar en posiciones 4-5 con estrategia moderada.'
      : 'Probabilidad de victoria inferior al 50%. Ser conservador, apostar en posición 3-4 y reducir apuestas tras pérdidas.',
    dailyGoal: overallWinProb > 0.5 ? 'Crecimiento del 20-30% del capital' : 'Crecimiento del 5-10% del capital',
  };
}
