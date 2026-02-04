import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Simular el nuevo modelo de predicción
const MYSTAKE_PATTERNS = {
  safestPositions: [23, 15, 14, 19, 13, 7, 8, 12, 22, 11, 21, 4, 25, 18, 20],
  mostRevealedPositions: [9, 10, 17, 2, 11, 13, 20, 6, 1, 19],
  volatilePositions: [1, 3, 16, 5, 24, 2, 6, 18, 20, 25],
  alwaysBoneToChicken: [1, 4, 5, 7, 8, 11, 12, 13, 14, 15],
  stableChickens: [23, 15, 14, 19, 13, 17, 7, 8, 12, 22],
  successfulSequences: [
    [1, 2, 5, 9, 10],
    [2, 4, 6, 7, 9],
    [10, 11, 20],
    [6, 17, 18, 19],
    [9, 17, 18, 20],
    [1, 2, 3, 4],
    [2, 6, 9, 10]
  ],
};

async function testNewPredictionModel() {
  try {
    console.log('🧪 PRUEBA DEL NUEVO MODELO DE PREDICCIÓN');
    console.log('='.repeat(70));
    
    // Obtener las últimas 10 partidas
    const recentGames = await prisma.chickenGame.findMany({
      where: {
        isSimulated: false,
        boneCount: 4,
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        positions: {
          orderBy: { position: 'asc' },
        },
      },
    });

    console.log(`\n📊 Analizando las últimas ${recentGames.length} partidas...\n`);

    let totalPredictions = 0;
    let correctPredictions = 0;

    for (let i = 0; i < recentGames.length - 1; i++) {
      const currentGame = recentGames[i + 1]; // Juego anterior
      const nextGame = recentGames[i]; // Juego siguiente (más reciente)

      // Obtener huesos del juego anterior
      const previousBones = currentGame.positions
        .filter(p => !p.isChicken)
        .map(p => p.position);

      // Obtener pollos revelados del juego siguiente
      const nextChickens = nextGame.positions
        .filter(p => p.isChicken && p.revealed)
        .map(p => p.position);

      if (nextChickens.length === 0) continue;

      console.log(`\n🎮 Juego ${i + 1}:`);
      console.log(`   Huesos anteriores: [${previousBones.join(', ')}]`);
      console.log(`   Pollos revelados: [${nextChickens.join(', ')}]`);

      // Calcular predicciones usando el nuevo modelo
      const predictions: { position: number; score: number }[] = [];

      for (let pos = 1; pos <= 25; pos++) {
        let score = 50;

        // Factor 1: Posiciones más reveladas
        if (MYSTAKE_PATTERNS.mostRevealedPositions.includes(pos)) {
          const rank = MYSTAKE_PATTERNS.mostRevealedPositions.indexOf(pos) + 1;
          score += 35 - (rank * 2);
        }

        // Factor 2: Top 15 posiciones seguras
        if (MYSTAKE_PATTERNS.safestPositions.includes(pos)) {
          const rank = MYSTAKE_PATTERNS.safestPositions.indexOf(pos) + 1;
          score += 20 - (rank * 0.8);
        }

        // Factor 3: Estabilidad como pollo
        if (MYSTAKE_PATTERNS.stableChickens.includes(pos)) {
          score += 15;
        }

        // Factor 4: Cambio de hueso a pollo
        if (MYSTAKE_PATTERNS.alwaysBoneToChicken.includes(pos) && 
            previousBones.includes(pos)) {
          score += 25;
        }

        // Factor 5: Evitar volátiles
        if (MYSTAKE_PATTERNS.volatilePositions.includes(pos)) {
          score -= 15;
        }

        // Factor 6: Estrategia de rotación
        if (previousBones.includes(pos)) {
          if (!MYSTAKE_PATTERNS.alwaysBoneToChicken.includes(pos)) {
            score -= 12;
          }
        } else {
          score += 12;
        }

        // Factor 7: Secuencias exitosas
        const matchingSequences = MYSTAKE_PATTERNS.successfulSequences.filter(seq => 
          seq.includes(pos)
        );
        if (matchingSequences.length > 0) {
          score += matchingSequences.length * 8;
        }

        // Factor 8: Zona favorable
        const row = Math.floor((pos - 1) / 5);
        const col = (pos - 1) % 5;
        if (row === 1) score += 5;
        if (col === 1 || col === 4) score += 5;

        predictions.push({ position: pos, score });
      }

      // Ordenar por score
      predictions.sort((a, b) => b.score - a.score);

      // Top 10 predicciones
      const top10 = predictions.slice(0, 10).map(p => p.position);
      console.log(`   Top 10 predicciones: [${top10.join(', ')}]`);

      // Verificar cuántas predicciones fueron correctas
      const correctInTop10 = nextChickens.filter(chicken => 
        top10.includes(chicken)
      ).length;

      totalPredictions += nextChickens.length;
      correctPredictions += correctInTop10;

      const accuracy = (correctInTop10 / nextChickens.length) * 100;
      console.log(`   ✅ Precisión: ${correctInTop10}/${nextChickens.length} (${accuracy.toFixed(2)}%)`);

      // Mostrar qué posiciones acertamos
      const hits = nextChickens.filter(c => top10.includes(c));
      const misses = nextChickens.filter(c => !top10.includes(c));
      
      if (hits.length > 0) {
        console.log(`   🎯 Acertadas: [${hits.join(', ')}]`);
      }
      if (misses.length > 0) {
        console.log(`   ❌ Falladas: [${misses.join(', ')}]`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 RESULTADOS FINALES');
    console.log('='.repeat(70));

    const overallAccuracy = (correctPredictions / totalPredictions) * 100;
    console.log(`\n✅ Predicciones correctas: ${correctPredictions}/${totalPredictions}`);
    console.log(`📈 Precisión general: ${overallAccuracy.toFixed(2)}%`);

    if (overallAccuracy >= 80) {
      console.log('\n🎉 ¡EXCELENTE! El modelo tiene alta precisión');
    } else if (overallAccuracy >= 60) {
      console.log('\n👍 BUENO. El modelo tiene precisión aceptable');
    } else {
      console.log('\n⚠️  MEJORABLE. El modelo necesita ajustes');
    }

    console.log('\n💡 NOTA: Esta es una prueba retrospectiva con datos históricos.');
    console.log('   La precisión real puede variar en partidas nuevas.');

  } catch (error) {
    console.error('❌ Error en prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testNewPredictionModel();
