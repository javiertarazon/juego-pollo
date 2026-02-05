// Endpoint para entrenar el simulador con partidas reales
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { writeFileSync } from 'fs';
import { join } from 'path';

interface PosicionStats {
  posicion: number;
  vecesHueso: number;
  vecesPollo: number;
  totalApariciones: number;
  tasaHueso: number;
}

export async function POST(req: NextRequest) {
  try {
    console.log('🎓 Iniciando entrenamiento del simulador...');

    // 1. Obtener TODAS las partidas reales
    const partidasReales = await db.chickenGame.findMany({
      where: { isSimulated: false },
      orderBy: { createdAt: 'desc' },
      include: { positions: true },
    });

    if (partidasReales.length < 50) {
      return NextResponse.json({
        error: 'Insufficient data',
        message: `Se necesitan al menos 50 partidas reales. Actualmente hay ${partidasReales.length}`,
        partidasReales: partidasReales.length,
      }, { status: 400 });
    }

    console.log(`📊 Analizando ${partidasReales.length} partidas reales...`);

    // 2. Analizar frecuencia de huesos por posición
    const posicionesStats = new Map<number, PosicionStats>();

    for (let pos = 1; pos <= 25; pos++) {
      posicionesStats.set(pos, {
        posicion: pos,
        vecesHueso: 0,
        vecesPollo: 0,
        totalApariciones: 0,
        tasaHueso: 0,
      });
    }

    partidasReales.forEach((partida) => {
      partida.positions.forEach((pos) => {
        const stats = posicionesStats.get(pos.position)!;
        stats.totalApariciones++;
        if (pos.isChicken) {
          stats.vecesPollo++;
        } else {
          stats.vecesHueso++;
        }
      });
    });

    // Calcular tasas
    const totalHuesos = Array.from(posicionesStats.values()).reduce(
      (sum, s) => sum + s.vecesHueso,
      0
    );

    posicionesStats.forEach((stats) => {
      stats.tasaHueso = (stats.vecesHueso / stats.totalApariciones) * 100;
    });

    // 3. Calcular pesos normalizados para el simulador
    const boneFrequencyWeights: Record<number, number> = {};
    posicionesStats.forEach((stats) => {
      const peso = stats.vecesHueso / totalHuesos;
      boneFrequencyWeights[stats.posicion] = parseFloat(peso.toFixed(4));
    });

    // 4. Analizar rotación de huesos
    let totalComparaciones = 0;
    let huesosRepetidos = 0;

    for (let i = 0; i < partidasReales.length - 1; i++) {
      const huesosActual = partidasReales[i].positions
        .filter((p) => !p.isChicken)
        .map((p) => p.position);

      const huesosSiguiente = partidasReales[i + 1].positions
        .filter((p) => !p.isChicken)
        .map((p) => p.position);

      const repetidos = huesosActual.filter((h) =>
        huesosSiguiente.includes(h)
      ).length;

      huesosRepetidos += repetidos;
      totalComparaciones++;
    }

    const promedioOverlap = huesosRepetidos / totalComparaciones;
    const porcentajeOverlap = (promedioOverlap / 4) * 100;

    // 5. Identificar posiciones seguras (90%+ pollos)
    const posicionesSeguras = Array.from(posicionesStats.values())
      .filter((s) => s.vecesPollo / s.totalApariciones >= 0.90)
      .sort((a, b) => b.vecesPollo / b.totalApariciones - a.vecesPollo / a.totalApariciones)
      .map((s) => s.posicion);

    // 6. Identificar posiciones peligrosas (10%+ huesos)
    const posicionesPeligrosas = Array.from(posicionesStats.values())
      .filter((s) => s.tasaHueso >= 10)
      .map((s) => s.posicion);

    // 7. Analizar comportamiento de retiro
    const retirosPorPosicion = new Map<number, number>();
    let totalRetiros = 0;

    partidasReales.forEach((partida) => {
      if (!partida.hitBone && partida.cashOutPosition) {
        retirosPorPosicion.set(
          partida.cashOutPosition,
          (retirosPorPosicion.get(partida.cashOutPosition) || 0) + 1
        );
        totalRetiros++;
      }
    });

    const cashOutBehavior: Record<number, number> = {};
    retirosPorPosicion.forEach((count, pos) => {
      cashOutBehavior[pos] = parseFloat((count / totalRetiros).toFixed(4));
    });

    // 8. Posiciones más reveladas
    const posicionesReveladas = new Map<number, number>();
    partidasReales.forEach((partida) => {
      partida.positions
        .filter((p) => p.revealed)
        .forEach((p) => {
          posicionesReveladas.set(
            p.position,
            (posicionesReveladas.get(p.position) || 0) + 1
          );
        });
    });

    const mostRevealedPositions = Array.from(posicionesReveladas.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([pos]) => pos);

    // 9. Generar configuración actualizada
    const updatedPatterns = {
      boneFrequencyWeights,
      safePositions: posicionesSeguras,
      dangerousPositions: posicionesPeligrosas,
      averageOverlap: parseFloat(promedioOverlap.toFixed(2)),
      overlapPercentage: parseFloat(porcentajeOverlap.toFixed(2)),
      mostRevealedPositions,
      cashOutBehavior,
      trainedWith: partidasReales.length,
      trainedAt: new Date().toISOString(),
    };

    // 10. Guardar configuración en archivo
    const configPath = join(process.cwd(), 'ml-simulator-config.json');
    writeFileSync(configPath, JSON.stringify(updatedPatterns, null, 2));

    console.log('✅ Simulador entrenado exitosamente');
    console.log(`📊 Partidas usadas: ${partidasReales.length}`);
    console.log(`🎯 Posiciones seguras: ${posicionesSeguras.length}`);
    console.log(`⚠️  Posiciones peligrosas: ${posicionesPeligrosas.length}`);
    console.log(`🔄 Overlap promedio: ${promedioOverlap.toFixed(2)} (${porcentajeOverlap.toFixed(2)}%)`);

    // 11. Estadísticas para respuesta
    const topSeguras = Array.from(posicionesStats.values())
      .sort((a, b) => (b.vecesPollo / b.totalApariciones) - (a.vecesPollo / a.totalApariciones))
      .slice(0, 10)
      .map((s) => ({
        posicion: s.posicion,
        tasaPollo: parseFloat(((s.vecesPollo / s.totalApariciones) * 100).toFixed(2)),
        usos: s.totalApariciones,
      }));

    const topPeligrosas = Array.from(posicionesStats.values())
      .sort((a, b) => b.tasaHueso - a.tasaHueso)
      .slice(0, 10)
      .map((s) => ({
        posicion: s.posicion,
        tasaHueso: parseFloat(s.tasaHueso.toFixed(2)),
        usos: s.totalApariciones,
      }));

    return NextResponse.json({
      success: true,
      message: 'Simulador entrenado exitosamente',
      training: {
        partidasReales: partidasReales.length,
        posicionesSeguras: posicionesSeguras.length,
        posicionesPeligrosas: posicionesPeligrosas.length,
        averageOverlap: promedioOverlap.toFixed(2),
        overlapPercentage: porcentajeOverlap.toFixed(2) + '%',
      },
      patterns: {
        topSeguras,
        topPeligrosas,
        mostRevealedPositions,
        cashOutBehavior,
      },
      config: updatedPatterns,
      configSaved: configPath,
    });

  } catch (error) {
    console.error('❌ Error entrenando simulador:', error);
    return NextResponse.json(
      {
        error: 'Training failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET - Obtener configuración actual del simulador
export async function GET() {
  try {
    const configPath = join(process.cwd(), 'ml-simulator-config.json');
    const fs = require('fs');
    
    if (!fs.existsSync(configPath)) {
      return NextResponse.json({
        message: 'No training data found',
        suggestion: 'Train the simulator first using POST /api/ml/train-simulator',
      });
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    return NextResponse.json({
      success: true,
      config,
      trainedWith: config.trainedWith,
      trainedAt: config.trainedAt,
    });

  } catch (error) {
    console.error('Error getting simulator config:', error);
    return NextResponse.json(
      { error: 'Failed to get config' },
      { status: 500 }
    );
  }
}
