/**
 * 🔍 ANÁLISIS EXHAUSTIVO DE ÚLTIMAS 30 PARTIDAS
 * 
 * Analiza:
 * - Patrones de posiciones sugeridas
 * - Uso excesivo de posiciones "seguras"
 * - Tasa de éxito real vs esperada
 * - Ventajas explotables
 * - Fallas del sistema
 */

import { db } from '@/lib/db';

interface AnalisisPartida {
  id: string;
  fecha: Date;
  boneCount: number;
  victoria: boolean;
  posicionesReveladas: number[];
  primeraPos: number;
  huesosReales: number[];
  multiplicador: number;
}

interface PatronPosicion {
  posicion: number;
  vecesUsada: number;
  vecesExito: number;
  tasaExito: number;
  vecesHueso: number;
  tasaHueso: number;
}

async function analizarUltimas30Partidas() {
  console.log('🔍 ===== ANÁLISIS EXHAUSTIVO DE ÚLTIMAS 30 PARTIDAS =====\n');

  // Obtener últimas 30 partidas REALES
  const partidas = await db.chickenGame.findMany({
    where: { isSimulated: false },
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: { positions: true },
  });

  console.log(`📊 Total de partidas analizadas: ${partidas.length}\n`);

  if (partidas.length === 0) {
    console.log('❌ No hay partidas para analizar');
    return;
  }

  // Procesar partidas
  const analisis: AnalisisPartida[] = partidas.map((p) => {
    const posiciones = p.positions
      .filter((pos) => pos.revealed && pos.revealOrder !== null)
      .sort((a, b) => (a.revealOrder || 0) - (b.revealOrder || 0));

    const pollos = posiciones.filter((pos) => pos.isChicken).map((pos) => pos.position);
    const huesos = posiciones.filter((pos) => !pos.isChicken).map((pos) => pos.position);

    return {
      id: p.id,
      fecha: p.createdAt,
      boneCount: p.boneCount,
      victoria: !p.hitBone,
      posicionesReveladas: posiciones.map((pos) => pos.position),
      primeraPos: posiciones.length > 0 ? posiciones[0].position : 0,
      huesosReales: huesos,
      multiplicador: p.multiplier || 0,
    };
  });

  // 1. ANÁLISIS DE VICTORIAS/DERROTAS
  console.log('📈 ===== 1. ANÁLISIS DE VICTORIAS/DERROTAS =====');
  const victorias = analisis.filter((a) => a.victoria).length;
  const derrotas = analisis.filter((a) => !a.victoria).length;
  const tasaVictoria = (victorias / analisis.length) * 100;

  console.log(`✅ Victorias: ${victorias} (${tasaVictoria.toFixed(1)}%)`);
  console.log(`❌ Derrotas: ${derrotas} (${(100 - tasaVictoria).toFixed(1)}%)`);
  console.log(`🎯 Tasa de éxito: ${tasaVictoria.toFixed(1)}%`);
  
  if (tasaVictoria < 50) {
    console.log('⚠️  ALERTA: Tasa de éxito menor al 50% - Sistema necesita ajustes');
  } else if (tasaVictoria > 70) {
    console.log('✨ EXCELENTE: Tasa de éxito mayor al 70%');
  }
  console.log('');

  // 2. ANÁLISIS DE RACHAS
  console.log('🔥 ===== 2. ANÁLISIS DE RACHAS =====');
  let rachaActualV = 0;
  let rachaActualD = 0;
  let maxRachaV = 0;
  let maxRachaD = 0;
  let rachaTemp = 0;
  let tipoRacha: 'V' | 'D' | null = null;

  analisis.reverse().forEach((a) => {
    if (a.victoria) {
      if (tipoRacha === 'V') {
        rachaTemp++;
      } else {
        rachaTemp = 1;
        tipoRacha = 'V';
      }
      maxRachaV = Math.max(maxRachaV, rachaTemp);
    } else {
      if (tipoRacha === 'D') {
        rachaTemp++;
      } else {
        rachaTemp = 1;
        tipoRacha = 'D';
      }
      maxRachaD = Math.max(maxRachaD, rachaTemp);
    }
  });

  // Racha actual (última partida)
  if (analisis.length > 0) {
    const ultima = analisis[analisis.length - 1];
    if (ultima.victoria) {
      rachaActualV = 1;
      for (let i = analisis.length - 2; i >= 0; i--) {
        if (analisis[i].victoria) rachaActualV++;
        else break;
      }
    } else {
      rachaActualD = 1;
      for (let i = analisis.length - 2; i >= 0; i--) {
        if (!analisis[i].victoria) rachaActualD++;
        else break;
      }
    }
  }

  console.log(`🟢 Racha actual de victorias: ${rachaActualV}`);
  console.log(`🔴 Racha actual de derrotas: ${rachaActualD}`);
  console.log(`📊 Racha máxima de victorias: ${maxRachaV}`);
  console.log(`📊 Racha máxima de derrotas: ${maxRachaD}`);
  
  if (maxRachaD > 5) {
    console.log('⚠️  ALERTA: Racha de derrotas muy alta - Revisar estrategia');
  }
  console.log('');

  // 3. ANÁLISIS DE POSICIONES USADAS
  console.log('🎯 ===== 3. ANÁLISIS DE POSICIONES USADAS =====');
  const posicionesMap = new Map<number, PatronPosicion>();

  analisis.forEach((a) => {
    if (a.primeraPos > 0) {
      const pos = a.primeraPos;
      if (!posicionesMap.has(pos)) {
        posicionesMap.set(pos, {
          posicion: pos,
          vecesUsada: 0,
          vecesExito: 0,
          tasaExito: 0,
          vecesHueso: 0,
          tasaHueso: 0,
        });
      }

      const patron = posicionesMap.get(pos)!;
      patron.vecesUsada++;
      if (a.victoria) {
        patron.vecesExito++;
      } else {
        patron.vecesHueso++;
      }
      patron.tasaExito = (patron.vecesExito / patron.vecesUsada) * 100;
      patron.tasaHueso = (patron.vecesHueso / patron.vecesUsada) * 100;
    }
  });

  const posicionesArray = Array.from(posicionesMap.values()).sort(
    (a, b) => b.vecesUsada - a.vecesUsada
  );

  console.log('📍 Top 10 Posiciones Más Usadas:');
  posicionesArray.slice(0, 10).forEach((p, i) => {
    const emoji = p.tasaExito >= 70 ? '✅' : p.tasaExito >= 50 ? '⚠️' : '❌';
    console.log(
      `${i + 1}. Pos ${p.posicion}: ${p.vecesUsada} veces | ` +
      `${emoji} ${p.tasaExito.toFixed(1)}% éxito | ` +
      `${p.vecesExito}V / ${p.vecesHueso}D`
    );
  });
  console.log('');

  // 4. DETECCIÓN DE USO EXCESIVO
  console.log('⚠️  ===== 4. DETECCIÓN DE USO EXCESIVO =====');
  const posicionesExcesivas = posicionesArray.filter((p) => p.vecesUsada >= 5);
  
  if (posicionesExcesivas.length > 0) {
    console.log(`🚨 ${posicionesExcesivas.length} posiciones usadas 5+ veces:`);
    posicionesExcesivas.forEach((p) => {
      const alerta = p.tasaExito < 50 ? '🔴 PELIGRO' : p.tasaExito < 70 ? '🟡 CUIDADO' : '🟢 OK';
      console.log(
        `   ${alerta} Pos ${p.posicion}: ${p.vecesUsada} veces (${p.tasaExito.toFixed(1)}% éxito)`
      );
    });
    console.log('');
    console.log('💡 RECOMENDACIÓN: Mystake puede detectar patrones en posiciones muy usadas');
    console.log('   → Aumentar diversidad de posiciones');
    console.log('   → Penalizar posiciones usadas > 5 veces');
  } else {
    console.log('✅ No hay uso excesivo de posiciones');
  }
  console.log('');

  // 5. ANÁLISIS DE POSICIONES "SEGURAS" PREDEFINIDAS
  console.log('🛡️  ===== 5. ANÁLISIS DE POSICIONES "SEGURAS" =====');
  const posicionesSeguras = [4, 7, 10, 13, 14, 15, 17, 18, 19, 20, 21, 23];
  const usadasSeguras = posicionesArray.filter((p) =>
    posicionesSeguras.includes(p.posicion)
  );
  const usadasNoSeguras = posicionesArray.filter(
    (p) => !posicionesSeguras.includes(p.posicion)
  );

  const totalUsosSeguras = usadasSeguras.reduce((sum, p) => sum + p.vecesUsada, 0);
  const totalUsosNoSeguras = usadasNoSeguras.reduce((sum, p) => sum + p.vecesUsada, 0);
  const porcentajeSeguras = (totalUsosSeguras / analisis.length) * 100;

  console.log(`📊 Posiciones "seguras" usadas: ${totalUsosSeguras}/${analisis.length} (${porcentajeSeguras.toFixed(1)}%)`);
  console.log(`📊 Posiciones "no seguras" usadas: ${totalUsosNoSeguras}/${analisis.length} (${(100 - porcentajeSeguras).toFixed(1)}%)`);
  
  if (porcentajeSeguras > 80) {
    console.log('🚨 ALERTA CRÍTICA: Uso excesivo de posiciones "seguras" predefinidas');
    console.log('   → Mystake puede detectar este patrón');
    console.log('   → Sistema muy predecible');
  } else if (porcentajeSeguras > 60) {
    console.log('⚠️  ADVERTENCIA: Alto uso de posiciones "seguras"');
    console.log('   → Aumentar diversidad');
  } else {
    console.log('✅ Buena distribución entre posiciones seguras y no seguras');
  }
  console.log('');

  // 6. ANÁLISIS DE PATRONES DE MYSTAKE
  console.log('🎲 ===== 6. ANÁLISIS DE PATRONES DE MYSTAKE =====');
  
  // Analizar si Mystake coloca huesos en posiciones previamente exitosas
  const posicionesExitosas = posicionesArray.filter((p) => p.tasaExito >= 70);
  const posicionesConHuesos = posicionesArray.filter((p) => p.vecesHueso > 0);
  
  const posicionesExitosasConHuesos = posicionesExitosas.filter((p) =>
    posicionesConHuesos.some((h) => h.posicion === p.posicion)
  );

  console.log(`📍 Posiciones con 70%+ éxito: ${posicionesExitosas.length}`);
  console.log(`💀 De esas, cuántas tuvieron huesos después: ${posicionesExitosasConHuesos.length}`);
  
  if (posicionesExitosasConHuesos.length > 0) {
    console.log('');
    console.log('🔍 Posiciones exitosas que luego tuvieron huesos:');
    posicionesExitosasConHuesos.forEach((p) => {
      console.log(`   Pos ${p.posicion}: ${p.vecesExito}V → ${p.vecesHueso}D (${p.tasaExito.toFixed(1)}% éxito final)`);
    });
    console.log('');
    console.log('💡 PATRÓN DETECTADO: Mystake puede estar moviendo huesos a posiciones exitosas');
    console.log('   → Evitar repetir posiciones exitosas inmediatamente');
    console.log('   → Rotar entre diferentes zonas del tablero');
  }
  console.log('');

  // 7. VENTAJAS EXPLOTABLES
  console.log('💎 ===== 7. VENTAJAS EXPLOTABLES =====');
  
  // Posiciones con 100% éxito y suficientes datos
  const posicionesConfiables = posicionesArray.filter(
    (p) => p.tasaExito === 100 && p.vecesUsada >= 3 && p.vecesUsada <= 5
  );
  
  if (posicionesConfiables.length > 0) {
    console.log('✨ Posiciones con 100% éxito (3-5 usos):');
    posicionesConfiables.forEach((p) => {
      console.log(`   🎯 Pos ${p.posicion}: ${p.vecesUsada} usos, 100% éxito`);
    });
    console.log('   → Usar estas posiciones antes de que Mystake las detecte');
  }
  
  // Posiciones poco usadas con buen éxito
  const posicionesInfravaloradas = posicionesArray.filter(
    (p) => p.vecesUsada <= 2 && p.tasaExito >= 50
  );
  
  if (posicionesInfravaloradas.length > 0) {
    console.log('');
    console.log('🔮 Posiciones poco usadas con potencial:');
    posicionesInfravaloradas.slice(0, 5).forEach((p) => {
      console.log(`   💡 Pos ${p.posicion}: ${p.vecesUsada} usos, ${p.tasaExito.toFixed(1)}% éxito`);
    });
    console.log('   → Explorar estas posiciones para diversificar');
  }
  
  // Zonas del tablero menos exploradas
  const zonaA = posicionesArray.filter((p) => p.posicion <= 12);
  const zonaB = posicionesArray.filter((p) => p.posicion >= 13);
  const usosZonaA = zonaA.reduce((sum, p) => sum + p.vecesUsada, 0);
  const usosZonaB = zonaB.reduce((sum, p) => sum + p.vecesUsada, 0);
  
  console.log('');
  console.log('🗺️  Distribución por zonas:');
  console.log(`   Zona A (1-12): ${usosZonaA} usos (${((usosZonaA / analisis.length) * 100).toFixed(1)}%)`);
  console.log(`   Zona B (13-25): ${usosZonaB} usos (${((usosZonaB / analisis.length) * 100).toFixed(1)}%)`);
  
  if (Math.abs(usosZonaA - usosZonaB) > analisis.length * 0.3) {
    const zonaDesbalanceada = usosZonaA > usosZonaB ? 'A' : 'B';
    const zonaInfraexplotada = usosZonaA > usosZonaB ? 'B' : 'A';
    console.log(`   ⚠️  Desbalance detectado: Zona ${zonaDesbalanceada} muy usada`);
    console.log(`   💡 Explotar Zona ${zonaInfraexplotada} para diversificar`);
  }
  console.log('');

  // 8. RECOMENDACIONES FINALES
  console.log('📋 ===== 8. RECOMENDACIONES FINALES =====');
  
  const recomendaciones: string[] = [];
  
  if (tasaVictoria < 50) {
    recomendaciones.push('🔴 CRÍTICO: Revisar completamente la estrategia de selección');
  }
  
  if (maxRachaD > 5) {
    recomendaciones.push('🔴 CRÍTICO: Implementar stop-loss después de 3 derrotas consecutivas');
  }
  
  if (porcentajeSeguras > 70) {
    recomendaciones.push('🟡 IMPORTANTE: Reducir uso de posiciones "seguras" predefinidas');
    recomendaciones.push('🟡 IMPORTANTE: Aumentar exploración de posiciones no convencionales');
  }
  
  if (posicionesExcesivas.length > 3) {
    recomendaciones.push('🟡 IMPORTANTE: Penalizar posiciones usadas > 5 veces');
    recomendaciones.push('🟡 IMPORTANTE: Implementar memoria de 10 posiciones (no 7)');
  }
  
  if (posicionesExitosasConHuesos.length > 0) {
    recomendaciones.push('🟢 OPORTUNIDAD: Mystake mueve huesos a posiciones exitosas');
    recomendaciones.push('🟢 OPORTUNIDAD: Rotar posiciones después de 2 éxitos consecutivos');
  }
  
  if (posicionesConfiables.length > 0) {
    recomendaciones.push('🟢 OPORTUNIDAD: Explotar posiciones con 100% éxito (3-5 usos)');
  }
  
  if (recomendaciones.length === 0) {
    recomendaciones.push('✅ Sistema funcionando correctamente');
    recomendaciones.push('✅ Mantener estrategia actual');
  }
  
  recomendaciones.forEach((r, i) => {
    console.log(`${i + 1}. ${r}`);
  });
  
  console.log('');
  console.log('✅ ===== ANÁLISIS COMPLETADO =====');
}

// Ejecutar análisis
analizarUltimas30Partidas()
  .then(() => {
    console.log('\n✅ Análisis finalizado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en análisis:', error);
    process.exit(1);
  });
