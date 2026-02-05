/**
 * 🧪 SCRIPT DE PRUEBA: ESTADÍSTICAS AVANZADAS Y GESTIÓN DE BALANCE
 * 
 * Prueba todos los endpoints implementados:
 * - Dashboard completo
 * - Gestión de sesión
 * - Registro de ganancias y pérdidas
 */

async function probarDashboard() {
  console.log('\n📊 === PRUEBA: DASHBOARD COMPLETO ===\n');
  
  const response = await fetch('http://localhost:3000/api/chicken/dashboard?limit=100');
  const data = await response.json();
  
  if (!data.success) {
    console.error('❌ Error:', data.error);
    return;
  }
  
  console.log('✅ Dashboard cargado exitosamente');
  console.log(`📈 Total partidas analizadas: ${data.total_partidas_analizadas}`);
  
  // Configuración
  console.log('\n⚙️ Configuración:');
  console.log(`  - Huesos: ${data.configuracion.bone_count}`);
  console.log(`  - Apuesta mínima: ${data.configuracion.apuesta_minima}`);
  console.log(`  - Incremento: ${data.configuracion.apuesta_incremento}`);
  console.log(`  - Multiplicadores: ${Object.keys(data.configuracion.multiplicadores).length} niveles`);
  
  // Últimas 10 partidas
  console.log('\n🎮 Últimas 10 Partidas:');
  data.ultimas_10_partidas.slice(0, 3).forEach((partida: any) => {
    console.log(`\n  Partida #${partida.numero} (${partida.resultado}):`);
    console.log(`    Huesos: ${partida.huesos.posiciones.join(', ')}`);
    console.log(`    Pollos: ${partida.pollos.posiciones.slice(0, 5).join(', ')}...`);
    if (partida.cambios) {
      console.log(`    Cambios: ${partida.cambios.hueso_a_pollo} hueso→pollo, ${partida.cambios.pollo_a_hueso} pollo→hueso`);
    }
  });
  
  // Frecuencias
  console.log('\n📊 Top 5 Posiciones Más Seguras (menos huesos):');
  data.frecuencias.posiciones_seguras.slice(0, 5).forEach((pos: any) => {
    console.log(`  Posición ${pos.posicion}: ${pos.huesos.porcentaje} huesos, ${pos.pollos.porcentaje} pollos`);
  });
  
  console.log('\n⚠️ Top 5 Posiciones Más Peligrosas (más huesos):');
  data.frecuencias.top_huesos.slice(0, 5).forEach((pos: any) => {
    console.log(`  Posición ${pos.posicion}: ${pos.huesos.porcentaje} huesos`);
  });
  
  // Transiciones
  console.log('\n🔄 Top 5 Posiciones Más Volátiles:');
  data.transiciones.posiciones_mas_volatiles.slice(0, 5).forEach((pos: any) => {
    console.log(`  Posición ${pos.posicion}: ${pos.total_cambios} cambios, ${pos.frecuencia_cambio}`);
  });
  
  // Patrones capitalizables
  console.log('\n🎯 Patrones Capitalizables:');
  data.patrones_capitalizables.forEach((patron: any) => {
    console.log(`\n  ${patron.tipo} (Confianza: ${patron.confianza})`);
    console.log(`    ${patron.descripcion}`);
    console.log(`    Posiciones: ${patron.posiciones.join(', ')}`);
  });
  
  // Recomendaciones
  console.log('\n💡 Recomendaciones:');
  data.recomendaciones.forEach((rec: any) => {
    console.log(`\n  ${rec.momento} (Prioridad: ${rec.prioridad})`);
    console.log(`    Estrategia: ${rec.estrategia}`);
    console.log(`    Posiciones: ${rec.posiciones.join(', ')}`);
    console.log(`    Razón: ${rec.razon}`);
    if (rec.apuesta_sugerida) {
      console.log(`    Apuesta sugerida: ${rec.apuesta_sugerida}`);
    }
  });
}

