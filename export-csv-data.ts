#!/usr/bin/env tsx
/**
 * EXPORTADOR DE DATOS CSV - Sistema de Análisis de Partidas
 * 
 * Genera archivos CSV con datos históricos de partidas para:
 * - Análisis de patrones
 * - Entrenamiento de ML
 * - Investigación de estrategias
 * 
 * Uso:
 *   npx tsx export-csv-data.ts all
 *   npx tsx export-csv-data.ts detailed
 *   npx tsx export-csv-data.ts patterns
 *   npx tsx export-csv-data.ts ml-training
 */

import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

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

async function exportDetailedCSV(games: any[]): Promise<string> {
  const headers = [
    'game_id', 'created_at', 'bone_count', 'revealed_count', 'hit_bone',
    'cash_out_position', 'multiplier', 'is_simulated', 'bone_positions',
    'chicken_positions', 'revealed_sequence', 'first_position', 'last_position',
    'game_duration_positions', 'success_rate', 'risk_level'
  ];

  const rows = games.map(game => {
    const bonePositions = game.positions
      .filter((p: any) => !p.isChicken)
      .map((p: any) => p.position)
      .sort((a: number, b: number) => a - b);
    
    const chickenPositions = game.positions
      .filter((p: any) => p.isChicken)
      .map((p: any) => p.position)
      .sort((a: number, b: number) => a - b);
    
    const revealedSequence = game.positions
      .filter((p: any) => p.revealed && p.revealOrder !== null)
      .sort((a: any, b: any) => (a.revealOrder || 0) - (b.revealOrder || 0))
      .map((p: any) => p.position);

    const firstPosition = revealedSequence.length > 0 ? revealedSequence[0] : null;
    const lastPosition = revealedSequence.length > 0 ? revealedSequence[revealedSequence.length - 1] : null;
    const successRate = game.revealedCount > 0 ? (revealedSequence.filter((pos: number) => chickenPositions.includes(pos)).length / game.revealedCount) : 0;
    const riskLevel = game.revealedCount >= 10 ? 'HIGH' : game.revealedCount >= 5 ? 'MEDIUM' : 'LOW';

    return [
      game.id, game.createdAt.toISOString(), game.boneCount, game.revealedCount,
      game.hitBone, game.cashOutPosition || '', game.multiplier || '', game.isSimulated,
      `"${bonePositions.join(',')}"`, `"${chickenPositions.join(',')}"`,
      `"${revealedSequence.join(',')}"`, firstPosition || '', lastPosition || '',
      revealedSequence.length, successRate.toFixed(3), riskLevel
    ];
  });

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}
async function exportSequencesCSV(games: any[]): Promise<string> {
  const headers = [
    'game_id', 'sequence_length', 'sequence_positions', 'sequence_results',
    'bone_count', 'hit_bone', 'success_positions', 'fail_position',
    'pattern_2', 'pattern_3', 'pattern_4', 'created_at'
  ];

  const rows = games.map(game => {
    const revealedPositions = game.positions
      .filter((p: any) => p.revealed && p.revealOrder !== null)
      .sort((a: any, b: any) => (a.revealOrder || 0) - (b.revealOrder || 0));

    const sequence = revealedPositions.map((p: any) => p.position);
    const results = revealedPositions.map((p: any) => p.isChicken ? 'C' : 'B');
    
    const successPositions = revealedPositions
      .filter((p: any) => p.isChicken)
      .map((p: any) => p.position);
    
    const failPosition = revealedPositions
      .find((p: any) => !p.isChicken)?.position || '';

    const pattern2 = sequence.length >= 2 ? sequence.slice(0, 2).join('-') : '';
    const pattern3 = sequence.length >= 3 ? sequence.slice(0, 3).join('-') : '';
    const pattern4 = sequence.length >= 4 ? sequence.slice(0, 4).join('-') : '';

    return [
      game.id, sequence.length, `"${sequence.join(',')}"`, `"${results.join(',')}"`,
      game.boneCount, game.hitBone, `"${successPositions.join(',')}"`, failPosition,
      pattern2, pattern3, pattern4, game.createdAt.toISOString()
    ];
  });

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

async function exportPatternsCSV(games: any[]): Promise<string> {
  const headers = [
    'pattern', 'pattern_length', 'frequency', 'success_rate',
    'next_positions', 'next_success_rate', 'bone_count', 'sample_games'
  ];

  const patternMap = new Map<string, {
    frequency: number; successes: number; nextPositions: number[];
    nextSuccesses: number; boneCount: number; gameIds: number[];
  }>();

  games.forEach(game => {
    const revealedPositions = game.positions
      .filter((p: any) => p.revealed && p.revealOrder !== null)
      .sort((a: any, b: any) => (a.revealOrder || 0) - (b.revealOrder || 0));

    for (let length = 2; length <= 4; length++) {
      for (let i = 0; i <= revealedPositions.length - length; i++) {
        const patternPositions = revealedPositions.slice(i, i + length);
        const pattern = patternPositions.map((p: any) => p.position).join('-');
        
        if (!patternMap.has(pattern)) {
          patternMap.set(pattern, {
            frequency: 0, successes: 0, nextPositions: [],
            nextSuccesses: 0, boneCount: game.boneCount, gameIds: []
          });
        }

        const patternData = patternMap.get(pattern)!;
        patternData.frequency++;
        patternData.gameIds.push(game.id);

        const allChickens = patternPositions.every((p: any) => p.isChicken);
        if (allChickens) patternData.successes++;

        if (i + length < revealedPositions.length) {
          const nextPos = revealedPositions[i + length];
          patternData.nextPositions.push(nextPos.position);
          if (nextPos.isChicken) patternData.nextSuccesses++;
        }
      }
    }
  });

  const rows = Array.from(patternMap.entries()).map(([pattern, data]) => {
    const successRate = data.frequency > 0 ? (data.successes / data.frequency) : 0;
    const nextSuccessRate = data.nextPositions.length > 0 ? (data.nextSuccesses / data.nextPositions.length) : 0;
    
    return [
      pattern, pattern.split('-').length, data.frequency, successRate.toFixed(3),
      `"${data.nextPositions.join(',')}"`, nextSuccessRate.toFixed(3),
      data.boneCount, `"${data.gameIds.slice(0, 10).join(',')}"`
    ];
  });

  rows.sort((a, b) => (b[2] as number) - (a[2] as number));
  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}
async function exportMLTrainingCSV(games: any[]): Promise<string> {
  const headers = [
    'game_id', 'position', 'is_target', 'reveal_order', 'bone_count',
    'total_revealed', 'previous_positions', 'previous_results',
    'position_frequency', 'zone', 'is_safe_position', 'distance_from_center',
    'adjacent_positions', 'corner_position', 'edge_position', 'result'
  ];

  const rows: any[] = [];
  const safePositions = [4, 7, 10, 13, 14, 15, 17, 18, 19, 20, 21, 23];
  const zoneA = [1, 2, 3, 4, 5, 11, 12, 13, 14, 15];

  games.forEach(game => {
    const revealedPositions = game.positions
      .filter((p: any) => p.revealed && p.revealOrder !== null)
      .sort((a: any, b: any) => (a.revealOrder || 0) - (b.revealOrder || 0));

    revealedPositions.forEach((pos: any, index: number) => {
      const previousPositions = revealedPositions.slice(0, index).map((p: any) => p.position);
      const previousResults = revealedPositions.slice(0, index).map((p: any) => p.isChicken ? 1 : 0);
      
      const zone = zoneA.includes(pos.position) ? 'A' : 'B';
      const isSafePosition = safePositions.includes(pos.position);
      const distanceFromCenter = Math.abs(pos.position - 13);
      
      const row = Math.floor((pos.position - 1) / 5);
      const col = (pos.position - 1) % 5;
      const adjacentPositions = [];
      
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const newRow = row + dr;
          const newCol = col + dc;
          if (newRow >= 0 && newRow < 5 && newCol >= 0 && newCol < 5) {
            adjacentPositions.push(newRow * 5 + newCol + 1);
          }
        }
      }

      const isCorner = [1, 5, 21, 25].includes(pos.position);
      const isEdge = [1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25].includes(pos.position);

      rows.push([
        game.id, pos.position, index === 0 ? 1 : 0, pos.revealOrder,
        game.boneCount, game.revealedCount, `"${previousPositions.join(',')}"`,
        `"${previousResults.join(',')}"`, previousPositions.filter(p => p === pos.position).length,
        zone, isSafePosition ? 1 : 0, distanceFromCenter, `"${adjacentPositions.join(',')}"`,
        isCorner ? 1 : 0, isEdge ? 1 : 0, pos.isChicken ? 1 : 0
      ]);
    });
  });

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

