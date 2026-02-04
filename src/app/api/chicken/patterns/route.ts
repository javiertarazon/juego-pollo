import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/chicken/patterns - Analyze ML patterns and rules
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const boneCount = parseInt(searchParams.get('boneCount') || '3');

    // Get all patterns from database
    const patterns = await db.chickenPattern.findMany({
      where: { boneCount },
      orderBy: { frequency: 'desc' },
      take: 50,
    });

    // Get position statistics
    const positionStats = await db.chickenPositionStats.findMany({
      where: { isSimulated: false },
    });

    // Analyze detected patterns
    const detectedPatterns = patterns
      .filter(p => p.frequency >= 2)
      .slice(0, 10)
      .map(p => ({
        pattern: p.pattern,
        frequency: p.frequency,
        lastSeen: p.lastSeen,
        nextChicken: p.nextChicken ? p.nextChicken.split(',') : [],
        nextBone: p.nextBone ? p.nextBone.split(',') : [],
        successRate: p.successRate,
      }));

    // Analyze frequent sequences
    const frequentSequences = patterns
      .filter(p => p.pattern.split(',').length >= 3 && p.frequency >= 3)
      .slice(0, 5)
      .map(p => ({
        sequence: p.pattern,
        occurrences: p.frequency,
        positions: p.pattern.split(',').map(Number),
        recommendation: p.nextChicken ? p.nextChicken.split(',')[0] : null,
      }));

    // Generate prediction rules based on patterns and statistics
    const predictionRules: any[] = [];

    // Rule 1: High win rate positions (win rate > 60%)
    const highWinRatePositions = positionStats
      .filter(s => s.winRate > 0.6 && s.totalGames >= 5)
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 5);

    if (highWinRatePositions.length > 0) {
      predictionRules.push({
        ruleName: 'Posiciones con Alto Win Rate',
        description: 'Estas posiciones históricamente tienen más de 60% de probabilidad de ser pollo',
        type: 'HIGH_WIN_RATE',
        positions: highWinRatePositions.map(s => s.position),
        confidence: Math.round(highWinRatePositions.reduce((sum, s) => sum + s.winRate, 0) / highWinRatePositions.length * 100),
      });
    }

    // Rule 2: Low win rate positions (win rate < 40%)
    const lowWinRatePositions = positionStats
      .filter(s => s.winRate < 0.4 && s.totalGames >= 5)
      .sort((a, b) => a.winRate - b.winRate)
      .slice(0, 5);

    if (lowWinRatePositions.length > 0) {
      predictionRules.push({
        ruleName: 'Posiciones con Bajo Win Rate (Evitar)',
        description: 'Estas posiciones históricamente tienen menos de 40% de probabilidad de ser pollo',
        type: 'LOW_WIN_RATE',
        positions: lowWinRatePositions.map(s => s.position),
        riskLevel: 'HIGH',
        confidence: Math.round(lowWinRatePositions.reduce((sum, s) => sum + s.winRate, 0) / lowWinRatePositions.length * 100),
      });
    }

    // Rule 3: Pattern-based predictions
    const strongPatterns = patterns.filter(p => p.frequency >= 4).slice(0, 3);
    if (strongPatterns.length > 0) {
      predictionRules.push({
        ruleName: 'Predicciones Basadas en Patrones Recurrentes',
        description: 'Secuencias que se repiten con frecuencia y sus siguientes posiciones más probables',
        type: 'PATTERN_BASED',
        patterns: strongPatterns.map(p => ({
          sequence: p.pattern,
          frequency: p.frequency,
          nextChicken: p.nextChicken?.split(',')[0],
          nextBone: p.nextBone?.split(',')[0],
        })),
        confidence: Math.min(95, 60 + strongPatterns.length * 10),
      });
    }

    // Rule 4: Hot zones (high bone frequency)
    const recentGames = await db.chickenGame.findMany({
      where: { boneCount, isSimulated: false },
      take: 40,
      include: { positions: true },
    });

    if (recentGames.length > 0) {
      const boneCounts = new Array(25).fill(0);
      recentGames.forEach(game => {
        game.positions.forEach(pos => {
          if (!pos.isChicken) boneCounts[pos.position - 1]++;
        });
      });

      const hotZonePositions = boneCounts
        .map((count, idx) => ({ position: idx + 1, count, percentage: (count / recentGames.length) * 100 }))
        .filter(z => z.percentage > 25)
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 5);

      if (hotZonePositions.length > 0) {
        predictionRules.push({
          ruleName: 'Zonas Calientes (Alta Frecuencia de Huesos)',
          description: 'Posiciones que aparecen como huesos en más del 25% de las partidas recientes',
          type: 'HOT_ZONES',
          positions: hotZonePositions.map(z => z.position),
          percentages: hotZonePositions.map(z => Math.round(z.percentage)),
          recommendation: 'EVITAR',
        });
      }
    }

    // Rule 5: Cold zones (low bone frequency)
    if (recentGames.length > 10) {
      const boneCounts = new Array(25).fill(0);
      recentGames.forEach(game => {
        game.positions.forEach(pos => {
          if (!pos.isChicken) boneCounts[pos.position - 1]++;
        });
      });

      const coldZonePositions = boneCounts
        .map((count, idx) => ({ position: idx + 1, count, percentage: (count / recentGames.length) * 100 }))
        .filter(z => z.percentage < 5)
        .sort((a, b) => a.percentage - b.percentage)
        .slice(0, 5);

      if (coldZonePositions.length > 0) {
        predictionRules.push({
          ruleName: 'Zonas Frías (Baja Frecuencia de Huesos)',
          description: 'Posiciones que raramente aparecen como huesos (menos del 5%)',
          type: 'COLD_ZONES',
          positions: coldZonePositions.map(z => z.position),
          percentages: coldZonePositions.map(z => Math.round(z.percentage)),
          recommendation: 'PRIORIDAD ALTA',
        });
      }
    }

    // Rule 6: Position clustering analysis
    const clusterAnalysis = analyzePositionClusters(recentGames);
    if (clusterAnalysis.length > 0) {
      predictionRules.push({
        ruleName: 'Análisis de Agrupamiento de Huesos',
        description: 'Tendencias de distribución de huesos en el tablero',
        type: 'CLUSTER_ANALYSIS',
        clusters: clusterAnalysis,
      });
    }

    return NextResponse.json({
      detectedPatterns,
      frequentSequences,
      predictionRules,
      totalPatterns: patterns.length,
      totalPositionsAnalyzed: positionStats.length,
    });
  } catch (error) {
    console.error('Error analyzing patterns:', error);
    return NextResponse.json(
      { error: 'Failed to analyze patterns' },
      { status: 500 }
    );
  }
}

