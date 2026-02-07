const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function parsePositions(text) {
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed.map(Number).filter((n) => n >= 1 && n <= 25);
    return [];
  } catch {
    return String(text)
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n) && n >= 1 && n <= 25);
  }
}

(async () => {
  const games = await prisma.chickenGame.findMany({
    where: { isSimulated: false },
    include: { positions: { orderBy: { revealOrder: "asc" } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  if (!games.length) {
    console.log("No hay partidas reales");
    return;
  }

  const gameIds = games.map((g) => `'${g.id}'`).join(",");
  const realBonesRows = await prisma.$queryRawUnsafe(
    `SELECT gameId, posiciones FROM RealBonePositions WHERE gameId IN (${gameIds})`
  );
  const realMap = new Map();
  realBonesRows.forEach((r) => realMap.set(r.gameId, parsePositions(r.posiciones)));

  const results = games.map((g) => {
    const positions = g.positions || [];
    const revealed = positions.filter((p) => p.revealed && p.revealOrder > 0);
    const revealedChickens = revealed.filter((p) => p.isChicken).map((p) => p.position);
    const revealedBones = revealed.filter((p) => !p.isChicken).map((p) => p.position);

    const allBones = positions.filter((p) => !p.isChicken).map((p) => p.position).sort((a, b) => a - b);
    const realBones = (realMap.get(g.id) || []).slice().sort((a, b) => a - b);

    const allChickens = positions.filter((p) => p.isChicken).map((p) => p.position).sort((a, b) => a - b);

    const unrevealedChickens = allChickens.filter((p) => !revealedChickens.includes(p));

    return {
      id: g.id,
      createdAt: g.createdAt,
      boneCount: g.boneCount,
      revealedCount: g.revealedCount,
      hitBone: g.hitBone,
      cashOutPosition: g.cashOutPosition,
      dataQuality: {
        positionsCount: positions.length,
        chickenCount: allChickens.length,
        boneCountInPositions: allBones.length,
        realBonesCount: realBones.length,
        realBonesMatchPositions: realBones.length > 0 ? (realBones.join(",") === allBones.join(",")) : false,
      },
      revealed: {
        total: revealed.length,
        chickens: revealedChickens,
        bones: revealedBones,
        revealOrder: revealed.map((p) => ({ pos: p.position, isChicken: p.isChicken, order: p.revealOrder })),
      },
      bones: {
        fromPositions: allBones,
        fromRealBonePositions: realBones,
      },
      chickens: {
        all: allChickens,
        unrevealed: unrevealedChickens,
      },
    };
  });

  console.log(JSON.stringify({ totalGames: results.length, games: results }, null, 2));
})()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
