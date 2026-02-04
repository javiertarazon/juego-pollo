#!/usr/bin/env tsx
/**
 * ML PREDICTOR V5 - STANDALONE
 * Script independiente que usa el sistema de Machine Learning
 * sin depender del servidor Next.js
 * 
 * Uso:
 *   npx tsx ml-predictor-standalone.ts predict
 *   npx tsx ml-predictor-standalone.ts update 15 true
 *   npx tsx ml-predictor-standalone.ts stats
 *   npx tsx ml-predictor-standalone.ts test 10
 */

import { PrismaClient } from '@prisma/client';
import {
  selectPositionML,
  updateMLFromGame,
  getMLStats,
  resetMLState,
  loadMLState,
} from './src/lib/ml/reinforcement-learning';

const prisma = new PrismaClient();

// Colores para terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

/**
 * Comando: predict
 * Obtener predicción ML
 */
async function predictCommand(revealedPositions: number[] = []) {
  log('\n🤖 ML PREDICTOR V5 - PREDICCIÓN', colors.bright + colors.cyan);
  log('='.repeat(80), colors.cyan);

  try {
    const result = await selectPositionML(revealedPositions);

    log(`\n✨ PREDICCIÓN:`, colors.bright);
    log(`   Posición: ${result.position}`, colors.green);
    log(`   Estrategia: ${result.strategy}`, colors.yellow);
    log(`   Zona: ${result.zone}`, colors.blue);
    log(`   Confianza: ${result.confidence}%`, colors.magenta);
    log(`   Q-Value: ${result.qValue.toFixed(3)}`, colors.cyan);
    log(`   Epsilon: ${result.epsilon.toFixed(3)}`, colors.yellow);

    const stats = getMLStats();
    log(`\n📊 ESTADÍSTICAS ML:`, colors.bright);
    log(`   Total partidas: ${stats.totalGames}`);
    log(`   Exploraciones: ${stats.explorationCount} (${((stats.explorationCount / Math.max(stats.totalGames, 1)) * 100).toFixed(1)}%)`);
    log(`   Explotaciones: ${stats.exploitationCount}`);
    log(`   Última zona: ${stats.lastZoneUsed}`);
    log(`   Memoria (últimas 7): [${stats.consecutiveSafePositions.join(', ')}]`);

    log(`\n🏆 TOP 5 POSICIONES:`, colors.bright);
    stats.topPositions.slice(0, 5).forEach((pos, idx) => {
      log(`   ${idx + 1}. Pos ${pos.position}: Q=${pos.qValue} | Win Rate=${pos.successRate}`);
    });

    return result;
  } catch (error) {
    log(`\n❌ ERROR: ${error instanceof Error ? error.message : 'Unknown'}`, colors.red);
    throw error;
  }
}

/**
 * Comando: update
 * Actualizar ML después de una partida
 */
async function updateCommand(position: number, wasSuccess: boolean, reward: number = 1.0) {
  log('\n📈 ML PREDICTOR V5 - ACTUALIZACIÓN', colors.bright + colors.cyan);
  log('='.repeat(80), colors.cyan);

  try {
    log(`\n🎮 Actualizando con:`, colors.bright);
    log(`   Posición: ${position}`);
    log(`   Resultado: ${wasSuccess ? '✅ VICTORIA' : '❌ DERROTA'}`, wasSuccess ? colors.green : colors.red);
    log(`   Recompensa: ${reward}`);

    await updateMLFromGame(position, wasSuccess, reward);

    const stats = getMLStats();
    log(`\n✅ ML actualizado exitosamente`, colors.green);
    log(`   Epsilon actual: ${stats.epsilon}`);
    log(`   Total partidas: ${stats.totalGames}`);

    // Mostrar Q-value actualizado de la posición
    const posStats = stats.topPositions.find(p => p.position === position);
    if (posStats) {
      log(`   Q-value Pos ${position}: ${posStats.qValue} | Win Rate: ${posStats.successRate}`);
    }
  } catch (error) {
    log(`\n❌ ERROR: ${error instanceof Error ? error.message : 'Unknown'}`, colors.red);
    throw error;
  }
}

/**
 * Comando: stats
 * Mostrar estadísticas completas del ML
 */
