import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const realGames = await prisma.chickenGame.count({
    where: { isSimulated: false }
  });
  const simulatedGames = await prisma.chickenGame.count({
    where: { isSimulated: true }
  });
  
  console.log(`Partidas Reales: ${realGames}`);
  console.log(`Partidas Simuladas: ${simulatedGames}`);
  
  const boneCounts = await prisma.chickenGame.groupBy({
    by: ['boneCount'],
    where: { isSimulated: false },
    _count: {
      _all: true
    }
  });
  
  console.log('Distribución por cantidad de huesos (Real):');
  boneCounts.forEach(bc => {
    console.log(`  - ${bc.boneCount} huesos: ${bc._count._all} partidas`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
