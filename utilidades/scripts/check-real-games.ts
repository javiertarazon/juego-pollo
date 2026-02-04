import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRealGames() {
  try {
    const totalGames = await prisma.chickenGame.count();
    const realGames = await prisma.chickenGame.count({
      where: { isSimulated: false }
    });
    const simulatedGames = await prisma.chickenGame.count({
      where: { isSimulated: true }
    });
    
    console.log('📊 Análisis de Juegos:');
    console.log('================================');
    console.log(`Total de Juegos: ${totalGames}`);
    console.log(`Juegos Reales: ${realGames}`);
    console.log(`Juegos Simulados: ${simulatedGames}`);
    console.log(`Porcentaje Real: ${((realGames / totalGames) * 100).toFixed(2)}%`);
    
    if (realGames > 0) {
      const realGamesSample = await prisma.chickenGame.findMany({
        where: { isSimulated: false },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          positions: {
            where: { isChicken: false },
            select: { position: true }
          }
        }
      });
      
      console.log('\n🎮 Muestra de Juegos Reales:');
      realGamesSample.forEach((game, idx) => {
        const bonePositions = game.positions.map(p => p.position).sort((a, b) => a - b);
        console.log(`${idx + 1}. Bones: ${game.boneCount}, Posiciones de huesos: [${bonePositions.join(', ')}], Revealed: ${game.revealedCount}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRealGames();
