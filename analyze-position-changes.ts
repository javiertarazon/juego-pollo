import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzePositionChanges() {
  try {
    console.log('🔄 ANÁLISIS DE CAMBIOS DE POSICIONES EN PARTIDAS CONSECUTIVAS');
    console.log('='.repeat(70));
    
    // Obtener juegos reales ordenados por fecha
    const realGames = await prisma.chickenGame.findMany({
      where: {
        isSimulated: false,
        boneCount: 4,
      },
      include: {
        positions: {
          orderBy: { position: 'asc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`\n📊 Total de juegos analizados: ${realGames.length}`);
    
    // Filtrar juegos con datos completos
    const gamesWithData = realGames.filter(game => {
      const bones = game.positions.filter(p => !p.isChicken);
      return bones.length > 0;
    });
    
    console.log(`✅ Juegos con datos de huesos: ${gamesWithData.length}`);
    console.log(`❌ Juegos sin datos: ${realGames.length - gamesWithData.length}`);
    
    if (gamesWithData.length < 2) {
      console.log('\n⚠️  No hay suficientes juegos con datos para analizar cambios');
      return;
    }
    
    // ANÁLISIS 1: Posiciones que cambian de POLLO a HUESO
    console.log('\n' + '='.repeat(70));
    console.log('1️⃣  POSICIONES QUE CAMBIAN DE POLLO A HUESO');
    console.log('='.repeat(70));
    
    const chickenToBoneChanges: Record<number, number> = {};
    const chickenToBoneExamples: Record<number, string[]> = {};
    
    for (let i = 0; i < gamesWithData.length - 1; i++) {
      const currentGame = gamesWithData[i];
      const nextGame = gamesWithData[i + 1];
      
      // Obtener pollos revelados en juego actual
      const currentChickens = currentGame.positions
        .filter(p => p.isChicken && p.revealed)
        .map(p => p.position);
      
      // Obtener huesos en siguiente juego
      const nextBones = nextGame.positions
        .filter(p => !p.isChicken)
        .map(p => p.position);
      
      // Encontrar posiciones que eran pollo y ahora son hueso
      currentChickens.forEach(chickenPos => {
        if (nextBones.includes(chickenPos)) {
          chickenToBoneChanges[chickenPos] = (chickenToBoneChanges[chickenPos] || 0) + 1;
          
          if (!chickenToBoneExamples[chickenPos]) {
            chickenToBoneExamples[chickenPos] = [];
          }
          if (chickenToBoneExamples[chickenPos].length < 3) {
            chickenToBoneExamples[chickenPos].push(
              `Juego ${i + 1} → ${i + 2}`
            );
          }
        }
      });
    }
    
    const sortedChanges = Object.entries(chickenToBoneChanges)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    if (sortedChanges.length > 0) {
      console.log('\n🔄 Top 10 posiciones que cambian de POLLO a HUESO:');
      sortedChanges.forEach(([pos, count], idx) => {
        const examples = chickenToBoneExamples[parseInt(pos)];
        console.log(`${idx + 1}. Posición ${pos}: ${count} veces`);
        if (examples && examples.length > 0) {
          console.log(`   Ejemplos: ${examples.join(', ')}`);
        }
      });
    } else {
      console.log('\n⚠️  No se encontraron cambios de POLLO a HUESO');
    }
    
    // ANÁLISIS 2: Posiciones que cambian de HUESO a POLLO
    console.log('\n' + '='.repeat(70));
    console.log('2️⃣  POSICIONES QUE CAMBIAN DE HUESO A POLLO');
    console.log('='.repeat(70));
    
    const boneToChickenChanges: Record<number, number> = {};
    const boneToChickenExamples: Record<number, string[]> = {};
    
    for (let i = 0; i < gamesWithData.length - 1; i++) {
      const currentGame = gamesWithData[i];
      const nextGame = gamesWithData[i + 1];
      
      // Obtener huesos en juego actual
      const currentBones = currentGame.positions
        .filter(p => !p.isChicken)
        .map(p => p.position);
      
      // Obtener pollos revelados en siguiente juego
      const nextChickens = nextGame.positions
        .filter(p => p.isChicken && p.revealed)
        .map(p => p.position);
      
      // Encontrar posiciones que eran hueso y ahora son pollo
      currentBones.forEach(bonePos => {
        if (nextChickens.includes(bonePos)) {
          boneToChickenChanges[bonePos] = (boneToChickenChanges[bonePos] || 0) + 1;
          
          if (!boneToChickenExamples[bonePos]) {
            boneToChickenExamples[bonePos] = [];
          }
          if (boneToChickenExamples[bonePos].length < 3) {
            boneToChickenExamples[bonePos].push(
              `Juego ${i + 1} → ${i + 2}`
            );
          }
        }
      });
    }
    
    const sortedBoneToChicken = Object.entries(boneToChickenChanges)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    if (sortedBoneToChicken.length > 0) {
      console.log('\n🔄 Top 10 posiciones que cambian de HUESO a POLLO:');
      sortedBoneToChicken.forEach(([pos, count], idx) => {
        const examples = boneToChickenExamples[parseInt(pos)];
        console.log(`${idx + 1}. Posición ${pos}: ${count} veces`);
        if (examples && examples.length > 0) {
          console.log(`   Ejemplos: ${examples.join(', ')}`);
        }
      });
    } else {
      console.log('\n⚠️  No se encontraron cambios de HUESO a POLLO');
    }
    
    // ANÁLISIS 3: Posiciones que se mantienen como HUESO
    console.log('\n' + '='.repeat(70));
    console.log('3️⃣  POSICIONES QUE SE MANTIENEN COMO HUESO');
    console.log('='.repeat(70));
    
    const consistentBones: Record<number, number> = {};
    
    for (let i = 0; i < gamesWithData.length - 1; i++) {
      const currentGame = gamesWithData[i];
      const nextGame = gamesWithData[i + 1];
      
      const currentBones = currentGame.positions
        .filter(p => !p.isChicken)
        .map(p => p.position);
      
      const nextBones = nextGame.positions
        .filter(p => !p.isChicken)
        .map(p => p.position);
      
      currentBones.forEach(bonePos => {
        if (nextBones.includes(bonePos)) {
          consistentBones[bonePos] = (consistentBones[bonePos] || 0) + 1;
        }
      });
    }
    
    const sortedConsistent = Object.entries(consistentBones)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    if (sortedConsistent.length > 0) {
      console.log('\n🔒 Top 10 posiciones que se MANTIENEN como HUESO:');
      sortedConsistent.forEach(([pos, count], idx) => {
        const percentage = ((count / (gamesWithData.length - 1)) * 100).toFixed(2);
        console.log(`${idx + 1}. Posición ${pos}: ${count} veces (${percentage}% de consistencia)`);
      });
    }
    
    // ANÁLISIS 4: Estadísticas generales
    console.log('\n' + '='.repeat(70));
    console.log('4️⃣  ESTADÍSTICAS GENERALES DE CAMBIOS');
    console.log('='.repeat(70));
    
    const totalChickenToBone = Object.values(chickenToBoneChanges).reduce((a, b) => a + b, 0);
    const totalBoneToChicken = Object.values(boneToChickenChanges).reduce((a, b) => a + b, 0);
    const totalConsistent = Object.values(consistentBones).reduce((a, b) => a + b, 0);
    
    console.log(`\n📊 Total de cambios POLLO → HUESO: ${totalChickenToBone}`);
    console.log(`📊 Total de cambios HUESO → POLLO: ${totalBoneToChicken}`);
    console.log(`📊 Total de posiciones CONSISTENTES como HUESO: ${totalConsistent}`);
    
    const changeRate = ((totalChickenToBone + totalBoneToChicken) / ((gamesWithData.length - 1) * 4)) * 100;
    console.log(`\n🔄 Tasa de cambio general: ${changeRate.toFixed(2)}%`);
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ ANÁLISIS COMPLETADO');
    console.log('='.repeat(70));
    
    console.log('\n💡 CONCLUSIONES:');
    console.log('- Si hay muchos cambios POLLO→HUESO: Mystake cambia posiciones frecuentemente');
    console.log('- Si hay posiciones consistentes: Mystake tiene posiciones "favoritas" para huesos');
    console.log('- Si la tasa de cambio es baja: Los patrones son más predecibles');
    
  } catch (error) {
    console.error('❌ Error en análisis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzePositionChanges();
