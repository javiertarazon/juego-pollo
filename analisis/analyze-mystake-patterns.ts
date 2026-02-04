import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeMystakePatterns() {
  try {
    console.log('🔍 ANÁLISIS PROFUNDO DE PATRONES DE MYSTAKE');
    console.log('='.repeat(60));
    
    // Obtener juegos reales con boneCount=4
    const realGames = await prisma.chickenGame.findMany({
      where: {
        isSimulated: false,
        boneCount: 4,
      },
      include: {
        positions: {
          orderBy: { position: 'asc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`\n📊 Total de juegos reales analizados: ${realGames.length}`);
    
    // 1. ANÁLISIS DE POSICIONES DE HUESOS
    console.log('\n' + '='.repeat(60));
    console.log('1️⃣  FRECUENCIA DE POSICIONES DE HUESOS');
    console.log('='.repeat(60));
    
    const boneFrequency: Record<number, number> = {};
    const bonePatterns: Map<string, number> = new Map();
    
    realGames.forEach(game => {
      const bones = game.positions
        .filter(p => !p.isChicken)
        .map(p => p.position)
        .sort((a, b) => a - b);
      
      // Contar frecuencia individual
      bones.forEach(pos => {
        boneFrequency[pos] = (boneFrequency[pos] || 0) + 1;
      });
      
      // Contar patrones completos
      const pattern = bones.join(',');
      bonePatterns.set(pattern, (bonePatterns.get(pattern) || 0) + 1);
    });
    
    // Mostrar top 10 posiciones más frecuentes
    const sortedPositions = Object.entries(boneFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    console.log('\n🔥 Top 10 posiciones MÁS FRECUENTES como hueso:');
    sortedPositions.forEach(([pos, count], idx) => {
      const percentage = ((count / realGames.length) * 100).toFixed(2);
      console.log(`${idx + 1}. Posición ${pos}: ${count} veces (${percentage}%)`);
    });
    
    // 2. ANÁLISIS DE PATRONES REPETIDOS
    console.log('\n' + '='.repeat(60));
    console.log('2️⃣  PATRONES DE HUESOS QUE SE REPITEN');
    console.log('='.repeat(60));
    
    const repeatedPatterns = Array.from(bonePatterns.entries())
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
    
    console.log(`\n🔁 Patrones que se repiten (Top 15):`);
    repeatedPatterns.forEach(([pattern, count], idx) => {
      console.log(`${idx + 1}. [${pattern}] - ${count} veces`);
    });
    
    // 3. ANÁLISIS DE PATRONES CONSECUTIVOS
    console.log('\n' + '='.repeat(60));
    console.log('3️⃣  PATRONES EN PARTIDAS CONSECUTIVAS');
    console.log('='.repeat(60));
    
    let consecutiveRepeats = 0;
    let consecutivePatterns: string[] = [];
    
    for (let i = 0; i < realGames.length - 1; i++) {
      const currentBones = realGames[i].positions
        .filter(p => !p.isChicken)
        .map(p => p.position)
        .sort((a, b) => a - b)
        .join(',');
      
      const nextBones = realGames[i + 1].positions
        .filter(p => !p.isChicken)
        .map(p => p.position)
        .sort((a, b) => a - b)
        .join(',');
      
      if (currentBones === nextBones) {
        consecutiveRepeats++;
        consecutivePatterns.push(currentBones);
      }
    }
    
    console.log(`\n🔄 Patrones repetidos en partidas consecutivas: ${consecutiveRepeats}`);
    if (consecutivePatterns.length > 0) {
      console.log('Ejemplos:');
      consecutivePatterns.slice(0, 5).forEach((pattern, idx) => {
        console.log(`  ${idx + 1}. [${pattern}]`);
      });
    }
    
    // 4. ANÁLISIS DE ZONAS CALIENTES
    console.log('\n' + '='.repeat(60));
    console.log('4️⃣  ANÁLISIS DE ZONAS (Filas y Columnas)');
    console.log('='.repeat(60));
    
    const rowFrequency: Record<number, number> = {};
    const colFrequency: Record<number, number> = {};
    
    realGames.forEach(game => {
      const bones = game.positions
        .filter(p => !p.isChicken)
        .map(p => p.position);
      
      bones.forEach(pos => {
        const row = Math.floor((pos - 1) / 5);
        const col = (pos - 1) % 5;
        rowFrequency[row] = (rowFrequency[row] || 0) + 1;
        colFrequency[col] = (colFrequency[col] || 0) + 1;
      });
    });
    
    console.log('\n📊 Frecuencia por FILA:');
    Object.entries(rowFrequency)
      .sort((a, b) => b[1] - a[1])
      .forEach(([row, count]) => {
        const percentage = ((count / (realGames.length * 4)) * 100).toFixed(2);
        console.log(`  Fila ${parseInt(row) + 1}: ${count} huesos (${percentage}%)`);
      });
    
    console.log('\n📊 Frecuencia por COLUMNA:');
    Object.entries(colFrequency)
      .sort((a, b) => b[1] - a[1])
      .forEach(([col, count]) => {
        const percentage = ((count / (realGames.length * 4)) * 100).toFixed(2);
        console.log(`  Columna ${parseInt(col) + 1}: ${count} huesos (${percentage}%)`);
      });
    
    // 5. ANÁLISIS DE PROXIMIDAD
    console.log('\n' + '='.repeat(60));
    console.log('5️⃣  ANÁLISIS DE PROXIMIDAD ENTRE HUESOS');
    console.log('='.repeat(60));
    
    const adjacencyCount: Record<string, number> = {};
    
    realGames.forEach(game => {
      const bones = game.positions
        .filter(p => !p.isChicken)
        .map(p => p.position)
        .sort((a, b) => a - b);
      
      for (let i = 0; i < bones.length; i++) {
        for (let j = i + 1; j < bones.length; j++) {
          const key = `${bones[i]}-${bones[j]}`;
          adjacencyCount[key] = (adjacencyCount[key] || 0) + 1;
        }
      }
    });
    
    const topAdjacencies = Object.entries(adjacencyCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    console.log('\n🔗 Top 10 pares de huesos que aparecen juntos:');
    topAdjacencies.forEach(([pair, count], idx) => {
      const percentage = ((count / realGames.length) * 100).toFixed(2);
      console.log(`${idx + 1}. Posiciones ${pair}: ${count} veces (${percentage}%)`);
    });
    
    // 6. ANÁLISIS DE VICTORIAS VS DERROTAS
    console.log('\n' + '='.repeat(60));
    console.log('6️⃣  ANÁLISIS DE VICTORIAS Y DERROTAS');
    console.log('='.repeat(60));
    
    const victories = realGames.filter(g => !g.hitBone && g.cashOutPosition && g.cashOutPosition >= 1);
    const defeats = realGames.filter(g => g.hitBone);
    const incomplete = realGames.filter(g => !g.hitBone && (!g.cashOutPosition || g.cashOutPosition < 1));
    
    console.log(`\n✅ Victorias (retiros): ${victories.length} (${((victories.length / realGames.length) * 100).toFixed(2)}%)`);
    console.log(`❌ Derrotas (hit bone): ${defeats.length} (${((defeats.length / realGames.length) * 100).toFixed(2)}%)`);
    console.log(`⚠️  Incompletas: ${incomplete.length} (${((incomplete.length / realGames.length) * 100).toFixed(2)}%)`);
    
    if (victories.length > 0) {
      const avgCashOut = victories.reduce((sum, g) => sum + (g.cashOutPosition || 0), 0) / victories.length;
      console.log(`📈 Promedio de pollos descubiertos en victorias: ${avgCashOut.toFixed(2)}`);
    }
    
    // 7. ANÁLISIS TEMPORAL
    console.log('\n' + '='.repeat(60));
    console.log('7️⃣  ANÁLISIS TEMPORAL - ¿HAY PATRONES POR TIEMPO?');
    console.log('='.repeat(60));
    
    const firstGames = realGames.slice(0, Math.floor(realGames.length / 3));
    const middleGames = realGames.slice(Math.floor(realGames.length / 3), Math.floor(realGames.length * 2 / 3));
    const lastGames = realGames.slice(Math.floor(realGames.length * 2 / 3));
    
    const analyzeSegment = (games: typeof realGames, name: string) => {
      const boneFreq: Record<number, number> = {};
      games.forEach(game => {
        game.positions
          .filter(p => !p.isChicken)
          .forEach(p => {
            boneFreq[p.position] = (boneFreq[p.position] || 0) + 1;
          });
      });
      
      const top3 = Object.entries(boneFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([pos, count]) => `${pos}(${count})`);
      
      console.log(`${name}: Top 3 posiciones = [${top3.join(', ')}]`);
    };
    
    analyzeSegment(firstGames, '📅 Primeros juegos');
    analyzeSegment(middleGames, '📅 Juegos medios ');
    analyzeSegment(lastGames, '📅 Últimos juegos ');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ ANÁLISIS COMPLETADO');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error en análisis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeMystakePatterns();
