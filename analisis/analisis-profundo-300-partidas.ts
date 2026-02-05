// Análisis profundo de últimas 300 partidas reales para mejorar simulador
import { db } from '@/lib/db';

interface PosicionStats {
  posicion: number;
  totalApariciones: number;
  vecesHueso: number;
  vecesPollo: number;
  tasaHueso: number;
  tasaPollo: number;
  primeraRevelada: number;
  segundaRevelada: number;
  terceraRevelada: number;
}

interface PatronSecuencial {
  secuencia: string;
  cantidad: number;
  tasaExito: number;
}

async function main() {
  console.log('🔍 ===== ANÁLISIS PROFUNDO DE 300 PARTIDAS REALES =====\n');

  // Obtener últimas 300 partidas reales
  const partidas = await db.chickenGame.findMany({
    where: { isSimulated: false },
    orderBy: { createdAt: 'desc' },
    take: 300,
    include: { positions: true },
  });

  console.log(`📊 Total partidas analizadas: ${partidas.length}\n`);

  if (partidas.length < 300) {
    console.log(`⚠️  Solo hay ${partidas.length} partidas disponibles\n`);
  }

  // 1. ANÁLISIS DETALLADO POR POSICIÓN
  console.log('📍 ===== 1. ANÁLISIS DETALLADO POR POSICIÓN =====\n');

  const posicionesStats = new Map<number, PosicionStats>();

  // Inicializar todas las posiciones
  for (let pos = 1; pos <= 25; pos++) {
    posicionesStats.set(pos, {
      posicion: pos,
      totalApariciones: 0,
      vecesHueso: 0,
      vecesPollo: 0,
      tasaHueso: 0,
      tasaPollo: 0,
      primeraRevelada: 0,
      segundaRevelada: 0,
      terceraRevelada: 0,
    });
  }

  // Analizar cada partida
  partidas.forEach((partida) => {
    partida.positions.forEach((pos) => {
      const stats = posicionesStats.get(pos.position)!;

      if (pos.isChicken) {
        stats.vecesPollo++;
      } else {
        stats.vecesHueso++;
      }
      stats.totalApariciones++;

      // Contar orden de revelación
      if (pos.revealed && pos.revealOrder !== null) {
        if (pos.revealOrder === 1) stats.primeraRevelada++;
        if (pos.revealOrder === 2) stats.segundaRevelada++;
        if (pos.revealOrder === 3) stats.terceraRevelada++;
      }
    });
  });

  // Calcular tasas
  posicionesStats.forEach((stats) => {
    stats.tasaHueso = (stats.vecesHueso / stats.totalApariciones) * 100;
    stats.tasaPollo = (stats.vecesPollo / stats.totalApariciones) * 100;
  });

  // Ordenar por tasa de hueso (más peligrosas primero)
  const posicionesOrdenadas = Array.from(posicionesStats.values()).sort(
    (a, b) => b.tasaHueso - a.tasaHueso
  );

  console.log('🔴 TOP 10 POSICIONES MÁS PELIGROSAS (más huesos):');
  posicionesOrdenadas.slice(0, 10).forEach((stats, i) => {
    console.log(
      `${i + 1}. Pos ${stats.posicion}: ${stats.tasaHueso.toFixed(2)}% huesos (${stats.vecesHueso}/${stats.totalApariciones}) | 1ra: ${stats.primeraRevelada}x`
    );
  });

  console.log('\n✅ TOP 10 POSICIONES MÁS SEGURAS (más pollos):');
  posicionesOrdenadas
    .slice(-10)
    .reverse()
    .forEach((stats, i) => {
      console.log(
        `${i + 1}. Pos ${stats.posicion}: ${stats.tasaPollo.toFixed(2)}% pollos (${stats.vecesPollo}/${stats.totalApariciones}) | 1ra: ${stats.primeraRevelada}x`
      );
    });

  // 2. ANÁLISIS DE DISTRIBUCIÓN POR ZONAS
  console.log('\n\n🗺️  ===== 2. DISTRIBUCIÓN POR ZONAS =====\n');

  const zonas = {
    fila1: { huesos: 0, total: 0, posiciones: [1, 2, 3, 4, 5] },
    fila2: { huesos: 0, total: 0, posiciones: [6, 7, 8, 9, 10] },
    fila3: { huesos: 0, total: 0, posiciones: [11, 12, 13, 14, 15] },
    fila4: { huesos: 0, total: 0, posiciones: [16, 17, 18, 19, 20] },
    fila5: { huesos: 0, total: 0, posiciones: [21, 22, 23, 24, 25] },
    col1: { huesos: 0, total: 0, posiciones: [1, 6, 11, 16, 21] },
    col2: { huesos: 0, total: 0, posiciones: [2, 7, 12, 17, 22] },
    col3: { huesos: 0, total: 0, posiciones: [3, 8, 13, 18, 23] },
    col4: { huesos: 0, total: 0, posiciones: [4, 9, 14, 19, 24] },
    col5: { huesos: 0, total: 0, posiciones: [5, 10, 15, 20, 25] },
  };

  Object.entries(zonas).forEach(([nombre, zona]) => {
    zona.posiciones.forEach((pos) => {
      const stats = posicionesStats.get(pos)!;
      zona.huesos += stats.vecesHueso;
      zona.total += stats.totalApariciones;
    });
  });

  console.log('📊 Distribución por FILAS:');
  ['fila1', 'fila2', 'fila3', 'fila4', 'fila5'].forEach((fila) => {
    const zona = zonas[fila as keyof typeof zonas];
    const tasa = (zona.huesos / zona.total) * 100;
    const emoji = tasa > 18 ? '🔴' : tasa > 14 ? '⚠️' : '✅';
    console.log(
      `   ${emoji} ${fila}: ${tasa.toFixed(2)}% huesos (${zona.huesos}/${zona.total})`
    );
  });

  console.log('\n📊 Distribución por COLUMNAS:');
  ['col1', 'col2', 'col3', 'col4', 'col5'].forEach((col) => {
    const zona = zonas[col as keyof typeof zonas];
    const tasa = (zona.huesos / zona.total) * 100;
    const emoji = tasa > 18 ? '🔴' : tasa > 14 ? '⚠️' : '✅';
    console.log(
      `   ${emoji} ${col}: ${tasa.toFixed(2)}% huesos (${zona.huesos}/${zona.total})`
    );
  });

  // 3. ANÁLISIS DE ROTACIÓN DE HUESOS
  console.log('\n\n🔄 ===== 3. ANÁLISIS DE ROTACIÓN DE HUESOS =====\n');

  let totalComparaciones = 0;
  let huesosRepetidos = 0;
  const overlapPorPartida: number[] = [];

  for (let i = 0; i < partidas.length - 1; i++) {
    const partidaActual = partidas[i];
    const partidaSiguiente = partidas[i + 1];

    const huesosActual = partidaActual.positions
      .filter((p) => !p.isChicken)
      .map((p) => p.position);

    const huesosSiguiente = partidaSiguiente.positions
      .filter((p) => !p.isChicken)
      .map((p) => p.position);

    const repetidos = huesosActual.filter((h) =>
      huesosSiguiente.includes(h)
    ).length;

    huesosRepetidos += repetidos;
    totalComparaciones++;
    overlapPorPartida.push(repetidos);
  }

  const promedioOverlap = huesosRepetidos / totalComparaciones;
  const porcentajeOverlap = (promedioOverlap / 4) * 100; // Asumiendo 4 huesos

  console.log(`Total comparaciones: ${totalComparaciones}`);
  console.log(`Huesos repetidos total: ${huesosRepetidos}`);
  console.log(`Promedio overlap: ${promedioOverlap.toFixed(2)} huesos`);
  console.log(`Porcentaje overlap: ${porcentajeOverlap.toFixed(2)}%`);

  // Distribución de overlap
  const overlapDistribucion = [0, 0, 0, 0, 0]; // 0, 1, 2, 3, 4 huesos repetidos
  overlapPorPartida.forEach((overlap) => {
    overlapDistribucion[overlap]++;
  });

  console.log('\n📊 Distribución de overlap:');
  overlapDistribucion.forEach((count, overlap) => {
    const porcentaje = (count / totalComparaciones) * 100;
    console.log(
      `   ${overlap} huesos repetidos: ${count} veces (${porcentaje.toFixed(1)}%)`
    );
  });

  // 4. ANÁLISIS DE PATRONES SECUENCIALES
  console.log('\n\n🔄 ===== 4. PATRONES SECUENCIALES =====\n');

  const patronesSecuenciales = new Map<string, PatronSecuencial>();

  for (let i = 0; i < partidas.length - 2; i++) {
    const p1 = !partidas[i].hitBone ? 'V' : 'D';
    const p2 = !partidas[i + 1].hitBone ? 'V' : 'D';
    const p3 = !partidas[i + 2].hitBone ? 'V' : 'D';
    const secuencia = `${p1}${p2}${p3}`;

    if (!patronesSecuenciales.has(secuencia)) {
      patronesSecuenciales.set(secuencia, {
        secuencia,
        cantidad: 0,
        tasaExito: 0,
      });
    }

    const patron = patronesSecuenciales.get(secuencia)!;
    patron.cantidad++;
  }

  console.log('📊 Patrones de 3 partidas consecutivas:');
  Array.from(patronesSecuenciales.values())
    .sort((a, b) => b.cantidad - a.cantidad)
    .forEach((patron) => {
      const porcentaje = (patron.cantidad / (partidas.length - 2)) * 100;
      console.log(
        `   ${patron.secuencia}: ${patron.cantidad} veces (${porcentaje.toFixed(1)}%)`
      );
    });

  // 5. ANÁLISIS DE POSICIONES MÁS REVELADAS
  console.log('\n\n👆 ===== 5. POSICIONES MÁS REVELADAS =====\n');

  const posicionesReveladas = new Map<number, number>();

  partidas.forEach((partida) => {
    partida.positions
      .filter((p) => p.revealed)
      .forEach((p) => {
        posicionesReveladas.set(
          p.position,
          (posicionesReveladas.get(p.position) || 0) + 1
        );
      });
  });

  const topReveladas = Array.from(posicionesReveladas.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  console.log('📊 Top 15 posiciones más reveladas por jugadores:');
  topReveladas.forEach(([pos, count], i) => {
    const stats = posicionesStats.get(pos)!;
    console.log(
      `${i + 1}. Pos ${pos}: ${count} veces revelada | ${stats.tasaPollo.toFixed(1)}% pollos`
    );
  });

  // 6. ANÁLISIS DE COMPORTAMIENTO DE RETIRO
  console.log('\n\n💰 ===== 6. COMPORTAMIENTO DE RETIRO =====\n');

  const retirosPorPosicion = new Map<number, number>();
  let totalRetiros = 0;

  partidas.forEach((partida) => {
    if (!partida.hitBone && partida.cashOutPosition) {
      retirosPorPosicion.set(
        partida.cashOutPosition,
        (retirosPorPosicion.get(partida.cashOutPosition) || 0) + 1
      );
      totalRetiros++;
    }
  });

  console.log('📊 Distribución de retiros por cantidad de pollos:');
  Array.from(retirosPorPosicion.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([posiciones, count]) => {
      const porcentaje = (count / totalRetiros) * 100;
      console.log(
        `   ${posiciones} pollos: ${count} retiros (${porcentaje.toFixed(1)}%)`
      );
    });

  // 7. GENERAR CONFIGURACIÓN PARA SIMULADOR
  console.log('\n\n⚙️  ===== 7. CONFIGURACIÓN PARA SIMULADOR =====\n');

  console.log('```typescript');
  console.log('const MYSTAKE_REAL_PATTERNS = {');
  console.log('  // Frecuencia de huesos por posición (basado en 300 partidas)');
  console.log('  boneFrequencyWeights: {');

  // Generar pesos normalizados
  const totalHuesos = Array.from(posicionesStats.values()).reduce(
    (sum, s) => sum + s.vecesHueso,
    0
  );

  posicionesOrdenadas.forEach((stats) => {
    const peso = stats.vecesHueso / totalHuesos;
    console.log(`    ${stats.posicion}: ${peso.toFixed(4)},`);
  });

  console.log('  },');
  console.log('');
  console.log('  // Distribución por zonas');
  console.log('  zoneWeights: {');

  ['fila1', 'fila2', 'fila3', 'fila4', 'fila5'].forEach((fila) => {
    const zona = zonas[fila as keyof typeof zonas];
    const peso = zona.huesos / totalHuesos;
    console.log(`    ${fila}: ${peso.toFixed(4)},`);
  });

  ['col1', 'col2', 'col3', 'col4', 'col5'].forEach((col) => {
    const zona = zonas[col as keyof typeof zonas];
    const peso = zona.huesos / totalHuesos;
    console.log(`    ${col}: ${peso.toFixed(4)},`);
  });

  console.log('  },');
  console.log('');
  console.log('  // Rotación de huesos');
  console.log(`  averageOverlap: ${promedioOverlap.toFixed(2)},`);
  console.log(`  overlapPercentage: ${porcentajeOverlap.toFixed(2)},`);
  console.log('');
  console.log('  // Posiciones más reveladas (orden de preferencia)');
  console.log(
    `  mostRevealedPositions: [${topReveladas.map(([pos]) => pos).join(', ')}],`
  );
  console.log('');
  console.log('  // Comportamiento de retiro');
  console.log('  cashOutBehavior: {');

  Array.from(retirosPorPosicion.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([posiciones, count]) => {
      const probabilidad = count / totalRetiros;
      console.log(`    ${posiciones}: ${probabilidad.toFixed(4)},`);
    });

  console.log('  }');
  console.log('};');
  console.log('```');

  // 8. RECOMENDACIONES PARA EL ASESOR
  console.log('\n\n💡 ===== 8. RECOMENDACIONES PARA EL ASESOR =====\n');

  const posicionesSeguras = posicionesOrdenadas
    .filter((s) => s.tasaPollo >= 85)
    .slice(-10);

  console.log('✅ Posiciones SEGURAS para priorizar (85%+ pollos):');
  posicionesSeguras.forEach((stats) => {
    console.log(
      `   Pos ${stats.posicion}: ${stats.tasaPollo.toFixed(1)}% pollos`
    );
  });

  const posicionesPeligrosas = posicionesOrdenadas
    .filter((s) => s.tasaHueso >= 20)
    .slice(0, 10);

  console.log('\n🔴 Posiciones PELIGROSAS para evitar (20%+ huesos):');
  posicionesPeligrosas.forEach((stats) => {
    console.log(
      `   Pos ${stats.posicion}: ${stats.tasaHueso.toFixed(1)}% huesos`
    );
  });

  console.log('\n📋 Estrategia recomendada:');
  console.log(`   1. Priorizar posiciones: ${posicionesSeguras.map((s) => s.posicion).join(', ')}`);
  console.log(`   2. Evitar posiciones: ${posicionesPeligrosas.map((s) => s.posicion).join(', ')}`);
  console.log(`   3. Overlap promedio: ${promedioOverlap.toFixed(2)} huesos (${porcentajeOverlap.toFixed(1)}%)`);
  console.log(`   4. Retiro óptimo: ${Array.from(retirosPorPosicion.entries()).sort((a, b) => b[1] - a[1])[0][0]} pollos`);

  console.log('\n✅ ===== ANÁLISIS COMPLETADO =====\n');
}

main()
  .catch((error) => {
    console.error('❌ Error en análisis:', error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