async function probarSesion() {
  console.log('\n\n🎮 === PRUEBA: GESTIÓN DE SESIÓN ===\n');
  
  const sessionId = 'test-' + Date.now();
  const balanceInicial = 100;
  
  // 1. Crear sesión
  console.log('1️⃣ Creando sesión...');
  let response = await fetch(`http://localhost:3000/api/chicken/session?sessionId=${sessionId}&balanceInicial=${balanceInicial}`);
  let data = await response.json();
  
  console.log(`✅ Sesión creada: ${data.sessionId}`);
  console.log(`💰 Balance inicial: ${data.balance.actual}`);
  
  // 2. Registrar ganancia
  console.log('\n2️⃣ Registrando ganancia (5 posiciones descubiertas)...');
  response = await fetch('http://localhost:3000/api/chicken/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      tipo: 'GANANCIA',
      apuesta: 0.2,
      posicionesDescubiertas: 5
    })
  });
  data = await response.json();
  
  console.log(`✅ Ganancia registrada`);
  console.log(`💰 Balance: ${data.balance.actual.toFixed(2)} (${data.estadisticas.roi} ROI)`);
  console.log(`📈 Racha: ${data.balance.racha_actual}`);
  
  // 3. Registrar otra ganancia
  console.log('\n3️⃣ Registrando otra ganancia (7 posiciones)...');
  response = await fetch('http://localhost:3000/api/chicken/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      tipo: 'GANANCIA',
      apuesta: 0.4,
      posicionesDescubiertas: 7
    })
  });
  data = await response.json();
  
  console.log(`✅ Ganancia registrada`);
  console.log(`💰 Balance: ${data.balance.actual.toFixed(2)} (${data.estadisticas.roi} ROI)`);
  console.log(`📈 Racha: ${data.balance.racha_actual}`);
  
  // 4. Registrar pérdida
  console.log('\n4️⃣ Registrando pérdida...');
  response = await fetch('http://localhost:3000/api/chicken/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      tipo: 'PERDIDA',
      apuesta: 0.2
    })
  });
  data = await response.json();
  
  console.log(`✅ Pérdida registrada`);
  console.log(`💰 Balance: ${data.balance.actual.toFixed(2)} (${data.estadisticas.roi} ROI)`);
  console.log(`📉 Racha: ${data.balance.racha_actual}`);
  
  // 5. Obtener estadísticas finales
  console.log('\n5️⃣ Estadísticas finales:');
  response = await fetch(`http://localhost:3000/api/chicken/session?sessionId=${sessionId}`);
  data = await response.json();
  
  console.log(`\n📊 Resumen de Sesión:`);
  console.log(`  Balance actual: ${data.balance.actual.toFixed(2)}`);
  console.log(`  Balance inicial: ${data.balance.inicial}`);
  console.log(`  Ganado: ${data.balance.ganado.toFixed(2)}`);
  console.log(`  Perdido: ${data.balance.perdido.toFixed(2)}`);
  console.log(`  Partidas jugadas: ${data.balance.partidas_jugadas}`);
  console.log(`  Partidas ganadas: ${data.balance.partidas_ganadas}`);
  console.log(`  Partidas perdidas: ${data.balance.partidas_perdidas}`);
  console.log(`  ROI: ${data.estadisticas.roi}`);
  console.log(`  Tasa de victoria: ${data.estadisticas.tasa_victoria}`);
  console.log(`  Mejor racha: ${data.balance.mejor_racha}`);
  console.log(`  Peor racha: ${data.balance.peor_racha}`);
  
  console.log(`\n📈 Gráfica de Equity (${data.grafica_equity.length} puntos):`);
  data.grafica_equity.forEach((punto: any) => {
    const emoji = punto.tipo === 'INICIAL' ? '🏁' : punto.tipo === 'GANANCIA' ? '✅' : '❌';
    console.log(`  ${emoji} Partida ${punto.partida}: ${punto.balance.toFixed(2)}`);
  });
  
  // 6. Reiniciar sesión
  console.log('\n6️⃣ Reiniciando sesión...');
  response = await fetch(`http://localhost:3000/api/chicken/session?sessionId=${sessionId}&balanceInicial=200`, {
    method: 'DELETE'
  });
  data = await response.json();
  
  console.log(`✅ Sesión reiniciada con balance: ${data.balance.actual}`);
}

async function probarMultiplicadores() {
  console.log('\n\n💰 === PRUEBA: MULTIPLICADORES ===\n');
  
  const apuestas = [0.2, 0.4, 1.0, 5.0];
  const posiciones = [1, 3, 5, 7, 10, 15, 21];
  
  console.log('Tabla de Ganancias Potenciales:\n');
  console.log('Posiciones | ' + apuestas.map(a => `Apuesta ${a}`).join(' | '));
  console.log('-'.repeat(70));
  
  const response = await fetch('http://localhost:3000/api/chicken/dashboard?limit=1');
  const data = await response.json();
  const multiplicadores = data.configuracion.multiplicadores;
  
  posiciones.forEach(pos => {
    const mult = multiplicadores[pos];
    const ganancias = apuestas.map(apuesta => {
      const ganancia = apuesta * mult;
      return ganancia.toFixed(2).padStart(8);
    });
    console.log(`${pos.toString().padStart(2)} (${mult}x)  | ${ganancias.join(' | ')}`);
  });
}

async function ejecutarPruebas() {
  console.log('🚀 INICIANDO PRUEBAS DE ESTADÍSTICAS AVANZADAS\n');
  console.log('='.repeat(70));
  
  try {
    await probarDashboard();
    await probarSesion();
    await probarMultiplicadores();
    
    console.log('\n\n' + '='.repeat(70));
    console.log('✅ TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE');
    console.log('='.repeat(70) + '\n');
    
  } catch (error) {
    console.error('\n❌ ERROR EN LAS PRUEBAS:', error);
    process.exit(1);
  }
}

// Ejecutar pruebas
ejecutarPruebas();
