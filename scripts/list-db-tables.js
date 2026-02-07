const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const tables = await prisma.$queryRawUnsafe(
    "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
  );
  console.log(tables);
})()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
