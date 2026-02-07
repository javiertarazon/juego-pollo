const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

(async () => {
  // Investigar la inconsistencia: ¿qué boneCount tienen vs cuántos huesos reales?
  const games = await p.chickenGame.findMany({
    where: { isSimulated: false },
    include: { positions: { orderBy: { position: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  let consistent = 0;
  let inconsistent = 0;
  const inconsistentDetails = {};

  for (const g of games) {
    const realBones = g.positions.filter((p) => !p.isChicken).length;
    if (realBones === g.boneCount) {
      consistent++;
    } else {
      inconsistent++;
      const key = `declared=${g.boneCount}_real=${realBones}`;
      if (!inconsistentDetails[key]) inconsistentDetails[key] = 0;
      inconsistentDetails[key]++;
    }
  }

  console.log("=== ANALISIS INCONSISTENCIA boneCount ===");
  console.log("Consistentes:", consistent);
  console.log("Inconsistentes:", inconsistent);
  console.log("Detalle:");
  Object.entries(inconsistentDetails)
    .sort((a, b) => b[1] - a[1])
    .forEach(([key, count]) => console.log("  ", key, "→", count, "partidas"));

  // Primeras 5 inconsistentes para ver detalles
  const badExamples = games
    .filter((g) => {
      const realBones = g.positions.filter((p) => !p.isChicken).length;
      return realBones !== g.boneCount;
    })
    .slice(0, 5);

  console.log("\nEjemplos de partidas inconsistentes:");
  for (const g of badExamples) {
    const bones = g.positions.filter((p) => !p.isChicken).map((p) => p.position);
    const chickens = g.positions.filter((p) => p.isChicken).map((p) => p.position);
    console.log(
      "  ID:",
      g.id.slice(0, 12),
      "| Declared boneCount:",
      g.boneCount,
      "| Real bones:",
      bones.length,
      "| Bones:",
      bones.sort((a, b) => a - b).join(","),
      "| Date:",
      g.createdAt.toISOString().slice(0, 19)
    );
  }

  // ¿Las últimas 50 partidas están bien?
  const last50 = games.slice(-50);
  const last50bad = last50.filter((g) => {
    return g.positions.filter((p) => !p.isChicken).length !== g.boneCount;
  });
  console.log("\n=== ULTIMAS 50 PARTIDAS ===");
  console.log("Consistentes:", 50 - last50bad.length, "| Inconsistentes:", last50bad.length);

  // ¿Las últimas 150 partidas están bien? (las que no son batch importadas)
  const last150 = games.slice(-150);
  const last150bad = last150.filter((g) => {
    return g.positions.filter((p) => !p.isChicken).length !== g.boneCount;
  });
  console.log("Últimas 150: Consistentes:", 150 - last150bad.length, "| Inconsistentes:", last150bad.length);

  // Verificar RealBonePositions vs ChickenPosition bones
  const gameIds = games.map((g) => `'${g.id}'`).join(",");
  let realBoneRows = [];
  try {
    realBoneRows = await p.$queryRawUnsafe(
      `SELECT gameId, posiciones FROM RealBonePositions`
    );
  } catch (e) {}
  
  const rbMap = new Map();
  realBoneRows.forEach((r) => {
    let pos;
    try { pos = JSON.parse(r.posiciones); } catch { pos = []; }
    rbMap.set(r.gameId, pos.map(Number).sort((a, b) => a - b));
  });

  let rbMatch = 0;
  let rbMismatch = 0;
  let rbMissing = 0;
  
  for (const g of games) {
    const bonesFromPositions = g.positions
      .filter((p) => !p.isChicken)
      .map((p) => p.position)
      .sort((a, b) => a - b);
    
    const rbBones = rbMap.get(g.id);
    if (!rbBones) {
      rbMissing++;
    } else if (rbBones.join(",") === bonesFromPositions.join(",")) {
      rbMatch++;
    } else {
      rbMismatch++;
    }
  }

  console.log("\n=== REALBONE vs POSITIONS ===");
  console.log("Coinciden:", rbMatch, "| No coinciden:", rbMismatch, "| Sin RealBone:", rbMissing);

  await p.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