async function statsCommand() {
  log('\n📊 ML PREDICTOR V5 - ESTADÍSTICAS COMPLETAS', colors.bright + colors.cyan);
  log('='.repeat(80), colors.cyan);

  try {
    await loadMLState();
    const stats = getMLStats();

    log(`\n🎯 ESTADO GENERAL:`, colors.bright);
    log(`   Total partidas: ${stats.totalGames}`);
    log(`   Epsilon (exploración): ${stats.epsilon} (${(parseFloat(stats.epsilon) * 100).toFixed(1)}%)`);
    log(`   Exploraciones: ${stats.explorationCount}`);
    log(`   Explotaciones: ${stats.exploitationCount}`);
    log(`   Tasa exploración: ${stats.totalGames > 0 ? ((stats.explorationCount / stats.totalGames) * 100).toFixed(1) : 0}%`);

    log(`\n🗺️ ZONAS:`, colors.bright);
    log(`   Última zona usada: ${stats.lastZoneUsed}`);
    log(`   Próxima zona: ${stats.lastZoneUsed === 'ZONE_A' ? 'ZONE_B' : 'ZONE_A'}`);

    log(`\n🔄 MEMORIA DE SECUENCIA (últimas 7 posiciones seguras):`, colors.bright);
    if (stats.consecutiveSafePositions.length > 0) {
      stats.consecutiveSafePositions.forEach((pos, idx) => {
        log(`   ${idx + 1}. Posición ${pos}`);
      });
    } else {
      log(`   (vacía - aún no hay partidas seguras)`);
    }

    log(`\n🏆 TOP 10 POSICIONES (por Q-value):`, colors.bright);
    stats.topPositions.forEach((pos, idx) => {
      const bar = '█'.repeat(Math.round(parseFloat(pos.qValue) * 20));
      log(`   ${(idx + 1).toString().padStart(2)}. Pos ${pos.position.toString().padStart(2)}: Q=${pos.qValue} ${bar} | Win Rate=${pos.successRate}`);
    });

    log(`\n⚙️ PARÁMETROS DE APRENDIZAJE:`, colors.bright);
    log(`   Learning Rate (α): ${stats.learningRate}`);
    log(`   Discount Factor (γ): ${stats.discountFactor}`);
    log(`   Epsilon mínimo: ${stats.minEpsilon}`);

    // Estadísticas de la base de datos
    const totalGames = await prisma.chickenGame.count({
      where: { isSimulated: false },
    });
    const recentGames = await prisma.chickenGame.findMany({
      where: { isSimulated: false },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });
    const recentWins = recentGames.filter(g => !g.hitBone).length;
    const winRate = (recentWins / recentGames.length) * 100;

    log(`\n📈 ESTADÍSTICAS DE PARTIDAS REALES:`, colors.bright);
    log(`   Total partidas en DB: ${totalGames}`);
    log(`   Últimas 20 partidas: ${recentWins} victorias (${winRate.toFixed(1)}%)`);

  } catch (error) {
    log(`\n❌ ERROR: ${error instanceof Error ? error.message : 'Unknown'}`, colors.red);
    throw error;
  }
}

/**
 * Comando: test
 * Probar el ML con N predicciones
 */
async function testCommand(count: number = 10) {
  log(`\n🧪 ML PREDICTOR V5 - TEST (${count} predicciones)`, colors.bright + colors.cyan);
  log('='.repeat(80), colors.cyan);

  try {
    const predictions: Array<{ position: number; zone: string; strategy: string }> = [];

    for (let i = 0; i < count; i++) {
      const result = await selectPositionML([]);
      predictions.push({
        position: result.position,
        zone: result.zone,
        strategy: result.strategy,
      });

      log(`\n${i + 1}. Pos ${result.position} | ${result.zone} | ${result.strategy} | Q=${result.qValue.toFixed(3)}`);
    }

    // Análisis de variedad
    log(`\n📊 ANÁLISIS DE VARIEDAD:`, colors.bright);
    const uniquePositions = new Set(predictions.map(p => p.position));
    const zoneA = predictions.filter(p => p.zone === 'ZONE_A').length;
    const zoneB = predictions.filter(p => p.zone === 'ZONE_B').length;
    const explores = predictions.filter(p => p.strategy === 'EXPLORE').length;
    const exploits = predictions.filter(p => p.strategy === 'EXPLOIT').length;

    log(`   Posiciones únicas: ${uniquePositions.size}/${count} (${((uniquePositions.size / count) * 100).toFixed(1)}%)`);
    log(`   Zona A: ${zoneA} (${((zoneA / count) * 100).toFixed(1)}%)`);
    log(`   Zona B: ${zoneB} (${((zoneB / count) * 100).toFixed(1)}%)`);
    log(`   Exploraciones: ${explores} (${((explores / count) * 100).toFixed(1)}%)`);
    log(`   Explotaciones: ${exploits} (${((exploits / count) * 100).toFixed(1)}%)`);

    // Frecuencia de posiciones
    const freq: Record<number, number> = {};
    predictions.forEach(p => {
      freq[p.position] = (freq[p.position] || 0) + 1;
    });

    log(`\n📈 FRECUENCIA DE POSICIONES:`, colors.bright);
    Object.entries(freq)
      .sort(([, a], [, b]) => b - a)
      .forEach(([pos, count]) => {
        const bar = '█'.repeat(count);
        log(`   Pos ${pos}: ${count} veces ${bar}`);
      });

    // Verificar alternancia de zonas
    log(`\n🔄 ALTERNANCIA DE ZONAS:`, colors.bright);
    let alternating = true;
    for (let i = 1; i < predictions.length; i++) {
      if (predictions[i].zone === predictions[i - 1].zone) {
        log(`   ⚠️ No alternó en predicción ${i + 1}: ${predictions[i - 1].zone} → ${predictions[i].zone}`, colors.yellow);
        alternating = false;
      }
    }
    if (alternating) {
      log(`   ✅ Todas las zonas alternaron correctamente`, colors.green);
    }

  } catch (error) {
    log(`\n❌ ERROR: ${error instanceof Error ? error.message : 'Unknown'}`, colors.red);
    throw error;
  }
}

