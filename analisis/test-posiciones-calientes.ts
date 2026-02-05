// Script para probar el sistema de posiciones calientes
import { db } from '@/lib/db';

async function testPosicionesCalientes() {
  console.log('🔥 ===== TEST SISTEMA DE POSICIONES CALIENTES =====\n');

  // Obtener últimas 5 partidas
  const ultimas5 = await db.chickenGame.findMany({
    where: { isSimulated: false },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { positions: true },
  });

  console.log(`📊 Analizando últimas ${ultimas5.length} partidas...\n`);

  if (ultimas5.length < 5) {
    console.log(`⚠️  Solo hay ${ultimas5.length} partidas (se necesitan 5)`);
    console.log(`🎮 Juega ${5 - ultimas5.length} partidas más para probar el sistema\n`);
  }

  // Contar posiciones usadas
  const posicionesMap = new Map<number, number>();

  ultimas5.forEach((partida, index) => {
    const primeraPos = partida.positions
      .filter((p) => p.revealed && p.revealOrder !== null)
      .sort((a, b) => (a.revealOrder || 0) - (b.revealOrder || 0))[0];

    if (primeraPos) {
      const pos = primeraPos.position;
      posicionesMap.set(pos, (posicionesMap.get(pos) || 0) + 1);
      
      const resultado = partida.hitBone ? '❌' : '✅';
      console.log(
        `Partida ${index + 1}: Pos ${pos} ${resultado} (${new Date(partida.createdAt).toLocaleString()})`
      );
    }
  });

  // Identificar posiciones calientes
  console.log(`\n🔥 ===== POSICIONES CALIENTES (2+ usos) =====`);
  const posicionesCalientes = Array.from(posicionesMap.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1]);

  if (posicionesCalientes.length === 0) {
    console.log(`✅ No hay posiciones calientes (buena diversidad)`);
  } else {
    console.log(`🔴 ${posicionesCalientes.length} posiciones calientes detectadas:\n`);
    posicionesCalientes.forEach(([pos, count]) => {
      const porcentaje = (count / ultimas5.length) * 100;
      console.log(`   🔥 Pos ${pos}: ${count} veces (${porcentaje.toFixed(0)}%)`);
    });
    console.log(`\n⚠️  Estas posiciones serán EVITADAS en la próxima predicción`);
  }

  // Mostrar todas las posiciones usadas
  console.log(`\n📍 ===== TODAS LAS POSICIONES USADAS =====`);
  const todasPosiciones = Array.from(posicionesMap.entries())
    .sort((a, b) => b[1] - a[1]);

  todasPosiciones.forEach(([pos, count]) => {
    const emoji = count >= 2 ? '🔥' : '✅';
    const porcentaje = (count / ultimas5.length) * 100;
    console.log(`   ${emoji} Pos ${pos}: ${count} veces (${porcentaje.toFixed(0)}%)`);
  });

  // Posiciones disponibles (no usadas en últimas 5)
  const posicionesUsadas = new Set(posicionesMap.keys());
  const posicionesDisponibles = Array.from({ length: 25 }, (_, i) => i + 1).filter(
    (p) => !posicionesUsadas.has(p)
  );

  console.log(`\n💎 ===== POSICIONES DISPONIBLES (no usadas) =====`);
  console.log(`${posicionesDisponibles.length} posiciones: ${posicionesDisponibles.join(', ')}`);

  // Recomendaciones
  console.log(`\n💡 ===== RECOMENDACIONES =====`);
  
  if (posicionesCalientes.length === 0) {
    console.log(`✅ Sistema funcionando correctamente`);
    console.log(`✅ Buena diversidad de posiciones`);
    console.log(`✅ Continuar jugando normalmente`);
  } else {
    console.log(`⚠️  Posiciones calientes detectadas: ${posicionesCalientes.map(([p]) => p).join(', ')}`);
    console.log(`🔧 Sistema las evitará automáticamente`);
    console.log(`🎯 Próxima sugerencia será de: ${posicionesDisponibles.slice(0, 5).join(', ')} u otras`);
  }

  console.log(`\n✅ ===== TEST COMPLETADO =====\n`);
}

testPosicionesCalientes()
  .catch((error) => {
    console.error('❌ Error en test:', error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
