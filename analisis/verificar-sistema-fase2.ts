// Script de verificación rápida del sistema después de Fase 2
import { db } from '@/lib/db';
import { getMLStats } from '@/lib/ml/reinforcement-learning';

async function main() {
  console.log('🔍 ===== VERIFICACIÓN RÁPIDA DEL SISTEMA =====\n');

  // 1. Verificar conexión a BD
  try {
    await db.$connect();
    console.log('✅ Conexión a base de datos: OK');
  } catch (error) {
    console.log('❌ Conexión a base de datos: FALLO');
    console.error(error);
    return;
  }

  // 2. Contar partidas totales
  const totalPartidas = await db.chickenGame.count({
    where: { isSimulated: false },
  });
  console.log(`✅ Total de partidas reales: ${totalPartidas}`);

  if (totalPartidas < 30) {
    console.log(
      `⚠️  Solo hay ${totalPartidas} partidas. Se necesitan al menos 30 para análisis completo.`
    );
  }

  // 3. Últimas 10 partidas
  const ultimas10 = await db.chickenGame.findMany({
    where: { isSimulated: false },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { positions: true },
  });

  const victorias10 = ultimas10.filter((p) => !p.hitBone).length;
  const tasa10 = (victorias10 / ultimas10.length) * 100;

  console.log(`\n📊 Últimas 10 partidas:`);
  console.log(`   Victorias: ${victorias10}/10 (${tasa10.toFixed(1)}%)`);

  // 4. Posiciones más usadas en últimas 10
  const posicionesMap = new Map<number, number>();
  ultimas10.forEach((partida) => {
    const primeraPos = partida.positions
      .filter((p) => p.revealed && p.revealOrder !== null)
      .sort((a, b) => (a.revealOrder || 0) - (b.revealOrder || 0))[0];

    if (primeraPos) {
      posicionesMap.set(
        primeraPos.position,
        (posicionesMap.get(primeraPos.position) || 0) + 1
      );
    }
  });

  console.log(`\n📍 Posiciones usadas en últimas 10 partidas:`);
  const posicionesOrdenadas = Array.from(posicionesMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  posicionesOrdenadas.forEach(([pos, count]) => {
    const emoji = count > 3 ? '🔴' : count > 2 ? '⚠️' : '✅';
    console.log(`   ${emoji} Pos ${pos}: ${count} veces`);
  });

  // 5. Verificar parámetros ML
  console.log(`\n🤖 Parámetros ML actuales:`);
  try {
    const mlStats = getMLStats();
    console.log(`   Epsilon: ${mlStats.epsilon} (mín: ${mlStats.minEpsilon})`);
    console.log(`   Total partidas ML: ${mlStats.totalGames}`);
    console.log(`   Exploraciones: ${mlStats.explorationCount}`);
    console.log(`   Explotaciones: ${mlStats.exploitationCount}`);
    console.log(`   Última zona: ${mlStats.lastZoneUsed}`);
    console.log(
      `   Memoria: ${mlStats.consecutiveSafePositions.length} posiciones`
    );
  } catch (error) {
    console.log('   ⚠️  ML no inicializado aún');
  }

  // 6. Verificar rachas actuales
  const ultimaPartida = ultimas10[0];
  if (ultimaPartida) {
    console.log(`\n🔥 Estado actual:`);
    console.log(`   Última partida: ${ultimaPartida.hitBone ? '❌ Derrota' : '✅ Victoria'}`);
    console.log(
      `   Fecha: ${ultimaPartida.createdAt.toLocaleString()}`
    );
  }

  // 7. Recomendaciones
  console.log(`\n💡 Recomendaciones:`);

  if (totalPartidas < 30) {
    console.log(
      `   🎮 Jugar ${30 - totalPartidas} partidas más para análisis completo`
    );
  } else if (totalPartidas >= 30 && totalPartidas < 60) {
    console.log(`   📊 Ejecutar: npx tsx analisis/analizar-ultimas-30-partidas.ts`);
  } else {
    console.log(`   📊 Ejecutar: npx tsx analisis/comparar-fases-optimizacion.ts`);
  }

  if (tasa10 < 50) {
    console.log(`   ⚠️  Tasa de éxito baja en últimas 10 partidas (${tasa10.toFixed(1)}%)`);
    console.log(`   🔧 Considerar ajustes adicionales si persiste`);
  } else {
    console.log(`   ✅ Tasa de éxito aceptable en últimas 10 partidas (${tasa10.toFixed(1)}%)`);
  }

  const posicionRepetida = posicionesOrdenadas.find(([, count]) => count > 3);
  if (posicionRepetida) {
    console.log(
      `   🔴 Posición ${posicionRepetida[0]} usada ${posicionRepetida[1]} veces en últimas 10`
    );
    console.log(`   🔧 Verificar que penalizaciones estén funcionando`);
  }

  console.log('\n✅ Verificación completada\n');
}

main()
  .catch((error) => {
    console.error('❌ Error en verificación:', error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
