// Enfrentamiento: Asesor ML vs Simulador Realista de Mystake
import { db } from '@/lib/db';
import { selectPositionML, loadMLState } from '@/lib/ml/reinforcement-learning';

// Patrones REALES del simulador (basados en 300 partidas)
const MYSTAKE_REAL_PATTERNS = {
  boneFrequencyWeights: {
    24: 0.0561, 3: 0.0513, 8: 0.0497, 16: 0.0481,
    5: 0.0465, 9: 0.0465, 12: 0.0465, 14: 0.0465,
    20: 0.0449, 21: 0.0449, 23: 0.0433, 4: 0.0401,
    15: 0.0401, 17: 0.0385, 2: 0.0369, 1: 0.0353,
    22: 0.0337, 25: 0.0337, 6: 0.0321, 10: 0.0321,
    11: 0.0321, 18: 0.0321, 7: 0.0304, 13: 0.0304,
    19: 0.0288,
  },
  safePositions: [19, 13, 7, 18, 11, 10, 6, 25, 22, 1],
};

// Generar huesos usando patrones reales
function generateRealisticBones(previousBones: number[] = []): number[] {
  const bones: number[] = [];
  const allPositions = Array.from({ length: 25 }, (_, i) => i + 1);
  
  const weightedCandidates = allPositions.map(pos => {
    let weight = MYSTAKE_REAL_PATTERNS.boneFrequencyWeights[pos as keyof typeof MYSTAKE_REAL_PATTERNS.boneFrequencyWeights] || 0.04;
    
    // Rotación: 4.68% overlap (95.32% no repetir)
    if (previousBones.includes(pos)) {
      weight *= 0.05;
    }
    
    return { pos, weight };
  });
  
  while (bones.length < 4) {
    const available = weightedCandidates.filter(c => !bones.includes(c.pos));
    const totalWeight = available.reduce((sum, c) => sum + c.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const candidate of available) {
      random -= candidate.weight;
      if (random <= 0) {
        bones.push(candidate.pos);
        break;
      }
    }
  }
  
  return bones.sort((a, b) => a - b);
}

