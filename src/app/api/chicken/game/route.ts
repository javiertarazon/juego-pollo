import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Multiplier constants based on revealed positions
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

// POST /api/chicken/game - Create a new game
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { boneCount = 3, isSimulated = false } = body;

    // Validate bone count
    if (![2, 3, 4].includes(boneCount)) {
      return NextResponse.json(
        { error: 'Bone count must be 2, 3, or 4' },
        { status: 400 }
      );
    }

    // Generate random bone positions
    const positions = Array.from({ length: 25 }, (_, i) => i + 1);
    const shuffled = positions.sort(() => Math.random() - 0.5);
    const bonePositions = shuffled.slice(0, boneCount);

    // Create game
    const game = await db.chickenGame.create({
      data: {
        boneCount,
        isSimulated,
        positions: {
          create: positions.map((pos) => ({
            position: pos,
            isChicken: !bonePositions.includes(pos),
          })),
        },
      },
      include: {
        positions: true,
      },
    });

    return NextResponse.json({
      gameId: game.id,
      boneCount: game.boneCount,
      positions: game.positions.map((p) => ({
        position: p.position,
        isChicken: p.isChicken,
      })),
    });
  } catch (error) {
    console.error('Error creating game:', error);
    return NextResponse.json(
      { error: 'Failed to create game' },
      { status: 500 }
    );
  }
}

// GET /api/chicken/game?gameId=xxx - Get game details (for testing)
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const gameId = searchParams.get('gameId');

    if (!gameId) {
      return NextResponse.json(
        { error: 'Game ID is required' },
        { status: 400 }
      );
    }

    const game = await db.chickenGame.findUnique({
      where: { id: gameId },
      include: {
        positions: true,
      },
    });

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      gameId: game.id,
      boneCount: game.boneCount,
      revealedCount: game.revealedCount,
      hitBone: game.hitBone,
      cashOutPosition: game.cashOutPosition,
      multiplier: game.multiplier,
      isSimulated: game.isSimulated,
      positions: game.positions.map((p) => ({
        position: p.position,
        isChicken: p.isChicken,
        revealed: p.revealed,
        revealOrder: p.revealOrder,
      })),
      multipliers: MULTIPLIERS,
    });
  } catch (error) {
    console.error('Error getting game:', error);
    return NextResponse.json(
      { error: 'Failed to get game' },
      { status: 500 }
    );
  }
}