function analyzePositionClusters(games: any[]) {
  const clusters: any[] = [];

  // Analyze bone distribution by rows
  for (let row = 0; row < 5; row++) {
    const rowPositions = Array.from({ length: 5 }, (_, i) => row * 5 + i + 1);
    let boneCount = 0;
    let totalCount = 0;

    games.forEach(game => {
      game.positions.forEach(pos => {
        if (rowPositions.includes(pos.position)) {
          totalCount++;
          if (!pos.isChicken) boneCount++;
        }
      });
    });

    if (totalCount > 0) {
      const bonePercentage = (boneCount / totalCount) * 100;
      clusters.push({
        type: 'ROW',
        identifier: `Fila ${row + 1}`,
        positions: rowPositions,
        boneCount,
        totalCount,
        bonePercentage: Math.round(bonePercentage),
        riskLevel: bonePercentage > 20 ? 'HIGH' : bonePercentage > 12 ? 'MEDIUM' : 'LOW',
      });
    }
  }

  // Analyze bone distribution by columns
  for (let col = 0; col < 5; col++) {
    const colPositions = Array.from({ length: 5 }, (_, i) => i * 5 + col + 1);
    let boneCount = 0;
    let totalCount = 0;

    games.forEach(game => {
      game.positions.forEach(pos => {
        if (colPositions.includes(pos.position)) {
          totalCount++;
          if (!pos.isChicken) boneCount++;
        }
      });
    });

    if (totalCount > 0) {
      const bonePercentage = (boneCount / totalCount) * 100;
      clusters.push({
        type: 'COLUMN',
        identifier: `Columna ${col + 1}`,
        positions: colPositions,
        boneCount,
        totalCount,
        bonePercentage: Math.round(bonePercentage),
        riskLevel: bonePercentage > 20 ? 'HIGH' : bonePercentage > 12 ? 'MEDIUM' : 'LOW',
      });
    }
  }

  return clusters.filter(c => c.totalCount > 0);
}
