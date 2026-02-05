// Análisis exhaustivo de últimas 100 partidas reales
import { db } from '@/lib/db';

interface AnalisisPartida {
  id: string;
  fecha: Date;
  victoria: boolean;
  posicionUsada: number;
  multiplicador: number;
  ganancia: number;
  huesos: number;
  posicionesReveladas: number;
}

interface PatronConsecutivo {
  tipo: 'VV' | 'VD' | 'DV' | 'DD';
  cantidad: number;
  tasaExito: number;
}

interface CambioEstado {
  deVictoriaADerrota: number;
  deDerrotaAVictoria: number;
  rachasVictorias: number[];
  rachasDerrotas: number[];
}

async function main() {
  console.log('🔍 ===== ANÁLISIS EXHAUSTIVO DE ÚLTIMAS 100 PARTIDAS =====\n');

  // Obtener últimas 100 partidas reales
  const partidas = await db.chickenGame.findMany({
    where: { isSimulated: false },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { positions: true },
  });

  if (partidas.length < 100) {
    console.log(
      `⚠️  Solo hay ${partidas.length} partidas disponibles (se necesitan 100)`
    );
    console.log(`📊 Analizando las ${partidas.length} partidas disponibles...\n`);
  }

  // Invertir para análisis cronológico
  partidas.reverse();

  // 1. MÉTRICAS BÁSICAS
  console.log('📊 ===== 1. MÉTRICAS BÁSICAS =====');
  const victorias = partidas.filter((p) => !p.hitBone).length;
  const derrotas = partidas.length - victorias;
  const tasaExito = (victorias / partidas.length) * 100;

  console.log(`Total partidas: ${partidas.length}`);
  console.log(`✅ Victorias: ${victorias} (${tasaExito.toFixed(1)}%)`);
  console.log(`❌ Derrotas: ${derrotas} (${(100 - tasaExito).toFixed(1)}%)`);

  // 2. ANÁLISIS DE RACHAS
  console.log(`\n🔥 ===== 2. ANÁLISIS DE RACHAS =====`);
  let rachaActualV = 0;
  let rachaActualD = 0;
  let rachaMaxV = 0;
  let rachaMaxD = 0;
  const rachasVictorias: number[] = [];
  const rachasDerrotas: number[] = [];

  partidas.forEach((p, i) => {
    if (!p.hitBone) {
      rachaActualV++;
      if (rachaActualD > 0) {
        rachasDerrotas.push(rachaActualD);
      }
      rachaActualD = 0;
      rachaMaxV = Math.max(rachaMaxV, rachaActualV);
    } else {
      rachaActualD++;
      if (rachaActualV > 0) {
        rachasVictorias.push(rachaActualV);
      }
      rachaActualV = 0;
      rachaMaxD = Math.max(rachaMaxD, rachaActualD);
    }
  });

  // Agregar racha final
  if (rachaActualV > 0) rachasVictorias.push(rachaActualV);
  if (rachaActualD > 0) rachasDerrotas.push(rachaActualD);

  console.log(`Racha máxima victorias: ${rachaMaxV}`);
  console.log(`Racha máxima derrotas: ${rachaMaxD}`);
  console.log(`Racha actual: ${rachaActualV > 0 ? `${rachaActualV} victorias` : `${rachaActualD} derrotas`}`);
  console.log(`Total rachas victorias: ${rachasVictorias.length}`);
  console.log(`Total rachas derrotas: ${rachasDerrotas.length}`);

  const promedioRachaV =
    rachasVictorias.length > 0
      ? rachasVictorias.reduce((a, b) => a + b, 0) / rachasVictorias.length
      : 0;
  const promedioRachaD =
    rachasDerrotas.length > 0
      ? rachasDerrotas.reduce((a, b) => a + b, 0) / rachasDerrotas.length
      : 0;

  console.log(`Promedio racha victorias: ${promedioRachaV.toFixed(1)}`);
  console.log(`Promedio racha derrotas: ${promedioRachaD.toFixed(1)}`);

  // 3. ANÁLISIS DE POSICIONES
  console.log(`\n📍 ===== 3. ANÁLISIS DE POSICIONES =====`);
  const posicionesMap = new Map<
    number,
    { usos: number; victorias: number; derrotas: number; indices: number[] }
  >();

  partidas.forEach((partida, index) => {
    const primeraPos = partida.positions
      .filter((p) => p.revealed && p.revealOrder !== null)
      .sort((a, b) => (a.revealOrder || 0) - (b.revealOrder || 0))[0];

    if (primeraPos) {
      const pos = primeraPos.position;
      if (!posicionesMap.has(pos)) {
        posicionesMap.set(pos, {
          usos: 0,
          victorias: 0,
          derrotas: 0,
          indices: [],
        });
      }
      const data = posicionesMap.get(pos)!;
      data.usos++;
      data.indices.push(index);
      if (primeraPos.isChicken) {
        data.victorias++;
      } else {
        data.derrotas++;
      }
    }
  });

  const posicionesOrdenadas = Array.from(posicionesMap.entries())
    .map(([pos, data]) => ({
      posicion: pos,
      usos: data.usos,
      victorias: data.victorias,
      derrotas: data.derrotas,
      tasaExito: (data.victorias / data.usos) * 100,
      indices: data.indices,
    }))
    .sort((a, b) => b.usos - a.usos);

  console.log(`\n📊 Top 15 Posiciones Más Usadas:`);
  posicionesOrdenadas.slice(0, 15).forEach((pos, i) => {
    const emoji =
      pos.tasaExito >= 60 ? '✅' : pos.tasaExito >= 40 ? '⚠️' : '❌';
    console.log(
      `${i + 1}. ${emoji} Pos ${pos.posicion}: ${pos.usos} usos | ${pos.tasaExito.toFixed(1)}% éxito | ${pos.victorias}V/${pos.derrotas}D`
    );
  });

  // Posiciones nunca usadas
  const posicionesUsadas = new Set(posicionesMap.keys());
  const posicionesNoUsadas = Array.from({ length: 25 }, (_, i) => i + 1).filter(
    (p) => !posicionesUsadas.has(p)
  );

  console.log(`\n💎 Posiciones NUNCA usadas (${posicionesNoUsadas.length}): ${posicionesNoUsadas.join(', ')}`);

  // 4. ANÁLISIS DE PATRONES CONSECUTIVOS
  console.log(`\n🔄 ===== 4. PATRONES CONSECUTIVOS =====`);
  const patrones = {
    VV: { cantidad: 0, exitos: 0 }, // Victoria seguida de Victoria
    VD: { cantidad: 0, exitos: 0 }, // Victoria seguida de Derrota
    DV: { cantidad: 0, exitos: 0 }, // Derrota seguida de Victoria
    DD: { cantidad: 0, exitos: 0 }, // Derrota seguida de Derrota
  };

  for (let i = 0; i < partidas.length - 1; i++) {
    const actual = !partidas[i].hitBone;
    const siguiente = !partidas[i + 1].hitBone;

    if (actual && siguiente) {
      patrones.VV.cantidad++;
      patrones.VV.exitos++;
    } else if (actual && !siguiente) {
      patrones.VD.cantidad++;
    } else if (!actual && siguiente) {
      patrones.DV.cantidad++;
      patrones.DV.exitos++;
    } else {
      patrones.DD.cantidad++;
    }
  }

  console.log(`Victoria → Victoria: ${patrones.VV.cantidad} veces (${patrones.VV.cantidad > 0 ? ((patrones.VV.exitos / patrones.VV.cantidad) * 100).toFixed(1) : 0}% mantiene victoria)`);
  console.log(`Victoria → Derrota: ${patrones.VD.cantidad} veces`);
  console.log(`Derrota → Victoria: ${patrones.DV.cantidad} veces (${patrones.DV.cantidad > 0 ? ((patrones.DV.exitos / patrones.DV.cantidad) * 100).toFixed(1) : 0}% recuperación)`);
  console.log(`Derrota → Derrota: ${patrones.DD.cantidad} veces`);

  // 5. ANÁLISIS DE CAMBIOS DE ESTADO
  console.log(`\n🔀 ===== 5. CAMBIOS DE ESTADO =====`);
  let cambiosVD = 0;
  let cambiosDV = 0;

  for (let i = 0; i < partidas.length - 1; i++) {
    const actual = !partidas[i].hitBone;
    const siguiente = !partidas[i + 1].hitBone;

    if (actual && !siguiente) cambiosVD++;
    if (!actual && siguiente) cambiosDV++;
  }

  console.log(`Cambios Victoria → Derrota: ${cambiosVD}`);
  console.log(`Cambios Derrota → Victoria: ${cambiosDV}`);
  console.log(`Estabilidad: ${((1 - (cambiosVD + cambiosDV) / (partidas.length - 1)) * 100).toFixed(1)}%`);

  // 6. ANÁLISIS DE ÚLTIMAS 5 PARTIDAS (POSICIONES CALIENTES)
  console.log(`\n🔥 ===== 6. POSICIONES CALIENTES (Últimas 5 Partidas) =====`);
  const ultimas5 = partidas.slice(-5);
  const posicionesCalientes = new Map<number, number>();

  ultimas5.forEach((partida) => {
    const primeraPos = partida.positions
      .filter((p) => p.revealed && p.revealOrder !== null)
      .sort((a, b) => (a.revealOrder || 0) - (b.revealOrder || 0))[0];

    if (primeraPos) {
      posicionesCalientes.set(
        primeraPos.position,
        (posicionesCalientes.get(primeraPos.position) || 0) + 1
      );
    }
  });

  const posicionesCalientesOrdenadas = Array.from(posicionesCalientes.entries())
    .sort((a, b) => b[1] - a[1]);

  console.log(`Posiciones usadas en últimas 5 partidas:`);
  posicionesCalientesOrdenadas.forEach(([pos, count]) => {
    const porcentaje = (count / 5) * 100;
    const emoji = count >= 3 ? '🔥' : count >= 2 ? '⚠️' : '✅';
    console.log(`   ${emoji} Pos ${pos}: ${count} veces (${porcentaje.toFixed(0)}%)`);
  });

  const posicionesAEvitar = posicionesCalientesOrdenadas
    .filter(([, count]) => count >= 2)
    .map(([pos]) => pos);

  console.log(`\n🚫 Posiciones a EVITAR (usadas 2+ veces): ${posicionesAEvitar.join(', ')}`);

  // 7. ANÁLISIS POR SEGMENTOS DE 20 PARTIDAS
  console.log(`\n📈 ===== 7. EVOLUCIÓN POR SEGMENTOS (20 partidas) =====`);
  const segmentos = Math.floor(partidas.length / 20);

  for (let i = 0; i < segmentos; i++) {
    const inicio = i * 20;
    const fin = inicio + 20;
    const segmento = partidas.slice(inicio, fin);
    const victoriasSegmento = segmento.filter((p) => !p.hitBone).length;
    const tasaSegmento = (victoriasSegmento / 20) * 100;

    const emoji = tasaSegmento >= 60 ? '✅' : tasaSegmento >= 40 ? '⚠️' : '❌';
    console.log(
      `Segmento ${i + 1} (partidas ${inicio + 1}-${fin}): ${emoji} ${victoriasSegmento}/20 (${tasaSegmento.toFixed(1)}%)`
    );
  }

  // 8. ANÁLISIS DE POSICIONES POR ZONA
  console.log(`\n🗺️  ===== 8. ANÁLISIS POR ZONAS =====`);
  const zonaA = posicionesOrdenadas.filter((p) => p.posicion <= 12);
  const zonaB = posicionesOrdenadas.filter((p) => p.posicion >= 13);

  const usosZonaA = zonaA.reduce((sum, p) => sum + p.usos, 0);
  const usosZonaB = zonaB.reduce((sum, p) => sum + p.usos, 0);
  const victoriasZonaA = zonaA.reduce((sum, p) => sum + p.victorias, 0);
  const victoriasZonaB = zonaB.reduce((sum, p) => sum + p.victorias, 0);

  console.log(`Zona A (1-12):`);
  console.log(`   Usos: ${usosZonaA} (${((usosZonaA / partidas.length) * 100).toFixed(1)}%)`);
  console.log(`   Tasa éxito: ${usosZonaA > 0 ? ((victoriasZonaA / usosZonaA) * 100).toFixed(1) : 0}%`);

  console.log(`Zona B (13-25):`);
  console.log(`   Usos: ${usosZonaB} (${((usosZonaB / partidas.length) * 100).toFixed(1)}%)`);
  console.log(`   Tasa éxito: ${usosZonaB > 0 ? ((victoriasZonaB / usosZonaB) * 100).toFixed(1) : 0}%`);

  // 9. VENTAJAS EXPLOTABLES
  console.log(`\n💎 ===== 9. VENTAJAS EXPLOTABLES =====`);

  // Posiciones con alta tasa de éxito y pocos usos
  const posicionesPromesa = posicionesOrdenadas.filter(
    (p) => p.tasaExito >= 60 && p.usos >= 3 && p.usos <= 8
  );

  console.log(`\n🎯 Posiciones con alto éxito y uso moderado:`);
  posicionesPromesa.forEach((pos) => {
    console.log(
      `   ✅ Pos ${pos.posicion}: ${pos.tasaExito.toFixed(1)}% éxito (${pos.usos} usos)`
    );
  });

  // Posiciones con baja tasa de éxito (evitar)
  const posicionesPeligrosas = posicionesOrdenadas.filter(
    (p) => p.tasaExito < 40 && p.usos >= 5
  );

  console.log(`\n⚠️  Posiciones peligrosas (< 40% éxito, 5+ usos):`);
  posicionesPeligrosas.forEach((pos) => {
    console.log(
      `   ❌ Pos ${pos.posicion}: ${pos.tasaExito.toFixed(1)}% éxito (${pos.usos} usos)`
    );
  });

  // Mejor momento para jugar (después de derrota o victoria)
  const tasaDespuesVictoria =
    patrones.VV.cantidad > 0
      ? (patrones.VV.exitos / patrones.VV.cantidad) * 100
      : 0;
  const tasaDespuesDerrota =
    patrones.DV.cantidad > 0
      ? (patrones.DV.exitos / patrones.DV.cantidad) * 100
      : 0;

  console.log(`\n🎲 Mejor momento para jugar:`);
  if (tasaDespuesDerrota > tasaDespuesVictoria) {
    console.log(
      `   ✅ Después de DERROTA (${tasaDespuesDerrota.toFixed(1)}% recuperación)`
    );
  } else {
    console.log(
      `   ✅ Después de VICTORIA (${tasaDespuesVictoria.toFixed(1)}% mantiene racha)`
    );
  }

  // 10. RECOMENDACIONES FINALES
  console.log(`\n📋 ===== 10. RECOMENDACIONES FINALES =====`);

  if (tasaExito < 50) {
    console.log(`🔴 CRÍTICO: Tasa de éxito muy baja (${tasaExito.toFixed(1)}%)`);
    console.log(`   → Aplicar optimizaciones agresivas`);
    console.log(`   → Evitar posiciones calientes: ${posicionesAEvitar.join(', ')}`);
  } else if (tasaExito < 60) {
    console.log(`⚠️  MEJORABLE: Tasa de éxito aceptable (${tasaExito.toFixed(1)}%)`);
    console.log(`   → Mantener diversidad de posiciones`);
    console.log(`   → Evitar posiciones calientes: ${posicionesAEvitar.join(', ')}`);
  } else {
    console.log(`✅ EXCELENTE: Tasa de éxito alta (${tasaExito.toFixed(1)}%)`);
    console.log(`   → Mantener estrategia actual`);
  }

  if (rachaMaxD > 5) {
    console.log(`🔴 Racha máxima derrotas muy alta (${rachaMaxD})`);
    console.log(`   → Implementar stop-loss después de 3 derrotas`);
  }

  if (posicionesNoUsadas.length > 15) {
    console.log(`💡 Muchas posiciones sin explorar (${posicionesNoUsadas.length})`);
    console.log(`   → Aumentar exploración (epsilon)`);
  }

  console.log(`\n✅ ===== ANÁLISIS COMPLETADO =====\n`);

  // Guardar posiciones calientes para uso del sistema
  console.log(`📝 Posiciones calientes guardadas: ${posicionesAEvitar.join(', ')}`);
}

main()
  .catch((error) => {
    console.error('❌ Error en análisis:', error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
