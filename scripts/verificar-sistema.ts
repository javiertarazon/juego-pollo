// Script de verificación del sistema completo
import { db } from '@/lib/db';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

async function verificarSistema() {
  console.log('🔍 ===== VERIFICACIÓN DEL SISTEMA =====\n');
  
  const checks = {
    baseDatos: false,
    partidasReales: 0,
    partidasSimuladas: 0,
    simuladorEntrenado: false,
    archivosAnalisis: false,
    endpoints: false,
  };
  
  try {
    // 1. Verificar base de datos
    console.log('📊 Verificando base de datos...');
    const totalPartidas = await db.chickenGame.count();
    const partidasReales = await db.chickenGame.count({ where: { isSimulated: false } });
    const partidasSimuladas = await db.chickenGame.count({ where: { isSimulated: true } });
    
    checks.baseDatos = true;
    checks.partidasReales = partidasReales;
    checks.partidasSimuladas = partidasSimuladas;
    
    console.log(`   ✅ Base de datos conectada`);
    console.log(`   📈 Total partidas: ${totalPartidas}`);
    console.log(`   🎮 Partidas reales: ${partidasReales}`);
    console.log(`   🤖 Partidas simuladas: ${partidasSimuladas}\n`);
    
    // 2. Verificar configuración del simulador
    console.log('🎯 Verificando configuración del simulador...');
    const configPath = join(process.cwd(), 'ml-simulator-config.json');
    
    if (existsSync(configPath)) {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      checks.simuladorEntrenado = true;
      
      console.log(`   ✅ Simulador entrenado`);
      console.log(`   📊 Entrenado con: ${config.trainedWith} partidas`);
      console.log(`   📅 Fecha: ${new Date(config.trainedAt).toLocaleString()}`);
      console.log(`   🎯 Posiciones seguras: ${config.safePositions?.length || 0}`);
      console.log(`   ⚠️  Posiciones peligrosas: ${config.dangerousPositions?.length || 0}`);
      console.log(`   🔄 Overlap: ${config.overlapPercentage}%\n`);
    } else {
      console.log(`   ⚠️  Simulador NO entrenado`);
      console.log(`   💡 Ejecutar: Clic en "Entrenar Simulador" en la interfaz\n`);
    }
    
    // 3. Verificar archivos de análisis
    console.log('📁 Verificando archivos de análisis...');
    const archivosAnalisis = [
      'analisis/analisis-profundo-300-partidas.ts',
      'analisis/enfrentamiento-asesor-vs-simulador.ts',
      'analisis/analisis-exhaustivo-100-partidas.ts',
    ];
    
    let archivosExisten = 0;
    archivosAnalisis.forEach(archivo => {
      if (existsSync(archivo)) {
        archivosExisten++;
        console.log(`   ✅ ${archivo}`);
      } else {
        console.log(`   ❌ ${archivo}`);
      }
    });
    
    checks.archivosAnalisis = archivosExisten === archivosAnalisis.length;
    console.log();
    
    // 4. Verificar endpoints
    console.log('🌐 Verificando endpoints...');
    const endpoints = [
      'src/app/api/ml/train-simulator/route.ts',
      'src/app/api/ml/train-advisor/route.ts',
      'src/app/api/chicken/simulate/route.ts',
    ];
    
    let endpointsExisten = 0;
    endpoints.forEach(endpoint => {
      if (existsSync(endpoint)) {
        endpointsExisten++;
        console.log(`   ✅ ${endpoint}`);
      } else {
        console.log(`   ❌ ${endpoint}`);
      }
    });
    
    checks.endpoints = endpointsExisten === endpoints.length;
    console.log();
    
    // 5. Resumen final
    console.log('📊 ===== RESUMEN DE VERIFICACIÓN =====\n');
    
    console.log(`Base de datos: ${checks.baseDatos ? '✅' : '❌'}`);
    console.log(`Partidas reales: ${checks.partidasReales} ${checks.partidasReales >= 50 ? '✅' : '⚠️'}`);
    console.log(`Partidas simuladas: ${checks.partidasSimuladas}`);
    console.log(`Simulador entrenado: ${checks.simuladorEntrenado ? '✅' : '⚠️'}`);
    console.log(`Archivos de análisis: ${checks.archivosAnalisis ? '✅' : '❌'}`);
    console.log(`Endpoints API: ${checks.endpoints ? '✅' : '❌'}\n`);
    
    // 6. Recomendaciones
    console.log('💡 ===== RECOMENDACIONES =====\n');
    
    if (!checks.simuladorEntrenado && checks.partidasReales >= 50) {
      console.log('🎯 ACCIÓN REQUERIDA:');
      console.log('   1. Ir a http://localhost:3000');
      console.log('   2. Pestaña "Simulador"');
      console.log('   3. Clic en "Entrenar Simulador"');
      console.log('   4. Esperar resultados\n');
    }
    
    if (checks.simuladorEntrenado && checks.partidasReales >= 100) {
      console.log('🎯 SIGUIENTE PASO:');
      console.log('   1. Ejecutar enfrentamiento:');
      console.log('      npx tsx analisis/enfrentamiento-asesor-vs-simulador.ts 100 5');
      console.log('   2. Verificar tasa de éxito > 55%');
      console.log('   3. Si tasa > 55%: Entrenar asesor');
      console.log('   4. Si tasa < 55%: Jugar más partidas y re-entrenar simulador\n');
    }
    
    if (checks.partidasReales < 50) {
      console.log('⚠️  PARTIDAS INSUFICIENTES:');
      console.log(`   Tienes ${checks.partidasReales} partidas reales`);
      console.log(`   Se necesitan al menos 50 para entrenar el simulador`);
      console.log(`   Faltan: ${50 - checks.partidasReales} partidas\n`);
    }
    
    // 7. Estado general
    console.log('🎯 ===== ESTADO GENERAL =====\n');
    
    const todosLosChecks = 
      checks.baseDatos &&
      checks.partidasReales >= 50 &&
      checks.archivosAnalisis &&
      checks.endpoints;
    
    if (todosLosChecks && checks.simuladorEntrenado) {
      console.log('✅ SISTEMA COMPLETAMENTE FUNCIONAL');
      console.log('   Todos los componentes están listos');
      console.log('   Puedes entrenar el asesor cuando las métricas sean > 55%\n');
    } else if (todosLosChecks && !checks.simuladorEntrenado) {
      console.log('⚠️  SISTEMA LISTO PARA ENTRENAR');
      console.log('   Todos los componentes están instalados');
      console.log('   Falta entrenar el simulador\n');
    } else {
      console.log('❌ SISTEMA INCOMPLETO');
      console.log('   Revisa los checks anteriores para ver qué falta\n');
    }
    
    // 8. Comandos útiles
    console.log('🔧 ===== COMANDOS ÚTILES =====\n');
    console.log('# Verificar sistema');
    console.log('npx tsx verificar-sistema.ts\n');
    console.log('# Analizar 300 partidas');
    console.log('npx tsx analisis/analisis-profundo-300-partidas.ts\n');
    console.log('# Enfrentamiento (100 partidas, objetivo 5)');
    console.log('npx tsx analisis/enfrentamiento-asesor-vs-simulador.ts 100 5\n');
    console.log('# Contar partidas');
    console.log('npx tsx utilidades/scripts/count-games.ts\n');
    
  } catch (error) {
    console.error('❌ Error en verificación:', error);
    console.log('\n⚠️  Asegúrate de que:');
    console.log('   1. El servidor esté corriendo (npm run dev)');
    console.log('   2. La base de datos esté accesible');
    console.log('   3. Todos los archivos estén en su lugar\n');
  } finally {
    await db.$disconnect();
  }
}

verificarSistema()
  .catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
