import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeMystakeAdaptation() {
  console.log('🎯 ANÁLISIS DE ADAPTACIÓN DE MYSTAKE\n');
  console.log('='.repeat(80));

  const games = await prisma.chickenGame.findMany({
    where: { isSimulated: false, boneCount: 4 },
    orderBy: { createdAt: 'asc' },
    include: { positions: { orderBy: { position: 'asc' } } }
  });

  console.log(`\n📊 Analizando ${games.length} partidas en orden cronológico\n`);

  // 1. PATRÓN: Repetición de patrones de huesos
  console.log('🔄 ANÁLISIS 1: Repetición de Patrones de Huesos');
  console.log('-'.repeat(80));

  const bonePatterns: string[] = [];
  games.forEach(game => {
    const bones = game.positions
      .filter(p => !p.isChicken)
      .map(p => p.position)
      .sort((a, b) => a - b)
      .join(',');
    bonePatterns.push(bones);
  });

  // Buscar patrones repetidos
  const patternOccurrences: Record<string, number[]> = {};
  bonePatterns.forEach((pattern, idx) => {
    if (!patternOccurrences[pattern]) {
      patternOccurrences[pattern] = [];
    }
    patternOccurrences[pattern].push(idx + 1);
  });

  const repeatedPatterns = Object.entries(patternOccurrences)
    .filter(([, occurrences]) => occurrences.length > 1)
    .sort(([, a], [, b]) => b.length - a.length);

  if (repeatedPatterns.length > 0) {
    console.log('Patrones de huesos que se repiten:');
    repeatedPatterns.slice(0, 5).forEach(([pattern, occurrences]) => {
      const gaps: number[] = [];
      for (let i = 1; i < occurrences.length; i++) {
        gaps.push(occurrences[i] - occurrences[i - 1]);
      }
      const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      console.log(`  Patrón [${pattern}]: ${occurrences.length} veces`);
      console.log(`    Partidas: ${occurrences.join(', ')}`);
      console.log(`    Intervalo promedio: cada ${avgGap.toFixed(1)} partidas`);
    });
  } else {
    console.log('✅ NO hay patrones de huesos repetidos - Mystake rota completamente');
  }

  // 2. PATRÓN: Pollo → Hueso en siguiente partida
  console.log('\n🔀 ANÁLISIS 2: Transformación Pollo → Hueso entre Partidas');
  console.log('-'.repeat(80));

  const transformations: Record<number, { chickenToBone: number, boneTochicken: number, stable: number }> = {};
  
  for (let i = 0; i < games.length - 1; i++) {
    const currentGame = games[i];
    const nextGame = games[i + 1];
    
    const currentChickens = new Set(currentGame.positions.filter(p => p.isChicken).map(p => p.position));
    const currentBones = new Set(currentGame.positions.filter(p => !p.isChicken).map(p => p.position));
    
    const nextChickens = new Set(nextGame.positions.filter(p => p.isChicken).map(p => p.position));
    const nextBones = new Set(nextGame.positions.filter(p => !p.isChicken).map(p => p.position));
    
    // Analizar cada posición
    for (let pos = 1; pos <= 25; pos++) {
      if (!transformations[pos]) {
        transformations[pos] = { chickenToBone: 0, boneTochicken: 0, stable: 0 };
      }
      
      const wasChicken = currentChickens.has(pos);
      const wasBone = currentBones.has(pos);
      const isChicken = nextChickens.has(pos);
      const isBone = nextBones.has(pos);
      
      if (wasChicken && isBone) {
        transformations[pos].chickenToBone++;
      } else if (wasBone && isChicken) {
        transformations[pos].boneTochicken++;
      } else if ((wasChicken && isChicken) || (wasBone && isBone)) {
        transformations[pos].stable++;
      }
    }
  }

  console.log('Posiciones que MÁS cambian de Pollo → Hueso:');
  Object.entries(transformations)
    .map(([pos, data]) => ({
      pos: parseInt(pos),
      rate: data.chickenToBone / (data.chickenToBone + data.boneTochicken + data.stable),
      count: data.chickenToBone
    }))
    .filter(x => x.count > 0)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 10)
    .forEach(({ pos, rate, count }) => {
      console.log(`  Posición ${pos}: ${(rate * 100).toFixed(0)}% (${count} veces) ⚠️ PELIGROSA`);
    });

  console.log('\nPosiciones que MÁS cambian de Hueso → Pollo:');
  Object.entries(transformations)
    .map(([pos, data]) => ({
      pos: parseInt(pos),
      rate: data.boneTochicken / (data.chickenToBone + data.boneTochicken + data.stable),
      count: data.boneTochicken
    }))
    .filter(x => x.count > 0)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 10)
    .forEach(({ pos, rate, count }) => {
      console.log(`  Posición ${pos}: ${(rate * 100).toFixed(0)}% (${count} veces) ✅ SEGURA`);
    });

  // 3. PATRÓN: Detección de adaptación por repetición
  console.log('\n🎯 ANÁLISIS 3: Detección de Adaptación por Repetición');
  console.log('-'.repeat(80));

  // Analizar primeras posiciones reveladas
  const firstMoves: number[] = [];
  games.forEach(game => {
    const revealed = game.positions
      .filter(p => p.revealed && p.revealOrder !== null)
      .sort((a, b) => (a.revealOrder || 0) - (b.revealOrder || 0));
    
    if (revealed.length > 0) {
      firstMoves.push(revealed[0].position);
    }
  });

  // Detectar cuándo Mystake coloca hueso después de repetir posición
  console.log('Análisis de repetición de primera posición:');
  
  const positionUsage: Record<number, { games: number[], hitBone: boolean[] }> = {};
  
  games.forEach((game, idx) => {
    const revealed = game.positions
      .filter(p => p.revealed && p.revealOrder !== null)
      .sort((a, b) => (a.revealOrder || 0) - (b.revealOrder || 0));
    
    if (revealed.length > 0) {
      const firstPos = revealed[0].position;
      const wasHitBone = !revealed[0].isChicken;
      
      if (!positionUsage[firstPos]) {
        positionUsage[firstPos] = { games: [], hitBone: [] };
      }
      
      positionUsage[firstPos].games.push(idx + 1);
      positionUsage[firstPos].hitBone.push(wasHitBone);
    }
  });

  // Analizar patrones de adaptación
  Object.entries(positionUsage)
    .filter(([, data]) => data.games.length >= 3)
    .forEach(([pos, data]) => {
      console.log(`\nPosición ${pos} usada ${data.games.length} veces:`);
      
      // Buscar si hay patrón de adaptación
      let consecutiveUses = 0;
      let adaptationDetected = false;
      
      for (let i = 0; i < data.games.length; i++) {
        const gameNum = data.games[i];
        const wasHitBone = data.hitBone[i];
        
        // Contar usos consecutivos (dentro de 5 partidas)
        if (i > 0 && data.games[i] - data.games[i - 1] <= 5) {
          consecutiveUses++;
        } else {
          consecutiveUses = 1;
        }
        
        console.log(`  Partida ${gameNum}: ${wasHitBone ? '💀 HUESO' : '🐔 POLLO'} (uso #${consecutiveUses})`);
        
        // Detectar adaptación: si después de 2-3 usos consecutivos, aparece hueso
        if (consecutiveUses >= 2 && wasHitBone && !adaptationDetected) {
          console.log(`    ⚠️ ADAPTACIÓN DETECTADA: Mystake colocó hueso después de ${consecutiveUses} usos`);
          adaptationDetected = true;
        }
      }
    });

  // 4. PATRÓN: Ventana de seguridad
  console.log('\n⏰ ANÁLISIS 4: Ventana de Seguridad por Posición');
  console.log('-'.repeat(80));

  console.log('¿Cuántas partidas puedes usar una posición antes de que Mystake la "queme"?');
  
  Object.entries(positionUsage)
    .filter(([, data]) => data.games.length >= 3)
    .forEach(([pos, data]) => {
      let safeWindow = 0;
      let foundBone = false;
      
      for (let i = 0; i < data.games.length && !foundBone; i++) {
        if (data.hitBone[i]) {
          safeWindow = i;
          foundBone = true;
        }
      }
      
      if (foundBone) {
        console.log(`  Posición ${pos}: Segura por ${safeWindow} usos, luego HUESO`);
      } else {
        console.log(`  Posición ${pos}: Segura en todos los ${data.games.length} usos ✅`);
      }
    });

  // 5. RECOMENDACIONES
  console.log('\n💡 RECOMENDACIONES ESTRATÉGICAS');
  console.log('='.repeat(80));

  // Encontrar posiciones más estables
  const stablePositions = Object.entries(transformations)
    .map(([pos, data]) => ({
      pos: parseInt(pos),
      stability: data.stable / (data.chickenToBone + data.boneTochicken + data.stable),
      total: data.chickenToBone + data.boneTochicken + data.stable
    }))
    .filter(x => x.total >= 10)
    .sort((a, b) => b.stability - a.stability)
    .slice(0, 10);

  console.log('\n1. POSICIONES MÁS ESTABLES (no cambian entre partidas):');
  stablePositions.forEach(({ pos, stability }) => {
    console.log(`   Posición ${pos}: ${(stability * 100).toFixed(0)}% estable`);
  });

  // Encontrar posiciones que rotan bien
  const goodRotation = Object.entries(transformations)
    .map(([pos, data]) => ({
      pos: parseInt(pos),
      boneTochicken: data.boneTochicken,
      chickenToBone: data.chickenToBone,
      ratio: data.boneTochicken / (data.chickenToBone + 1)
    }))
    .filter(x => x.boneTochicken >= 3)
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 10);

  console.log('\n2. POSICIONES CON MEJOR ROTACIÓN (Hueso → Pollo):');
  goodRotation.forEach(({ pos, boneTochicken, chickenToBone, ratio }) => {
    console.log(`   Posición ${pos}: ${boneTochicken} veces H→P vs ${chickenToBone} veces P→H (ratio: ${ratio.toFixed(2)})`);
  });

  console.log('\n3. ESTRATEGIA DE ROTACIÓN:');
  console.log('   - NO usar la misma posición más de 2 veces consecutivas');
  console.log('   - Esperar al menos 3-5 partidas antes de reusar una posición');
  console.log('   - Priorizar posiciones que fueron HUESO en partida anterior');

  console.log('\n' + '='.repeat(80));
  console.log('✅ Análisis de adaptación completado\n');

  await prisma.$disconnect();
}

analyzeMystakeAdaptation().catch(console.error);
