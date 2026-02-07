const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  // 1. Tablas
  const tables = await p.$queryRawUnsafe(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  );
  console.log("=== TABLAS ===");
  tables.forEach((t) => console.log(" -", t.name));

  // 2. Conteo partidas reales vs simuladas
  const realCount = await p.chickenGame.count({ where: { isSimulated: false } });
  const simCount = await p.chickenGame.count({ where: { isSimulated: true } });
  console.log("\n=== CONTEO PARTIDAS ===");
  console.log("Reales:", realCount, "| Simuladas:", simCount);

  // 3. Últimas 15 partidas reales con posiciones
  const games = await p.chickenGame.findMany({
    where: { isSimulated: false },
    include: { positions: { orderBy: { position: "asc" } } },
    orderBy: { createdAt: "desc" },
    take: 15,
  });

  console.log("\n=== ULTIMAS 15 PARTIDAS REALES ===");
  for (const g of games) {
    const bones = g.positions.filter((p) => !p.isChicken).map((p) => p.position).sort((a, b) => a - b);
    const chickens = g.positions.filter((p) => p.isChicken).map((p) => p.position).sort((a, b) => a - b);
    const revealed = g.positions.filter((p) => p.revealed).sort((a, b) => a.revealOrder - b.revealOrder);
    const revChickens = revealed.filter((p) => p.isChicken).map((p) => p.position);
    const revBones = revealed.filter((p) => !p.isChicken).map((p) => p.position);
    console.log(
      "Partida:",
      g.id.slice(0, 8),
      "| Fecha:",
      g.createdAt.toISOString().slice(0, 19)
    );
    console.log(
      "  Huesos(" + g.boneCount + "):",
      bones.join(","),
      "| Pollos(" + chickens.length + "):",
      chickens.join(",")
    );
    console.log("  Total posiciones:", g.positions.length, "| Reveladas:", revealed.length);
    console.log("  RevChickens:", revChickens.join(","), "| RevBones:", revBones.join(","));
    console.log(
      "  HitBone:",
      g.hitBone,
      "| CashOut:",
      g.cashOutPosition,
      "| Modo:",
      g.modoJuego
    );
    console.log("");
  }

  // 4. RealBonePositions
  try {
    const rbCount = await p.$queryRawUnsafe(
      "SELECT COUNT(*) as cnt FROM RealBonePositions"
    );
    console.log("=== REAL BONE POSITIONS ===");
    console.log("Total registros:", rbCount[0].cnt);
    const rbSample = await p.$queryRawUnsafe(
      "SELECT * FROM RealBonePositions ORDER BY rowid DESC LIMIT 10"
    );
    rbSample.forEach((r) =>
      console.log(
        "  GameId:",
        (r.gameId || "").slice(0, 8),
        "| Posiciones:",
        r.posiciones
      )
    );
  } catch (e) {
    console.log("RealBonePositions: no existe o error -", e.message);
  }

  // 5. Posiciones con estadísticas
  const stats = await p.chickenPositionStats.findMany({
    where: { isSimulated: false },
    orderBy: { position: "asc" },
  });
  console.log("\n=== STATS POR POSICION (reales) ===");
  stats.forEach((s) =>
    console.log(
      "  Pos",
      s.position,
      "| Chicken:",
      s.chickenCount,
      "| Bone:",
      s.boneCount,
      "| WinRate:",
      (s.winRate * 100).toFixed(1) + "%"
    )
  );

  // 6. Verificar integridad: partidas sin 25 posiciones
  const allGames = await p.chickenGame.findMany({
    where: { isSimulated: false },
    include: { positions: true },
  });
  const badGames = allGames.filter((g) => g.positions.length !== 25);
  console.log("\n=== INTEGRIDAD ===");
  console.log("Total partidas reales:", allGames.length);
  console.log(
    "Partidas sin 25 posiciones exactas:",
    badGames.length,
    badGames.length > 0
      ? badGames.map((g) => g.id.slice(0, 8) + "(" + g.positions.length + ")").join(", ")
      : ""
  );

  // Partidas donde boneCount no coincide con huesos reales en positions
  const mismatchBones = allGames.filter((g) => {
    const bonePositions = g.positions.filter((p) => !p.isChicken).length;
    return bonePositions !== g.boneCount;
  });
  console.log(
    "Partidas con boneCount inconsistente:",
    mismatchBones.length,
    mismatchBones.length > 0
      ? mismatchBones.map((g) => g.id.slice(0, 8)).join(", ")
      : ""
  );

  // 7. Patrones guardados
  const patterns = await p.chickenPattern.findMany({
    orderBy: { frequency: "desc" },
    take: 10,
  });
  console.log("\n=== TOP 10 PATRONES GUARDADOS ===");
  patterns.forEach((pat) =>
    console.log(
      "  Pattern:",
      pat.pattern.slice(0, 30),
      "| Freq:",
      pat.frequency,
      "| Success:",
      (pat.successRate * 100).toFixed(1) + "%"
    )
  );

  // 8. AnalysisReport recientes
  const reports = await p.analysisReport.findMany({
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  console.log("\n=== ULTIMOS REPORTES DE ANALISIS ===");
  reports.forEach((r) =>
    console.log(
      "  Fecha:",
      r.createdAt.toISOString().slice(0, 19),
      "| Partidas:",
      r.partidasAnalizadas,
      "| TasaAcierto:",
      (r.tasaAcierto * 100).toFixed(1) + "%",
      "| TasaExito:",
      (r.tasaExito * 100).toFixed(1) + "%"
    )
  );

  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
