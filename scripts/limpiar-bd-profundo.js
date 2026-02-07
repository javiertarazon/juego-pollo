/**
 * LIMPIEZA DE BASE DE DATOS - Juego del Pollo
 * 
 * Elimina:
 * 1. TODAS las partidas simuladas (isSimulated=true) → no aportan realismo
 * 2. Partidas reales INCONSISTENTES (boneCount ≠ huesos reales en positions)
 * 3. Estadísticas de simulación (SimulationStats)
 * 4. ChickenPositionStats de simuladas
 * 5. RealBonePositions huérfanas
 * 
 * Conserva:
 * - Partidas reales con datos completos y consistentes
 * - Patrones, reportes de análisis, StreakState
 */

const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  console.log("╔══════════════════════════════════════════════════════════════════╗");
  console.log("║          LIMPIEZA DE BASE DE DATOS                              ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝");

  // ═══════════════════════════════════════════════════════
  // FASE 0: DIAGNÓSTICO PRE-LIMPIEZA
  // ═══════════════════════════════════════════════════════
  const totalGames = await p.chickenGame.count();
  const simGames = await p.chickenGame.count({ where: { isSimulated: true } });
  const realGames = await p.chickenGame.count({ where: { isSimulated: false } });
  const totalPositions = await p.chickenPosition.count();
  const simStats = await p.simulationStats.count();
  const posStats = await p.chickenPositionStats.count();
  const posStatsSim = await p.chickenPositionStats.count({ where: { isSimulated: true } });
  const posStatsReal = await p.chickenPositionStats.count({ where: { isSimulated: false } });
  const patterns = await p.chickenPattern.count();
  const reports = await p.analysisReport.count();

  let rbpCount = 0;
  try {
    const rbp = await p.$queryRawUnsafe("SELECT COUNT(*) as cnt FROM RealBonePositions");
    rbpCount = Number(rbp[0].cnt);
  } catch (e) {}

  console.log("\n=== ESTADO PRE-LIMPIEZA ===");
  console.log(`  ChickenGame total: ${totalGames}`);
  console.log(`    - Simuladas: ${simGames}`);
  console.log(`    - Reales: ${realGames}`);
  console.log(`  ChickenPosition total: ${totalPositions}`);
  console.log(`  ChickenPositionStats: ${posStats} (sim: ${posStatsSim}, real: ${posStatsReal})`);
  console.log(`  SimulationStats: ${simStats}`);
  console.log(`  ChickenPattern: ${patterns}`);
  console.log(`  AnalysisReport: ${reports}`);
  console.log(`  RealBonePositions: ${rbpCount}`);

  // ═══════════════════════════════════════════════════════
  // FASE 1: IDENTIFICAR PARTIDAS REALES INCONSISTENTES
  // ═══════════════════════════════════════════════════════
  console.log("\n--- Fase 1: Identificar partidas reales inconsistentes ---");

  const allRealGames = await p.chickenGame.findMany({
    where: { isSimulated: false },
    include: { positions: true },
  });

  const inconsistentIds = [];
  const consistentIds = [];

  for (const g of allRealGames) {
    const realBoneCount = g.positions.filter((pos) => !pos.isChicken).length;
    const hasAll25 = g.positions.length === 25;
    const boneCountMatches = realBoneCount === g.boneCount;
    const validBones = realBoneCount >= 3 && realBoneCount <= 5;

    if (hasAll25 && boneCountMatches && validBones) {
      consistentIds.push(g.id);
    } else {
      inconsistentIds.push(g.id);
    }
  }

  console.log(`  Partidas reales consistentes: ${consistentIds.length}`);
  console.log(`  Partidas reales INCONSISTENTES a eliminar: ${inconsistentIds.length}`);

  // ═══════════════════════════════════════════════════════
  // FASE 2: ELIMINAR SIMULADAS
  // ═══════════════════════════════════════════════════════
  console.log("\n--- Fase 2: Eliminar partidas simuladas ---");

  // Primero eliminar positions de simuladas (cascade debería funcionar pero por seguridad)
  const delSimPositions = await p.chickenPosition.deleteMany({
    where: {
      game: { isSimulated: true },
    },
  });
  console.log(`  ChickenPosition de simuladas eliminadas: ${delSimPositions.count}`);

  const delSimGames = await p.chickenGame.deleteMany({
    where: { isSimulated: true },
  });
  console.log(`  ChickenGame simuladas eliminadas: ${delSimGames.count}`);

  // ═══════════════════════════════════════════════════════
  // FASE 3: ELIMINAR REALES INCONSISTENTES
  // ═══════════════════════════════════════════════════════
  console.log("\n--- Fase 3: Eliminar partidas reales inconsistentes ---");

  if (inconsistentIds.length > 0) {
    // Eliminar positions de inconsistentes
    const delIncPositions = await p.chickenPosition.deleteMany({
      where: { gameId: { in: inconsistentIds } },
    });
    console.log(`  ChickenPosition de inconsistentes eliminadas: ${delIncPositions.count}`);

    // Eliminar los games inconsistentes
    const delIncGames = await p.chickenGame.deleteMany({
      where: { id: { in: inconsistentIds } },
    });
    console.log(`  ChickenGame inconsistentes eliminadas: ${delIncGames.count}`);

    // Eliminar RealBonePositions huérfanas de inconsistentes
    try {
      const placeholders = inconsistentIds.map(() => "?").join(",");
      await p.$executeRawUnsafe(
        `DELETE FROM RealBonePositions WHERE gameId IN (${placeholders})`,
        ...inconsistentIds
      );
      console.log(`  RealBonePositions de inconsistentes limpiadas`);
    } catch (e) {
      console.log(`  RealBonePositions: ${e.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════
  // FASE 4: ELIMINAR DATOS DE SIMULACIÓN
  // ═══════════════════════════════════════════════════════
  console.log("\n--- Fase 4: Eliminar estadísticas de simulación ---");

  const delSimStats = await p.simulationStats.deleteMany({});
  console.log(`  SimulationStats eliminadas: ${delSimStats.count}`);

  const delSimPosStats = await p.chickenPositionStats.deleteMany({
    where: { isSimulated: true },
  });
  console.log(`  ChickenPositionStats simuladas eliminadas: ${delSimPosStats.count}`);

  // ═══════════════════════════════════════════════════════
  // FASE 5: LIMPIAR REALBONEPOSITIONS HUÉRFANAS  
  // ═══════════════════════════════════════════════════════
  console.log("\n--- Fase 5: Limpiar RealBonePositions huérfanas ---");

  try {
    // Eliminar RealBonePositions que no tengan un ChickenGame correspondiente
    const validGameIds = consistentIds.map((id) => `'${id}'`).join(",");
    const delOrphan = await p.$executeRawUnsafe(
      `DELETE FROM RealBonePositions WHERE gameId NOT IN (${validGameIds})`
    );
    console.log(`  RealBonePositions huérfanas eliminadas`);
  } catch (e) {
    console.log(`  RealBonePositions limpieza: ${e.message}`);
  }

  // ═══════════════════════════════════════════════════════
  // FASE 6: RECALCULAR ChickenPositionStats para datos limpios
  // ═══════════════════════════════════════════════════════
  console.log("\n--- Fase 6: Recalcular estadísticas de posición ---");

  // Eliminar stats reales antiguas y recalcular
  await p.chickenPositionStats.deleteMany({ where: { isSimulated: false } });

  const cleanGames = await p.chickenGame.findMany({
    where: { isSimulated: false },
    include: { positions: true },
  });

  const posStatsMap = {};
  for (let pos = 1; pos <= 25; pos++) {
    posStatsMap[pos] = { chicken: 0, bone: 0, total: 0 };
  }

  for (const g of cleanGames) {
    for (const pos of g.positions) {
      posStatsMap[pos.position].total++;
      if (pos.isChicken) {
        posStatsMap[pos.position].chicken++;
      } else {
        posStatsMap[pos.position].bone++;
      }
    }
  }

  for (let pos = 1; pos <= 25; pos++) {
    const s = posStatsMap[pos];
    await p.chickenPositionStats.create({
      data: {
        position: pos,
        totalGames: s.total,
        chickenCount: s.chicken,
        boneCount: s.bone,
        winRate: s.total > 0 ? s.chicken / s.total : 0,
        isSimulated: false,
      },
    });
  }
  console.log(`  Estadísticas recalculadas para 25 posiciones con ${cleanGames.length} partidas`);

  // ═══════════════════════════════════════════════════════
  // FASE 7: LIMPIAR PATRONES ANTIGUOS (opcional: recalcular)
  // ═══════════════════════════════════════════════════════
  console.log("\n--- Fase 7: Limpiar patrones antiguos ---");
  const delPatterns = await p.chickenPattern.deleteMany({});
  console.log(`  Patrones eliminados: ${delPatterns.count} (se recalcularán con datos limpios)`);

  // ═══════════════════════════════════════════════════════
  // FASE 8: DIAGNÓSTICO POST-LIMPIEZA
  // ═══════════════════════════════════════════════════════
  const postGames = await p.chickenGame.count();
  const postReal = await p.chickenGame.count({ where: { isSimulated: false } });
  const postSim = await p.chickenGame.count({ where: { isSimulated: true } });
  const postPositions = await p.chickenPosition.count();
  const postPosStats = await p.chickenPositionStats.count();
  const postSimStats = await p.simulationStats.count();
  const postPatterns = await p.chickenPattern.count();

  let postRbp = 0;
  try {
    const r = await p.$queryRawUnsafe("SELECT COUNT(*) as cnt FROM RealBonePositions");
    postRbp = Number(r[0].cnt);
  } catch (e) {}

  console.log("\n╔══════════════════════════════════════════════════════════════════╗");
  console.log("║          RESULTADO POST-LIMPIEZA                                ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝");
  console.log(`  ChickenGame: ${postGames} (reales: ${postReal}, sim: ${postSim})`);
  console.log(`  ChickenPosition: ${postPositions} (${postPositions / 25} × 25)`);
  console.log(`  ChickenPositionStats: ${postPosStats}`);
  console.log(`  SimulationStats: ${postSimStats}`);
  console.log(`  ChickenPattern: ${postPatterns}`);
  console.log(`  RealBonePositions: ${postRbp}`);

  // Verificar todas las partidas restantes son consistentes
  const finalCheck = await p.chickenGame.findMany({
    where: { isSimulated: false },
    include: { positions: true },
  });
  let allOk = true;
  for (const g of finalCheck) {
    const bones = g.positions.filter((p) => !p.isChicken).length;
    if (g.positions.length !== 25 || bones !== g.boneCount) {
      console.log(`  ⚠ Partida ${g.id} aún inconsistente: positions=${g.positions.length}, bones=${bones}, boneCount=${g.boneCount}`);
      allOk = false;
    }
  }
  if (allOk) {
    console.log(`\n  ✅ TODAS las ${finalCheck.length} partidas restantes son CONSISTENTES`);
    console.log(`     Cada una tiene 25 posiciones y boneCount coincide con huesos reales`);
  }

  // VACUUM para reducir tamaño
  console.log("\n--- Compactando base de datos (VACUUM) ---");
  await p.$executeRawUnsafe("VACUUM");
  console.log("  ✅ Base de datos compactada");

  await p.$disconnect();
  console.log("\n🎉 Limpieza completada exitosamente.");
})().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
