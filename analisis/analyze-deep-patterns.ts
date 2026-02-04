import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeDeepPatterns() {
  console.log('🔬 ANÁLISIS PROFUNDO DE PATRONES\n');
  console.log('='.repeat(80));

  const games = await prisma.chickenGame.findMany({
    where: { isSimulated: false, boneCount: 4 },
    take: 50,
    orderBy: { createdAt: 'desc' },
    include: { positions: { orderBy: { position: 'asc' } } }
  });

  console.log(`\n📊 Analizando ${games.length} partidas\n`);

  // 1. PATRÓN: Posiciones de pollos → Dónde NO están los huesos
  console.log('🐔 PATRÓN 1: Análisis de Posiciones de Pollos');
  console.log('-'.repeat(80));
  
  const chickenPositions: number[] = [];
  const bonePositions: number[] = [];
  
  games.forEach(game => {
    game.positions.forEach(p => {
      if (p.isChicken) chickenPositions.push(p.position);
      else bonePositions.push(p.position);
    });
  });

  const chickenFreq: Record<number, number> = {};
  chickenPositions.forEach(p => {
    chickenFreq[p] = (chickenFreq[p] || 0) + 1;
  });

  const topChickens = Object.entries(chickenFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  console.log('Top 10 posiciones MÁS FRECUENTES como POLLOS:');
  topChickens.forEach(([pos, count]) => {
    const percentage = ((count / chickenPositions.length) * 100).toFixed(1);
    console.log(`  Posición ${pos}: ${count} veces (${percentage}%) ✅ SEGURA`);
  });

  // 2. PATRÓN: Secuencias de pollos consecutivos
  console.log('\n🔗 PATRÓN 2: Secuencias de Pollos Consecutivos');
  console.log('-'.repeat(80));

  const sequences: Record<string, number> = {};
  
  games.forEach(game => {
    const revealed = game.positions
      .filter(p => p.revealed && p.revealOrder !== null)
      .sort((a, b) => (a.revealOrder || 0) - (b.revealOrder || 0));
    
    const chickens = revealed.filter(p => p.isChicken).map(p => p.position);
    
    // Secuencias de 3 pollos
    for (let i = 0; i <= chickens.length - 3; i++) {
      const seq = chickens.slice(i, i + 3).join(',');
      sequences[seq] = (sequences[seq] || 0) + 1;
    }
  });

  const topSequences = Object.entries(sequences)
    .filter(([, count]) => count >= 3)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  console.log('Top 10 secuencias de 3 pollos (aparecen 3+ veces):');
  topSequences.forEach(([seq, count]) => {
    console.log(`  ${seq}: ${count} veces`);
  });

  // 3. PATRÓN: Posiciones que NUNCA son huesos después de ciertos pollos
  console.log('\n🎯 PATRÓN 3: Posiciones Seguras Después de Pollos Específicos');
  console.log('-'.repeat(80));

  const afterChicken: Record<string, { next: number[], bones: number[], safe: number[] }> = {};
  
  games.forEach(game => {
    const revealed = game.positions
      .filter(p => p.revealed && p.revealOrder !== null)
      .sort((a, b) => (a.revealOrder || 0) - (b.revealOrder || 0));
    
    for (let i = 0; i < revealed.length - 1; i++) {
      if (revealed[i].isChicken) {
        const currentPos = revealed[i].position;
        const nextPos = revealed[i + 1].position;
        const nextIsBone = !revealed[i + 1].isChicken;
        
        if (!afterChicken[currentPos]) {
          afterChicken[currentPos] = { next: [], bones: [], safe: [] };
        }
        
        afterChicken[currentPos].next.push(nextPos);
        
        if (nextIsBone) {
          afterChicken[currentPos].bones.push(nextPos);
        } else {
          afterChicken[currentPos].safe.push(nextPos);
        }
      }
    }
  });

  console.log('Después de revelar POLLO en posición X, qué posiciones son SEGURAS:');
  Object.entries(afterChicken)
    .filter(([, data]) => data.next.length >= 5)
    .sort(([, a], [, b]) => b.next.length - a.next.length)
    .slice(0, 10)
    .forEach(([pos, data]) => {
      const safeRate = ((data.safe.length / data.next.length) * 100).toFixed(0);
      const mostSafe = [...new Set(data.safe)]
        .map(p => ({ pos: p, count: data.safe.filter(x => x === p).length }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map(x => x.pos);
      
      console.log(`  Después de ${pos}: ${safeRate}% seguro → Mejores: ${mostSafe.join(', ')}`);
    });

  // 4. PATRÓN: Distancia entre pollos y huesos
  console.log('\n📏 PATRÓN 4: Distancia Óptima entre Posiciones');
  console.log('-'.repeat(80));

  const distances: number[] = [];
  
  games.forEach(game => {
    const revealed = game.positions
      .filter(p => p.revealed && p.revealOrder !== null)
      .sort((a, b) => (a.revealOrder || 0) - (b.revealOrder || 0));
    
    for (let i = 0; i < revealed.length - 1; i++) {
      if (revealed[i].isChicken && revealed[i + 1].isChicken) {
        const dist = Math.abs(revealed[i + 1].position - revealed[i].position);
        distances.push(dist);
      }
    }
  });

  const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
  const distFreq: Record<number, number> = {};
  distances.forEach(d => {
    distFreq[d] = (distFreq[d] || 0) + 1;
  });

  console.log(`Distancia promedio entre pollos consecutivos: ${avgDistance.toFixed(1)}`);
  console.log('Distancias más comunes:');
  Object.entries(distFreq)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .forEach(([dist, count]) => {
      console.log(`  ${dist} posiciones: ${count} veces`);
    });

  // 5. PATRÓN: Posiciones por zona (filas/columnas)
  console.log('\n🗺️ PATRÓN 5: Análisis por Zonas (Filas y Columnas)');
  console.log('-'.repeat(80));

  const zoneChickens: Record<string, number> = {};
  const zoneBones: Record<string, number> = {};
  
  games.forEach(game => {
    game.positions.forEach(p => {
      const row = Math.floor((p.position - 1) / 5) + 1;
      const col = ((p.position - 1) % 5) + 1;
      const rowKey = `Fila ${row}`;
      const colKey = `Col ${col}`;
      
      if (p.isChicken) {
        zoneChickens[rowKey] = (zoneChickens[rowKey] || 0) + 1;
        zoneChickens[colKey] = (zoneChickens[colKey] || 0) + 1;
      } else {
        zoneBones[rowKey] = (zoneBones[rowKey] || 0) + 1;
        zoneBones[colKey] = (zoneBones[colKey] || 0) + 1;
      }
    });
  });

  console.log('Zonas más seguras (más pollos, menos huesos):');
  const zones = [...new Set([...Object.keys(zoneChickens), ...Object.keys(zoneBones)])];
  zones.forEach(zone => {
    const chickens = zoneChickens[zone] || 0;
    const bones = zoneBones[zone] || 0;
    const total = chickens + bones;
    const safeRate = ((chickens / total) * 100).toFixed(0);
    console.log(`  ${zone}: ${safeRate}% pollos (${chickens}/${total})`);
  });

  // 6. RECOMENDACIONES FINALES
  console.log('\n💡 RECOMENDACIONES PARA PREDICTOR');
  console.log('='.repeat(80));

  const topSafePositions = topChickens.slice(0, 5).map(([pos]) => parseInt(pos));
  console.log(`\n1. PRIORIZAR estas posiciones (más frecuentes como pollos):`);
  console.log(`   ${topSafePositions.join(', ')}`);

  const topSafeSequences = topSequences.slice(0, 3).map(([seq]) => seq);
  console.log(`\n2. USAR estas secuencias exitosas:`);
  topSafeSequences.forEach(seq => console.log(`   ${seq}`));

  console.log(`\n3. DISTANCIA ÓPTIMA entre movimientos: ${Math.round(avgDistance)} posiciones`);

  const safestZones = zones
    .map(zone => ({
      zone,
      chickens: zoneChickens[zone] || 0,
      bones: zoneBones[zone] || 0,
      rate: ((zoneChickens[zone] || 0) / ((zoneChickens[zone] || 0) + (zoneBones[zone] || 0)))
    }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 3);

  console.log(`\n4. ZONAS MÁS SEGURAS:`);
  safestZones.forEach(z => {
    console.log(`   ${z.zone}: ${(z.rate * 100).toFixed(0)}% seguro`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('✅ Análisis completado\n');

  await prisma.$disconnect();
}

analyzeDeepPatterns().catch(console.error);
