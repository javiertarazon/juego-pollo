/**
 * ANÁLISIS PROFUNDO DE PATRONES - Juego del Pollo
 * 
 * Analiza:
 * 1. Posiciones con más huesos en últimas 5 y 10 partidas
 * 2. Posiciones con más % de pollo en últimas 5 y 10 partidas
 * 3. % de inversión pollo→hueso y hueso→pollo entre partidas
 * 4. Cada cuántas partidas ocurren esos cambios
 * 5. Repetición de patrones de posiciones de pollos entre partidas
 * 6. Análisis de retiro: cuando te retiras, ¿la siguiente era pollo o hueso?
 * 7. Patrones recurrentes que sirvan como ventaja predictiva
 */

const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

function getBonePositions(game) {
  return game.positions.filter((p) => !p.isChicken).map((p) => p.position).sort((a, b) => a - b);
}

function getChickenPositions(game) {
  return game.positions.filter((p) => p.isChicken).map((p) => p.position).sort((a, b) => a - b);
}

function getRevealedInOrder(game) {
  return game.positions
    .filter((p) => p.revealed && p.revealOrder > 0)
    .sort((a, b) => a.revealOrder - b.revealOrder);
}

function positionFrequency(games, filterFn) {
  const freq = {};
  for (let i = 1; i <= 25; i++) freq[i] = 0;
  for (const g of games) {
    const positions = g.positions.filter(filterFn).map((p) => p.position);
    for (const pos of positions) freq[pos]++;
  }
  return freq;
}

function printTopPositions(freq, n, total, label) {
  const sorted = Object.entries(freq)
    .map(([pos, count]) => ({
      pos: parseInt(pos),
      count,
      pct: ((count / total) * 100).toFixed(1),
    }))
    .sort((a, b) => b.count - a.count);

  console.log(`\n  Top ${n} ${label}:`);
  sorted.slice(0, n).forEach((s) =>
    console.log(`    Pos ${String(s.pos).padStart(2)}: ${s.count} veces (${s.pct}%)`)
  );
  console.log(`  Bottom ${n} (menos frecuentes):`);
  sorted.slice(-n).forEach((s) =>
    console.log(`    Pos ${String(s.pos).padStart(2)}: ${s.count} veces (${s.pct}%)`)
  );
}