/**
 * Comando: reset
 * Resetear estado del ML
 */
async function resetCommand() {
  log('\n🔄 ML PREDICTOR V5 - RESET', colors.bright + colors.cyan);
  log('='.repeat(80), colors.cyan);

  try {
    resetMLState();
    log(`\n✅ Estado del ML reseteado`, colors.green);
    log(`   Epsilon: 0.3 (30%)`);
    log(`   Total partidas: 0`);
    log(`   Q-values: Todos en 0.5 (neutral)`);
  } catch (error) {
    log(`\n❌ ERROR: ${error instanceof Error ? error.message : 'Unknown'}`, colors.red);
    throw error;
  }
}

/**
 * Comando: help
 * Mostrar ayuda
 */
function helpCommand() {
  log('\n📖 ML PREDICTOR V5 - AYUDA', colors.bright + colors.cyan);
  log('='.repeat(80), colors.cyan);

  log(`\n🎯 COMANDOS DISPONIBLES:\n`, colors.bright);

  log(`1. predict [pos1,pos2,...]`, colors.green);
  log(`   Obtener predicción ML`);
  log(`   Ejemplo: npx tsx ml-predictor-standalone.ts predict`);
  log(`   Ejemplo: npx tsx ml-predictor-standalone.ts predict 1,2,3\n`);

  log(`2. update <position> <success> [reward]`, colors.green);
  log(`   Actualizar ML después de una partida`);
  log(`   Ejemplo: npx tsx ml-predictor-standalone.ts update 15 true`);
  log(`   Ejemplo: npx tsx ml-predictor-standalone.ts update 9 false 1.0\n`);

  log(`3. stats`, colors.green);
  log(`   Mostrar estadísticas completas del ML`);
  log(`   Ejemplo: npx tsx ml-predictor-standalone.ts stats\n`);

  log(`4. test [count]`, colors.green);
  log(`   Probar el ML con N predicciones`);
  log(`   Ejemplo: npx tsx ml-predictor-standalone.ts test 10\n`);

  log(`5. reset`, colors.green);
  log(`   Resetear estado del ML`);
  log(`   Ejemplo: npx tsx ml-predictor-standalone.ts reset\n`);

  log(`6. help`, colors.green);
  log(`   Mostrar esta ayuda\n`);

  log(`\n💡 FLUJO DE USO TÍPICO:\n`, colors.bright);
  log(`1. Obtener predicción: npx tsx ml-predictor-standalone.ts predict`);
  log(`2. Jugar partida con la posición sugerida`);
  log(`3. Actualizar ML: npx tsx ml-predictor-standalone.ts update 15 true`);
  log(`4. Repetir pasos 1-3`);
  log(`5. Ver estadísticas: npx tsx ml-predictor-standalone.ts stats\n`);
}

/**
 * Main
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  try {
    switch (command) {
      case 'predict': {
        const revealed = args[1] ? args[1].split(',').map(Number) : [];
        await predictCommand(revealed);
        break;
      }

      case 'update': {
        const position = parseInt(args[1]);
        const wasSuccess = args[2] === 'true';
        const reward = args[3] ? parseFloat(args[3]) : 1.0;

        if (!position || isNaN(position)) {
          log('❌ Error: Posición inválida', colors.red);
          log('Uso: npx tsx ml-predictor-standalone.ts update <position> <true|false> [reward]');
          process.exit(1);
        }

        await updateCommand(position, wasSuccess, reward);
        break;
      }

      case 'stats': {
        await statsCommand();
        break;
      }

      case 'test': {
        const count = args[1] ? parseInt(args[1]) : 10;
        await testCommand(count);
        break;
      }

      case 'reset': {
        await resetCommand();
        break;
      }

      case 'help':
      default: {
        helpCommand();
        break;
      }
    }

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    log(`\n💥 ERROR FATAL: ${error instanceof Error ? error.message : 'Unknown'}`, colors.red);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Ejecutar
main();
