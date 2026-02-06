// Script para verificar que las posiciones de huesos estén guardadas correctamente
import { db } from './src/lib/db';

async function verificarDatos() {
  console.log('🔍 VERIFICANDO DATOS EN LA BASE DE DATOS\n');
  console.log('='.repeat(60));
  
  try {
    // Contar partidas
    const totalGames = await db.chickenGame.count({});
    const realGames = await db.chickenGame.count({ where: { isSimulated: false } });
    
    console.log('📊 Partidas:');
    console.log(`   • Total: ${totalGames}`);
    console.log(`   • Reales: ${realGames}`);
    console.log(`   • Simuladas: ${totalGames - realGames}\n`);
    
    // Verificar posiciones de huesos guardadas
    const realBonePositions = await db.realBonePositions.count({});
    console.log(`🎯 Posiciones de huesos reales guardadas: ${realBonePositions}\n`);
    
    // Obtener una partida de muestra
    const sampleGame = await db.chickenGame.findFirst({
      where: { isSimulated: false },
      include: {
        positions: true,
        realPositions: true,
      },
    });
    
    if (sampleGame) {
      console.log('📋 MUESTRA DE PARTIDA:');
      console.log('='.repeat(60));
      console.log(`   ID: ${sampleGame.id}`);
      console.log(`   Huesos en juego: ${sampleGame.boneCount}`);
      console.log(`   Reveladas: ${sampleGame.revealedCount}`);
      console.log(`   Golpeó hueso: ${sampleGame.hitBone ? 'SÍ' : 'NO'}`);
      
      if (sampleGame.realPositions) {
        const bonePositions = JSON.parse(sampleGame.realPositions.posiciones);
        console.log(`\n   🦴 Posiciones de huesos reales: ${bonePositions.join(', ')}`);
      }
      
      // Verificar que las posiciones coincidan
      const boneMarkedPositions = sampleGame.positions
        .filter(p => !p.isChicken) // isChicken=false significa que ES hueso
        .map(p => p.position)
        .sort((a, b) => a - b);
      
      console.log(`   🦴 Posiciones marcadas como hueso en BD: ${boneMarkedPositions.join(', ')}`);
      
      const chickenMarkedPositions = sampleGame.positions
        .filter(p => p.isChicken) // isChicken=true significa que ES pollo
        .map(p => p.position)
        .sort((a, b) => a - b);
      
      console.log(`   🐔 Posiciones marcadas como pollo: ${chickenMarkedPositions.length} posiciones`);
      
      // Verificar consistencia
      if (sampleGame.realPositions) {
        const realBones = JSON.parse(sampleGame.realPositions.posiciones);
        const matches = boneMarkedPositions.every(p => realBones.includes(p)) && 
                       realBones.every((p: number) => boneMarkedPositions.includes(p));
        
        if (matches) {
          console.log(`\n   ✅ CONSISTENCIA VERIFICADA: Las posiciones coinciden`);
        } else {
          console.log(`\n   ❌ ERROR: Las posiciones NO coinciden`);
        }
      }
      
      // Mostrar posiciones reveladas
      const revealedPositions = sampleGame.positions
        .filter(p => p.revealed)
        .sort((a, b) => (a.revealOrder || 0) - (b.revealOrder || 0))
        .map(p => `${p.position}${p.isChicken ? '🐔' : '🦴'}`);
      
      if (revealedPositions.length > 0) {
        console.log(`\n   📍 Secuencia de revelación: ${revealedPositions.join(' → ')}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ VERIFICACIÓN COMPLETADA');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ ERROR:', error);
    process.exit(1);
  }
}

verificarDatos()
  .then(() => {
    console.log('\n✅ Proceso completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
