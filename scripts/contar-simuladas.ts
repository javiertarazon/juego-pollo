import { db } from './src/lib/db';

async function contarSimuladas() {
  try {
    const count = await db.chickenGame.count({
      where: { isSimulated: true }
    });
    console.log('\n✅ Partidas simuladas generadas:', count);
    
    const countReal = await db.chickenGame.count({
      where: { isSimulated: false }
    });
    console.log('✅ Partidas reales:', countReal);
    console.log('✅ Total:', count + countReal);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.$disconnect();
  }
}

contarSimuladas();
