import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeRecentGames() {
  console.log('🔍 ANÁLISIS DE DETECCIÓN DE PATRONES POR MYSTAKE\n');
  console.log('=' .repeat(80));

  // Obtener últimas 20 partidas reales
  const recentGames = await prisma.chickenGame.findMany({
    where: {
      isSimulated: false,
      boneCount: 4,
    },
    include: {
      positions: {
        orderBy: { position: 'asc' }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  console.log(`\n📊 Analizando ${recentGames.length} partidas más recientes\n`);

  // Análisis 1: Posiciones sugeridas vs huesos encontrados
  console.log('🎯 ANÁLISIS 1: Posiciones Sugeridas vs Huesos Reales');
  console.log('-'.repeat(80));

  const suggestedPositions: number[] = [];
  const bonePositionsFound: number[] = [];
  const firstMovePositions: number[] = [];
  
  let consecutiveLosses = 0;
  let maxConsecutiveLosses = 0;

  recentGames.reverse().forEach((game, idx) => {
    const gameNum = idx + 1;
    const revealed = game.positions
      .filter(p => p.revealed && p.revealOrder !== null)
      .sort((a, b) => (a.revealOrder || 0) - (b.revealOrder || 0));
    
    const bones = game.positions.filter(p => !p.isChicken).map(p => p.position);
    const isLoss = game.hitBone;
    
    if (isLoss) {
      consecutiveLosses++;
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, consecutiveLosses);
    } else {
      consecutiveLosses = 0;
    }

    // Primera posición revelada (la sugerida)
    if (revealed.length > 0) {
      const firstMove = revealed[0].position;
      firstMovePositions.push(firstMove);
      suggestedPositions.push(firstMove);
      
      // Verificar si el primer movimiento fue un hueso
      const hitBoneOnFirst = bones.includes(firstMove);
      
      console.log(`Juego ${gameNum}: Primera pos: ${firstMove} ${hitBoneOnFirst ? '💀 HUESO' : '🐔'} | Resultado: ${isLoss ? '❌ PÉRDIDA' : '✅ VICTORIA'} | Reveladas: ${revealed.length}`);
    }

    bonePositionsFound.push(...bones);
  });

  // Análisis 2: Frecuencia de posiciones sugeridas
  console.log('\n📈 ANÁLISIS 2: Frecuencia de Primeras Posiciones Sugeridas');
  console.log('-'.repeat(80));

  const firstMoveFreq: Record<number, number> = {};
  firstMovePositions.forEach(pos => {
    firstMoveFreq[pos] = (firstMoveFreq[pos] || 0) + 1;
  });

  const sortedFirstMoves = Object.entries(firstMoveFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  console.log('Top 10 posiciones más sugeridas como primer movimiento:');
  sortedFirstMoves.forEach(([pos, count]) => {
    const percentage = ((count / firstMovePositions.length) * 100).toFixed(1);
    console.log(`  Posición ${pos}: ${count} veces (${percentage}%)`);
  });

  // Análisis 3: Mystake está colocando huesos en posiciones sugeridas
  console.log('\n🎲 ANÁLISIS 3: Mystake Adaptándose a Nuestras Sugerencias');
  console.log('-'.repeat(80));

  const boneFreqInSuggested: Record<number, number> = {};
  bonePositionsFound.forEach(pos => {
    boneFreqInSuggested[pos] = (boneFreqInSuggested[pos] || 0) + 1;
  });

  const topBonePositions = Object.entries(boneFreqInSuggested)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  console.log('Top 10 posiciones donde Mystake coloca huesos:');
  topBonePositions.forEach(([pos, count]) => {
    const percentage = ((count / bonePositionsFound.length) * 100).toFixed(1);
    const wasSuggested = firstMoveFreq[parseInt(pos)] || 0;
    const correlation = wasSuggested > 0 ? '⚠️ CORRELACIÓN' : '';
    console.log(`  Posición ${pos}: ${count} huesos (${percentage}%) ${correlation}`);
  });

  // Análisis 4: Últimas 5 partidas (las pérdidas)
  console.log('\n💀 ANÁLISIS 4: Últimas 5 Partidas (Racha de Pérdidas)');
  console.log('-'.repeat(80));

  const last5 = recentGames.slice(0, 5).reverse();
  last5.forEach((game, idx) => {
    const revealed = game.positions
      .filter(p => p.revealed && p.revealOrder !== null)
      .sort((a, b) => (a.revealOrder || 0) - (b.revealOrder || 0))
      .map(p => p.position);
    
    const bones = game.positions.filter(p => !p.isChicken).map(p => p.position);
    
    console.log(`\nPartida ${idx + 1}:`);
    console.log(`  Posiciones reveladas: ${revealed.join(', ')}`);
    console.log(`  Posiciones de huesos: ${bones.join(', ')}`);
    console.log(`  Resultado: ${game.hitBone ? '❌ PÉRDIDA' : '✅ VICTORIA'}`);
    
    // Verificar si el primer movimiento fue un hueso
    if (revealed.length > 0 && bones.includes(revealed[0])) {
      console.log(`  ⚠️ PRIMER MOVIMIENTO FUE HUESO - Mystake predijo nuestra sugerencia`);
    }
  });

  // Análisis 5: Detección de anti-patrón
  console.log('\n🚨 ANÁLISIS 5: Detección de Anti-Patrón de Mystake');
  console.log('-'.repeat(80));

  console.log(`Racha máxima de pérdidas consecutivas: ${maxConsecutiveLosses}`);
  console.log(`Racha actual de pérdidas: ${consecutiveLosses}`);

  if (maxConsecutiveLosses >= 3) {
    console.log('\n⚠️ ALERTA: Mystake está detectando nuestro patrón!');
    console.log('Recomendaciones:');
    console.log('  1. Introducir ALEATORIEDAD en las sugerencias');
    console.log('  2. Rotar entre diferentes estrategias');
    console.log('  3. Evitar posiciones "seguras" obvias');
    console.log('  4. Usar posiciones menos frecuentes ocasionalmente');
  }

  // Análisis 6: Comparación de posiciones sugeridas vs huesos
  console.log('\n🔄 ANÁLISIS 6: Overlap entre Sugerencias y Huesos');
  console.log('-'.repeat(80));

  const suggestedSet = new Set(firstMovePositions);
  const boneSet = new Set(bonePositionsFound);
  const overlap = [...suggestedSet].filter(pos => boneSet.has(pos));

  console.log(`Posiciones únicas sugeridas: ${suggestedSet.size}`);
  console.log(`Posiciones únicas con huesos: ${boneSet.size}`);
  console.log(`Overlap (posiciones sugeridas que tuvieron huesos): ${overlap.length}`);
  console.log(`Posiciones en overlap: ${overlap.join(', ')}`);

  const overlapPercentage = ((overlap.length / suggestedSet.size) * 100).toFixed(1);
  console.log(`\nPorcentaje de overlap: ${overlapPercentage}%`);

  if (parseFloat(overlapPercentage) > 50) {
    console.log('🚨 CRÍTICO: Más del 50% de nuestras sugerencias tienen huesos!');
    console.log('Mystake está claramente adaptándose a nuestro patrón.');
  }

  // Análisis 7: Entropía de sugerencias
  console.log('\n📊 ANÁLISIS 7: Entropía y Predictibilidad');
  console.log('-'.repeat(80));

  const entropy = calculateEntropy(firstMovePositions);
  const maxEntropy = Math.log2(25); // Máxima entropía para 25 posiciones
  const predictability = ((1 - entropy / maxEntropy) * 100).toFixed(1);

  console.log(`Entropía de sugerencias: ${entropy.toFixed(2)} bits`);
  console.log(`Entropía máxima posible: ${maxEntropy.toFixed(2)} bits`);
  console.log(`Predictibilidad: ${predictability}%`);

  if (parseFloat(predictability) > 60) {
    console.log('⚠️ ALTA PREDICTIBILIDAD: Nuestras sugerencias son muy predecibles');
  }

  console.log('\n' + '='.repeat(80));
  console.log('✅ Análisis completado\n');

  await prisma.$disconnect();
}

function calculateEntropy(positions: number[]): number {
  const freq: Record<number, number> = {};
  positions.forEach(pos => {
    freq[pos] = (freq[pos] || 0) + 1;
  });

  const total = positions.length;
  let entropy = 0;

  Object.values(freq).forEach(count => {
    const p = count / total;
    entropy -= p * Math.log2(p);
  });

  return entropy;
}

analyzeRecentGames().catch(console.error);
