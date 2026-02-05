/**
 * 🎮 API ENDPOINT: GESTIÓN DE SESIÓN DE JUEGO
 * 
 * Maneja:
 * - Balance del jugador
 * - Historial de partidas
 * - Estadísticas de sesión
 * - Gráfica de equity
 */

import { NextRequest, NextResponse } from 'next/server';
import { GestorBalance } from '@/lib/multipliers';

// Almacenamiento en memoria de sesiones (en producción usar base de datos)
const sesiones = new Map<string, GestorBalance>();

/**
 * GET - Obtener información de la sesión
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId') || 'default';
    
    let gestor = sesiones.get(sessionId);
    
    if (!gestor) {
      // Crear nueva sesión con balance inicial
      const balanceInicial = parseFloat(searchParams.get('balanceInicial') || '100');
      gestor = new GestorBalance(balanceInicial);
      sesiones.set(sessionId, gestor);
    }
    
    const balance = gestor.obtenerBalance();
    const estadisticas = gestor.obtenerEstadisticas();
    const grafica = gestor.generarDatosGrafica();
    
    // Calcular rachas para el frontend
    const rachaVictorias = balance.racha_actual > 0 ? balance.racha_actual : 0;
    const rachaDerrotas = balance.racha_actual < 0 ? Math.abs(balance.racha_actual) : 0;
    
    return NextResponse.json({
      success: true,
      sessionId,
      balance,
      estadisticas: {
        ...estadisticas,
        rachaVictorias,
        rachaDerrotas,
        totalVictorias: balance.partidas_ganadas,
        totalDerrotas: balance.partidas_perdidas,
      },
      grafica_equity: grafica
    });
    
  } catch (error) {
    console.error('❌ Error al obtener sesión:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener información de sesión',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Registrar resultado de partida
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sessionId = 'default',
      tipo, // 'GANANCIA' o 'PERDIDA'
      apuesta,
      posicionesDescubiertas
    } = body;
    
    // Validar entrada
    if (!tipo || !apuesta) {
      return NextResponse.json(
        { success: false, error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }
    
    if (tipo !== 'GANANCIA' && tipo !== 'PERDIDA') {
      return NextResponse.json(
        { success: false, error: 'Tipo debe ser GANANCIA o PERDIDA' },
        { status: 400 }
      );
    }
    
    // Obtener o crear gestor
    let gestor = sesiones.get(sessionId);
    if (!gestor) {
      gestor = new GestorBalance(100);
      sesiones.set(sessionId, gestor);
    }
    
    // Verificar que puede apostar
    const puedeApostar = gestor.puedeApostar(apuesta);
    if (!puedeApostar.puede) {
      return NextResponse.json(
        { success: false, error: puedeApostar.razon },
        { status: 400 }
      );
    }
    
    // Registrar resultado
    if (tipo === 'GANANCIA') {
      if (!posicionesDescubiertas) {
        return NextResponse.json(
          { success: false, error: 'Se requiere posicionesDescubiertas para ganancias' },
          { status: 400 }
        );
      }
      gestor.registrarGanancia(apuesta, posicionesDescubiertas);
    } else {
      gestor.registrarPerdida(apuesta);
    }
    
    // Obtener estado actualizado
    const balance = gestor.obtenerBalance();
    const estadisticas = gestor.obtenerEstadisticas();
    const grafica = gestor.generarDatosGrafica();
    
    // Calcular rachas para el frontend
    const rachaVictorias = balance.racha_actual > 0 ? balance.racha_actual : 0;
    const rachaDerrotas = balance.racha_actual < 0 ? Math.abs(balance.racha_actual) : 0;
    
    return NextResponse.json({
      success: true,
      sessionId,
      resultado: tipo,
      balance,
      estadisticas: {
        ...estadisticas,
        rachaVictorias,
        rachaDerrotas,
        totalVictorias: balance.partidas_ganadas,
        totalDerrotas: balance.partidas_perdidas,
      },
      grafica_equity: grafica
    });
    
  } catch (error) {
    console.error('❌ Error al registrar resultado:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al registrar resultado',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Reiniciar sesión
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId') || 'default';
    const balanceInicial = parseFloat(searchParams.get('balanceInicial') || '100');
    
    // Crear nueva sesión
    const gestor = new GestorBalance(balanceInicial);
    sesiones.set(sessionId, gestor);
    
    return NextResponse.json({
      success: true,
      message: 'Sesión reiniciada',
      sessionId,
      balance: gestor.obtenerBalance()
    });
    
  } catch (error) {
    console.error('❌ Error al reiniciar sesión:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al reiniciar sesión',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
