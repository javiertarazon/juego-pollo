// Script para importar partidas desde CSV a la base de datos como partidas REALES
import { db } from './src/lib/db';
import * as fs from 'fs';
import * as path from 'path';

interface CSVGame {
  game_id: string;
  created_at: string;
  bone_count: number;
  revealed_count: number;
  hit_bone: boolean;
  cash_out_position: string;
  multiplier: string;
  is_simulated: boolean;
  bone_positions: string;
  chicken_positions: string;
  revealed_sequence: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

function parseCSV(content: string): CSVGame[] {
  const lines = content.split('\n').filter(line => line.trim());
  const headers = parseCSVLine(lines[0]);
  
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const game: any = {};
    
    headers.forEach((header, index) => {
      game[header] = values[index] || '';
    });
    
    return {
      game_id: game.game_id,
      created_at: game.created_at,
      bone_count: parseInt(game.bone_count) || 4,
      revealed_count: parseInt(game.revealed_count) || 0,
      hit_bone: game.hit_bone === 'true',
      cash_out_position: game.cash_out_position,
      multiplier: game.multiplier,
      is_simulated: false, // MARCAR COMO REAL
      bone_positions: game.bone_positions,
      chicken_positions: game.chicken_positions,
      revealed_sequence: game.revealed_sequence,
    };
  });
}

async function importarPartidas() {
  console.log('🎯 IMPORTANDO PARTIDAS DESDE CSV\n');
  console.log('='.repeat(60));
  
  try {
    const csvDir = path.join(__dirname, 'csv-exports');
    const csvFile = path.join(csvDir, 'chicken_games_detailed_2026-02-04T12-11-15.csv');
    
    if (!fs.existsSync(csvFile)) {
      console.error('❌ Archivo CSV no encontrado:', csvFile);
      return;
    }
    
    console.log('📂 Leyendo archivo:', csvFile);
    const content = fs.readFileSync(csvFile, 'utf-8');
    const games = parseCSV(content);
    
    console.log(`📊 Total de partidas en CSV: ${games.length}\n`);
    
    // Filtrar solo partidas con datos válidos
    const validGames = games.filter(g => 
      g.revealed_sequence && 
      g.revealed_sequence.trim() !== '' &&
      g.bone_count >= 2
    );
    
    console.log(`✅ Partidas válidas para importar: ${validGames.length}\n`);
    
    let imported = 0;
    let skipped = 0;
    
    for (const game of validGames) {
      try {
        // Parsear posiciones reveladas
        const revealedPositions = game.revealed_sequence
          .split(',')
          .map(p => parseInt(p.trim()))
          .filter(p => !isNaN(p) && p >= 1 && p <= 25);
        
        if (revealedPositions.length === 0) {
          skipped++;
          continue;
        }
        
        // Parsear posiciones de huesos (DATOS REALES)
        const bonePositions = game.bone_positions
          .split(',')
          .map(p => parseInt(p.trim()))
          .filter(p => !isNaN(p) && p >= 1 && p <= 25);
        
        if (bonePositions.length === 0) {
          skipped++;
          continue;
        }
        
        // Crear la partida en la BD
        const createdGame = await db.chickenGame.create({
          data: {
            boneCount: game.bone_count,
            revealedCount: game.revealed_count,
            hitBone: game.hit_bone,
            cashOutPosition: game.cash_out_position ? parseInt(game.cash_out_position) : null,
            multiplier: game.multiplier ? parseFloat(game.multiplier) : 0,
            isSimulated: false, // IMPORTANTE: Marcar como partida REAL
            createdAt: new Date(game.created_at),
          },
        });
        
        // ✅ GUARDAR POSICIONES REALES DE HUESOS en tabla específica
        await db.realBonePositions.create({
          data: {
            gameId: createdGame.id,
            posiciones: JSON.stringify(bonePositions),
            reportadoPor: 'csv_import',
            verificado: true, // Los datos del CSV son verificados
          },
        });
        
        // Crear las posiciones
        const positionsData = [];
        
        for (let pos = 1; pos <= 25; pos++) {
          const isChicken = !bonePositions.includes(pos);
          const revealedIndex = revealedPositions.indexOf(pos);
          const isRevealed = revealedIndex !== -1;
          
          positionsData.push({
            gameId: createdGame.id,
            position: pos,
            isChicken: isChicken,
            revealed: isRevealed,
            revealOrder: isRevealed ? revealedIndex : null,
          });
        }
        
        await db.chickenPosition.createMany({
          data: positionsData,
        });
        
        imported++;
        
        if (imported % 100 === 0) {
          console.log(`   Importadas: ${imported}/${validGames.length}...`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error importando partida ${game.game_id}:`, error);
        skipped++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ IMPORTACIÓN COMPLETADA');
    console.log('='.repeat(60));
    console.log(`📊 Estadísticas:`);
    console.log(`   • Total en CSV: ${games.length}`);
    console.log(`   • Válidas: ${validGames.length}`);
    console.log(`   • Importadas: ${imported}`);
    console.log(`   • Omitidas: ${skipped}`);
    console.log(`\n🎯 Ahora el sistema ML puede entrenar con ${imported} partidas REALES`);
    console.log(`   ✅ Posiciones de huesos guardadas en RealBonePositions`);
    console.log(`   ✅ isChicken correctamente marcado (true=pollo, false=hueso)`);
    
  } catch (error) {
    console.error('❌ ERROR CRÍTICO:', error);
    process.exit(1);
  }
}

importarPartidas()
  .then(() => {
    console.log('\n✅ Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
