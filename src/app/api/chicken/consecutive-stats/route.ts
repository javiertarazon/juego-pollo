import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/chicken/consecutive-stats - Analyze 3-in-a-row sequences
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const boneCount = parseInt(searchParams.get('boneCount') || '4');

    // Get all REAL games
    const games = await db.chickenGame.findMany({
      where: { isSimulated: false, boneCount },
      include: { positions: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    if (games.length === 0) {
      return NextResponse.json({
        message: 'No hay datos suficientes',
        consecutiveStats: {},
      });
    }

    // Find all 3-in-a-row sequences for each position
    const consecutiveSequences: Record<number, {
      position: number;
      totalSequences: number;
      successfulSequences: number;
      winRate: number;
      avgNextPositions: number[];
      sequences: any[];
    }> = {};

    for (let startPos = 1; startPos <= 25; startPos++) {
      const sequences: any[] = [];
      let successfulCount = 0;
      const nextPositions: Record<number, number> = {};

      games.forEach(game => {
        const pos1 = game.positions.find(p => p.position === startPos);
        if (!pos1 || !pos1.isChicken || !pos1.revealed) return;

        const pos2 = game.positions.find(p => {
          const row1 = Math.floor((startPos - 1) / 5);
          const row2 = Math.floor((p.position - 1) / 5);
          const col1 = (startPos - 1) % 5;
          const col2 = (p.position - 1) % 5;
          return p.isChicken && p.revealed && (
            (row1 === row2 && Math.abs(col1 - col2) === 1) ||
            (col1 === col2 && Math.abs(row1 - row2) === 1)
          );
        });

        const pos3 = game.positions.find(p => {
          const row1 = Math.floor((startPos - 1) / 5);
          const row3 = Math.floor((p.position - 1) / 5);
          const col1 = (startPos - 1) % 5;
          const col3 = (p.position - 1) % 5;
          return p.isChicken && p.revealed && (
            (row1 === row3 && Math.abs(col1 - col3) === 1) ||
            (col1 === col3 && Math.abs(row1 - row3) === 1)
          );
        });

        // Found a valid 3-in-a-row sequence
        if (pos2 && pos3) {
          sequences.push({
            gameId: game.id,
            position2: pos2.position,
            position3: pos3.position,
          });
          successfulCount++;

          // Track next positions after sequence
          game.positions.forEach(p => {
            if (p.revealOrder && p.revealOrder > pos3.revealOrder! && p.isChicken) {
              nextPositions[p.position] = (nextPositions[p.position] || 0) + 1;
            }
          });
        }
      });

      const winRate = sequences.length > 0 ? successfulCount / sequences.length : 0;

      // Get best next positions (most frequent chickens after this 3-in-row)
      const sortedNextPositions = Object.entries(nextPositions)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([pos, count]) => parseInt(pos));

      consecutiveSequences[startPos] = {
        position: startPos,
        totalSequences: sequences.length,
        successfulSequences: successfulCount,
        winRate,
        avgNextPositions: sortedNextPositions,
        sequences: sequences.slice(0, 10),
      };
    }

    // Find best starting positions for 3-in-a-row
    const bestStartingPositions = Object.entries(consecutiveSequences)
      .filter(([_, stats]) => stats.totalSequences >= 5)
      .map(([pos, stats]) => ({
        position: parseInt(pos),
        ...stats,
        overallScore: stats.winRate * 60 + stats.successfulSequences * 10,
      }))
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 10);

    // Find patterns of successful 3-in-a-rows
    const patternFrequency: Record<string, number> = {};
    games.forEach(game => {
      const chickenPositions = game.positions
        .filter(p => p.isChicken && p.revealed)
        .sort((a, b) => a.revealOrder! - b.revealOrder!)
        .map(p => p.position);

      // Find all 3-in-a-row sequences in this game
      for (let i = 0; i <= chickenPositions.length - 3; i++) {
        const seq = chickenPositions.slice(i, i + 3).join('-');
        patternFrequency[seq] = (patternFrequency[seq] || 0) + 1;
      }
    });

    const commonPatterns = Object.entries(patternFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([pattern, count]) => ({
        pattern,
        frequency: count,
        positions: pattern.split('-').map(Number),
      }));

    // Calculate overall 3-in-a-row success rate
    let totalSequences = 0;
    let totalSuccessful = 0;
    Object.values(consecutiveSequences).forEach(stats => {
      totalSequences += stats.totalSequences;
      totalSuccessful += stats.successfulSequences;
    });

    const overallConsecutiveWinRate = totalSequences > 0
      ? totalSuccessful / totalSequences
      : 0;

    return NextResponse.json({
      success: true,
      boneCount,
      totalGames: games.length,
      overallConsecutiveWinRate: Math.round(overallConsecutiveWinRate * 10000) / 10000,
      consecutiveSequences,
      bestStartingPositions,
      commonPatterns,
      recommendation: {
        message: overallConsecutiveWinRate > 0.65
          ? 'Excelente rendimiento en 3-en-raya consecutivos'
          : overallConsecutiveWinRate > 0.55
          ? 'Buen rendimiento en 3-en-raya consecutivos'
          : 'Se necesitan más partidas para aprender patrones de 3-en-raya',
        bestStartingPositions: bestStartingPositions.slice(0, 3).map(p => p.position),
        avoidPatterns: Object.entries(consecutiveSequences)
          .filter(([_, stats]) => stats.winRate < 0.40 && stats.totalSequences >= 5)
          .map(([pos, _]) => parseInt(pos))
          .slice(0, 3),
      },
    });
  } catch (error) {
    console.error('Error getting consecutive stats:', error);
    return NextResponse.json(
      { error: 'Failed to get consecutive stats' },
      { status: 500 }
    );
  }
}
