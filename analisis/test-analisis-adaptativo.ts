/**
 * Script de prueba para el análisis adaptativo
 * Muestra cómo el ML se adapta a las últimas 10 partidas
 */

import {
  analizarUltimasPartidas,
  detectarRotacionActiva,
  generarReporteAdaptativo,
  obtenerPosicionesRecomendadas,
  calcularScoreSeguridad,
} from '../src/lib/ml/adaptive-pattern-analyzer';

async function main() {
  console.log('\n🔍 ===== TEST DE ANÁLISIS ADAPTATIVO =====\n');

  // 1. Análisis de últimas 10 partidas
  console.log('📊 1. ANÁLISIS DE ÚLTIMAS 10 PARTIDAS:\n');
  const analisis = await analizarUltimasPartidas(10);
  
  console.log(`   Partidas analizadas: ${analisis.ultimasPartidas}`);
  console.log(`   Zonas calientes detectadas: ${analisis.zonasCalientes.length}`);
  console.log(`   Posiciones seguras: ${analisis.posicionesSeguras.length}`);
  console.log(`   Posiciones peligrosas: ${analisis.posicionesPeligrosas.length}`);
  console.log(`   Patrones de rotación: ${analisis.patronesRotacion.length}`);

  // 2. Detectar rotación activa
  console.log('\n🔄 2. DETECCIÓN DE ROTACIÓN:\n');
  const rotacion = await detectarRotacionActiva(10);
  
  console.log(`   Hay rotación: ${rotacion.hayRotacion ? 'SÍ' : 'NO'}`);
  console.log(`   Patrón: ${rotacion.patron}`);
  console.log(`   Confianza: ${rotacion.confianza.toFixed(1)}%`);
  console.log(`   Descripción: ${rotacion.descripcion}`);

  // 3. Zonas calientes detalladas
  if (analisis.zonasCalientes.length > 0) {
    console.log('\n🔥 3. ZONAS CALIENTES (Top 10):\n');
    analisis.zonasCalientes.slice(0, 10).forEach((zona, idx) => {
      console.log(`   ${idx + 1}. Posición ${zona.posicion}: ${zona.vecesHueso} huesos (${zona.frecuencia.toFixed(1)}% frecuencia)`);
    });
  }

  // 4. Posiciones seguras
  if (analisis.posicionesSeguras.length > 0) {
    console.log('\n🛡️ 4. POSICIONES SEGURAS:\n');
    console.log(`   ${analisis.posicionesSeguras.join(', ')}`);
  }

  // 5. Patrones de rotación
  if (analisis.patronesRotacion.length > 0) {
    console.log('\n🔄 5. PATRONES DE ROTACIÓN:\n');
    analisis.patronesRotacion.forEach((patron, idx) => {
      console.log(`   ${idx + 1}. Pollos en [${patron.pollosEn123}]:`);
      console.log(`      → Huesos frecuentes: ${patron.huesosEncontrados.slice(0, 8).join(', ')}`);
      console.log(`      → Frecuencia: ${patron.frecuencia} veces`);
    });
  }

  // 6. Posiciones recomendadas
  console.log('\n💡 6. POSICIONES RECOMENDADAS (sin revelar ninguna):\n');
  const recomendadas = await obtenerPosicionesRecomendadas([], 10);
  console.log(`   Top 10: ${recomendadas.join(', ')}`);

  // 7. Posiciones recomendadas después de revelar 1, 2, 3
  console.log('\n💡 7. POSICIONES RECOMENDADAS (después de revelar 1, 2, 3):\n');
  const recomendadas2 = await obtenerPosicionesRecomendadas([1, 2, 3], 10);
  console.log(`   Top 10: ${recomendadas2.join(', ')}`);

  // 8. Score de seguridad de posiciones específicas
  console.log('\n📊 8. SCORE DE SEGURIDAD DE POSICIONES CLAVE:\n');
  const posicionesClave = [1, 2, 3, 5, 10, 12, 19, 23];
  
  for (const pos of posicionesClave) {
    const score = await calcularScoreSeguridad(pos, 10);
    const emoji = score.nivel === 'MUY_SEGURA' ? '🟢' : 
                  score.nivel === 'SEGURA' ? '🟡' : 
                  score.nivel === 'NEUTRAL' ? '⚪' : 
                  score.nivel === 'PELIGROSA' ? '🟠' : '🔴';
    console.log(`   ${emoji} Posición ${pos}: ${score.score}/100 (${score.nivel}) - ${score.razon}`);
  }

  // 9. Reporte completo
  console.log('\n📋 9. REPORTE COMPLETO:\n');
  const reporte = await generarReporteAdaptativo(10);
  console.log(reporte);

  // 10. Recomendaciones finales
  console.log('\n✅ 10. RECOMENDACIONES FINALES:\n');
  analisis.recomendaciones.forEach((rec, idx) => {
    console.log(`   ${idx + 1}. ${rec}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ Test completado exitosamente\n');
}

main().catch(console.error);
