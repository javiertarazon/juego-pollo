import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/chicken/train-advisor - Train advisor with simulated games
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      boneCount = 3,
      gameCount = 100,
      minRevealedCount = 2,
    } = body;

    // VALIDACIÓN DE ENTRADA
    if (!Number.isInteger(boneCount) || boneCount < 2 || boneCount > 4) {
      return NextResponse.json({ 
        error: 'Invalid boneCount: must be integer between 2 and 4' 
      }, { status: 400 });
    }
    
    if (!Number.isInteger(gameCount) || gameCount < 1 || gameCount > 10000) {
      return NextResponse.json({ 
        error: 'Invalid gameCount: must be integer between 1 and 10000' 
      }, { status: 400 });
    }
    
    if (!Number.isInteger(minRevealedCount) || minRevealedCount < 1 || minRevealedCount > 25) {
      return NextResponse.json({ 
        error: 'Invalid minRevealedCount: must be integer between 1 and 25' 
      }, { status: 400 });
    }

    console.log(`Training advisor with ${gameCount} simulated games, boneCount=${boneCount}`);

    // Get simulated games to train with
    const simulatedGames = await db.chickenGame.findMany({
      where: {
        isSimulated: true,
        boneCount,
        revealedCount: { gte: minRevealedCount },
      },
      include: {
        positions: {
          orderBy: { revealOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: gameCount,
    });

    console.log(`Found ${simulatedGames.length} simulated games for training`);

    if (simulatedGames.length < 10) {
      return NextResponse.json({
        success: false,
        error: `Insufficient simulated games. Need at least 10 games, found ${simulatedGames.length}. Run the simulator first to generate more games.`,
        gamesFound: simulatedGames.length,
      }, { status: 400 });
    }

    // Training statistics
    let patternsCreated = 0;
    let patternsUpdated = 0;
    let positionsAnalyzed = 0;

    // OPTIMIZACIÓN: Cargar todos los patrones existentes en memoria
    const existingPatterns = await db.chickenPattern.findMany({
      where: { boneCount },
    });
    
    const patternMap = new Map(
      existingPatterns.map(p => [`${p.pattern}`, p])
    );

    // Acumular cambios en memoria
    const patternsToCreate: Array<{
      pattern: string;
      boneCount: number;
      frequency: number;
      successRate: number;
      nextChicken?: string;
    }> = [];
    
    const patternsToUpdate: Array<{
      id: string;
      frequency: number;
      successRate: number;
      nextChicken?: string;
    }> = [];

    // Process each simulated game to train the advisor
    for (const game of simulatedGames) {
      // Extract revealed positions in order
      const revealedPositions = game.positions
        .filter(p => p.revealed && p.revealOrder !== null)
        .sort((a, b) => (a.revealOrder || 0) - (b.revealOrder || 0))
        .map(p => p.position);

      // Extract bone positions
      const bonePositions = game.positions
        .filter(p => !p.isChicken)
        .map(p => p.position);

      // Update patterns for different sequence lengths (solo longitud 3 para velocidad)
      const patternLengths = [3]; // Reducido de [2,3,4] a solo [3]

      for (const length of patternLengths) {
        for (let i = 0; i <= revealedPositions.length - length; i++) {
          const pattern = revealedPositions.slice(i, i + length).join(',');

          // Determine what came after this pattern
          if (i + length < revealedPositions.length) {
            const nextPos = revealedPositions[i + length];
            const wasChicken = !bonePositions.includes(nextPos);

            const existing = patternMap.get(pattern);

            if (existing) {
              // Actualizar en memoria
              const historicalWeight = Math.min(0.95, existing.frequency / (existing.frequency + 1));
              const newDataWeight = 1 - historicalWeight;
              const newSuccessRate = existing.successRate * historicalWeight + (wasChicken ? 1 : 0) * newDataWeight;

              existing.frequency += 1;
              existing.successRate = Math.max(0, Math.min(1, newSuccessRate));
              patternsUpdated++;
            } else {
              // Crear nuevo patrón en memoria
              const newPattern = {
                pattern,
                boneCount,
                frequency: 1,
                successRate: wasChicken ? 1 : 0,
              };
              patternMap.set(pattern, newPattern as any);
              patternsToCreate.push(newPattern);
              patternsCreated++;
            }
          }
        }
      }

      positionsAnalyzed += revealedPositions.length;
    }

    // OPTIMIZACIÓN: Guardar todos los cambios en una sola transacción
    console.log(`Guardando ${patternsToCreate.length} nuevos patrones y actualizando ${patternsUpdated} existentes...`);
    
    // Aumentar timeout de transacción a 30 segundos
    await db.$transaction(async (tx) => {
      // Crear nuevos patrones en lotes pequeños para evitar duplicados
      if (patternsToCreate.length > 0) {
        const createBatchSize = 20;
        for (let i = 0; i < patternsToCreate.length; i += createBatchSize) {
          const batch = patternsToCreate.slice(i, i + createBatchSize);
          await Promise.allSettled(
            batch.map(pattern =>
              tx.chickenPattern.create({ data: pattern })
            )
          );
        }
      }

      // Actualizar patrones existentes (en lotes de 100 para más velocidad)
      const updateBatchSize = 100;
      const existingToUpdate = Array.from(patternMap.values()).filter(p => p.id);
      
      for (let i = 0; i < existingToUpdate.length; i += updateBatchSize) {
        const batch = existingToUpdate.slice(i, i + updateBatchSize);
        await Promise.all(
          batch.map(p =>
            tx.chickenPattern.update({
              where: { id: p.id },
              data: {
                frequency: p.frequency,
                successRate: p.successRate,
                lastSeen: new Date(),
              },
            })
          )
        );
      }
    }, {
      maxWait: 30000, // 30 segundos
      timeout: 30000, // 30 segundos
    });

    // Calculate training effectiveness
    const totalGamesProcessed = simulatedGames.length;
    const avgRevealedPerGame = positionsAnalyzed / totalGamesProcessed;
    const patternsPerGame = (patternsCreated + patternsUpdated) / totalGamesProcessed;

    console.log('Training completed:', {
      totalGamesProcessed,
      patternsCreated,
      patternsUpdated,
      positionsAnalyzed,
      avgRevealedPerGame,
      patternsPerGame,
    });

    // Get updated pattern statistics
    const totalPatterns = await db.chickenPattern.count({
      where: { boneCount },
    });

    const highConfidencePatterns = await db.chickenPattern.count({
      where: {
        boneCount,
        frequency: { gte: 3 },
        successRate: { gte: 0.6 },
      },
    });

    return NextResponse.json({
      success: true,
      summary: {
        gamesProcessed: totalGamesProcessed,
        patternsCreated,
        patternsUpdated,
        totalPatternChanges: patternsCreated + patternsUpdated,
        positionsAnalyzed,
        avgRevealedPerGame: Math.round(avgRevealedPerGame * 100) / 100,
        patternsPerGame: Math.round(patternsPerGame * 100) / 100,
      },
      advisorStatus: {
        totalPatterns,
        highConfidencePatterns,
        boneCount,
      },
      message: `Asesor entrenado exitosamente con ${totalGamesProcessed} partidas simuladas. ${patternsCreated} nuevos patrones creados, ${patternsUpdated} patrones actualizados.`,
    });

  } catch (error) {
    console.error('Error training advisor:', error);
    return NextResponse.json(
      { error: 'Failed to train advisor', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET /api/chicken/train-advisor - Get advisor training status
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const boneCount = parseInt(searchParams.get('boneCount') || '3');

    // Get simulated games count
    const simulatedGamesCount = await db.chickenGame.count({
      where: {
        isSimulated: true,
        boneCount,
      },
    });

    // Get real games count
    const realGamesCount = await db.chickenGame.count({
      where: {
        isSimulated: false,
        boneCount,
      },
    });

    // Get pattern statistics
    const totalPatterns = await db.chickenPattern.count({
      where: { boneCount },
    });

    const highConfidencePatterns = await db.chickenPattern.count({
      where: {
        boneCount,
        frequency: { gte: 3 },
        successRate: { gte: 0.6 },
      },
    });

    // Get recent patterns
    const recentPatterns = await db.chickenPattern.findMany({
      where: { boneCount },
      orderBy: { lastSeen: 'desc' },
      take: 10,
    });

    // Calculate training readiness
    const canTrainFromReal = realGamesCount >= 10;
    const canTrainFromSimulated = simulatedGamesCount >= 10;
    const canTrainOverall = simulatedGamesCount >= 50; // Need more simulated games for effective training

    return NextResponse.json({
      status: 'ready',
      boneCount,
      dataAvailability: {
        realGames: realGamesCount,
        simulatedGames: simulatedGamesCount,
        totalGames: realGamesCount + simulatedGamesCount,
      },
      advisorStatus: {
        totalPatterns,
        highConfidencePatterns,
        recentPatterns: recentPatterns.map(p => ({
          pattern: p.pattern,
          frequency: p.frequency,
          successRate: Math.round(p.successRate * 100) / 100,
          lastSeen: p.lastSeen,
        })),
      },
      trainingReadiness: {
        canTrainFromReal,
        canTrainFromSimulated,
        canTrainOverall,
        recommendedMinGames: 50,
      },
    });
  } catch (error) {
    console.error('Error getting training status:', error);
    return NextResponse.json(
      { error: 'Failed to get training status' },
      { status: 500 }
    );
  }
}
