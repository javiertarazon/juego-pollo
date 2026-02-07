const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const cols = await prisma.$queryRawUnsafe(
    "PRAGMA table_info('RealBonePositions')"
  );
  console.log(cols);
})()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
