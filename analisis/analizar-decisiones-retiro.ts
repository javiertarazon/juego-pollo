/**
 * 🎯 ANÁLISIS DE DECISIONES DE RETIRO
 * 
 * Analiza las sugerencias no usadas en retiros para determinar:
 * - ¿Cuántas veces el retiro fue prematuro? (sugerencia era pollo)
 * - ¿Cuántas veces el retiro fue inteligente? (sugerencia era hueso)
 * - Precisión del sistema en sugerencias
 * - Oportunidades perdidas vs pérdidas evitadas
 */

import { db } from '@/lib/db';

interface DecisionRetiro {
  gameId: string;
  fecha: Date;
  pollosDescubiertos: number;
  multiplicador: number;
  posicionSugerida: number | null;
  sugerenciaEraPollo: boolean;
  sugerenciaEraHueso: boolean;
  decision: 'RETIRO_PREMATURO' | 'RETIRO_INTELIGENTE' | 'SIN_DATOS';
  gananciaExtra: number;
}

async function analizarDecisionesRetiro() {
  console.log('🎯 ===== ANÁLISIS DE DECISIONES DE RETIRO =====\n');

  // Obtener partidas con retiro (victorias)
  const partidas = await db.chickenGame.findMany({
    where: {
      isSimulated: false,
      hitBone: false, // Solo victorias (retiros)
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { positions: true },
  });

  console.log(`📊 Total de retiros analizados: ${partidas.length}\n`);

  if (partidas.length === 0) {
    console.log('❌ No hay retiros para analizar');
    return;
  }

  const decisiones: DecisionRetiro[] = [];
  let retirosPrematuos = 0;
  let retirosInteligentes = 0;
  let sinDatos = 0;
  let gananciaExtraTotal = 0;
  let perdidasEvitadas = 0;

  // Analizar cada retiro
  for (const partida of partidas) {
    const posiciones = partida.positions
      .filter((p) => p.revealed && p.revealOrder !== null)
      .sort((a, b) => (a.revealOrder || 0) - (b.revealOrder || 0));

    const pollos = posiciones.filter((p) => p.isChicken);
    const huesos = posiciones.filter((p) => !p.isChicken);

    // Obtener todas las posiciones reveladas
    const posicionesReveladas = posiciones.map((p) => p.position);
    
    // Encontrar la siguiente posición no revelada (sería la sugerencia)
    // En un retiro, la sugerencia sería la siguiente posición que el sistema habría sugerido
    const todasPosiciones = Array.from({ length: 25 }, (_, i) => i + 1);
    const posicionesNoReveladas = todasPosiciones.filter(
      (pos) => !posicionesReveladas.includes(pos)
    );

    // Simular cuál habría sido la sugerencia (primera no revelada en orden)
    // NOTA: Esto es una aproximación, idealmente deberíamos guardar la sugerencia real
    const posicionSugerida = posicionesNoReveladas.length > 0 ? posicionesNoReveladas[0] : null;

    if (!posicionSugerida) {
      sinDatos++;
      continue;
    }

    // Verificar si la sugerencia era pollo o hueso
    const sugerenciaEraHueso = huesos.some((h) => h.position === posicionSugerida);
    const sugerenciaEraPollo = !sugerenciaEraHueso;

    const decision: 'RETIRO_PREMATURO' | 'RETIRO_INTELIGENTE' = sugerenciaEraPollo
      ? 'RETIRO_PREMATURO'
      : 'RETIRO_INTELIGENTE';

    // Calcular ganancia extra si hubiera continuado
    const multiplicadorActual = partida.multiplier || 1;
    const multiplicadorSiguiente = obtenerMultiplicador(pollos.length + 1);
    const gananciaExtra = sugerenciaEraPollo ? multiplicadorSiguiente - multiplicadorActual : 0;

    decisiones.push({
      gameId: partida.id,
      fecha: partida.createdAt,
      pollosDescubiertos: pollos.length,
      multiplicador: multiplicadorActual,
      posicionSugerida,
      sugerenciaEraPollo,
      sugerenciaEraHueso,
      decision,
      gananciaExtra,
    });

    if (decision === 'RETIRO_PREMATURO') {
      retirosPrematuos++;
      gananciaExtraTotal += gananciaExtra;
    } else {
      retirosInteligentes++;
      perdidasEvitadas++;
    }
  }

  // RESULTADOS
  console.log('📈 ===== RESULTADOS GENERALES =====');
  console.log(`✅ Retiros inteligentes: ${retirosInteligentes} (${((retirosInteligentes / decisiones.length) * 100).toFixed(1)}%)`);
  console.log(`⚠️  Retiros prematuros: ${retirosPrematuos} (${((retirosPrematuos / decisiones.length) * 100).toFixed(1)}%)`);
  console.log(`❓ Sin datos: ${sinDatos}`);
  console.log('');

  console.log('💰 ===== IMPACTO ECONÓMICO =====');
  console.log(`💸 Ganancia extra perdida (retiros prematuros): ${gananciaExtraTotal.toFixed(2)}x`);
  console.log(`🛡️  Pérdidas evitadas (retiros inteligentes): ${perdidasEvitadas} partidas`);
  console.log('');

  if (retirosPrematuos > retirosInteligentes) {
    console.log('⚠️  ALERTA: Más retiros prematuros que inteligentes');
    console.log('   → Considera jugar 1-2 posiciones más antes de retirarte');
    console.log('   → Confía más en las sugerencias del sistema');
  } else {
    console.log('✅ BIEN: Más retiros inteligentes que prematuros');
    console.log('   → Tu instinto de retiro es bueno');
    console.log('   → Continúa con la estrategia actual');
  }
  console.log('');

  // TOP 10 RETIROS PREMATUROS
  if (retirosPrematuos > 0) {
    console.log('⚠️  ===== TOP 10 RETIROS PREMATUROS =====');
    const retirosPrematurosList = decisiones
      .filter((d) => d.decision === 'RETIRO_PREMATURO')
      .sort((a, b) => b.gananciaExtra - a.gananciaExtra)
      .slice(0, 10);

    retirosPrematurosList.forEach((d, i) => {
      console.log(
        `${i + 1}. Game ${d.gameId} | ${d.pollosDescubiertos} pollos (${d.multiplicador.toFixed(2)}x) | ` +
        `Pos ${d.posicionSugerida} era POLLO | Perdiste ${d.gananciaExtra.toFixed(2)}x extra`
      );
    });
    console.log('');
  }

  // TOP 10 RETIROS INTELIGENTES
  if (retirosInteligentes > 0) {
    console.log('✅ ===== TOP 10 RETIROS INTELIGENTES =====');
    const retirosInteligentesList = decisiones
      .filter((d) => d.decision === 'RETIRO_INTELIGENTE')
      .slice(0, 10);

    retirosInteligentesList.forEach((d, i) => {
      console.log(
        `${i + 1}. Game ${d.gameId} | ${d.pollosDescubiertos} pollos (${d.multiplicador.toFixed(2)}x) | ` +
        `Pos ${d.posicionSugerida} era HUESO | ¡Evitaste perder!`
      );
    });
    console.log('');
  }

  // ANÁLISIS POR NÚMERO DE POLLOS
  console.log('📊 ===== ANÁLISIS POR NÚMERO DE POLLOS =====');
  const porPollos = new Map<number, { prematuros: number; inteligentes: number }>();

  decisiones.forEach((d) => {
    if (!porPollos.has(d.pollosDescubiertos)) {
      porPollos.set(d.pollosDescubiertos, { prematuros: 0, inteligentes: 0 });
    }

    const stats = porPollos.get(d.pollosDescubiertos)!;
    if (d.decision === 'RETIRO_PREMATURO') {
      stats.prematuros++;
    } else {
      stats.inteligentes++;
    }
  });

  Array.from(porPollos.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([pollos, stats]) => {
      const total = stats.prematuros + stats.inteligentes;
      const tasaInteligente = (stats.inteligentes / total) * 100;
      const emoji = tasaInteligente >= 60 ? '✅' : tasaInteligente >= 40 ? '⚠️' : '❌';
      
      console.log(
        `${emoji} ${pollos} pollos: ${stats.inteligentes}I / ${stats.prematuros}P ` +
        `(${tasaInteligente.toFixed(1)}% inteligentes)`
      );
    });
  console.log('');

  // RECOMENDACIONES
  console.log('💡 ===== RECOMENDACIONES =====');
  
  const recomendaciones: string[] = [];
  
  if (retirosPrematuos > retirosInteligentes * 1.5) {
    recomendaciones.push('🔴 CRÍTICO: Demasiados retiros prematuros');
    recomendaciones.push('   → Juega al menos 1 posición más antes de retirarte');
    recomendaciones.push('   → Confía en las sugerencias del sistema');
  }
  
  if (gananciaExtraTotal > 10) {
    recomendaciones.push('💰 OPORTUNIDAD: Has perdido mucha ganancia potencial');
    recomendaciones.push(`   → Total perdido: ${gananciaExtraTotal.toFixed(2)}x`);
    recomendaciones.push('   → Considera ser más agresivo');
  }
  
  // Analizar punto óptimo de retiro
  const mejorPunto = Array.from(porPollos.entries())
    .map(([pollos, stats]) => ({
      pollos,
      tasaInteligente: (stats.inteligentes / (stats.prematuros + stats.inteligentes)) * 100,
    }))
    .sort((a, b) => b.tasaInteligente - a.tasaInteligente)[0];

  if (mejorPunto) {
    recomendaciones.push(`🎯 PUNTO ÓPTIMO: Retirarse después de ${mejorPunto.pollos} pollos`);
    recomendaciones.push(`   → ${mejorPunto.tasaInteligente.toFixed(1)}% de retiros inteligentes en este punto`);
  }
  
  if (recomendaciones.length === 0) {
    recomendaciones.push('✅ Tus decisiones de retiro son buenas');
    recomendaciones.push('✅ Mantén la estrategia actual');
  }
  
  recomendaciones.forEach((r, i) => {
    console.log(`${i + 1}. ${r}`);
  });
  
  console.log('');
  console.log('✅ ===== ANÁLISIS COMPLETADO =====');
}

// Función auxiliar para obtener multiplicador
function obtenerMultiplicador(pollos: number): number {
  const multiplicadores: Record<number, number> = {
    1: 1.17, 2: 1.41, 3: 1.71, 4: 2.09, 5: 2.58,
    6: 3.23, 7: 4.09, 8: 5.26, 9: 6.88, 10: 9.17,
    11: 12.50, 12: 17.50, 13: 25.00, 14: 37.50, 15: 58.33,
    16: 100.00, 17: 183.33, 18: 366.67, 19: 825.00, 20: 2062.50, 21: 6187.50,
  };
  return multiplicadores[pollos] || 1;
}

// Ejecutar análisis
analizarDecisionesRetiro()
  .then(() => {
    console.log('\n✅ Análisis finalizado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en análisis:', error);
    process.exit(1);
  });
