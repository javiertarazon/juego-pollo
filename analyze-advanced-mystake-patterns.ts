import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface GameData {
  id: string;
  bonePositions: number[];
  chickenPositions: number[];
  revealedChickens: number[];
  createdAt: Date;
}

async function analyzeAdvancedMystakePatterns() {
  try {
    console.log('🔬 ANÁLISIS AVANZADO DE PATRONES DE MYSTAKE');
    console.log('='.repeat(80));
    console.log('Buscando ventajas para predecir posiciones de pollos consecutivas...\n');
    
    // Obtener TODOS los juegos reales ordenados cronológicamente
    const realGames = await prisma.chickenGame.findMany({
      where: {
        isSimulated: false,
        boneCount: 4,
      },
      include: {
        positions: {
          orderBy: { position: 'asc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`📊 Total de juegos reales: ${realGames.length}\n`);
    
    if (realGames.length < 10) {
      console.log('⚠️  Necesitas al menos 10 juegos para un análisis significativo');
      return;
    }

    // Preparar datos estructurados
    const gamesData: GameData[] = realGames.map(game => ({
      id: game.id,
      bonePositions: game.positions.filter(p => !p.isChicken).map(p => p.position).sort((a, b) => a - b),
      chickenPositions: game.positions.filter(p => p.isChicken).map(p => p.position).sort((a, b) => a - b),
      revealedChickens: game.positions.filter(p => p.isChicken && p.revealed).map(p => p.position).sort((a, b) => a - b),
      createdAt: game.createdAt
    }));

    // ============================================================================
    // ANÁLISIS 1: MOVIMIENTO DE HUESOS EN PARTIDAS CONSECUTIVAS
    // ============================================================================
    console.log('='.repeat(80));
    console.log('1️⃣  ANÁLISIS DE MOVIMIENTO DE HUESOS EN PARTIDAS CONSECUTIVAS');
    console.log('='.repeat(80));
    
    const boneMovementPatterns: Record<string, number> = {};
    const positionStability: Record<number, { stable: number, changed: number }> = {};
    
    for (let pos = 1; pos <= 25; pos++) {
      positionStability[pos] = { stable: 0, changed: 0 };
    }
    
    for (let i = 0; i < gamesData.length - 1; i++) {
      const current = gamesData[i];
      const next = gamesData[i + 1];
      
      // Analizar cada posición
      for (let pos = 1; pos <= 25; pos++) {
        const wasBone = current.bonePositions.includes(pos);
        const isBone = next.bonePositions.includes(pos);
        
        if (wasBone && isBone) {
          positionStability[pos].stable++;
          boneMovementPatterns['BONE→BONE'] = (boneMovementPatterns['BONE→BONE'] || 0) + 1;
        } else if (wasBone && !isBone) {
          positionStability[pos].changed++;
          boneMovementPatterns['BONE→CHICKEN'] = (boneMovementPatterns['BONE→CHICKEN'] || 0) + 1;
        } else if (!wasBone && isBone) {
          positionStability[pos].changed++;
          boneMovementPatterns['CHICKEN→BONE'] = (boneMovementPatterns['CHICKEN→BONE'] || 0) + 1;
        } else {
          positionStability[pos].stable++;
          boneMovementPatterns['CHICKEN→CHICKEN'] = (boneMovementPatterns['CHICKEN→CHICKEN'] || 0) + 1;
        }
      }
    }
    
    console.log('\n📊 Patrones de movimiento generales:');
    Object.entries(boneMovementPatterns).forEach(([pattern, count]) => {
      const percentage = ((count / ((gamesData.length - 1) * 25)) * 100).toFixed(2);
      console.log(`   ${pattern}: ${count} veces (${percentage}%)`);
    });
    
    // Posiciones más estables como HUESO
    const stablePositions = Object.entries(positionStability)
      .map(([pos, data]) => ({
        position: parseInt(pos),
        stability: data.stable / (data.stable + data.changed),
        total: data.stable + data.changed
      }))
      .filter(p => p.total > 5)
      .sort((a, b) => b.stability - a.stability)
      .slice(0, 10);
    
    console.log('\n🔒 Top 10 posiciones MÁS ESTABLES (mantienen su estado):');
    stablePositions.forEach((p, idx) => {
      console.log(`   ${idx + 1}. Posición ${p.position}: ${(p.stability * 100).toFixed(2)}% estabilidad`);
    });
    
    // Posiciones más volátiles
    const volatilePositions = Object.entries(positionStability)
      .map(([pos, data]) => ({
        position: parseInt(pos),
        volatility: data.changed / (data.stable + data.changed),
        total: data.stable + data.changed
      }))
      .filter(p => p.total > 5)
      .sort((a, b) => b.volatility - a.volatility)
      .slice(0, 10);
    
    console.log('\n🔄 Top 10 posiciones MÁS VOLÁTILES (cambian frecuentemente):');
    volatilePositions.forEach((p, idx) => {
      console.log(`   ${idx + 1}. Posición ${p.position}: ${(p.volatility * 100).toFixed(2)}% volatilidad`);
    });

    // ============================================================================
    // ANÁLISIS 2: SECUENCIAS DE POLLOS EXITOSAS
    // ============================================================================
    console.log('\n' + '='.repeat(80));
    console.log('2️⃣  ANÁLISIS DE SECUENCIAS DE POLLOS EXITOSAS');
    console.log('='.repeat(80));
    
    const successfulSequences: Record<string, number> = {};
    const sequencesByLength: Record<number, string[]> = {};
    
    gamesData.forEach(game => {
      if (game.revealedChickens.length >= 3) {
        const sequence = game.revealedChickens.slice(0, 5).join('→');
        successfulSequences[sequence] = (successfulSequences[sequence] || 0) + 1;
        
        const length = game.revealedChickens.length;
        if (!sequencesByLength[length]) sequencesByLength[length] = [];
        sequencesByLength[length].push(sequence);
      }
    });
    
    const topSequences = Object.entries(successfulSequences)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
    
    console.log('\n🎯 Top 15 secuencias de pollos más exitosas:');
    topSequences.forEach(([seq, count], idx) => {
      console.log(`   ${idx + 1}. ${seq} (${count} veces)`);
    });
    
    console.log('\n📊 Distribución por longitud de secuencia:');
    Object.entries(sequencesByLength)
      .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
      .forEach(([length, sequences]) => {
        console.log(`   ${length} pollos consecutivos: ${sequences.length} veces`);
      });

    // ============================================================================
    // ANÁLISIS 3: PATRONES DE "ZONAS SEGURAS" DESPUÉS DE HUESOS
    // ============================================================================
    console.log('\n' + '='.repeat(80));
    console.log('3️⃣  ZONAS SEGURAS: Posiciones de pollos después de huesos conocidos');
    console.log('='.repeat(80));
    
    const safeZonesAfterBones: Record<string, { chickens: number[], frequency: number }> = {};
    
    for (let i = 0; i < gamesData.length - 1; i++) {
      const current = gamesData[i];
      const next = gamesData[i + 1];
      
      // Si en el juego actual se revelaron huesos
      if (current.bonePositions.length > 0) {
        const bonePattern = current.bonePositions.join(',');
        
        if (!safeZonesAfterBones[bonePattern]) {
          safeZonesAfterBones[bonePattern] = { chickens: [], frequency: 0 };
        }
        
        // Registrar qué posiciones fueron pollos en el siguiente juego
        next.chickenPositions.forEach(chickenPos => {
          safeZonesAfterBones[bonePattern].chickens.push(chickenPos);
        });
        safeZonesAfterBones[bonePattern].frequency++;
      }
    }
    
    // Analizar zonas seguras más comunes
    const commonSafeZones = Object.entries(safeZonesAfterBones)
      .filter(([_, data]) => data.frequency >= 2)
      .sort((a, b) => b[1].frequency - a[1].frequency)
      .slice(0, 10);
    
    console.log('\n🛡️  Patrones de huesos y sus zonas seguras en el siguiente juego:');
    commonSafeZones.forEach(([bonePattern, data], idx) => {
      const chickenFreq: Record<number, number> = {};
      data.chickens.forEach(pos => {
        chickenFreq[pos] = (chickenFreq[pos] || 0) + 1;
      });
      
      const topChickens = Object.entries(chickenFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([pos, count]) => `${pos}(${count})`)
        .join(', ');
      
      console.log(`   ${idx + 1}. Huesos [${bonePattern}] → Pollos frecuentes: ${topChickens}`);
      console.log(`      Frecuencia: ${data.frequency} veces`);
    });

    // ============================================================================
    // ANÁLISIS 4: PREDICCIÓN BASADA EN ÚLTIMAS 3 PARTIDAS
    // ============================================================================
    console.log('\n' + '='.repeat(80));
    console.log('4️⃣  ANÁLISIS DE TENDENCIAS EN ÚLTIMAS 3 PARTIDAS');
    console.log('='.repeat(80));
    
    if (gamesData.length >= 4) {
      const recentGames = gamesData.slice(-4);
      const last3 = recentGames.slice(0, 3);
      const current = recentGames[3];
      
      // Analizar qué posiciones fueron huesos en las últimas 3
      const boneFrequencyLast3: Record<number, number> = {};
      last3.forEach(game => {
        game.bonePositions.forEach(pos => {
          boneFrequencyLast3[pos] = (boneFrequencyLast3[pos] || 0) + 1;
        });
      });
      
      console.log('\n📈 Frecuencia de huesos en últimas 3 partidas:');
      const sortedBones = Object.entries(boneFrequencyLast3)
        .sort((a, b) => b[1] - a[1]);
      
      sortedBones.forEach(([pos, count]) => {
        const wasInCurrent = current.bonePositions.includes(parseInt(pos));
        const status = wasInCurrent ? '❌ (hueso otra vez)' : '✅ (cambió a pollo)';
        console.log(`   Posición ${pos}: ${count}/3 veces ${status}`);
      });
      
      // Posiciones que NUNCA fueron hueso en las últimas 3
      const neverBones = [];
      for (let pos = 1; pos <= 25; pos++) {
        if (!boneFrequencyLast3[pos]) {
          neverBones.push(pos);
        }
      }
      
      console.log(`\n🎯 Posiciones que NUNCA fueron hueso en últimas 3 partidas: [${neverBones.join(', ')}]`);
      
      // Verificar cuántas de estas fueron pollos en la partida actual
      const neverBonesInCurrent = neverBones.filter(pos => 
        current.chickenPositions.includes(pos)
      );
      
      const accuracy = (neverBonesInCurrent.length / neverBones.length) * 100;
      console.log(`   De estas, ${neverBonesInCurrent.length}/${neverBones.length} fueron pollos en la partida actual (${accuracy.toFixed(2)}% precisión)`);
    }

    // ============================================================================
    // ANÁLISIS 5: PATRONES DE ROTACIÓN DE HUESOS
    // ============================================================================
    console.log('\n' + '='.repeat(80));
    console.log('5️⃣  PATRONES DE ROTACIÓN: ¿Mystake rota los huesos sistemáticamente?');
    console.log('='.repeat(80));
    
    const rotationPatterns: string[] = [];
    
    for (let i = 0; i < Math.min(gamesData.length - 1, 10); i++) {
      const game1 = gamesData[i];
      const game2 = gamesData[i + 1];
      
      const overlap = game1.bonePositions.filter(pos => 
        game2.bonePositions.includes(pos)
      ).length;
      
      const overlapPercentage = (overlap / 4) * 100;
      rotationPatterns.push(`${overlapPercentage.toFixed(0)}%`);
      
      console.log(`   Juego ${i + 1} → ${i + 2}: ${overlap}/4 huesos en común (${overlapPercentage.toFixed(0)}% overlap)`);
    }
    
    const avgOverlap = rotationPatterns.reduce((sum, p) => sum + parseFloat(p), 0) / rotationPatterns.length;
    console.log(`\n📊 Promedio de overlap: ${avgOverlap.toFixed(2)}%`);
    
    if (avgOverlap < 30) {
      console.log('   💡 CONCLUSIÓN: Mystake ROTA frecuentemente las posiciones de huesos');
      console.log('   🎯 ESTRATEGIA: Evitar posiciones que fueron huesos recientemente');
    } else if (avgOverlap > 70) {
      console.log('   💡 CONCLUSIÓN: Mystake MANTIENE posiciones de huesos consistentes');
      console.log('   🎯 ESTRATEGIA: Identificar y evitar posiciones "favoritas" de huesos');
    } else {
      console.log('   💡 CONCLUSIÓN: Mystake usa un patrón MIXTO de rotación');
      console.log('   🎯 ESTRATEGIA: Combinar análisis de frecuencia y rotación');
    }

    // ============================================================================
    // ANÁLISIS 6: MATRIZ DE TRANSICIÓN DE ESTADOS
    // ============================================================================
    console.log('\n' + '='.repeat(80));
    console.log('6️⃣  MATRIZ DE TRANSICIÓN: Probabilidades de cambio de estado');
    console.log('='.repeat(80));
    
    const transitionMatrix: Record<number, { 
      boneToChicken: number, 
      boneToBone: number,
      chickenToBone: number,
      chickenToChicken: number 
    }> = {};
    
    for (let pos = 1; pos <= 25; pos++) {
      transitionMatrix[pos] = {
        boneToChicken: 0,
        boneToBone: 0,
        chickenToBone: 0,
        chickenToChicken: 0
      };
    }
    
    for (let i = 0; i < gamesData.length - 1; i++) {
      const current = gamesData[i];
      const next = gamesData[i + 1];
      
      for (let pos = 1; pos <= 25; pos++) {
        const wasBone = current.bonePositions.includes(pos);
        const isBone = next.bonePositions.includes(pos);
        
        if (wasBone && isBone) transitionMatrix[pos].boneToBone++;
        else if (wasBone && !isBone) transitionMatrix[pos].boneToChicken++;
        else if (!wasBone && isBone) transitionMatrix[pos].chickenToBone++;
        else transitionMatrix[pos].chickenToChicken++;
      }
    }
    
    // Encontrar posiciones con alta probabilidad de ser pollo después de ser hueso
    const highBoneToChicken = Object.entries(transitionMatrix)
      .map(([pos, data]) => ({
        position: parseInt(pos),
        probability: data.boneToChicken / (data.boneToChicken + data.boneToBone),
        total: data.boneToChicken + data.boneToBone
      }))
      .filter(p => p.total >= 3)
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 10);
    
    console.log('\n🔄 Top 10 posiciones que cambian de HUESO a POLLO frecuentemente:');
    highBoneToChicken.forEach((p, idx) => {
      console.log(`   ${idx + 1}. Posición ${p.position}: ${(p.probability * 100).toFixed(2)}% probabilidad`);
    });
    
    // Encontrar posiciones con alta probabilidad de mantenerse como pollo
    const highChickenToChicken = Object.entries(transitionMatrix)
      .map(([pos, data]) => ({
        position: parseInt(pos),
        probability: data.chickenToChicken / (data.chickenToChicken + data.chickenToBone),
        total: data.chickenToChicken + data.chickenToBone
      }))
      .filter(p => p.total >= 3)
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 10);
    
    console.log('\n✅ Top 10 posiciones que se MANTIENEN como POLLO:');
    highChickenToChicken.forEach((p, idx) => {
      console.log(`   ${idx + 1}. Posición ${p.position}: ${(p.probability * 100).toFixed(2)}% probabilidad`);
    });

    // ============================================================================
    // ANÁLISIS 7: ESTRATEGIA ÓPTIMA BASADA EN DATOS
    // ============================================================================
    console.log('\n' + '='.repeat(80));
    console.log('7️⃣  ESTRATEGIA ÓPTIMA PARA PREDECIR POLLOS CONSECUTIVOS');
    console.log('='.repeat(80));
    
    // Calcular score de seguridad para cada posición
    const safetyScores: Record<number, number> = {};
    
    for (let pos = 1; pos <= 25; pos++) {
      let score = 0;
      
      // Factor 1: Baja frecuencia como hueso
      const boneCount = gamesData.filter(g => g.bonePositions.includes(pos)).length;
      const boneFreq = boneCount / gamesData.length;
      score += (1 - boneFreq) * 40; // 40 puntos máximo
      
      // Factor 2: Alta probabilidad de mantenerse como pollo
      const trans = transitionMatrix[pos];
      const chickenStability = trans.chickenToChicken / (trans.chickenToChicken + trans.chickenToBone || 1);
      score += chickenStability * 30; // 30 puntos máximo
      
      // Factor 3: Alta probabilidad de cambiar de hueso a pollo
      const boneToChickenProb = trans.boneToChicken / (trans.boneToChicken + trans.boneToBone || 1);
      score += boneToChickenProb * 30; // 30 puntos máximo
      
      safetyScores[pos] = score;
    }
    
    const topSafePositions = Object.entries(safetyScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
    
    console.log('\n🎯 TOP 15 POSICIONES MÁS SEGURAS (Score combinado):');
    topSafePositions.forEach(([pos, score], idx) => {
      console.log(`   ${idx + 1}. Posición ${pos}: ${score.toFixed(2)} puntos`);
    });
    
    console.log('\n💡 RECOMENDACIONES ESTRATÉGICAS:');
    console.log('   1. Prioriza las posiciones del Top 15 anterior');
    console.log('   2. Evita posiciones que fueron huesos en las últimas 2 partidas');
    console.log('   3. Si una posición fue hueso 3 veces seguidas, probablemente cambie a pollo');
    console.log('   4. Las posiciones volátiles son impredecibles - evítalas');
    console.log('   5. Combina múltiples factores para mejor precisión');

    // ============================================================================
    // RESUMEN FINAL
    // ============================================================================
    console.log('\n' + '='.repeat(80));
    console.log('✅ ANÁLISIS COMPLETADO');
    console.log('='.repeat(80));
    
    console.log(`\n📊 Juegos analizados: ${gamesData.length}`);
    console.log(`📈 Patrones identificados: ${Object.keys(successfulSequences).length}`);
    console.log(`🎯 Posiciones seguras identificadas: ${topSafePositions.length}`);
    
  } catch (error) {
    console.error('❌ Error en análisis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeAdvancedMystakePatterns();
