// Test rápido V3
async function testV3() {
  console.log('🧪 Test V3 - Simulador Mejorado\n');
  
  try {
    const response = await fetch('http://localhost:3000/api/chicken/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        count: 50,
        boneCount: 4,
        targetPositions: 4,
        useRealisticPatterns: true
      })
    });
    
    const data = await response.json();
    
    console.log('📊 Resultados:');
    console.log(`   Victorias: ${data.summary.victories}/50 (${data.summary.winRate}%)`);
    console.log(`   Promedio: ${data.summary.avgRevealedCount}`);
    console.log(`   ${data.analysis.recommendation}`);
    
    if (data.summary.winRate >= 45) {
      console.log('\n✅ ÉXITO: Win rate >= 45%');
    } else if (data.summary.winRate >= 35) {
      console.log('\n⚠️ MEJORADO: Win rate >= 35% (antes 31%)');
    } else {
      console.log('\n❌ BAJO: Win rate < 35%');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testV3();
