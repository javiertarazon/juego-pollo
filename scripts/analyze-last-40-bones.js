const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function safeParsePositions(text) {
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.map(Number).filter((n) => n >= 1 && n <= 25);
    return [];
  } catch {
    // Soporte para strings tipo "1,2,3,4"
    return String(text)
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n) && n >= 1 && n <= 25);
  }
}

(async () => {
  const games = await prisma.chickenGame.findMany({
    where: { isSimulated: false },
    include: { positions: true },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  if (!games.length) {
    console.log("No hay partidas reales");
    return;
  }

  const gameIds = games.map((g) => `'${g.id}'`).join(",");
  const realBones = await prisma.$queryRawUnsafe(
    `SELECT gameId, posiciones FROM RealBonePositions WHERE gameId IN (${gameIds})`
  );

  const realMap = new Map();
  realBones.forEach((r) => {
    realMap.set(r.gameId, safeParsePositions(r.posiciones));
  });

  const issues = {
    missingRealBonePositions: [],
    realBoneCountMismatch: [],
    chickenPositionBoneMismatch: [],
  };

  games.forEach((g) => {
    const positions = g.positions || [];
    const bonesFromPositions = positions.filter((p) => !p.isChicken).map((p) => p.position).sort((a, b) => a - b);
    const realBones = realMap.get(g.id) || [];
    const realSorted = [...realBones].sort((a, b) => a - b);

    if (!realMap.has(g.id)) {
      issues.missingRealBonePositions.push({ id: g.id, boneCount: g.boneCount });
    } else if (realBones.length !== g.boneCount) {
      issues.realBoneCountMismatch.push({ id: g.id, boneCount: g.boneCount, realCount: realBones.length, realBones: realSorted });
    }

    // Si hay datos reales, comparar con ChickenPosition
    if (realBones.length > 0) {
      const mismatch = realSorted.join(",") !== bonesFromPositions.join(",");
      if (mismatch) {
        issues.chickenPositionBoneMismatch.push({
          id: g.id,
          boneCount: g.boneCount,
          chickenPositionBones: bonesFromPositions,
          realBones: realSorted,
        });
      }
    }
  });

  console.log(
    JSON.stringify(
      {
        totalGames: games.length,
        realBonePositionsFound: realMap.size,
        issues,
      },
      null,
      2
    )
  );
})()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
