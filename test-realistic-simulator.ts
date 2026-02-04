import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testRealisticSimulator() {
  try {
    console.log('🧪 PRUEBA DEL SIMULADOR REALISTA DE MYSTAKE');
    console.log('='.repeat(70));
    
    // 1. Obtener estadísticas de juegos REALES
    console.log('\n📊 ESTADÍSTICAS DE JUEGOS REALES:');
    console.log('='.repeat(70));
    
    const realGames = await prisma.chickenGame.findMany({
      where: { isSimulated: false, boneCount: 4 },
      include: { positions: true }
    });
    
    console.log(`Total de juegos reales: ${realGames.length}`);
    
    // Analizar distribución de huesos en juegos reales
    const realBoneFrequency: Record<number, number> = {};
    const realRevealedCount: Record<number, number> = {};
    
    realGames.forEach(game => {
      // Contar huesos por posición
      game.positions
        .filter(p => !p.isChicken)
        .forEach(p => {
          realBoneFrequency[p.position] = (realBoneFrequency[p.position] || 0) + 1;
        });
      
      // Contar distribución de pollos revelados
      const count = game.revealedCount;
      realRevealedCount[count] = (realRevealedCount[count] || 0) + 1;
    });
    
    console.log('\n🎯 Top 10 posiciones más frecuentes como hueso (REAL):');
    Object.entries(realBoneFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([pos, count], idx) => {
        const percentage = ((count / realGames.length) * 100).toFixed(2);
        console.log(`   ${idx + 1}. Posición ${pos}: ${count} veces (${percentage}%)`);
      });
    
    console.log('\n📈 Distribución de pollos revelados (REAL):');
    Object.entries(realRevealedCount)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .forEach(([count, games]) => {
        const percentage = ((games / realGames.length) * 100).toFixed(2);
        console.log(`   ${count} pollos: ${games} juegos (${percentage}%)`);
      });
    
    // 2. Llamar al endpoint de simulación
    console.log('\n' + '='.repeat(70));
    console.log('🎮 EJECUTANDO SIMULACIÓN REALISTA (100 juegos):');
    console.log('='.repeat(70));
    
    const response = await fetch('http://localhost:3000/api/chicken/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        count: 100,
        boneCount: 4,
        useRealisticPatterns: true
      })
    });
    
    if (!response.ok) {
      console.error('❌ Error en simulación:', response.statusText);
      return;
    }
    
    const simData = await response.json();
    
    console.log('\n✅ Simulación completada:');
    console.log(`   Juegos procesados: ${simData.gamesProcessed}`);
    console.log(`   Victorias: ${simData.summary.victories}`);
    console.log(`   Derrotas: ${simData.summary.defeats}`);
    console.log(`   Win Rate: ${simData.summary.winRate}%`);
    console.log(`   Promedio de pollos revelados: ${simData.summary.avgRevealedCount}`);
    
    // 3. Obtener juegos simulados de la BD
    console.log('\n' + '='.repeat(70));
    console.log('📊 ANÁLISIS DE JUEGOS SIMULADOS:');
    console.log('='.repeat(70));
    
    const simulatedGames = await prisma.chickenGame.findMany({
      where: { isSimulated: true, boneCount: 4 },
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: { positions: true }
    });
    
    console.log(`Total de juegos simulados analizados: ${simulatedGames.length}`);
    
    // Analizar distribución de huesos en juegos simulados
    const simBoneFrequency: Record<number, number> = {};
    const simRevealedCount: Record<number, number> = {};
    
    simulatedGames.forEach(game => {
      // Contar huesos por posición
      game.positions
        .filter(p => !p.isChicken)
        .forEach(p => {
          simBoneFrequency[p.position] = (simBoneFrequency[p.position] || 0) + 1;
        });
      
      // Contar distribución de pollos revelados
      const count = game.revealedCount;
      simRevealedCount[count] = (simRevealedCount[count] || 0) + 1;
    });
    
    console.log('\n🎯 Top 10 posiciones más frecuentes como hueso (SIMULADO):');
    Object.entries(simBoneFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([pos, count], idx) => {
        const percentage = ((count / simulatedGames.length) * 100).toFixed(2);
        const realPercentage = realBoneFrequency[parseInt(pos)] 
          ? ((realBoneFrequency[parseInt(pos)] / realGames.length) * 100).toFixed(2)
          : '0.00';
        console.log(`   ${idx + 1}. Posición ${pos}: ${count} veces (${percentage}%) [Real: ${realPercentage}%]`);
      });
    
    console.log('\n📈 Distribución de pollos revelados (SIMULADO):');
    Object.entries(simRevealedCount)
      .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
      .forEach(([count, games]) => {
        const percentage = ((games / simulatedGames.length) * 100).toFixed(2);
        const realGamesCount = realRevealedCount[parseInt(count)] || 0;
        const realPercentage = ((realGamesCount / realGames.length) * 100).toFixed(2);
        console.log(`   ${count} pollos: ${games} juegos (${percentage}%) [Real: ${realPercentage}%]`);
      });
    
    // 4. Comparación y análisis de similitud
    console.log('\n' + '='.repeat(70));
    console.log('📊 COMPARACIÓN REAL vs SIMULADO:');
    console.log('='.repeat(70));
    
    // Calcular similitud en distribución de huesos
    let totalDifference = 0;
    let positionsCompared = 0;
    
    for (let pos = 1; pos <= 25; pos++) {
      const realFreq = (realBoneFrequency[pos] || 0) / realGames.length;
      const simFreq = (simBoneFrequency[pos] || 0) / simulatedGames.length;
      const diff = Math.abs(realFreq - simFreq);
      totalDifference += diff;
      positionsCompared++;
    }
    
    const avgDifference = totalDifference / positionsCompared;
    const similarity = (1 - avgDifference) * 100;
    
    console.log(`\n🎯 Similitud en distribución de huesos: ${similarity.toFixed(2)}%`);
    
    // Calcular similitud en comportamiento de jugadores
    let revealedDifference = 0;
    let revealedCompared = 0;
    
    for (let count = 1; count <= 10; count++) {
      const realFreq = (realRevealedCount[count] || 0) / realGames.length;
      const simFreq = (simRevealedCount[count] || 0) / simulatedGames.length;
      const diff = Math.abs(realFreq - simFreq);
      revealedDifference += diff;
      revealedCompared++;
    }
    
    const avgRevealedDiff = revealedDifference / revealedCompared;
    const revealedSimilarity = (1 - avgRevealedDiff) * 100;
    
    console.log(`🎯 Similitud en comportamiento de jugadores: ${revealedSimilarity.toFixed(2)}%`);
    
    const overallSimilarity = (similarity + revealedSimilarity) / 2;
    console.log(`\n🏆 SIMILITUD GENERAL: ${overallSimilarity.toFixed(2)}%`);
    
    if (overallSimilarity >= 80) {
      console.log('\n✅ EXCELENTE: El simulador genera juegos muy realistas');
    } else if (overallSimilarity >= 60) {
      console.log('\n👍 BUENO: El simulador genera juegos realistas');
    } else {
      console.log('\n⚠️  MEJORABLE: El simulador necesita ajustes');
    }
    
    // 5. Verificar rotación de huesos
    console.log('\n' + '='.repeat(70));
    console.log('🔄 VERIFICACIÓN DE ROTACIÓN DE HUESOS:');
    console.log('='.repeat(70));
    
    let rotationCount = 0;
    let totalChecked = 0;
    
    for (let i = 0; i < simulatedGames.length - 1; i++) {
      const game1 = simulatedGames[i];
      const game2 = simulatedGames[i + 1];
      
      const bones1 = game1.positions.filter(p => !p.isChicken).map(p => p.position);
      const bones2 = game2.positions.filter(p => !p.isChicken).map(p => p.position);
      
      const overlap = bones1.filter(b => bones2.includes(b)).length;
      
      if (overlap === 0) rotationCount++;
      totalChecked++;
    }
    
    const rotationRate = (rotationCount / totalChecked) * 100;
    console.log(`\n🔄 Tasa de rotación completa: ${rotationRate.toFixed(2)}%`);
    console.log(`   (Objetivo: ~100% según análisis real)`);
    
    if (rotationRate >= 90) {
      console.log('   ✅ Rotación implementada correctamente');
    } else {
      console.log('   ⚠️  Rotación necesita ajustes');
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ PRUEBA COMPLETADA');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('❌ Error en prueba:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testRealisticSimulator();