async function exportPositionsCSV(games: any[]): Promise<string> {
  const headers = [
    'game_id', 'position', 'is_chicken', 'is_bone', 'revealed',
    'reveal_order', 'position_in_sequence', 'game_bone_count', 'game_created_at'
  ];

  const rows: any[] = [];
  
  games.forEach(game => {
    game.positions.forEach((pos: any) => {
      rows.push([
        game.id, pos.position, pos.isChicken, !pos.isChicken, pos.revealed,
        pos.revealOrder || '', pos.revealOrder ? `${pos.revealOrder}/${game.revealedCount}` : '',
        game.boneCount, game.createdAt.toISOString()
      ]);
    });
  });

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const includeSimulated = args.includes('--include-simulated');
  const limit = parseInt(args.find(arg => arg.startsWith('--limit='))?.split('=')[1] || '1000');

  log('\n📊 EXPORTADOR DE DATOS CSV - Solo Partidas Reales', colors.bright + colors.cyan);
  log('='.repeat(80), colors.cyan);

  try {
    // Crear directorio de exportación
    const exportDir = 'csv-exports';
    mkdirSync(exportDir, { recursive: true });

    // Obtener datos de la base de datos - SOLO PARTIDAS REALES por defecto
    log(`\n📥 Cargando datos de la base de datos...`, colors.yellow);
    log(`   Límite: ${limit} partidas`);
    log(`   Incluir simuladas: ${includeSimulated ? 'Sí' : 'No (solo reales)'}`);

    // Obtener TODAS las partidas reales con 4 huesos (sin límite)
    const games = await prisma.chickenGame.findMany({
      where: includeSimulated ? undefined : { 
        isSimulated: false,
        boneCount: 4 // Solo partidas con 4 huesos
      },
      include: {
        positions: { orderBy: { position: 'asc' } }
      },
      orderBy: { createdAt: 'desc' }
      // Sin take: para obtener TODAS las partidas
    });

    log(`   ✅ ${games.length} partidas cargadas`, colors.green);

    if (!includeSimulated) {
      log(`   🎯 Solo partidas reales para análisis ML`, colors.blue);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    switch (command) {
      case 'all':
        log(`\n📋 Generando todos los archivos CSV...`, colors.bright);
        
        const detailed = await exportDetailedCSV(games);
        writeFileSync(join(exportDir, `chicken_games_detailed_${timestamp}.csv`), detailed);
        log(`   ✅ chicken_games_detailed_${timestamp}.csv`, colors.green);

        const sequences = await exportSequencesCSV(games);
        writeFileSync(join(exportDir, `chicken_sequences_${timestamp}.csv`), sequences);
        log(`   ✅ chicken_sequences_${timestamp}.csv`, colors.green);

        const patterns = await exportPatternsCSV(games);
        writeFileSync(join(exportDir, `chicken_patterns_${timestamp}.csv`), patterns);
        log(`   ✅ chicken_patterns_${timestamp}.csv`, colors.green);

        const mlTraining = await exportMLTrainingCSV(games);
        writeFileSync(join(exportDir, `chicken_ml_training_${timestamp}.csv`), mlTraining);
        log(`   ✅ chicken_ml_training_${timestamp}.csv`, colors.green);

        const positions = await exportPositionsCSV(games);
        writeFileSync(join(exportDir, `chicken_positions_${timestamp}.csv`), positions);
        log(`   ✅ chicken_positions_${timestamp}.csv`, colors.green);
        break;

      case 'detailed':
        const detailedData = await exportDetailedCSV(games);
        writeFileSync(join(exportDir, `chicken_games_detailed_${timestamp}.csv`), detailedData);
        log(`   ✅ Archivo generado: chicken_games_detailed_${timestamp}.csv`, colors.green);
        break;

      case 'sequences':
        const sequencesData = await exportSequencesCSV(games);
        writeFileSync(join(exportDir, `chicken_sequences_${timestamp}.csv`), sequencesData);
        log(`   ✅ Archivo generado: chicken_sequences_${timestamp}.csv`, colors.green);
        break;

      case 'patterns':
        const patternsData = await exportPatternsCSV(games);
        writeFileSync(join(exportDir, `chicken_patterns_${timestamp}.csv`), patternsData);
        log(`   ✅ Archivo generado: chicken_patterns_${timestamp}.csv`, colors.green);
        break;

      case 'ml-training':
        const mlData = await exportMLTrainingCSV(games);
        writeFileSync(join(exportDir, `chicken_ml_training_${timestamp}.csv`), mlData);
        log(`   ✅ Archivo generado: chicken_ml_training_${timestamp}.csv`, colors.green);
        break;

      case 'positions':
        const positionsData = await exportPositionsCSV(games);
        writeFileSync(join(exportDir, `chicken_positions_${timestamp}.csv`), positionsData);
        log(`   ✅ Archivo generado: chicken_positions_${timestamp}.csv`, colors.green);
        break;

      case 'help':
      default:
        showHelp();
        break;
    }

    if (command !== 'help') {
      log(`\n📁 Archivos guardados en: ./${exportDir}/`, colors.bright);
      log(`📊 Total de partidas procesadas: ${games.length}`, colors.magenta);
      
      const realGames = games.filter(g => !g.isSimulated).length;
      const simulatedGames = games.filter(g => g.isSimulated).length;
      
      if (includeSimulated) {
        log(`   - Partidas reales: ${realGames}`, colors.blue);
        log(`   - Partidas simuladas: ${simulatedGames}`, colors.blue);
      } else {
        log(`   - Solo partidas reales: ${realGames}`, colors.green);
        log(`   🎯 Datos listos para análisis y entrenamiento ML`, colors.cyan);
      }
    }

  } catch (error) {
    log(`\n💥 ERROR: ${error instanceof Error ? error.message : 'Unknown'}`, colors.red);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function showHelp() {
  log(`\n📖 AYUDA - Exportador de Datos CSV`, colors.bright);
  log(`\n🎯 COMANDOS DISPONIBLES:\n`, colors.bright);

  log(`1. all`, colors.green);
  log(`   Genera todos los archivos CSV`);
  log(`   Ejemplo: npx tsx export-csv-data.ts all\n`);

  log(`2. detailed`, colors.green);
  log(`   Resumen detallado de cada partida`);
  log(`   Ejemplo: npx tsx export-csv-data.ts detailed\n`);

  log(`3. sequences`, colors.green);
  log(`   Secuencias de posiciones y patrones`);
  log(`   Ejemplo: npx tsx export-csv-data.ts sequences\n`);

  log(`4. patterns`, colors.green);
  log(`   Análisis de patrones frecuentes`);
  log(`   Ejemplo: npx tsx export-csv-data.ts patterns\n`);

  log(`5. ml-training`, colors.green);
  log(`   Datos preparados para entrenamiento ML`);
  log(`   Ejemplo: npx tsx export-csv-data.ts ml-training\n`);

  log(`6. positions`, colors.green);
  log(`   Datos de cada posición individual`);
  log(`   Ejemplo: npx tsx export-csv-data.ts positions\n`);

  log(`🔧 OPCIONES:\n`, colors.bright);
  log(`--include-simulated    Incluir partidas simuladas (por defecto solo reales)`);
  log(`--limit=N             Limitar a N partidas (default: 1000)\n`);

  log(`💡 EJEMPLOS DE USO:\n`, colors.bright);
  log(`npx tsx export-csv-data.ts all                    # Solo partidas reales`);
  log(`npx tsx export-csv-data.ts patterns --limit=500   # 500 partidas reales`);
  log(`npx tsx export-csv-data.ts ml-training --limit=2000  # Para entrenamiento ML`);
  log(`npx tsx export-csv-data.ts all --include-simulated   # Incluir simuladas\n`);
}

main();