(async () => {
  // Cargar SOLO partidas con datos BUENOS (4 huesos reales en positions)
  const allGames = await p.chickenGame.findMany({
    where: { isSimulated: false },
    include: { positions: { orderBy: { position: "asc" } } },
    orderBy: { createdAt: "desc" },
  });

  // Filtrar partidas con datos correctos (exactamente 4 huesos y 21 pollos)
  const goodGames = allGames.filter((g) => {
    const bones = g.positions.filter((p) => !p.isChicken).length;
    return g.positions.length === 25 && bones >= 3 && bones <= 5;
  });

  console.log("╔══════════════════════════════════════════════════════════════════╗");
  console.log("║            ANÁLISIS PROFUNDO DE PATRONES                        ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝");
  console.log(`Total partidas reales: ${allGames.length}`);
  console.log(`Partidas con datos buenos (3-5 huesos + 25 pos): ${goodGames.length}`);

  const last5 = goodGames.slice(0, 5);
  const last10 = goodGames.slice(0, 10);
  const last20 = goodGames.slice(0, 20);

  // ═══════════════════════════════════════════════════════
  // 1. POSICIONES CON MÁS HUESOS - Últimas 5 y 10
  // ═══════════════════════════════════════════════════════
  console.log("\n" + "═".repeat(65));
  console.log("1. POSICIONES CON MÁS HUESOS (últimas 5 y 10 partidas)");
  console.log("═".repeat(65));

  const boneFreq5 = positionFrequency(last5, (p) => !p.isChicken);
  printTopPositions(boneFreq5, 8, last5.length, "HUESOS - Últimas 5");

  const boneFreq10 = positionFrequency(last10, (p) => !p.isChicken);
  printTopPositions(boneFreq10, 8, last10.length, "HUESOS - Últimas 10");

  // ═══════════════════════════════════════════════════════
  // 2. POSICIONES CON MÁS POLLO - Últimas 5 y 10
  // ═══════════════════════════════════════════════════════
  console.log("\n" + "═".repeat(65));
  console.log("2. POSICIONES CON MÁS POLLO (últimas 5 y 10 partidas)");
  console.log("═".repeat(65));

  const chickenFreq5 = positionFrequency(last5, (p) => p.isChicken);
  printTopPositions(chickenFreq5, 8, last5.length, "POLLOS - Últimas 5");

  const chickenFreq10 = positionFrequency(last10, (p) => p.isChicken);
  printTopPositions(chickenFreq10, 8, last10.length, "POLLOS - Últimas 10");

  // ═══════════════════════════════════════════════════════
  // 3. INVERSIÓN POLLO↔HUESO ENTRE PARTIDAS CONSECUTIVAS
  // ═══════════════════════════════════════════════════════
  console.log("\n" + "═".repeat(65));
  console.log("3. INVERSIÓN POLLO↔HUESO ENTRE PARTIDAS CONSECUTIVAS");
  console.log("═".repeat(65));

  // Revertir para orden cronológico
  const chrono = [...goodGames].reverse();
  
  let totalPolloAHueso = 0;
  let totalHuesoAPollo = 0;
  let totalPosiciones = 0;
  const inversionPorPartida = [];
  const inversionPorPosicion = {};
  for (let i = 1; i <= 25; i++) inversionPorPosicion[i] = { polloAHueso: 0, huesoAPollo: 0, sinCambio: 0 };

  for (let i = 1; i < chrono.length; i++) {
    const prev = chrono[i - 1];
    const curr = chrono[i];
    let p2h = 0;
    let h2p = 0;

    for (let pos = 1; pos <= 25; pos++) {
      const prevType = prev.positions.find((p) => p.position === pos);
      const currType = curr.positions.find((p) => p.position === pos);
      if (!prevType || !currType) continue;

      totalPosiciones++;
      if (prevType.isChicken && !currType.isChicken) {
        totalPolloAHueso++;
        p2h++;
        inversionPorPosicion[pos].polloAHueso++;
      } else if (!prevType.isChicken && currType.isChicken) {
        totalHuesoAPollo++;
        h2p++;
        inversionPorPosicion[pos].huesoAPollo++;
      } else {
        inversionPorPosicion[pos].sinCambio++;
      }
    }
    inversionPorPartida.push({ gameIdx: i, polloAHueso: p2h, huesoAPollo: h2p });
  }

  const totalTransitions = chrono.length - 1;
  console.log(`\n  Total transiciones analizadas: ${totalTransitions} pares de partidas`);
  console.log(`  Total celdas evaluadas: ${totalPosiciones}`);
  console.log(`  Pollo→Hueso: ${totalPolloAHueso} (${((totalPolloAHueso / totalPosiciones) * 100).toFixed(2)}%)`);
  console.log(`  Hueso→Pollo: ${totalHuesoAPollo} (${((totalHuesoAPollo / totalPosiciones) * 100).toFixed(2)}%)`);
  console.log(`  Sin cambio: ${totalPosiciones - totalPolloAHueso - totalHuesoAPollo} (${(((totalPosiciones - totalPolloAHueso - totalHuesoAPollo) / totalPosiciones) * 100).toFixed(2)}%)`);
  
  const avgP2H = inversionPorPartida.reduce((s, x) => s + x.polloAHueso, 0) / totalTransitions;
  const avgH2P = inversionPorPartida.reduce((s, x) => s + x.huesoAPollo, 0) / totalTransitions;
  console.log(`\n  Por partida promedio:`);
  console.log(`    Pollo→Hueso: ${avgP2H.toFixed(1)} posiciones cambian`);
  console.log(`    Hueso→Pollo: ${avgH2P.toFixed(1)} posiciones cambian`);

  // Posiciones más volátiles (más cambios)
  const volatility = Object.entries(inversionPorPosicion)
    .map(([pos, v]) => ({
      pos: parseInt(pos),
      totalCambios: v.polloAHueso + v.huesoAPollo,
      pctCambio: (((v.polloAHueso + v.huesoAPollo) / totalTransitions) * 100).toFixed(1),
      pctPolloAHueso: ((v.polloAHueso / totalTransitions) * 100).toFixed(1),
      pctHuesoAPollo: ((v.huesoAPollo / totalTransitions) * 100).toFixed(1),
    }))
    .sort((a, b) => b.totalCambios - a.totalCambios);

  console.log(`\n  Top 10 posiciones más volátiles (más cambios entre partidas):`);
  volatility.slice(0, 10).forEach((v) =>
    console.log(
      `    Pos ${String(v.pos).padStart(2)}: ${v.totalCambios} cambios (${v.pctCambio}%) | P→H: ${v.pctPolloAHueso}% | H→P: ${v.pctHuesoAPollo}%`
    )
  );

  console.log(`\n  Top 5 posiciones más estables (menos cambios):`);
  volatility.slice(-5).reverse().forEach((v) =>
    console.log(
      `    Pos ${String(v.pos).padStart(2)}: ${v.totalCambios} cambios (${v.pctCambio}%)`
    )
  );

  // ═══════════════════════════════════════════════════════
  // 4. FRECUENCIA DE CAMBIOS - ¿Cada cuántas partidas?
  // ═══════════════════════════════════════════════════════
  console.log("\n" + "═".repeat(65));
  console.log("4. FRECUENCIA DE CAMBIOS POR POSICIÓN");
  console.log("═".repeat(65));

  // Para cada posición, calcular la racha promedio sin cambio
  for (let pos = 1; pos <= 25; pos++) {
    const states = chrono.map((g) => {
      const p = g.positions.find((p) => p.position === pos);
      return p ? (p.isChicken ? "C" : "B") : "?";
    });

    let rachas = [];
    let currentLen = 1;
    for (let i = 1; i < states.length; i++) {
      if (states[i] === states[i - 1]) {
        currentLen++;
      } else {
        rachas.push(currentLen);
        currentLen = 1;
      }
    }
    rachas.push(currentLen);

    const avgRacha = rachas.length > 0 ? rachas.reduce((s, r) => s + r, 0) / rachas.length : 0;
    const maxRacha = Math.max(...rachas);
    const cambios = rachas.length - 1;

    if (pos <= 25) {
      const recent10 = states.slice(-10).join("");
      console.log(
        `  Pos ${String(pos).padStart(2)}: Cambios=${String(cambios).padStart(3)} | AvgRacha=${avgRacha.toFixed(1)} | MaxRacha=${maxRacha} | Últimas10: ${recent10}`
      );
    }
  }

  // ═══════════════════════════════════════════════════════
  // 5. PATRONES DE HUESOS ENTRE PARTIDAS CONSECUTIVAS
  // ═══════════════════════════════════════════════════════
  console.log("\n" + "═".repeat(65));
  console.log("5. PATRONES REPETIDOS DE POSICIONES DE HUESOS");
  console.log("═".repeat(65));

  // ¿Cuántas posiciones de huesos se repiten de una partida a la siguiente?
  const repeticiones = [];
  for (let i = 1; i < chrono.length; i++) {
    const prevBones = new Set(getBonePositions(chrono[i - 1]));
    const currBones = getBonePositions(chrono[i]);
    const shared = currBones.filter((b) => prevBones.has(b));
    repeticiones.push(shared.length);
  }

  const avgRepetidas = repeticiones.reduce((s, r) => s + r, 0) / repeticiones.length;
  const dist = [0, 0, 0, 0, 0]; // 0, 1, 2, 3, 4 repetidas
  repeticiones.forEach((r) => { if (r <= 4) dist[r]++; });

  console.log(`\n  Huesos que se repiten de partida anterior:`);
  console.log(`    Promedio: ${avgRepetidas.toFixed(2)} posiciones se repiten`);
  console.log(`    Distribución:`);
  dist.forEach((count, i) =>
    console.log(`      ${i} repetidas: ${count} veces (${((count / repeticiones.length) * 100).toFixed(1)}%)`)
  );

  // Patrones completos de 4 huesos que se han repetido
  const bonePatterns = {};
  for (const g of chrono) {
    const key = getBonePositions(g).join(",");
    if (!bonePatterns[key]) bonePatterns[key] = 0;
    bonePatterns[key]++;
  }
  const repeatedPatterns = Object.entries(bonePatterns)
    .filter(([k, v]) => v > 1)
    .sort((a, b) => b[1] - a[1]);

  console.log(`\n  Combinaciones exactas de huesos que se repitieron:`);
  if (repeatedPatterns.length === 0) {
    console.log(`    Ninguna combinación exacta se repitió`);
  } else {
    repeatedPatterns.slice(0, 10).forEach(([pattern, count]) =>
      console.log(`    [${pattern}]: ${count} veces`)
    );
  }

  // Patrones de pollos (grupos frecuentes)
  console.log(`\n  Pares de huesos más frecuentes:`);
  const bonePairs = {};
  for (const g of chrono) {
    const bones = getBonePositions(g);
    for (let i = 0; i < bones.length; i++) {
      for (let j = i + 1; j < bones.length; j++) {
        const pair = `${bones[i]}-${bones[j]}`;
        if (!bonePairs[pair]) bonePairs[pair] = 0;
        bonePairs[pair]++;
      }
    }
  }
  Object.entries(bonePairs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([pair, count]) =>
      console.log(`    Par [${pair}]: ${count} veces (${((count / chrono.length) * 100).toFixed(1)}%)`)
    );

  // ═══════════════════════════════════════════════════════
  // 6. ANÁLISIS DE RETIRO (CASH OUT)
  // ═══════════════════════════════════════════════════════
  console.log("\n" + "═".repeat(65));
  console.log("6. ANÁLISIS DE RETIRO (CASH OUT)");
  console.log("═".repeat(65));

  const cashOutGames = chrono.filter((g) => g.cashOutPosition > 0 && !g.hitBone);
  const hitBoneGames = chrono.filter((g) => g.hitBone);

  console.log(`\n  Partidas con retiro exitoso: ${cashOutGames.length}`);
  console.log(`  Partidas donde pegó hueso: ${hitBoneGames.length}`);
  console.log(`  Tasa retiro exitoso: ${((cashOutGames.length / chrono.length) * 100).toFixed(1)}%`);

  // Distribución de posiciones de retiro
  const cashOutDist = {};
  cashOutGames.forEach((g) => {
    if (!cashOutDist[g.cashOutPosition]) cashOutDist[g.cashOutPosition] = 0;
    cashOutDist[g.cashOutPosition]++;
  });
  console.log(`\n  Distribución de posición de retiro:`);
  Object.entries(cashOutDist)
    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
    .forEach(([pos, count]) =>
      console.log(`    Retiro tras ${pos} pollos: ${count} veces (${((count / cashOutGames.length) * 100).toFixed(1)}%)`)
    );

  // ¿Qué era la siguiente posición tras el retiro? (pollo o hueso)
  console.log(`\n  Análisis post-retiro: ¿Qué había en la siguiente sugerencia?`);
  let nextWasChicken = 0;
  let nextWasBone = 0;
  let nextUnknown = 0;

  for (const g of cashOutGames) {
    const revealed = getRevealedInOrder(g);
    const lastRevealed = revealed[revealed.length - 1];
    if (!lastRevealed) { nextUnknown++; continue; }
    
    // Buscar la siguiente posición que NO fue revelada pero podría haber sido elegida
    // Tomamos las posiciones no reveladas ordenadas por posición
    const revealedPositions = new Set(revealed.map((p) => p.position));
    const unrevealed = g.positions.filter((p) => !revealedPositions.has(p.position));
    
    // ¿Cuántas son pollo vs hueso de las no reveladas?
    const unrevealedChickens = unrevealed.filter((p) => p.isChicken).length;
    const unrevealedBones = unrevealed.filter((p) => !p.isChicken).length;
    const totalUnrevealed = unrevealed.length;
    
    // Probabilidad de que la siguiente fuera hueso
    const probBone = unrevealedBones / totalUnrevealed;
    
    if (probBone > 0.5) {
      nextWasBone++;
    } else {
      nextWasChicken++;
    }
  }

  console.log(`    Tras retiro, probabilidad alta de pollo: ${nextWasChicken} (${((nextWasChicken / cashOutGames.length) * 100).toFixed(1)}%)`);
  console.log(`    Tras retiro, probabilidad alta de hueso: ${nextWasBone} (${((nextWasBone / cashOutGames.length) * 100).toFixed(1)}%)`);

  // Análisis más preciso: para cada retiro miro las posiciones no reveladas
  console.log(`\n  Detalle post-retiro (posiciones NO reveladas por partida):`);
  let totalUnrevBones = 0;
  let totalUnrevChickens = 0;
  for (const g of cashOutGames.slice(-10)) {
    const revealedSet = new Set(g.positions.filter((p) => p.revealed).map((p) => p.position));
    const unrev = g.positions.filter((p) => !revealedSet.has(p.position));
    const ub = unrev.filter((p) => !p.isChicken).length;
    const uc = unrev.filter((p) => p.isChicken).length;
    totalUnrevBones += ub;
    totalUnrevChickens += uc;
    console.log(
      `    Partida ${g.id.slice(0, 8)} (retiro tras ${g.cashOutPosition} pollos): quedaban ${ub} huesos y ${uc} pollos sin revelar → prob hueso: ${((ub / (ub + uc)) * 100).toFixed(1)}%`
    );
  }

  // ═══════════════════════════════════════════════════════
  // 7. PATRONES PREDECIBLES RECURRENTES
  // ═══════════════════════════════════════════════════════
  console.log("\n" + "═".repeat(65));
  console.log("7. PATRONES RECURRENTES PREDECIBLES");
  console.log("═".repeat(65));

  // 7a. Filas y columnas con más huesos
  console.log(`\n  a) Distribución por FILA (1-5):`);
  for (let row = 0; row < 5; row++) {
    const rowPositions = [row * 5 + 1, row * 5 + 2, row * 5 + 3, row * 5 + 4, row * 5 + 5];
    let boneCount = 0;
    let total = 0;
    for (const g of chrono) {
      for (const pos of rowPositions) {
        const p = g.positions.find((p) => p.position === pos);
        if (p) {
          total++;
          if (!p.isChicken) boneCount++;
        }
      }
    }
    console.log(`    Fila ${row + 1} (pos ${rowPositions.join(",")}): ${boneCount} huesos de ${total} (${((boneCount / total) * 100).toFixed(1)}%)`);
  }

  console.log(`\n  b) Distribución por COLUMNA (1-5):`);
  for (let col = 0; col < 5; col++) {
    const colPositions = [col + 1, col + 6, col + 11, col + 16, col + 21];
    let boneCount = 0;
    let total = 0;
    for (const g of chrono) {
      for (const pos of colPositions) {
        const p = g.positions.find((p) => p.position === pos);
        if (p) {
          total++;
          if (!p.isChicken) boneCount++;
        }
      }
    }
    console.log(`    Col ${col + 1} (pos ${colPositions.join(",")}): ${boneCount} huesos de ${total} (${((boneCount / total) * 100).toFixed(1)}%)`);
  }

  // 7b. Después de partida con huesos en "zona alta", ¿dónde van en la siguiente?
  console.log(`\n  c) Migración de huesos: ¿si los huesos estaban en zona X, dónde van después?`);
  const zones = {
    "esquinas": [1, 5, 21, 25],
    "bordes": [2, 3, 4, 6, 10, 11, 15, 16, 20, 22, 23, 24],
    "centro": [7, 8, 9, 12, 13, 14, 17, 18, 19],
  };

  for (let i = 1; i < chrono.length; i++) {
    // Skip - se hace solo estadística agregada
  }

  const migrationMatrix = { esquinas: { esquinas: 0, bordes: 0, centro: 0 }, bordes: { esquinas: 0, bordes: 0, centro: 0 }, centro: { esquinas: 0, bordes: 0, centro: 0 } };
  for (let i = 1; i < chrono.length; i++) {
    const prevBones = getBonePositions(chrono[i - 1]);
    const currBones = getBonePositions(chrono[i]);

    for (const pb of prevBones) {
      const fromZone = Object.entries(zones).find(([z, ps]) => ps.includes(pb))?.[0] || "bordes";
      for (const cb of currBones) {
        const toZone = Object.entries(zones).find(([z, ps]) => ps.includes(cb))?.[0] || "bordes";
        migrationMatrix[fromZone][toZone]++;
      }
    }
  }

  for (const [from, tos] of Object.entries(migrationMatrix)) {
    const total = Object.values(tos).reduce((s, v) => s + v, 0);
    console.log(`    Desde ${from}:`);
    for (const [to, count] of Object.entries(tos)) {
      console.log(`      → ${to}: ${count} (${total > 0 ? ((count / total) * 100).toFixed(1) : 0}%)`);
    }
  }

  // 7c. Huesos consecutivos (adyacentes)
  console.log(`\n  d) ¿Cuántos huesos son adyacentes entre sí?`);
  let adjCount = 0;
  let adjTotal = 0;
  
  function areAdjacent(p1, p2) {
    const r1 = Math.floor((p1 - 1) / 5);
    const c1 = (p1 - 1) % 5;
    const r2 = Math.floor((p2 - 1) / 5);
    const c2 = (p2 - 1) % 5;
    return Math.abs(r1 - r2) <= 1 && Math.abs(c1 - c2) <= 1 && (r1 !== r2 || c1 !== c2);
  }

  for (const g of chrono) {
    const bones = getBonePositions(g);
    adjTotal++;
    let hasAdj = false;
    for (let i = 0; i < bones.length; i++) {
      for (let j = i + 1; j < bones.length; j++) {
        if (areAdjacent(bones[i], bones[j])) hasAdj = true;
      }
    }
    if (hasAdj) adjCount++;
  }
  console.log(`    Partidas con huesos adyacentes: ${adjCount} de ${adjTotal} (${((adjCount / adjTotal) * 100).toFixed(1)}%)`);

  // 7d. Últimas 5 partidas - análisis detallado
  console.log(`\n  e) DETALLE ÚLTIMAS 5 PARTIDAS (más recientes primero):`);
  const last5Chrono = goodGames.slice(0, 5);
  for (let i = 0; i < last5Chrono.length; i++) {
    const g = last5Chrono[i];
    const bones = getBonePositions(g);
    const revealed = getRevealedInOrder(g);
    const grid = Array(25).fill("🐔");
    bones.forEach((b) => (grid[b - 1] = "💀"));
    
    console.log(`\n    Partida ${i + 1} (${g.createdAt.toISOString().slice(0, 19)}) - ${g.hitBone ? "PERDIDA" : "RETIRO tras " + g.cashOutPosition}:`);
    console.log(`    Huesos en: [${bones.join(", ")}]`);
    console.log(`    Orden revelado: ${revealed.map((r) => r.position + (r.isChicken ? "🐔" : "💀")).join(" → ")}`);
    
    // Grid visual
    for (let row = 0; row < 5; row++) {
      const rowStr = grid.slice(row * 5, row * 5 + 5).map((c, ci) => {
        const pos = row * 5 + ci + 1;
        const isRevealed = revealed.some((r) => r.position === pos);
        return `${String(pos).padStart(2)}${c}${isRevealed ? "*" : " "}`;
      }).join(" ");
      console.log(`    ${rowStr}`);
    }
  }

  // 7e. Últimas 10 partidas completas para patrones
  console.log(`\n  f) RESUMEN ÚLTIMAS 10 PARTIDAS - Mapa de huesos:`);
  console.log(`    ${"Pos".padStart(5)}  ${Array.from({length: 25}, (_, i) => String(i + 1).padStart(2)).join(" ")}`);
  
  for (let i = 0; i < Math.min(10, goodGames.length); i++) {
    const g = goodGames[i];
    const boneSet = new Set(getBonePositions(g));
    const row = Array.from({length: 25}, (_, j) => boneSet.has(j + 1) ? " X" : " .");
    console.log(`    P${String(i + 1).padStart(2)}:  ${row.join(" ")}`);
  }

  // ═══════════════════════════════════════════════════════
  // 8. DATOS EXPORTABLES PARA ML
  // ═══════════════════════════════════════════════════════
  console.log("\n" + "═".repeat(65));
  console.log("8. RESUMEN DE FEATURES ÚTILES PARA EL MODELO ML");
  console.log("═".repeat(65));

  const features = {
    totalPartidas: goodGames.length,
    posicionesMasPeligrosas_10: Object.entries(boneFreq10)
      .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([p, c]) => ({ pos: parseInt(p), count: c })),
    posicionesMasSeguras_10: Object.entries(chickenFreq10)
      .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([p, c]) => ({ pos: parseInt(p), count: c })),
    tasaInversionPromedio: {
      polloAHueso: `${((totalPolloAHueso / totalPosiciones) * 100).toFixed(2)}%`,
      huesoAPollo: `${((totalHuesoAPollo / totalPosiciones) * 100).toFixed(2)}%`,
    },
    promedioCambiosPorPartida: avgP2H.toFixed(1),
    paresHuesosFrecuentes: Object.entries(bonePairs)
      .sort((a, b) => b[1] - a[1]).slice(0, 5).map(([pair, count]) => ({ pair, count })),
    tasaRetiroExitoso: `${((cashOutGames.length / chrono.length) * 100).toFixed(1)}%`,
    huesesRepetidosPromedio: avgRepetidas.toFixed(2),
    posicionesVolatilesTop5: volatility.slice(0, 5).map((v) => ({ pos: v.pos, cambios: v.totalCambios })),
    posicionesEstablesTop5: volatility.slice(-5).map((v) => ({ pos: v.pos, cambios: v.totalCambios })),
  };

  console.log(JSON.stringify(features, null, 2));

  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
