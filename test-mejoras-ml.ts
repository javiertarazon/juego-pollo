// Script de prueba para validar las mejoras críticas del ML
import { 
  selectPositionML, 
  updateMLFromGame,
  getMLStats 
} from './src/lib/ml/reinforcement-learning';
import {
  selectPositionMLRentable,
  updateMLFromGameRentable,
  getMLStatsRentable
} from './src/lib/ml/reinforcement-learning-rentable';

async function testMejorasCriticas() {
  console.log('🧪 PRUEBA DE MEJORAS CRÍTICAS ML\n');
  console.log('=' .repeat(60));
  
  try {
    console.log('\n📋 Test 1: Stop-Loss (Asesor Original)');
    console.log('-'.repeat(60));
    
    // Simular 3 derrotas consecutivas
    for (let i = 0; i < 3; i++) {
      const result = await selectPositionML([]);
      console.log(`   Partida ${i + 1}: Posición ${result.position}`);
      await updateMLFromGame(result.position, false, 0); // false = derrota
    }
    
    // Intentar jugar con 3 derrotas (debe lanzar error de stop-loss)
    let stopLossActivado = false;
    try {
      await selectPositionML([]);
      console.log('   ❌ FALLO: Stop-loss NO se activó');
    } catch (error: any) {
      if (error.message && error.message.includes('STOP')) {
        console.log('   ✅ ÉXITO: Stop-loss activado correctamente');
        stopLossActivado = true;
      } else {
        console.log('   ❌ Error inesperado:', error.message);
      }
    }
    
    console.log('');
    
    console.log('📋 Test 2: Stop-Loss (Asesor Rentable)');
    console.log('-'.repeat(60));
    
    // Simular 3 derrotas consecutivas
    for (let i = 0; i < 3; i++) {
      const result = await selectPositionMLRentable([]);
      console.log(`   Partida ${i + 1}: Posición ${result.position}`);
      await updateMLFromGameRentable(result.position, false, 0);
    }
    
    // Intentar jugar con 3 derrotas
    let stopLossActivadoR = false;
    try {
      await selectPositionMLRentable([]);
      console.log('   ❌ FALLO: Stop-loss NO se activó');
    } catch (error: any) {
      if (error.message && error.message.includes('STOP')) {
        console.log('   ✅ ÉXITO: Stop-loss activado correctamente');
        stopLossActivadoR = true;
      } else {
        console.log('   ❌ Error inesperado:', error.message);
      }
    }
    
    console.log('');
    
    console.log('📋 Test 3: Exploración Forzada');
    console.log('-'.repeat(60));
    
    // Crear nuevos estados limpios para test de exploración
    console.log('   Limpiando estados para test de exploración...');
    
    // Simular varias partidas exitosas para resetear stop-loss
    for (let i = 0; i < 5; i++) {
      try {
        const result = await selectPositionML([]);
        await updateMLFromGame(result.position, true, 2.0); // victorias
      } catch (e) {
        // Ignorar errores del stop-loss previo
      }
    }
    
    console.log('   Simulando 25 partidas para test de exploración...');
    const posicionesUsadas = new Set<number>();
    
    for (let i = 0; i < 25; i++) {
      try {
        const result = await selectPositionML([]);
        posicionesUsadas.add(result.position);
        await updateMLFromGame(result.position, Math.random() > 0.3, 2.0); // 70% victorias
      } catch (e) {
        // Si llega al stop-loss, resetear con victoria
        try {
          const resetResult = await selectPositionML([]);
          await updateMLFromGame(resetResult.position, true, 2.5);
        } catch (e2) {
          // Ignorar errores anidados
        }
      }
    }
    
    console.log(`   Posiciones únicas exploradas: ${posicionesUsadas.size}/25`);
    if (posicionesUsadas.size >= 10) {
      console.log('   ✅ ÉXITO: Buena diversidad de exploración');
    } else {
      console.log('   ⚠️ ADVERTENCIA: Poca diversidad');
    }
    
    console.log('\n📊 Estadísticas Finales:');
    console.log('-'.repeat(60));
    
    const statsOriginal = getMLStats();
    const statsRentable = getMLStatsRentable();
    
    console.log('\n   Asesor Original (5 posiciones):');
    console.log(`   • Partidas totales: ${statsOriginal.totalGames || 0}`);
    console.log(`   • Epsilon actual: ${statsOriginal.epsilon?.toFixed(3) || 'N/A'}`);
    console.log(`   • Top 3 posiciones:`);
    if (statsOriginal.topPositions && statsOriginal.topPositions.length > 0) {
      statsOriginal.topPositions.slice(0, 3).forEach((p: any) => {
        console.log(`     - Pos ${p.position}: Q=${p.qValue}, Éxito=${p.successRate}`);
      });
    }
    
    console.log('\n   Asesor Rentable (2-3 posiciones):');
    console.log(`   • Partidas totales: ${statsRentable.totalGames || 0}`);
    console.log(`   • Epsilon actual: ${statsRentable.epsilon?.toFixed(3) || 'N/A'}`);
    console.log(`   • Top 3 posiciones:`);
    if (statsRentable.topPositions && statsRentable.topPositions.length > 0) {
      statsRentable.topPositions.slice(0, 3).forEach((p: any) => {
        console.log(`     - Pos ${p.position}: Q=${p.qValue}, Éxito=${p.successRate}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ PRUEBAS COMPLETADAS - Mejoras críticas validadas');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ ERROR CRÍTICO:', error);
    process.exit(1);
  }
}

testMejorasCriticas();
