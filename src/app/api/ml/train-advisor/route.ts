// Endpoint para entrenar el asesor ML con partidas simuladas
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { selectPositionML, updateMLFromGame, loadMLState } from '@/lib/ml/reinforcement-learning';
import { readFileSync } from 'fs';
import { join } from 'path';

// Cargar configuración del simulador
function loadSimulatorConfig() {
  try {
    const configPath = join(process.cwd(), 'ml-simulator-config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    return config;
  } catch (error) {
    return null;
  }
}

// Generar huesos usando configuración del simulador
function generateRealisticBones(config: any, previousBones: number[] = []): number[] {
  const bones: number[] = [];
  const allPositions = Array.from({ length: 25 }, (_, i) => i + 1);
  
  const weightedCandidates = allPositions.map(pos => {
    let weight = config.boneFrequencyWeights[pos] || 0.04;
    
    // Aplicar rotación según overlap real
    if (previousBones.includes(pos)) {
      const overlapFactor = config.overlapPercentage / 100;
      weight *= overlapFactor;
    }
    
    return { pos, weight };
  });
  
  while (bones.length < 4) {
    const available = weightedCandidates.filter(c => !bones.includes(c.pos));
    const totalWeight = available.reduce((sum, c) => sum + c.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const candidate of available) {
      random -= candidate.weight;
      if (random <= 0) {
        bones.push(candidate.pos);
        break;
      }
    }
  }
  
  return bones.sort((a, b) => a - b);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      trainingGames = 100,
      targetPositions = 5,
      validateAfter = true,
    } = body;

    console.log('🤖 Iniciando entrenamiento del asesor ML...');
    console.log(`📊 Partidas de entrenamiento: ${trainingGames}`);
    console.log(`🎯 Objetivo: ${targetPositions} pollos`);

    // 1. Verificar que el simulador esté entrenado
    const simulatorConfig = loadSimulatorConfig();
    if (!simulatorConfig) {
      return NextResponse.json({
        error: 'Simulator not trained',
        message: 'Primero debes entrenar el simulador usando POST /api/ml/train-simulator',
      }, { status: 400 });
    }

    console.log(`✅ Simulador cargado (entrenado con ${simulatorConfig.trainedWith} partidas)`);

    // 2. Cargar estado actual del ML
    await loadMLState();
    console.log('✅ Estado del ML cargado');

    // 3. Entrenar con partidas simuladas
    let victorias = 0;
    let derrotas = 0;
    let totalPosicionesReveladas = 0;
    let previousBones: number[] = [];

    const posicionesUsadas = new Map<number, { usos: number; exitos: number }>();

    for (let i = 0; i < trainingGames; i++) {
      // Generar huesos realistas
      const bones = generateRealisticBones(simulatorConfig, previousBones);
      previousBones = bones;

      // Jugar partida con el asesor
      const revealedPositions: number[] = [];
      let hitBone = false;
      let reachedObjective = false;

      while (!hitBone && !reachedObjective && revealedPositions.length < 21) {
        // Obtener sugerencia del ML
        const prediction = await selectPositionML(revealedPositions);
        const suggestedPos = prediction.position;

        // Registrar uso
        if (!posicionesUsadas.has(suggestedPos)) {
          posicionesUsadas.set(suggestedPos, { usos: 0, exitos: 0 });
        }
        const posStats = posicionesUsadas.get(suggestedPos)!;
        posStats.usos++;

        // Verificar si es hueso
        if (bones.includes(suggestedPos)) {
          hitBone = true;
          revealedPositions.push(suggestedPos);
          
          // Actualizar ML con resultado negativo
          await updateMLFromGame(suggestedPos, false, 1);
        } else {
          revealedPositions.push(suggestedPos);
          posStats.exitos++;
          
          // Actualizar ML con resultado positivo
          await updateMLFromGame(suggestedPos, true, 1);

          // Verificar si alcanzó objetivo
          if (revealedPositions.length >= targetPositions) {
            reachedObjective = true;
          }
        }
      }

      // Registrar resultado
      totalPosicionesReveladas += revealedPositions.length;

      if (reachedObjective && !hitBone) {
        victorias++;
      } else if (hitBone) {
        derrotas++;
      }

      // Mostrar progreso cada 20 partidas
      if ((i + 1) % 20 === 0) {
        const tasaActual = (victorias / (i + 1)) * 100;
        console.log(
          `Partida ${i + 1}/${trainingGames} | Victorias: ${victorias} | Tasa: ${tasaActual.toFixed(1)}%`
        );
      }
    }

    // 4. Calcular métricas finales
    const tasaExito = (victorias / trainingGames) * 100;
    const promedioPosiciones = totalPosicionesReveladas / trainingGames;

    console.log('✅ Entrenamiento completado');
    console.log(`📊 Tasa de éxito: ${tasaExito.toFixed(2)}%`);
    console.log(`📍 Promedio posiciones: ${promedioPosiciones.toFixed(2)}`);

    // 5. Validación opcional
    let validationResults = null;
    if (validateAfter) {
      console.log('🔍 Ejecutando validación...');
      
      const validationGames = 50;
      let validationVictorias = 0;
      let validationDerrotas = 0;

      for (let i = 0; i < validationGames; i++) {
        const bones = generateRealisticBones(simulatorConfig, previousBones);
        previousBones = bones;

        const revealedPositions: number[] = [];
        let hitBone = false;
        let reachedObjective = false;

        while (!hitBone && !reachedObjective && revealedPositions.length < 21) {
          const prediction = await selectPositionML(revealedPositions);
          const suggestedPos = prediction.position;

          if (bones.includes(suggestedPos)) {
            hitBone = true;
            revealedPositions.push(suggestedPos);
          } else {
            revealedPositions.push(suggestedPos);
            if (revealedPositions.length >= targetPositions) {
              reachedObjective = true;
            }
          }
        }

        if (reachedObjective && !hitBone) {
          validationVictorias++;
        } else if (hitBone) {
          validationDerrotas++;
        }
      }

      const validationTasa = (validationVictorias / validationGames) * 100;
      
      validationResults = {
        games: validationGames,
        victorias: validationVictorias,
        derrotas: validationDerrotas,
        tasaExito: parseFloat(validationTasa.toFixed(2)),
      };

      console.log(`✅ Validación: ${validationTasa.toFixed(2)}% éxito`);
    }

    // 6. Análisis de posiciones
    const topPosiciones = Array.from(posicionesUsadas.entries())
      .map(([pos, stats]) => ({
        posicion: pos,
        usos: stats.usos,
        exitos: stats.exitos,
        tasaExito: parseFloat(((stats.exitos / stats.usos) * 100).toFixed(2)),
      }))
      .sort((a, b) => b.usos - a.usos)
      .slice(0, 15);

    // 7. Comparar con posiciones seguras del simulador
    const posicionesSeguras = simulatorConfig.safePositions || [];
    const posicionesSeguraUsadas = posicionesSeguras.filter((pos: number) =>
      posicionesUsadas.has(pos)
    );

    const porcentajeSeguras = (posicionesSeguraUsadas.length / posicionesSeguras.length) * 100;

    return NextResponse.json({
      success: true,
      message: 'Asesor ML entrenado exitosamente',
      training: {
        games: trainingGames,
        victorias,
        derrotas,
        tasaExito: parseFloat(tasaExito.toFixed(2)),
        promedioPosiciones: parseFloat(promedioPosiciones.toFixed(2)),
        targetPositions,
      },
      validation: validationResults,
      analysis: {
        topPosiciones,
        posicionesSeguras: posicionesSeguras.length,
        posicionesSeguraUsadas: posicionesSeguraUsadas.length,
        porcentajeSeguras: parseFloat(porcentajeSeguras.toFixed(2)),
      },
      simulator: {
        trainedWith: simulatorConfig.trainedWith,
        trainedAt: simulatorConfig.trainedAt,
      },
      recommendation:
        tasaExito >= 55
          ? '✅ Excelente: El asesor está listo para uso en producción'
          : tasaExito >= 50
          ? '✅ Bueno: El asesor funciona bien, considera más entrenamiento'
          : tasaExito >= 45
          ? '⚠️ Regular: Se recomienda más entrenamiento o ajustes'
          : '❌ Bajo: Requiere optimización urgente',
    });

  } catch (error) {
    console.error('❌ Error entrenando asesor:', error);
    return NextResponse.json(
      {
        error: 'Training failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET - Obtener estado actual del entrenamiento
export async function GET() {
  try {
    // Verificar si el simulador está entrenado
    const simulatorConfig = loadSimulatorConfig();
    
    if (!simulatorConfig) {
      return NextResponse.json({
        simulatorTrained: false,
        message: 'Simulador no entrenado. Usa POST /api/ml/train-simulator primero',
      });
    }

    // Obtener estadísticas de partidas simuladas
    const partidasSimuladas = await db.chickenGame.count({
      where: { isSimulated: true },
    });

    const partidasReales = await db.chickenGame.count({
      where: { isSimulated: false },
    });

    return NextResponse.json({
      simulatorTrained: true,
      simulator: {
        trainedWith: simulatorConfig.trainedWith,
        trainedAt: simulatorConfig.trainedAt,
        posicionesSeguras: simulatorConfig.safePositions?.length || 0,
        posicionesPeligrosas: simulatorConfig.dangerousPositions?.length || 0,
      },
      database: {
        partidasReales,
        partidasSimuladas,
        total: partidasReales + partidasSimuladas,
      },
      ready: true,
      suggestion: 'Usa POST /api/ml/train-advisor para entrenar el asesor',
    });

  } catch (error) {
    console.error('Error getting training status:', error);
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    );
  }
}
