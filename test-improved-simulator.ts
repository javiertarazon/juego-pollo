// Test del simulador mejorado
async function testImprovedSimulator() {
  console.log('🧪 Probando simulador mejorado...\n');
  
  const tests = [
    { target: 4, games: 100, expectedWinRate: 50 },
    { target: 5, games: 100, expectedWinRate: 35 },
    { target: 6, games: 100, expectedWinRate: 25 },
  ];
  
  for (const test of tests) {
    console.log(`\n📊 Test: ${test.games} juegos con objetivo de ${test.target} posiciones`);
    console.log(`   Win rate esperado: ~${test.expectedWinRate}%`);
    
    try {
      const response = await fetch('http://localhost:3000/api/chicken/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: test.games,
          boneCount: 4,
          targetPositions: test.target,
          useRealisticPatterns: true
        })
      });
      
      if (!response.ok) {
        console.error(`   ❌ Error: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      
      console.log(`   ✅ Resultado:`);
      console.log(`      - Victorias: ${data.summary.victories}/${test.games} (${data.summary.winRate}%)`);
      console.log(`      - Promedio revelado: ${data.summary.avgRevealedCount}`);
      console.log(`      - Estado: ${data.analysis.recommendation}`);
      
      // Verificar si cumple expectativas
      const winRate = data.summary.winRate;
      const avgRevealed = parseFloat(data.summary.avgRevealedCount);
      
      if (winRate >= test.expectedWinRate * 0.8) {
        console.log(`      ✅ Win rate aceptable (>= ${test.expectedWinRate * 0.8}%)`);
      } else {
        console.log(`      ⚠️ Win rate bajo (esperado >= ${test.expectedWinRate * 0.8}%)`);
      }
      
      if (avgRevealed >= test.target * 0.7) {
        console.log(`      ✅ Promedio revelado aceptable (>= ${(test.target * 0.7).toFixed(1)})`);
      } else {
        console.log(`      ⚠️ Promedio revelado bajo (esperado >= ${(test.target * 0.7).toFixed(1)})`);
      }
      
    } catch (error) {
      console.error(`   ❌ Error en test:`, error);
    }
  }
  
  console.log('\n✅ Tests completados');
}

testImprovedSimulator().catch(console.error);
