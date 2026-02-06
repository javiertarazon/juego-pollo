import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { updateMLFromGame } from '@/lib/ml/reinforcement-learning';

const MULTIPLIERS = {
  4: 1.7,
  5: 1.99,
  6: 2.34,
  7: 2.66,
  8: 3.0,
  9: 3.4,
  10: 3.84,
  11: 4.35,
  12: 4.96,
  13: 5.65,
  14: 6.44,
  15: 7.35,
  16: 8.4,
  17: 9.6,
  18: 10.96,
  19: 12.52,
  20: 14.32,
  21: 16.37,
} as const;

// POST /api/chicken/result - Submit game result from real gameplay
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      boneCount = 3,
      revealedPositions = [],
      bonePositions = [],
      cashOutPosition,
      hitBone = false,
      objetivo = 0,
      modoJuego = 'real',
      streakStateId = 'default',
    } = body;

    const safeCashOutPosition = cashOutPosition ?? 0;

    // Create the game
    const game = await db.chickenGame.create({
      data: {
        boneCount,
        revealedCount: revealedPositions.length,
        hitBone,
        cashOutPosition: safeCashOutPosition,
        multiplier: safeCashOutPosition > 0
          ? MULTIPLIERS[safeCashOutPosition as keyof typeof MULTIPLIERS] || 0
          : 0,
        isSimulated: false,
        objetivo,
        modoJuego,
        streakStateId,
        positions: {
          create: Array.from({ length: 25 }, (_, i) => {
            const pos = i + 1;
            const isChicken = !bonePositions.includes(pos);
            const revealed = revealedPositions.includes(pos);
            const revealOrder = revealed
              ? revealedPositions.indexOf(pos) + 1
              : 0;

            return {
              position: pos,
              isChicken,
              revealed,
              revealOrder,
            };
          }),
        },
      },
      include: {
        positions: true,
      },
    });

    // Update position statistics (REAL GAMES ONLY)
    await updatePositionStats(bonePositions, false);

    // Update patterns
    if (revealedPositions.length > 0) {
      await updatePatterns(revealedPositions, bonePositions, boneCount);
    }

    // 🤖 ML V5: Auto-update after each game
    if (revealedPositions.length > 0) {
      const firstPosition = revealedPositions[0];
      const wasSuccess = !hitBone && cashOutPosition !== undefined && cashOutPosition >= 4;
      const reward = cashOutPosition ? (cashOutPosition / 21) : 0.5; // Reward proporcional a pollos revelados
      
      await updateMLFromGame(firstPosition, wasSuccess, reward);
      console.log(`ML V5 auto-actualizado: Pos ${firstPosition} | ${wasSuccess ? 'EXITO' : 'FALLO'} | Reward: ${reward.toFixed(2)}`);
    }

    // Return success with analysis
    return NextResponse.json({
      success: true,
      gameId: game.id,
      analysis: {
        revealedCount: game.revealedCount,
        hitBone: game.hitBone,
        multiplier: game.multiplier,
        isVictory:
          !hitBone && cashOutPosition !== undefined && cashOutPosition >= 4,
      },
      mlUpdated: revealedPositions.length > 0, // Indica si se actualizó el ML
    });
  } catch (error) {
    console.error('Error submitting result:', error);
    return NextResponse.json(
      { error: 'Failed to submit result' },
      { status: 500 }
    );
  }
}

async function updatePositionStats(bonePositions: number[], isSimulated: boolean = false) {
  for (let pos = 1; pos <= 25; pos++) {
    const isBone = bonePositions.includes(pos);

    const existing = await db.chickenPositionStats.findUnique({
      where: { position_isSimulated: { position: pos, isSimulated } },
    });

    if (existing) {
      await db.chickenPositionStats.update({
        where: { position_isSimulated: { position: pos, isSimulated } },
        data: {
          totalGames: { increment: 1 },
          chickenCount: isBone ? undefined : { increment: 1 },
          boneCount: isBone ? { increment: 1 } : undefined,
          winRate: isBone
            ? existing.chickenCount / (existing.totalGames + 1)
            : (existing.chickenCount + 1) / (existing.totalGames + 1),
        },
      });
    } else {
      await db.chickenPositionStats.create({
        data: {
          position: pos,
          totalGames: 1,
          chickenCount: isBone ? 0 : 1,
          boneCount: isBone ? 1 : 0,
          winRate: isBone ? 0 : 1,
          isSimulated,
        },
      });
    }
  }
}

async function updatePatterns(
  revealedPositions: number[],
  bonePositions: number[],
  boneCount: number
) {
  // Update patterns for different sequence lengths
  const patternLengths = [2, 3, 4];

  for (const length of patternLengths) {
    for (let i = 0; i <= revealedPositions.length - length; i++) {
      const pattern = revealedPositions.slice(i, i + length).join(',');

      // Determine what came after this pattern
      if (i + length < revealedPositions.length) {
        const nextPos = revealedPositions[i + length];
        const wasChicken = !bonePositions.includes(nextPos);

        const existing = await db.chickenPattern.findUnique({
          where: { pattern_boneCount: { pattern, boneCount } },
        });

        if (existing) {
          await db.chickenPattern.update({
            where: { pattern_boneCount: { pattern, boneCount } },
            data: {
              frequency: { increment: 1 },
              lastSeen: new Date(),
            },
          });
        } else {
          await db.chickenPattern.create({
            data: {
              pattern,
              boneCount,
              frequency: 1,
            },
          });
        }
      }
    }
  }

  // Create pattern for what would be the next position
  if (revealedPositions.length >= 2) {
    const pattern = revealedPositions.slice(-3).join(',');
    const nextPositions = Array.from({ length: 25 }, (_, i) => i + 1).filter(
      (p) => !revealedPositions.includes(p)
    );

    for (const nextPos of nextPositions) {
      const wasChicken = !bonePositions.includes(nextPos);
      const key = `${pattern},${nextPos}`;

      const existing = await db.chickenPattern.findFirst({
        where: {
          pattern: { startsWith: pattern },
          boneCount,
        },
      });

      if (!existing && wasChicken) {
        await db.chickenPattern.create({
          data: {
            pattern: key,
            boneCount,
            frequency: 1,
            nextChicken: String(nextPos),
          },
        });
      } else if (existing && wasChicken) {
        const nextChickens = existing.nextChicken
          ? existing.nextChicken.split(',')
          : [];
        if (!nextChickens.includes(String(nextPos))) {
          await db.chickenPattern.update({
            where: { id: existing.id },
            data: {
              nextChicken: [...nextChickens, nextPos].join(','),
            },
          });
        }
      }
    }
  }
}

// GET /api/chicken/result - Get position statistics (REAL GAMES ONLY)
export async function GET(req: NextRequest) {
  try {
    const stats = await db.chickenPositionStats.findMany({
      where: { isSimulated: false },
      orderBy: { position: 'asc' },
    });

    return NextResponse.json({
      stats: stats.map((s) => ({
        position: s.position,
        totalGames: s.totalGames,
        chickenCount: s.chickenCount,
        boneCount: s.boneCount,
        winRate: Math.round(s.winRate * 100) / 100,
      })),
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    return NextResponse.json(
      { error: 'Failed to get stats' },
      { status: 500 }
    );
  }
}
