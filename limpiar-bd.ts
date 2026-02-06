// Script para limpiar la base de datos antes de reimportar
import { db } from './src/lib/db';

async function limpiarBaseDatos() {
  console.log('🧹 LIMPIANDO BASE DE DATOS\n');
  console.log('='.repeat(60));
  
  try {
    console.log('🗑️  Eliminando RealBonePositions...');
    const deletedReal = await db.realBonePositions.deleteMany({});
    console.log(`   ✅ ${deletedReal.count} registros eliminados`);
    
    console.log('🗑️  Eliminando ChickenPosition...');
    const deletedPositions = await db.chickenPosition.deleteMany({});
    console.log(`   ✅ ${deletedPositions.count} registros eliminados`);
    
    console.log('🗑️  Eliminando ChickenGame...');
    const deletedGames = await db.chickenGame.deleteMany({});
    console.log(`   ✅ ${deletedGames.count} registros eliminados`);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ BASE DE DATOS LIMPIADA');
    console.log('='.repeat(60));
    console.log('\n📝 Ahora puedes ejecutar: npx tsx importar-partidas-csv.ts');
    
  } catch (error) {
    console.error('❌ ERROR:', error);
    process.exit(1);
  }
}

limpiarBaseDatos()
  .then(() => {
    console.log('\n✅ Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
