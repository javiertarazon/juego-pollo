import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AnalisisResultado {
  totalPartidas: number;
  primerasPosiciones: {
    posicion: number;
    vecesPollo: number;
    vecesHueso: number;
    porcentajePollo: number;
  }[];
  segundasPosiciones: {
    posicion: number;
    vecesPollo: number;
    vecesHueso: number;
    porcentajePollo: number;
  }[];
  posicionesMasSeguras: {
    posicion: number;
    vecesPollo: number;
    vecesHueso: number;
    porcentajePollo: number;
    totalApariciones: number;
  }[];
  patronesRepetidos: {
    patron: string;
    veces: number;
    posiciones: number[];
  }[];
  secuenciasComunes: {
    secuencia: string;
    veces: number;
    longitud: number;
  }[];
  estadisticasGenerales: {
    promedioPollosPorPartida: number;
    promedioHuesosPorPartida: number;
    partidasConRetiro: number;
    partidasConHueso: number;
    posicionPromedioRetiro: number;
  };
}

async function analizarUltimasPartidas(limite: number = 30): Promise<AnalisisResultado> {
  console.log(`\n🔍 ===== ANÁLISIS DE ÚLTIMAS ${limite} PARTIDAS REALES =====\n`);

  // Obtener últimas partidas reales (no simuladas)
  const partidas = await prisma.chickenGame.findMany({
    where: {
      isSimulated: false,
    },
    include: {
      positions: {
        orderBy: {
          revealOrder: 'asc',
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limite,
  });

  console.log(`✅ Partidas encontradas: ${partidas.length}`);

  if (partidas.length === 0) {
    console.log('❌ No hay partidas reales en la base de datos');
    process.exit(0);
  }

  // Inicializar contadores
  const primerasPosiciones = new Map<number, { pollo: number; hueso: number }>();
  const segundasPosiciones = new Map<number, { pollo: number; hueso: number }>();
  const todasLasPosiciones = new Map<number, { pollo: number; hueso: number }>();
  const patronesHuesos = new Map<string, number>();
  const secuenciasPollos = new Map<string, number>();

  let totalPollos = 0;
  let totalHuesos = 0;
  let partidasConRetiro = 0;
  let partidasConHueso = 0;
  let sumaRetiros = 0;

  // Analizar cada partida
  partidas.forEach((partida, idx) => {
    const posiciones = partida.positions;
    const pollos = posiciones.filter(p => p.isChicken);
    const huesos = posiciones.filter(p => !p.isChicken);

    totalPollos += pollos.length;
    totalHuesos += huesos.length;

    if (partida.hitBone) {
      partidasConHueso++;
    } else {
      partidasConRetiro++;
      if (partida.cashOutPosition) {
        sumaRetiros += partida.cashOutPosition;
      }
    }

    // Analizar primera posición
    if (posiciones.length > 0) {
      const primera = posiciones[0];
      const pos = primera.position;
      if (!primerasPosiciones.has(pos)) {
        primerasPosiciones.set(pos, { pollo: 0, hueso: 0 });
      }
      const stats = primerasPosiciones.get(pos)!;
      if (primera.isChicken) {
        stats.pollo++;
      } else {
        stats.hueso++;
      }
    }

    // Analizar segunda posición
    if (posiciones.length > 1) {
      const segunda = posiciones[1];
      const pos = segunda.position;
      if (!segundasPosiciones.has(pos)) {
        segundasPosiciones.set(pos, { pollo: 0, hueso: 0 });
      }
      const stats = segundasPosiciones.get(pos)!;
      if (segunda.isChicken) {
        stats.pollo++;
      } else {
        stats.hueso++;
      }
    }

    // Analizar todas las posiciones
    posiciones.forEach(pos => {
      const position = pos.position;
      if (!todasLasPosiciones.has(position)) {
        todasLasPosiciones.set(position, { pollo: 0, hueso: 0 });
      }
      const stats = todasLasPosiciones.get(position)!;
      if (pos.isChicken) {
        stats.pollo++;
      } else {
        stats.hueso++;
      }
    });

    // Analizar patrones de huesos
    const huesosPos = huesos.map(h => h.position).sort((a, b) => a - b);
    if (huesosPos.length > 0) {
      const patron = huesosPos.join(',');
      patronesHuesos.set(patron, (patronesHuesos.get(patron) || 0) + 1);
    }

    // Analizar secuencias de pollos
    const pollosPos = pollos.map(p => p.position).sort((a, b) => a - b);
    if (pollosPos.length >= 2) {
      for (let i = 0; i < pollosPos.length - 1; i++) {
        const secuencia = `${pollosPos[i]}-${pollosPos[i + 1]}`;
        secuenciasPollos.set(secuencia, (secuenciasPollos.get(secuencia) || 0) + 1);
      }
    }
  });

  // Procesar resultados
  const primerasPosicionesArray = Array.from(primerasPosiciones.entries())
    .map(([posicion, stats]) => ({
      posicion,
      vecesPollo: stats.pollo,
      vecesHueso: stats.hueso,
      porcentajePollo: (stats.pollo / (stats.pollo + stats.hueso)) * 100,
    }))
    .sort((a, b) => b.porcentajePollo - a.porcentajePollo);

  const segundasPosicionesArray = Array.from(segundasPosiciones.entries())
    .map(([posicion, stats]) => ({
      posicion,
      vecesPollo: stats.pollo,
      vecesHueso: stats.hueso,
      porcentajePollo: (stats.pollo / (stats.pollo + stats.hueso)) * 100,
    }))
    .sort((a, b) => b.porcentajePollo - a.porcentajePollo);

  const posicionesMasSeguras = Array.from(todasLasPosiciones.entries())
    .map(([posicion, stats]) => ({
      posicion,
      vecesPollo: stats.pollo,
      vecesHueso: stats.hueso,
      porcentajePollo: (stats.pollo / (stats.pollo + stats.hueso)) * 100,
      totalApariciones: stats.pollo + stats.hueso,
    }))
    .filter(p => p.totalApariciones >= 3) // Mínimo 3 apariciones para ser significativo
    .sort((a, b) => b.porcentajePollo - a.porcentajePollo);

  const patronesRepetidos = Array.from(patronesHuesos.entries())
    .filter(([_, veces]) => veces >= 2)
    .map(([patron, veces]) => ({
      patron,
      veces,
      posiciones: patron.split(',').map(Number),
    }))
    .sort((a, b) => b.veces - a.veces);

  const secuenciasComunes = Array.from(secuenciasPollos.entries())
    .filter(([_, veces]) => veces >= 2)
    .map(([secuencia, veces]) => ({
      secuencia,
      veces,
      longitud: 2,
    }))
    .sort((a, b) => b.veces - a.veces);

  const estadisticasGenerales = {
    promedioPollosPorPartida: totalPollos / partidas.length,
    promedioHuesosPorPartida: totalHuesos / partidas.length,
    partidasConRetiro,
    partidasConHueso,
    posicionPromedioRetiro: partidasConRetiro > 0 ? sumaRetiros / partidasConRetiro : 0,
  };

  return {
    totalPartidas: partidas.length,
    primerasPosiciones: primerasPosicionesArray,
    segundasPosiciones: segundasPosicionesArray,
    posicionesMasSeguras,
    patronesRepetidos,
    secuenciasComunes,
    estadisticasGenerales,
  };
}

function imprimirResultados(resultado: AnalisisResultado, limite: number) {
  console.log(`\n📊 ===== RESULTADOS DEL ANÁLISIS (${limite} PARTIDAS) =====\n`);

  // Estadísticas generales
  console.log('📈 ESTADÍSTICAS GENERALES:');
  console.log(`   Total de partidas analizadas: ${resultado.totalPartidas}`);
  console.log(`   Promedio de pollos por partida: ${resultado.estadisticasGenerales.promedioPollosPorPartida.toFixed(2)}`);
  console.log(`   Promedio de huesos por partida: ${resultado.estadisticasGenerales.promedioHuesosPorPartida.toFixed(2)}`);
  console.log(`   Partidas con retiro: ${resultado.estadisticasGenerales.partidasConRetiro} (${((resultado.estadisticasGenerales.partidasConRetiro / resultado.totalPartidas) * 100).toFixed(1)}%)`);
  console.log(`   Partidas con hueso: ${resultado.estadisticasGenerales.partidasConHueso} (${((resultado.estadisticasGenerales.partidasConHueso / resultado.totalPartidas) * 100).toFixed(1)}%)`);
  console.log(`   Posición promedio de retiro: ${resultado.estadisticasGenerales.posicionPromedioRetiro.toFixed(2)}`);

  // Primeras posiciones
  console.log('\n🥇 ANÁLISIS DE PRIMERAS POSICIONES:');
  console.log('   (¿Qué posiciones se eligen primero y cuántas veces son pollo?)\n');
  resultado.primerasPosiciones.slice(0, 10).forEach((pos, idx) => {
    const emoji = pos.porcentajePollo >= 70 ? '✅' : pos.porcentajePollo >= 50 ? '⚠️' : '❌';
    console.log(`   ${emoji} #${idx + 1} Posición ${pos.posicion}: ${pos.vecesPollo} pollos, ${pos.vecesHueso} huesos (${pos.porcentajePollo.toFixed(1)}% pollo)`);
  });

  // Segundas posiciones
  console.log('\n🥈 ANÁLISIS DE SEGUNDAS POSICIONES:');
  console.log('   (¿Qué posiciones se eligen en segundo lugar?)\n');
  resultado.segundasPosiciones.slice(0, 10).forEach((pos, idx) => {
    const emoji = pos.porcentajePollo >= 70 ? '✅' : pos.porcentajePollo >= 50 ? '⚠️' : '❌';
    console.log(`   ${emoji} #${idx + 1} Posición ${pos.posicion}: ${pos.vecesPollo} pollos, ${pos.vecesHueso} huesos (${pos.porcentajePollo.toFixed(1)}% pollo)`);
  });

  // Posiciones más seguras
  console.log('\n🛡️ TOP 15 POSICIONES MÁS SEGURAS:');
  console.log('   (Posiciones con mayor % de pollos, mínimo 3 apariciones)\n');
  resultado.posicionesMasSeguras.slice(0, 15).forEach((pos, idx) => {
    const emoji = pos.porcentajePollo >= 90 ? '🟢' : pos.porcentajePollo >= 80 ? '🟡' : pos.porcentajePollo >= 70 ? '🟠' : '🔴';
    console.log(`   ${emoji} #${idx + 1} Posición ${pos.posicion}: ${pos.vecesPollo}/${pos.totalApariciones} pollos (${pos.porcentajePollo.toFixed(1)}%)`);
  });

  // Patrones repetidos
  if (resultado.patronesRepetidos.length > 0) {
    console.log('\n🔄 PATRONES DE HUESOS REPETIDOS:');
    console.log('   (Conjuntos de posiciones de huesos que se repiten)\n');
    resultado.patronesRepetidos.slice(0, 10).forEach((patron, idx) => {
      console.log(`   ${idx + 1}. Posiciones [${patron.posiciones.join(', ')}] - Repetido ${patron.veces} veces`);
    });
  } else {
    console.log('\n🔄 PATRONES DE HUESOS REPETIDOS:');
    console.log('   No se encontraron patrones repetidos (cada partida tiene huesos en posiciones diferentes)');
  }

  // Secuencias comunes
  if (resultado.secuenciasComunes.length > 0) {
    console.log('\n🔗 SECUENCIAS DE POLLOS COMUNES:');
    console.log('   (Pares de posiciones que frecuentemente son pollos consecutivos)\n');
    resultado.secuenciasComunes.slice(0, 10).forEach((sec, idx) => {
      console.log(`   ${idx + 1}. Secuencia ${sec.secuencia} - Aparece ${sec.veces} veces`);
    });
  } else {
    console.log('\n🔗 SECUENCIAS DE POLLOS COMUNES:');
    console.log('   No se encontraron secuencias repetidas significativas');
  }

  // Recomendaciones
  console.log('\n💡 RECOMENDACIONES BASADAS EN EL ANÁLISIS:\n');

  const mejoresPrimeras = resultado.primerasPosiciones.filter(p => p.porcentajePollo >= 70).slice(0, 5);
  if (mejoresPrimeras.length > 0) {
    console.log('   ✅ Mejores posiciones para empezar:');
    mejoresPrimeras.forEach(pos => {
      console.log(`      • Posición ${pos.posicion} (${pos.porcentajePollo.toFixed(1)}% pollo)`);
    });
  }

  const mejoresSegundas = resultado.segundasPosiciones.filter(p => p.porcentajePollo >= 70).slice(0, 5);
  if (mejoresSegundas.length > 0) {
    console.log('\n   ✅ Mejores posiciones para segunda jugada:');
    mejoresSegundas.forEach(pos => {
      console.log(`      • Posición ${pos.posicion} (${pos.porcentajePollo.toFixed(1)}% pollo)`);
    });
  }

  const ultraSeguras = resultado.posicionesMasSeguras.filter(p => p.porcentajePollo >= 90).slice(0, 10);
  if (ultraSeguras.length > 0) {
    console.log('\n   🛡️ Posiciones ULTRA SEGURAS (90%+ pollos):');
    ultraSeguras.forEach(pos => {
      console.log(`      • Posición ${pos.posicion} (${pos.porcentajePollo.toFixed(1)}% pollo en ${pos.totalApariciones} apariciones)`);
    });
  }

  const peligrosas = resultado.posicionesMasSeguras
    .filter(p => p.porcentajePollo < 50 && p.totalApariciones >= 3)
    .slice(0, 5);
  if (peligrosas.length > 0) {
    console.log('\n   ⚠️ Posiciones PELIGROSAS (evitar):');
    peligrosas.forEach(pos => {
      console.log(`      • Posición ${pos.posicion} (${pos.porcentajePollo.toFixed(1)}% pollo, ${pos.vecesHueso} huesos)`);
    });
  }
}

async function main() {
  try {
    // Analizar últimas 30 partidas
    console.log('\n' + '='.repeat(60));
    const resultado30 = await analizarUltimasPartidas(30);
    imprimirResultados(resultado30, 30);

    // Analizar últimas 50 partidas
    console.log('\n\n' + '='.repeat(60));
    const resultado50 = await analizarUltimasPartidas(50);
    imprimirResultados(resultado50, 50);

    // Comparación entre 30 y 50 partidas
    console.log('\n\n' + '='.repeat(60));
    console.log('\n📊 COMPARACIÓN 30 vs 50 PARTIDAS:\n');
    
    console.log('   Promedio de pollos por partida:');
    console.log(`      30 partidas: ${resultado30.estadisticasGenerales.promedioPollosPorPartida.toFixed(2)}`);
    console.log(`      50 partidas: ${resultado50.estadisticasGenerales.promedioPollosPorPartida.toFixed(2)}`);
    
    console.log('\n   Tasa de retiro exitoso:');
    console.log(`      30 partidas: ${((resultado30.estadisticasGenerales.partidasConRetiro / resultado30.totalPartidas) * 100).toFixed(1)}%`);
    console.log(`      50 partidas: ${((resultado50.estadisticasGenerales.partidasConRetiro / resultado50.totalPartidas) * 100).toFixed(1)}%`);

    console.log('\n   Top 5 posiciones más seguras (30 partidas):');
    resultado30.posicionesMasSeguras.slice(0, 5).forEach((pos, idx) => {
      console.log(`      ${idx + 1}. Posición ${pos.posicion} (${pos.porcentajePollo.toFixed(1)}%)`);
    });

    console.log('\n   Top 5 posiciones más seguras (50 partidas):');
    resultado50.posicionesMasSeguras.slice(0, 5).forEach((pos, idx) => {
      console.log(`      ${idx + 1}. Posición ${pos.posicion} (${pos.porcentajePollo.toFixed(1)}%)`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Análisis completado exitosamente\n');

  } catch (error) {
    console.error('❌ Error en el análisis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
