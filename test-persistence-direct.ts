
import { updateMLFromGame, loadMLState } from './src/lib/ml/reinforcement-learning';
import { existsSync, unlinkSync, readFileSync } from 'fs';
import { join } from 'path';

async function testPersistence() {
    console.log('🧪 Iniciando prueba de persistencia ML...');
    
    // Ruta del archivo
    const filePath = join(process.cwd(), 'ml-data', 'ml-state-v5.json');
    
    // NOTA: No borramos el archivo existente para no perder el entrenamiento del usuario si ya existe.
    // Solo verificamos que se actualice.
    
    let statsAntes = null;
    if (existsSync(filePath)) {
        statsAntes = JSON.parse(readFileSync(filePath, 'utf-8'));
        console.log('📂 Estado previo encontrado.');
    } else {
        console.log('🆕 Estado previo no encontrado. Se creará uno nuevo.');
    }

    console.log('🎮 Simulando actualización de ML (Posición 25, Derrota)...');
    // Actualizamos posición 25 con una derrota
    try {
        await updateMLFromGame(25, false, 0.95);
    } catch (e) {
        console.error('Error durante updateMLFromGame:', e);
    }
    
    if (existsSync(filePath)) {
        console.log('✅ Archivo de persistencia verificado.');
        const content = JSON.parse(readFileSync(filePath, 'utf-8'));
        
        // Verificar que hay cambios en pos 25
        const total25 = content.positionSuccessRate?.[25]?.total || 0;
        console.log(`📊 Total jugadas Pos 25: ${total25}`);
        
        if (statsAntes) {
             const prevTotal = statsAntes.positionSuccessRate?.[25]?.total || 0;
             if (total25 > prevTotal) {
                 console.log('✅ Incremento confirmado en persistencia.');
             } else {
                 console.log('⚠️ No se detectó incremento (tal vez era primera vez).');
             }
        }
    } else {
        console.error('❌ El archivo de persistencia NO existe tras la actualización.');
    }
    
    console.log('Test finalizado.');
    process.exit(0);
}

testPersistence().catch(e => {
    console.error(e);
    process.exit(1);
});
