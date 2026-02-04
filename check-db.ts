import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    const totalGames = await prisma.chickenGame.count();
    const totalPositions = await prisma.chickenPosition.count();
    const totalStats = await prisma.chickenPositionStats.count();
    const totalPatterns = await prisma.chickenPattern.count();
    
    console.log('📊 Estado de la Base de Datos:');
    console.log('================================');
    console.log(`Total de Juegos: ${totalGames}`);
    console.log(`Total de Posiciones: ${totalPositions}`);
    console.log(`Total de Estadísticas: ${totalStats}`);
    console.log(`Total de Patrones: ${totalPatterns}`);
    
    if (totalGames > 0) {
      const recentGames = await prisma.chickenGame.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          positions: true,
        },
      });
      
      console.log('\n🎮 Últimos 5 Juegos:');
      recentGames.forEach((game, idx) => {
        console.log(`${idx + 1}. ID: ${game.id}, Bones: ${game.boneCount}, Revealed: ${game.revealedCount}, Hit Bone: ${game.hitBone}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error al verificar la base de datos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();
