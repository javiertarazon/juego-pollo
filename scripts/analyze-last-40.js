const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

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

  let mismatches = [];
  let incomplete = [];
  let win = 0;
  let loss = 0;
  let totalPositions = 0;
  const boneFreq = Array(26).fill(0);
  const chickenFreq = Array(26).fill(0);
  const totalByPos = Array(26).fill(0);
  const patternCounts = new Map();

  games.forEach((g) => {
    const positions = g.positions || [];
    totalPositions += positions.length;
    const bones = positions.filter((p) => !p.isChicken);

    if (g.hitBone) loss++;
    else win++;

    if (positions.length !== 25) {
      incomplete.push({
        id: g.id,
        positions: positions.length,
        boneCount: g.boneCount,
        revealedCount: g.revealedCount,
      });
    }

    if (g.boneCount !== bones.length) {
      mismatches.push({
        id: g.id,
        boneCount: g.boneCount,
        bonesRecorded: bones.length,
        positions: positions.length,
      });
    }

    positions.forEach((p) => {
      if (p.position >= 1 && p.position <= 25) {
        totalByPos[p.position]++;
        if (p.isChicken) chickenFreq[p.position]++;
        else boneFreq[p.position]++;
      }
    });

    const boneSet = bones
      .map((b) => b.position)
      .sort((a, b) => a - b)
      .join(",");

    if (boneSet) {
      patternCounts.set(boneSet, (patternCounts.get(boneSet) || 0) + 1);
    }
  });

  const safe = Array.from({ length: 25 }, (_, i) => i + 1)
    .map((pos) => ({
      pos,
      total: totalByPos[pos],
      chicken: chickenFreq[pos],
      bone: boneFreq[pos],
      chickenRate: totalByPos[pos] ? chickenFreq[pos] / totalByPos[pos] : 0,
      boneRate: totalByPos[pos] ? boneFreq[pos] / totalByPos[pos] : 0,
    }))
    .sort((a, b) => b.chickenRate - a.chickenRate);

  const danger = [...safe].sort((a, b) => b.boneRate - a.boneRate);

  const topPatterns = [...patternCounts.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  console.log(
    JSON.stringify(
      {
        totalGames: games.length,
        wins: win,
        losses: loss,
        winRate: win / (win + loss),
        dataCompleteness: {
          incompleteGames: incomplete.length,
          boneCountMismatches: mismatches.length,
          avgPositionsPerGame: totalPositions / games.length,
        },
        issues: { incomplete, mismatches },
        topSafe: safe.slice(0, 5),
        topDanger: danger.slice(0, 5),
        repeatedBonePatterns: topPatterns,
      },
      null,
      2
    )
  );
})()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