async function main() {
  console.log('⚔️  ===== ENFRENTAMIENTO: ASESOR ML vs SIMULADOR MYSTAKE =====\n');
  
  const totalPartidas = parseInt(process.argv[2]) || 100;
  const objetivo = parseInt(process.argv[3]) || 5;
  
  console.log(`📊 Configuración:`);
  console.log(`   Partidas: ${totalPartidas}`);
  console.log(`   Objetivo: ${objetivo} pollos`);
  console.log(`   Huesos: 4\n`);
  
  // Cargar estado del ML
  console.log('🤖 Cargando estado del ML...');
  await loadMLState();
  console.log('✅ ML cargado\n');
  
  // Estadísticas
  let victorias = 0;
  let derrotas = 0;
  let totalPosicionesReveladas = 0;
  let objetivoAlcanzado = 0;
  
  const posicionesUsadas = new Map<number, { usos: number; exitos: number }>();
  const estrategiasUsadas = { EXPLORE: 0, EXPLOIT: 0 };
  
  let previousBones: number[] = [];
  
  console.log('🎮 Iniciando enfrentamiento...\n');
  
  for (let i = 0; i < totalPartidas; i++) {
    // 1. Simulador genera huesos REALISTAS
    const bones = generateRealisticBones(previousBones);
    previousBones = bones;
    
    // 2. Asesor ML juega la partida
    const revealedPositions: number[] = [];
    let hitBone = false;
    let reachedObjective = false;
    
    while (!hitBone && !reachedObjective && revealedPositions.length < 21) {
      // Obtener sugerencia del ML
      const prediction = await selectPositionML(revealedPositions);
      const suggestedPos = prediction.position;
      
      // Registrar estrategia
      estrategiasUsadas[prediction.strategy]++;
      
      // Registrar uso de posición
      if (!posicionesUsadas.has(suggestedPos)) {
        posicionesUsadas.set(suggestedPos, { usos: 0, exitos: 0 });
      }
      const posStats = posicionesUsadas.get(suggestedPos)!;
      posStats.usos++;
      
      // Verificar si es hueso
      if (bones.includes(suggestedPos)) {
        hitBone = true;
        revealedPositions.push(suggestedPos);
      } else {
        revealedPositions.push(suggestedPos);
        posStats.exitos++;
        
        // Verificar si alcanzó objetivo
        if (revealedPositions.length >= objetivo) {
          reachedObjective = true;
        }
      }
    }
    
    // 3. Registrar resultado
    totalPosicionesReveladas += revealedPositions.length;
    
    if (reachedObjective && !hitBone) {
      victorias++;
      objetivoAlcanzado++;
    } else if (hitBone) {
      derrotas++;
    }
    
    // Mostrar progreso cada 10 partidas
    if ((i + 1) % 10 === 0) {
      const tasaActual = (victorias / (i + 1)) * 100;
      console.log(
        `Partida ${i + 1}/${totalPartidas} | Victorias: ${victorias} | Tasa: ${tasaActual.toFixed(1)}%`
      );
    }
  }
  
  // 4. Resultados finales
  console.log('\n\n📊 ===== RESULTADOS FINALES =====\n');
  
  const tasaExito = (victorias / totalPartidas) * 100;
  const promedioPosiciones = totalPosicionesReveladas / totalPartidas;
  
  console.log(`✅ Victorias: ${victorias}/${totalPartidas} (${tasaExito.toFixed(2)}%)`);
  console.log(`❌ Derrotas: ${derrotas}/${totalPartidas} (${((derrotas / totalPartidas) * 100).toFixed(2)}%)`);
  console.log(`🎯 Objetivo alcanzado: ${objetivoAlcanzado} veces`);
  console.log(`📊 Promedio posiciones reveladas: ${promedioPosiciones.toFixed(2)}`);
  
  console.log(`\n🎲 Estrategias usadas:`);
  console.log(`   EXPLORE: ${estrategiasUsadas.EXPLORE} (${((estrategiasUsadas.EXPLORE / (estrategiasUsadas.EXPLORE + estrategiasUsadas.EXPLOIT)) * 100).toFixed(1)}%)`);
  console.log(`   EXPLOIT: ${estrategiasUsadas.EXPLOIT} (${((estrategiasUsadas.EXPLOIT / (estrategiasUsadas.EXPLORE + estrategiasUsadas.EXPLOIT)) * 100).toFixed(1)}%)`);
  
  // 5. Análisis de posiciones
  console.log(`\n\n📍 ===== ANÁLISIS DE POSICIONES =====\n`);
  
  const posicionesOrdenadas = Array.from(posicionesUsadas.entries())
    .map(([pos, stats]) => ({
      posicion: pos,
      usos: stats.usos,
      exitos: stats.exitos,
      tasaExito: (stats.exitos / stats.usos) * 100,
    }))
    .sort((a, b) => b.usos - a.usos);
  
  console.log('📊 Top 15 posiciones más usadas:');
  posicionesOrdenadas.slice(0, 15).forEach((pos, i) => {
    const emoji = pos.tasaExito >= 90 ? '✅' : pos.tasaExito >= 70 ? '⚠️' : '❌';
    console.log(
      `${i + 1}. ${emoji} Pos ${pos.posicion}: ${pos.usos} usos | ${pos.tasaExito.toFixed(1)}% éxito`
    );
  });
  
  // 6. Comparación con posiciones seguras reales
  console.log(`\n\n🔍 ===== COMPARACIÓN CON DATOS REALES =====\n`);
  
  console.log('Posiciones seguras REALES (93%+ pollos en 300 partidas):');
  console.log(`   ${MYSTAKE_REAL_PATTERNS.safePositions.join(', ')}`);
  
  const posicionesSeguraUsadas = MYSTAKE_REAL_PATTERNS.safePositions.filter(
    pos => posicionesUsadas.has(pos)
  );
  
  console.log(`\nPosiciones seguras USADAS por el asesor:`);
  posicionesSeguraUsadas.forEach(pos => {
    const stats = posicionesUsadas.get(pos);
    if (stats) {
      const tasaExito = (stats.exitos / stats.usos) * 100;
      console.log(
        `   Pos ${pos}: ${stats.usos} usos | ${tasaExito.toFixed(1)}% éxito`
      );
    }
  });
  
  const porcentajeSeguras = (posicionesSeguraUsadas.length / MYSTAKE_REAL_PATTERNS.safePositions.length) * 100;
  console.log(`\n📊 Uso de posiciones seguras: ${posicionesSeguraUsadas.length}/${MYSTAKE_REAL_PATTERNS.safePositions.length} (${porcentajeSeguras.toFixed(1)}%)`);
  
  // 7. Evaluación final
  console.log(`\n\n⭐ ===== EVALUACIÓN FINAL =====\n`);
  
  if (tasaExito >= 60) {
    console.log(`✅ EXCELENTE: El asesor tiene ${tasaExito.toFixed(1)}% de éxito`);
    console.log(`   El sistema ML está funcionando muy bien contra el simulador realista`);
  } else if (tasaExito >= 50) {
    console.log(`✅ BUENO: El asesor tiene ${tasaExito.toFixed(1)}% de éxito`);
    console.log(`   El sistema ML está funcionando bien, cerca del objetivo`);
  } else if (tasaExito >= 40) {
    console.log(`⚠️  REGULAR: El asesor tiene ${tasaExito.toFixed(1)}% de éxito`);
    console.log(`   El sistema ML necesita ajustes para mejorar`);
  } else {
    console.log(`❌ BAJO: El asesor tiene ${tasaExito.toFixed(1)}% de éxito`);
    console.log(`   El sistema ML necesita optimización urgente`);
  }
  
  // 8. Recomendaciones
  console.log(`\n\n💡 ===== RECOMENDACIONES =====\n`);
  
  if (porcentajeSeguras < 70) {
    console.log(`🔴 CRÍTICO: Solo usa ${porcentajeSeguras.toFixed(1)}% de posiciones seguras`);
    console.log(`   → Aumentar prioridad de posiciones seguras en el ML`);
  }
  
  if (estrategiasUsadas.EXPLORE / (estrategiasUsadas.EXPLORE + estrategiasUsadas.EXPLOIT) < 0.25) {
    console.log(`⚠️  Exploración baja (${((estrategiasUsadas.EXPLORE / (estrategiasUsadas.EXPLORE + estrategiasUsadas.EXPLOIT)) * 100).toFixed(1)}%)`);
    console.log(`   → Considerar aumentar epsilon para más diversidad`);
  }
  
  const posicionesBajasTasa = posicionesOrdenadas.filter(
    p => p.usos >= 5 && p.tasaExito < 70
  );
  
  if (posicionesBajasTasa.length > 0) {
    console.log(`\n🔴 Posiciones con baja tasa de éxito (>= 5 usos, < 70%):`);
    posicionesBajasTasa.forEach(pos => {
      console.log(`   Pos ${pos.posicion}: ${pos.tasaExito.toFixed(1)}% éxito (${pos.usos} usos)`);
    });
    console.log(`   → Aumentar penalización para estas posiciones`);
  }
  
  console.log(`\n✅ ===== ENFRENTAMIENTO COMPLETADO =====\n`);
  
  // 9. Guardar resultados
  console.log(`📝 Resumen guardado en memoria`);
  console.log(`\nPara ejecutar con más partidas:`);
  console.log(`   npx tsx analisis/enfrentamiento-asesor-vs-simulador.ts 500 5`);
}

main()
  .catch((error) => {
    console.error('❌ Error en enfrentamiento:', error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
