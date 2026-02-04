// Script para probar el simulador directamente sin pasar por Next.js
// Esto evita problemas de caché

async function testSimulator() {
  try {
    console.log('🧪 Probando simulador con objetivo de posiciones...\n');
    
    const response = await fetch('http://localhost:3000/api/chicken/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        count: 10,
        boneCount: 4,
        targetPositions: 5,
        useRealisticPatterns: true
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Error:', error);
      return;
    }
    
    const result = await response.json();
    
    console.log('✅ Simulación exitosa!\n');
    console.log('📊 Resumen:');
    console.log(`   Objetivo: ${result.targetPositions} posiciones`);
    console.log(`   Juegos: ${result.gamesProcessed}`);
    console.log(`   Victorias: ${result.summary.victories} (${result.summary.winRate}%)`);
    console.log(`   Derrotas: ${result.summary.defeats}`);
    console.log(`   Promedio revelado: ${result.summary.avgRevealedCount}`);
    
    console.log('\n📈 Estadísticas detalladas:');
    result.detailedStatsByPositions.forEach((stat: any) => {
      console.log(`   ${stat.positions} pos: ${stat.reached} alcanzadas, ${stat.victories} victorias (${stat.winRate}%)`);
    });
    
    console.log(`\n${result.analysis.recommendation}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testSimulator();
