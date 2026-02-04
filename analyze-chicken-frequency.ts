import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeChickenFrequency() {
  try {
    console.log('🐔 ANÁLISIS DE FRECUENCIA DE POLLOS REVELADOS');
    console.log('='.repeat(70));
    
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

    console.log(`\n📊 Total de juegos analizados: ${realGames.length}\n`);

    // Contar frecuencia de pollos REVELADOS
    const chickenFrequency: Record<number, number> = {};
    const totalRevealed: Record<number, number> = {};

    realGames.forEach(game => {
      const revealedChickens = game.positions
        .filter(p => p.isChicken && p.revealed)
        .map(p => p.position);
      
      revealedChickens.forEach(pos => {
        chickenFrequency[pos] = (chickenFrequency[pos] || 0) + 1;
      });

      // Contar total de pollos (revelados o no)
      game.positions
        .filter(p => p.isChicken)
        .forEach(p => {
          totalRevealed[p.position] = (totalRevealed[p.position] || 0) + 1;
        });
    });

    console.log('🎯 TOP 20 POSICIONES MÁS FRECUENTES COMO POLLOS REVELADOS:');
    console.log('='.repeat(70));

    const sortedChickens = Object.entries(chickenFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    sortedChickens.forEach(([pos, count], idx) => {
      const percentage = ((count / realGames.length) * 100).toFixed(2);
      const total = totalRevealed[parseInt(pos)] || 0;
      const revealRate = ((count / total) * 100).toFixed(2);
      console.log(`${idx + 1}. Posición ${pos}: ${count} veces revelado (${percentage}% de juegos, ${revealRate}% reveal rate)`);
    });

    console.log('\n📊 ANÁLISIS POR ZONAS:');
    console.log('='.repeat(70));

    // Analizar por filas
    const rowFrequency: Record<number, number> = {};
    Object.entries(chickenFrequency).forEach(([pos, count]) => {
      const row = Math.floor((parseInt(pos) - 1) / 5);
      rowFrequency[row] = (rowFrequency[row] || 0) + count;
    });

    console.log('\n📍 Frecuencia por FILA:');
    Object.entries(rowFrequency)
      .sort((a, b) => b[1] - a[1])
      .forEach(([row, count]) => {
        console.log(`   Fila ${parseInt(row) + 1}: ${count} pollos revelados`);
      });

    // Analizar por columnas
    const colFrequency: Record<number, number> = {};
    Object.entries(chickenFrequency).forEach(([pos, count]) => {
      const col = (parseInt(pos) - 1) % 5;
      colFrequency[col] = (colFrequency[col] || 0) + count;
    });

    console.log('\n📍 Frecuencia por COLUMNA:');
    Object.entries(colFrequency)
      .sort((a, b) => b[1] - a[1])
      .forEach(([col, count]) => {
        console.log(`   Columna ${parseInt(col) + 1}: ${count} pollos revelados`);
      });

    console.log('\n💡 CONCLUSIÓN:');
    console.log('='.repeat(70));
    console.log('Las posiciones más frecuentemente reveladas son las que los jugadores');
    console.log('eligen más a menudo. Esto indica patrones de comportamiento humano.');
    console.log('\nEstas posiciones deberían tener MAYOR peso en el modelo de predicción.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeChickenFrequency();
