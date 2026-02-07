/**
 * EXPORTACIÓN DE DATOS AVANZADOS PARA ML PYTHON
 * 
 * Genera archivos JSON con features y patrones descubiertos
 * que el modelo Python puede consumir directamente para:
 * - Nuevas features de entrenamiento
 * - Datos de transición entre partidas
 * - Estadísticas de retiro y resultado
 * - Patrones recurrentes detectados
 */

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const p = new PrismaClient();

function getBones(game) {
  return game.positions.filter((p) => !p.isChicken).map((p) => p.position).sort((a, b) => a - b);
}

function getChickens(game) {
  return game.positions.filter((p) => p.isChicken).map((p) => p.position).sort((a, b) => a - b);
}

function getRevealed(game) {
  return game.positions
    .filter((p) => p.revealed && p.revealOrder > 0)
    .sort((a, b) => a.revealOrder - b.revealOrder);
}

(async () => {
  const games = await p.chickenGame.findMany({
    where: { isSimulated: false },
    include: { positions: { orderBy: { position: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Cargadas ${games.length} partidas reales consistentes`);

  // ═══════════════════════════════════════════════════════
  // 1. DATASET PRINCIPAL: Matriz de huesos + metadata
  // ═══════════════════════════════════════════════════════
  const mainDataset = games.map((g, idx) => {
    const bones = getBones(g);
    const revealed = getRevealed(g);
    const revChickens = revealed.filter((r) => r.isChicken).map((r) => r.position);
    const revBones = revealed.filter((r) => !r.isChicken).map((r) => r.position);

    // Mapa binario 25 posiciones: 1=hueso, 0=pollo
    const boneMap = Array(25).fill(0);
    bones.forEach((b) => (boneMap[b - 1] = 1));

    return {
      game_index: idx,
      game_id: g.id,
      created_at: g.createdAt.toISOString(),
      bone_count: g.boneCount,
      bone_positions: bones,
      bone_map: boneMap,
      hit_bone: g.hitBone,
      cash_out_position: g.cashOutPosition,
      multiplier: g.multiplier,
      modo_juego: g.modoJuego,
      revealed_count: revealed.length,
      revealed_chickens: revChickens,
      revealed_bones: revBones,
      reveal_order: revealed.map((r) => ({
        position: r.position,
        is_chicken: r.isChicken,
        order: r.revealOrder,
      })),
    };
  });

  // ═══════════════════════════════════════════════════════
  // 2. FEATURES DE TRANSICIÓN ENTRE PARTIDAS
  // ═══════════════════════════════════════════════════════
  const transitions = [];
  for (let i = 1; i < games.length; i++) {
    const prev = games[i - 1];
    const curr = games[i];
    const prevBones = new Set(getBones(prev));
    const currBones = new Set(getBones(curr));

    const stayed_bone = [...currBones].filter((b) => prevBones.has(b));
    const new_bone = [...currBones].filter((b) => !prevBones.has(b));
    const removed_bone = [...prevBones].filter((b) => !currBones.has(b));

    // Transiciones por posición
    const per_position = [];
    for (let pos = 1; pos <= 25; pos++) {
      const wasBone = prevBones.has(pos);
      const isBone = currBones.has(pos);
      per_position.push({
        position: pos,
        was_bone: wasBone,
        is_bone: isBone,
        transition: wasBone && isBone ? "BB" : wasBone && !isBone ? "BC" : !wasBone && isBone ? "CB" : "CC",
      });
    }

    transitions.push({
      from_game_index: i - 1,
      to_game_index: i,
      stayed_bone: stayed_bone,
      new_bone: new_bone,
      removed_bone: removed_bone,
      n_stayed: stayed_bone.length,
      n_new: new_bone.length,
      n_removed: removed_bone.length,
      hamming_distance: new_bone.length + removed_bone.length,
      per_position: per_position,
    });
  }

  // ═══════════════════════════════════════════════════════
  // 3. ESTADÍSTICAS ACUMULADAS DE POSICIÓN
  // ═══════════════════════════════════════════════════════
  const positionStats = [];
  for (let pos = 1; pos <= 25; pos++) {
    const boneGames = [];
    const chickenGames = [];
    const rachas = []; // rachas consecutivas sin hueso
    let currentStreak = 0;

    for (let i = 0; i < games.length; i++) {
      const isBone = getBones(games[i]).includes(pos);
      if (isBone) {
        boneGames.push(i);
        if (currentStreak > 0) rachas.push(currentStreak);
        currentStreak = 0;
      } else {
        chickenGames.push(i);
        currentStreak++;
      }
    }
    if (currentStreak > 0) rachas.push(currentStreak);

    // Transiciones para esta posición
    let bb = 0, bc = 0, cb = 0, cc = 0;
    for (let i = 1; i < games.length; i++) {
      const wasBone = getBones(games[i - 1]).includes(pos);
      const isBone = getBones(games[i]).includes(pos);
      if (wasBone && isBone) bb++;
      else if (wasBone && !isBone) bc++;
      else if (!wasBone && isBone) cb++;
      else cc++;
    }
    const totalTrans = games.length - 1;

    positionStats.push({
      position: pos,
      total_bone: boneGames.length,
      total_chicken: chickenGames.length,
      bone_rate: boneGames.length / games.length,
      // Frecuencias en ventanas
      bone_rate_last_5: getBoneRateLastN(games, pos, 5),
      bone_rate_last_10: getBoneRateLastN(games, pos, 10),
      bone_rate_last_20: getBoneRateLastN(games, pos, 20),
      // Rachas
      avg_streak_no_bone: rachas.length > 0 ? rachas.reduce((s, r) => s + r, 0) / rachas.length : games.length,
      max_streak_no_bone: rachas.length > 0 ? Math.max(...rachas) : games.length,
      current_streak_no_bone: currentStreak,
      // Transiciones
      p_bone_given_bone: bb / Math.max(bb + bc, 1),
      p_bone_given_chicken: cb / Math.max(cb + cc, 1),
      p_change: (bc + cb) / totalTrans,
      p_stay: (bb + cc) / totalTrans,
      transition_counts: { bb, bc, cb, cc },
    });
  }

  function getBoneRateLastN(games, pos, n) {
    const last = games.slice(-n);
    return last.filter((g) => getBones(g).includes(pos)).length / last.length;
  }

  // ═══════════════════════════════════════════════════════
  // 4. PATRONES DE PARES Y GRUPOS DE HUESOS
  // ═══════════════════════════════════════════════════════
  const pairFreq = {};
  const tripleFreq = {};
  for (const g of games) {
    const bones = getBones(g);
    // Pares
    for (let i = 0; i < bones.length; i++) {
      for (let j = i + 1; j < bones.length; j++) {
        const key = `${bones[i]}-${bones[j]}`;
        pairFreq[key] = (pairFreq[key] || 0) + 1;
      }
    }
    // Triples
    for (let i = 0; i < bones.length; i++) {
      for (let j = i + 1; j < bones.length; j++) {
        for (let k = j + 1; k < bones.length; k++) {
          const key = `${bones[i]}-${bones[j]}-${bones[k]}`;
          tripleFreq[key] = (tripleFreq[key] || 0) + 1;
        }
      }
    }
  }

  const topPairs = Object.entries(pairFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([pair, count]) => ({ pair, count, rate: count / games.length }));

  const topTriples = Object.entries(tripleFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([triple, count]) => ({ triple, count, rate: count / games.length }));

  // ═══════════════════════════════════════════════════════
  // 5. DATOS DE RETIRO (CASH OUT)
  // ═══════════════════════════════════════════════════════
  const cashOutAnalysis = [];
  for (const g of games) {
    if (g.cashOutPosition <= 0) continue;
    const revealed = getRevealed(g);
    const revealedSet = new Set(revealed.map((r) => r.position));
    const unrevealed = g.positions.filter((pos) => !revealedSet.has(pos.position));
    const unrevBones = unrevealed.filter((pos) => !pos.isChicken).length;
    const unrevChickens = unrevealed.filter((pos) => pos.isChicken).length;

    cashOutAnalysis.push({
      game_index: games.indexOf(g),
      cash_out_after: g.cashOutPosition,
      hit_bone: g.hitBone,
      revealed_chickens: revealed.filter((r) => r.isChicken).map((r) => r.position),
      revealed_bones: revealed.filter((r) => !r.isChicken).map((r) => r.position),
      unrevealed_bones: unrevBones,
      unrevealed_chickens: unrevChickens,
      prob_next_bone: unrevBones / Math.max(unrevBones + unrevChickens, 1),
    });
  }

  // ═══════════════════════════════════════════════════════
  // 6. SECUENCIAS TEMPORALES (ventanas para LSTM)
  // ═══════════════════════════════════════════════════════
  const sequences = [];
  const windowSize = 10;
  for (let i = windowSize; i < games.length; i++) {
    const window = games.slice(i - windowSize, i).map((g) => {
      const boneMap = Array(25).fill(0);
      getBones(g).forEach((b) => (boneMap[b - 1] = 1));
      return boneMap;
    });
    const target = Array(25).fill(0);
    getBones(games[i]).forEach((b) => (target[b - 1] = 1));

    sequences.push({
      target_game_index: i,
      input_window: window, // 10 × 25
      target: target, // 25
    });
  }

  // ═══════════════════════════════════════════════════════
  // EXPORTAR TODO
  // ═══════════════════════════════════════════════════════
  const outputDir = path.join(__dirname, "..", "ml-python", "data");
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const exports = {
    "games_clean.json": mainDataset,
    "transitions.json": transitions,
    "position_stats.json": positionStats,
    "bone_patterns.json": { top_pairs: topPairs, top_triples: topTriples },
    "cash_out_analysis.json": cashOutAnalysis,
    "lstm_sequences.json": sequences,
  };

  for (const [filename, data] of Object.entries(exports)) {
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    const size = (fs.statSync(filepath).size / 1024).toFixed(1);
    console.log(`  ✅ ${filename} → ${size} KB`);
  }

  // Resumen
  console.log("\n╔══════════════════════════════════════════════════════════════════╗");
  console.log("║          EXPORTACIÓN COMPLETADA                                 ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝");
  console.log(`  Partidas exportadas: ${mainDataset.length}`);
  console.log(`  Transiciones: ${transitions.length}`);
  console.log(`  Stats por posición: ${positionStats.length}`);
  console.log(`  Pares frecuentes: ${topPairs.length}`);
  console.log(`  Triples frecuentes: ${topTriples.length}`);
  console.log(`  Análisis cash-out: ${cashOutAnalysis.length}`);
  console.log(`  Secuencias LSTM (ventana ${windowSize}): ${sequences.length}`);
  console.log(`  Directorio: ${outputDir}`);

  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
