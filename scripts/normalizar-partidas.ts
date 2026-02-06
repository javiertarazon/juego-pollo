import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const updatedGames = await prisma.$executeRaw`
    UPDATE ChickenGame
    SET cashOutPosition = COALESCE(cashOutPosition, 0),
        multiplier = COALESCE(multiplier, 0),
        objetivo = COALESCE(objetivo, 0),
        modoJuego = COALESCE(modoJuego, 'desconocido'),
        streakStateId = COALESCE(streakStateId, 'default')
  `;

  const updatedPositions = await prisma.$executeRaw`
    UPDATE ChickenPosition
    SET revealOrder = COALESCE(revealOrder, 0)
  `;

  console.log('✅ Normalización completada');
  console.log(`- ChickenGame actualizadas: ${updatedGames}`);
  console.log(`- ChickenPosition actualizadas: ${updatedPositions}`);
}

main()
  .catch((error) => {
    console.error('❌ Error normalizando:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
