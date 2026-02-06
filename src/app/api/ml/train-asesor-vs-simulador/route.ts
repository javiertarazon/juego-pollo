// NUEVO ENDPOINT: Entrenar Asesor ML jugando contra Simulador de Mystake
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { selectPositionML, updateMLFromGame, resetStopLoss } from '@/lib/ml/reinforcement-learning';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Cargar patrones del simulador de Mystake
function loadMystakeSimulator() {
  const configPath = join(process.cwd(), 'ml-simulator-config.json');
  if (!existsSync(configPath)) {
    throw new Error('Simulador no entrenado. Usa primero POST /api/ml/train-simulator');
  }
  return JSON.parse(readFileSync(configPath, 'utf-8'));
}

// Generar posiciones de huesos según patrones de Mystake
function generateMystakeBones(patterns: any, boneCount: number): number[] {
  const bones: number[] = [];
  const weights = patterns.boneFrequencyWeights;
  
  // Crear array con todas las posiciones y sus pesos
  const weightedPositions = Object.entries(weights).map(([pos, weight]) => ({
    position: parseInt(pos),
    weight: weight as number
  }));
  
  // Seleccionar huesos usando distribución ponderada
  const available = [...weightedPositions];
  
  while (bones.length < boneCount && available.length > 0) {
    const totalWeight = available.reduce((sum, p) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < available.length; i++) {
      random -= available[i].weight;
      if (random <= 0) {
        bones.push(available[i].position);
        available.splice(i, 1);
        break;
      }
    }
  }
  
  // Si faltan huesos, agregar aleatorios de los disponibles
  while (bones.length < boneCount) {
    const allPositions = Array.from({ length: 25 }, (_, i) => i + 1);
    const remaining = allPositions.filter(p => !bones.includes(p));
    if (remaining.length === 0) break;
    const randomPos = remaining[Math.floor(Math.random() * remaining.length)];
    bones.push(randomPos);
  }
  
  return bones.sort((a, b) => a - b);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      trainingGames = 100,
      targetPositions = 5,
      boneCount = 3,
      saveToDatabase = false, // Opción de guardar partidas
      showProgressEvery = 10, // Mostrar progreso cada N partidas
    } = body;

    console.log('🎮 INICIANDO ENTRENAMIENTO: Asesor ML vs Simulador Mystake');
    console.log(`📊 Partidas: ${trainingGames} | Objetivo: ${targetPositions} pollos | Huesos: ${boneCount}`);
    console.log(`💾 Guardar en BD: ${saveToDatabase ? 'SÍ' : 'NO'}`);

    // 1. Cargar simulador de Mystake
    const mystakePatterns = loadMystakeSimulator();
    console.log(`✅ Simulador cargado (${mystakePatterns.trainedWith} partidas reales)`);

    // 2. Resetear stop-loss del asesor
    resetStopLoss();

    // 3. MÉTRICAS GLOBALES
    const metrics = {
      // Por partida
      partidas: [] as any[],
      
      // Globales
      totalVictorias: 0,
      totalDerrotas: 0,
      totalIncompletas: 0,
      totalPosicionesReveladas: 0,
      
      // Por rangos de partidas (cada 10)
      evolucionPorRango: [] as any[],
      
      // Posiciones usadas por el asesor
      posicionesUsadas: new Map<number, { usos: number; exitos: number; fallos: number }>(),
      
      // Posiciones de huesos (del simulador)
      posicionesHuesos: new Map<number, number>(), // posición -> cantidad de veces que fue hueso
      
      // Rachas
      rachaVictoriaActual: 0,
      rachaVictoriaMaxima: 0,
      rachaDerrotaActual: 0,
      rachaDerrotaMaxima: 0,
      rachas: [] as any[],
    };

    // Inicializar mapas
    for (let i = 1; i <= 25; i++) {
      metrics.posicionesUsadas.set(i, { usos: 0, exitos: 0, fallos: 0 });
      metrics.posicionesHuesos.set(i, 0);
    }

    // 4. ENTRENAR: Asesor juega contra Simulador
    for (let gameNum = 1; gameNum <= trainingGames; gameNum++) {
      // Generar posiciones de huesos según Mystake
      const bonePositions = generateMystakeBones(mystakePatterns, boneCount);
      
      // Registrar huesos generados
      bonePositions.forEach(pos => {
        metrics.posicionesHuesos.set(pos, (metrics.posicionesHuesos.get(pos) || 0) + 1);
      });
      
      // Jugar partida: Asesor revela posiciones
      const revealedPositions: number[] = [];
      let hitBone = false;
      let reachedTarget = false;
      
      while (!hitBone && !reachedTarget && revealedPositions.length < 21) {
        // Resetear stop-loss cada 50 partidas
        if (gameNum % 50 === 0 && revealedPositions.length === 0) {
          resetStopLoss();
        }
        
        // Asesor sugiere posición (con stop-loss desactivado durante entrenamiento)
        const prediction = await selectPositionML(revealedPositions, true);
        const suggestedPos = prediction.position;
        
        // Registrar uso
        const posStats = metrics.posicionesUsadas.get(suggestedPos)!;
        posStats.usos++;
        
        // Verificar si es hueso
        if (bonePositions.includes(suggestedPos)) {
          hitBone = true;
          revealedPositions.push(suggestedPos);
          posStats.fallos++;
          
          // Actualizar ML: falló
          await updateMLFromGame(suggestedPos, false, 1);
        } else {
          revealedPositions.push(suggestedPos);
          posStats.exitos++;
          
          // Actualizar ML: acertó
          await updateMLFromGame(suggestedPos, true, 1);
          
          // Verificar si alcanzó objetivo
          if (revealedPositions.length >= targetPositions) {
            reachedTarget = true;
          }
        }
      }
      
      // Resultado de la partida
      const isVictoria = reachedTarget && !hitBone;
      const isDerrota = hitBone;
      
      // Actualizar métricas globales
      if (isVictoria) {
        metrics.totalVictorias++;
        metrics.rachaVictoriaActual++;
        metrics.rachaDerrotaActual = 0;
        metrics.rachaVictoriaMaxima = Math.max(metrics.rachaVictoriaMaxima, metrics.rachaVictoriaActual);
      } else if (isDerrota) {
        metrics.totalDerrotas++;
        metrics.rachaDerrotaActual++;
        metrics.rachaVictoriaActual = 0;
        metrics.rachaDerrotaMaxima = Math.max(metrics.rachaDerrotaMaxima, metrics.rachaDerrotaActual);
      } else {
        metrics.totalIncompletas++;
        metrics.rachaVictoriaActual = 0;
        metrics.rachaDerrotaActual = 0;
      }
      
      metrics.totalPosicionesReveladas += revealedPositions.length;
      
      // Guardar info de partida
      metrics.partidas.push({
        numero: gameNum,
        victoria: isVictoria,
        derrota: isDerrota,
        posicionesReveladas: revealedPositions.length,
        huesosTocados: hitBone ? 1 : 0,
        posicionFallo: hitBone ? revealedPositions[revealedPositions.length - 1] : null,
      });
      
      // Guardar en BD si está habilitado
      if (saveToDatabase) {
        const allPositions = Array.from({ length: 25 }, (_, i) => i + 1);
        const safeCashOutPosition = isVictoria ? revealedPositions.length : 0;
        await db.chickenGame.create({
          data: {
            boneCount,
            revealedCount: revealedPositions.length,
            hitBone,
            cashOutPosition: safeCashOutPosition,
            multiplier: 0,
            isSimulated: true,
            objetivo: targetPositions,
            modoJuego: 'entrenamiento',
            streakStateId: 'default',
            positions: {
              create: allPositions.map((pos) => ({
                position: pos,
                isChicken: !bonePositions.includes(pos),
                revealed: revealedPositions.includes(pos),
                revealOrder: revealedPositions.indexOf(pos) >= 0 ? revealedPositions.indexOf(pos) + 1 : 0,
              })),
            },
          },
        });
      }
      
      // Mostrar progreso
      if (gameNum % showProgressEvery === 0) {
        const tasaActual = (metrics.totalVictorias / gameNum) * 100;
        console.log(`Partida ${gameNum}/${trainingGames} | Victorias: ${metrics.totalVictorias} (${tasaActual.toFixed(1)}%) | Racha: ${metrics.rachaVictoriaActual}V/${metrics.rachaDerrotaActual}D`);
        
        // Guardar evolución por rango
        metrics.evolucionPorRango.push({
          rango: `${gameNum - showProgressEvery + 1}-${gameNum}`,
          partidasJugadas: gameNum,
          victorias: metrics.totalVictorias,
          derrotas: metrics.totalDerrotas,
          tasaExito: parseFloat(tasaActual.toFixed(2)),
        });
      }
    }

    // 5. CALCULAR MÉTRICAS FINALES
    const tasaExitoFinal = (metrics.totalVictorias / trainingGames) * 100;
    const promedioReveladas = metrics.totalPosicionesReveladas / trainingGames;
    
    // Top 10 posiciones más usadas por asesor
    const topPosicionesAsesor = Array.from(metrics.posicionesUsadas.entries())
      .map(([pos, stats]) => ({
        posicion: pos,
        usos: stats.usos,
        exitos: stats.exitos,
        fallos: stats.fallos,
        tasaExito: stats.usos > 0 ? parseFloat(((stats.exitos / stats.usos) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.usos - a.usos)
      .slice(0, 10);
    
    // Top 10 posiciones más calientes (más huesos)
    const posicionesCalientes = Array.from(metrics.posicionesHuesos.entries())
      .map(([pos, count]) => ({
        posicion: pos,
        vecesHueso: count,
        frecuencia: parseFloat(((count / trainingGames) * 100).toFixed(2)),
      }))
      .sort((a, b) => b.vecesHueso - a.vecesHueso)
      .slice(0, 10);
    
    // Top 10 posiciones más frías (menos huesos)
    const posicionesFrias = Array.from(metrics.posicionesHuesos.entries())
      .map(([pos, count]) => ({
        posicion: pos,
        vecesHueso: count,
        frecuencia: parseFloat(((count / trainingGames) * 100).toFixed(2)),
      }))
      .sort((a, b) => a.vecesHueso - b.vecesHueso)
      .slice(0, 10);
    
    // Posiciones más seguras para 1ra y 2da sugerencia
    const primerasSugerencias = metrics.partidas
      .filter(p => p.posicionesReveladas >= 1)
      .map(p => revealedPositions => revealedPositions[0]);
    
    const posicionesSegurasPrimera = topPosicionesAsesor
      .filter(p => p.usos >= trainingGames * 0.05) // Mínimo 5% de uso
      .sort((a, b) => b.tasaExito - a.tasaExito)
      .slice(0, 5);
    
    // Comparación Asesor vs Mystake (estimado)
    const tasaMystakeEstimada = mystakePatterns.averageSuccessRate || 50;
    
    console.log(`\n✅ ENTRENAMIENTO COMPLETADO`);
    console.log(`📊 Tasa de éxito: ${tasaExitoFinal.toFixed(2)}%`);
    console.log(`🏆 Racha máxima victorias: ${metrics.rachaVictoriaMaxima}`);
    console.log(`📉 Racha máxima derrotas: ${metrics.rachaDerrotaMaxima}`);

    return NextResponse.json({
      success: true,
      message: 'Entrenamiento completado exitosamente',
      
      // Resumen general
      resumen: {
        partidasJugadas: trainingGames,
        victorias: metrics.totalVictorias,
        derrotas: metrics.totalDerrotas,
        incompletas: metrics.totalIncompletas,
        tasaExito: parseFloat(tasaExitoFinal.toFixed(2)),
        promedioReveladas: parseFloat(promedioReveladas.toFixed(2)),
        guardadoEnBD: saveToDatabase,
      },
      
      // Evolución del aprendizaje
      evolucion: metrics.evolucionPorRango,
      
      // Análisis de posiciones - ASESOR
      asesor: {
        topPosiciones: topPosicionesAsesor,
        posicionesSegurasPrimera: posicionesSegurasPrimera.map(p => ({
          posicion: p.posicion,
          tasaExito: p.tasaExito,
          usos: p.usos,
        })),
      },
      
      // Análisis de posiciones - SIMULADOR MYSTAKE
      simulador: {
        posicionesCalientes: posicionesCalientes,
        posicionesFrias: posicionesFrias,
        patronesUsados: {
          trainedWith: mystakePatterns.trainedWith,
          trainedAt: mystakePatterns.trainedAt,
        },
      },
      
      // Rachas
      rachas: {
        victoriasMaxima: metrics.rachaVictoriaMaxima,
        derrotasMaxima: metrics.rachaDerrotaMaxima,
        victoriasActual: metrics.rachaVictoriaActual,
        derrotasActual: metrics.rachaDerrotaActual,
      },
      
      // Comparación Asesor vs Mystake
      comparacion: {
        asesorTasaExito: parseFloat(tasaExitoFinal.toFixed(2)),
        mystakeTasaEstimada: tasaMystakeEstimada,
        diferencia: parseFloat((tasaExitoFinal - tasaMystakeEstimada).toFixed(2)),
        ganador: tasaExitoFinal > tasaMystakeEstimada ? 'ASESOR' : 'MYSTAKE',
      },
      
      // Recomendación
      recomendacion: 
        tasaExitoFinal >= 60 ? '🏆 Excelente: Asesor supera ampliamente a Mystake' :
        tasaExitoFinal >= 50 ? '✅ Bueno: Asesor competitivo, listo para producción' :
        tasaExitoFinal >= 40 ? '⚠️ Regular: Requiere más entrenamiento' :
        '❌ Bajo: Ajustar parámetros o aumentar partidas de entrenamiento',
    });

  } catch (error) {
    console.error('❌ Error en entrenamiento:', error);
    return NextResponse.json(
      {
        error: 'Training failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET - Estado del entrenamiento
export async function GET() {
  try {
    const configPath = join(process.cwd(), 'ml-simulator-config.json');
    const simulatorTrained = existsSync(configPath);
    
    if (!simulatorTrained) {
      return NextResponse.json({
        ready: false,
        message: 'Primero entrena el simulador con POST /api/ml/train-simulator',
      });
    }
    
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    
    return NextResponse.json({
      ready: true,
      simulator: {
        trainedWith: config.trainedWith,
        trainedAt: config.trainedAt,
        posicionesAnalizadas: Object.keys(config.boneFrequencyWeights).length,
      },
      message: 'Simulador listo. Usa POST para entrenar el asesor',
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    );
  }
}
