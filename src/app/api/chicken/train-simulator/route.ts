import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface BonePattern {
  positions: number[];
  frequency: number;
  lastSeen: Date;
  winRate: number;
}

interface AdjacencyPattern {
  from: number;
  to: number;
  frequency: number;
}

interface ZonePattern {
  zoneType: 'row' | 'column' | 'diagonal' | 'corner' | 'center';
  zone: number | string;
  boneFrequency: number;
}

// POST /api/chicken/train-simulator - Train simulator model with real game patterns
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { boneCount = 3, minGamesForPattern = 5 } = body;

    console.log(`Training simulator with boneCount=${boneCount}, minGames=${minGamesForPattern}`);

    // Get all real games with this bone count
    const realGames = await db.chickenGame.findMany({
      where: {
        isSimulated: false,
        boneCount,
        revealedCount: { gte: 2 }, // At least some positions revealed
      },
      include: {
        positions: {
          orderBy: { revealOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500, // Limit to last 500 games
    });

    console.log(`Found ${realGames.length} real games to analyze`);

    if (realGames.length < 10) {
      return NextResponse.json({
        success: false,
        error: `Insufficient real games. Need at least 10 games, found ${realGames.length}.`,
        gamesFound: realGames.length,
      }, { status: 400 });
    }

    // Extract bone position patterns
    const bonePatterns: Map<string, BonePattern> = new Map();
    const adjacencyPatterns: Map<string, AdjacencyPattern> = new Map();
    const zonePatterns: Map<string, ZonePattern> = new Map();

    // Analyze each game
    for (const game of realGames) {
      // Get bone positions from this game
      const bonePositions = game.positions
        .filter(p => !p.isChicken)
        .map(p => p.position)
        .sort((a, b) => a - b);

      // Create pattern key (sorted positions as string)
      const patternKey = bonePositions.join(',');

      // Update bone pattern frequency
      if (bonePatterns.has(patternKey)) {
        const pattern = bonePatterns.get(patternKey)!;
        pattern.frequency++;
        pattern.lastSeen = game.createdAt;
      } else {
        // Calculate win rate for this pattern
        const gamesWithPattern = realGames.filter(g => {
          const bones = g.positions
            .filter(p => !p.isChicken)
            .map(p => p.position)
            .sort((a, b) => a - b);
          return bones.join(',') === patternKey;
        });

        const wins = gamesWithPattern.filter(g => !g.hitBone && g.cashOutPosition && g.cashOutPosition >= 4).length;
        const winRate = gamesWithPattern.length > 0 ? wins / gamesWithPattern.length : 0;

        bonePatterns.set(patternKey, {
          positions: bonePositions,
          frequency: 1,
          lastSeen: game.createdAt,
          winRate,
        });
      }

      // Analyze adjacency patterns (which positions tend to be bones together)
      for (let i = 0; i < bonePositions.length; i++) {
        for (let j = i + 1; j < bonePositions.length; j++) {
          const from = bonePositions[i];
          const to = bonePositions[j];
          const adjKey = `${from}-${to}`;

          if (adjacencyPatterns.has(adjKey)) {
            adjacencyPatterns.get(adjKey)!.frequency++;
          } else {
            adjacencyPatterns.set(adjKey, { from, to, frequency: 1 });
          }
        }
      }

      // Analyze zone patterns
      // Row zones
      for (let row = 0; row < 5; row++) {
        const rowPositions = Array.from({ length: 5 }, (_, i) => row * 5 + i + 1);
        const bonesInRow = bonePositions.filter(p => rowPositions.includes(p));

        if (bonesInRow.length > 0) {
          const zoneKey = `row-${row}`;
          if (zonePatterns.has(zoneKey)) {
            zonePatterns.get(zoneKey)!.boneFrequency++;
          } else {
            zonePatterns.set(zoneKey, {
              zoneType: 'row',
              zone: row,
              boneFrequency: 1,
            });
          }
        }
      }

      // Column zones
      for (let col = 0; col < 5; col++) {
        const colPositions = Array.from({ length: 5 }, (_, i) => i * 5 + col + 1);
        const bonesInCol = bonePositions.filter(p => colPositions.includes(p));

        if (bonesInCol.length > 0) {
          const zoneKey = `col-${col}`;
          if (zonePatterns.has(zoneKey)) {
            zonePatterns.get(zoneKey)!.boneFrequency++;
          } else {
            zonePatterns.set(zoneKey, {
              zoneType: 'column',
              zone: col,
              boneFrequency: 1,
            });
          }
        }
      }

      // Corner zones
      const corners = [1, 5, 21, 25];
      const bonesInCorners = bonePositions.filter(p => corners.includes(p));
      if (bonesInCorners.length > 0) {
        const zoneKey = 'corner';
        if (zonePatterns.has(zoneKey)) {
          zonePatterns.get(zoneKey)!.boneFrequency++;
        } else {
          zonePatterns.set(zoneKey, {
            zoneType: 'corner',
            zone: 'all',
            boneFrequency: 1,
          });
        }
      }

      // Center zone
      const centers = [7, 8, 9, 12, 13, 14, 17, 18, 19];
      const bonesInCenter = bonePositions.filter(p => centers.includes(p));
      if (bonesInCenter.length > 0) {
        const zoneKey = 'center';
        if (zonePatterns.has(zoneKey)) {
          zonePatterns.get(zoneKey)!.boneFrequency++;
        } else {
          zonePatterns.set(zoneKey, {
            zoneType: 'center',
            zone: 'all',
            boneFrequency: 1,
          });
        }
      }
    }

    // Convert patterns to arrays and filter by frequency
    const frequentBonePatterns = Array.from(bonePatterns.values())
      .filter(p => p.frequency >= minGamesForPattern)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 50); // Keep top 50 patterns

    const frequentAdjacencyPatterns = Array.from(adjacencyPatterns.values())
      .filter(p => p.frequency >= minGamesForPattern)
      .sort((a, b) => b.frequency - a.frequency);

    const zonePatternArray = Array.from(zonePatterns.values())
      .sort((a, b) => b.boneFrequency - a.boneFrequency);

    // Analyze position preferences (which positions are most likely to be bones)
    const positionBoneFrequency = new Array(25).fill(0);
    const positionTotalGames = new Array(25).fill(0);

    realGames.forEach(game => {
      const bonePositions = game.positions
        .filter(p => !p.isChicken)
        .map(p => p.position);

      positionBoneFrequency.forEach((_, idx) => {
        positionTotalGames[idx] += realGames.length;
      });

      bonePositions.forEach(pos => {
        positionBoneFrequency[pos - 1]++;
      });
    });

    const positionProbabilities = positionBoneFrequency.map((freq, idx) => ({
      position: idx + 1,
      frequency: freq,
      probability: realGames.length > 0 ? freq / realGames.length : 0,
    }));

    // Analyze reveal sequences (order in which chickens are typically revealed)
    const revealSequences: Map<string, number> = new Map();
    realGames.forEach(game => {
      const revealedChickens = game.positions
        .filter(p => p.isChicken && p.revealed && p.revealOrder !== null)
        .sort((a, b) => (a.revealOrder || 0) - (b.revealOrder || 0))
        .map(p => p.position);

      // Extract 3-position sequences
      for (let i = 0; i <= revealedChickens.length - 3; i++) {
        const seq = revealedChickens.slice(i, i + 3).join(',');
        revealSequences.set(seq, (revealSequences.get(seq) || 0) + 1);
      }
    });

    const frequentSequences = Array.from(revealSequences.entries())
      .filter(([_, freq]) => freq >= minGamesForPattern)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([sequence, frequency]) => ({ sequence, frequency }));

    // Create training summary
    const trainingSummary = {
      gamesAnalyzed: realGames.length,
      boneCount,
      uniquePatterns: bonePatterns.size,
      frequentPatterns: frequentBonePatterns.length,
      adjacencyPatterns: frequentAdjacencyPatterns.length,
      zonePatterns: zonePatternArray.length,
      revealSequences: frequentSequences.length,
      trainingDate: new Date().toISOString(),
    };

    console.log('Training summary:', trainingSummary);

    // Store training results in a simple format for simulator to use
    const trainingData = {
      bonePatterns: frequentBonePatterns,
      adjacencyPatterns: frequentAdjacencyPatterns,
      zonePatterns: zonePatternArray,
      positionProbabilities,
      revealSequences: frequentSequences,
      summary: trainingSummary,
    };

    return NextResponse.json({
      success: true,
      trainingData,
      summary: trainingSummary,
      message: `Simulador entrenado exitosamente con ${realGames.length} partidas reales. Se identificaron ${frequentBonePatterns.length} patrones frecuentes.`,
    });

  } catch (error) {
    console.error('Error training simulator:', error);
    return NextResponse.json(
      { error: 'Failed to train simulator', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET /api/chicken/train-simulator - Get training status and last trained data
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const boneCount = parseInt(searchParams.get('boneCount') || '3');

    // Get recent real games count
    const realGamesCount = await db.chickenGame.count({
      where: {
        isSimulated: false,
        boneCount,
      },
    });

    // Get simulated games count
    const simulatedGamesCount = await db.chickenGame.count({
      where: {
        isSimulated: true,
        boneCount,
      },
    });

    return NextResponse.json({
      status: 'ready',
      boneCount,
      realGamesAvailable: realGamesCount,
      simulatedGamesGenerated: simulatedGamesCount,
      canTrain: realGamesCount >= 10,
      recommendedMinGames: 10,
    });
  } catch (error) {
    console.error('Error getting training status:', error);
    return NextResponse.json(
      { error: 'Failed to get training status' },
      { status: 500 }
    );
  }
}
