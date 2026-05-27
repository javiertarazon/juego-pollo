/**
 * 🎮 API ENDPOINT: GESTIÓN DE SESIÓN DE JUEGO
 * 
 * Maneja:
 * - Balance del jugador (PERSISTIDO EN BD)
 * - Historial de partidas
 * - Estadísticas de sesión
 * - Gráfica de equity
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { GestorBalance } from '@/lib/multipliers';

// Cache en memoria para rendimiento (se sincroniza con BD)
const sesiones = new Map<string, GestorBalance>();

/**
 * Obtener o crear gestor de balance desde BD
 */
async function getOrCreateSession(sessionId: string, balanceInicial: number = 100): Promise<GestorBalance> {
  // 1. Intentar cache en memoria
  const cached = sesiones.get(sessionId);
  if (cached) return cached;

  // 2. Intentar cargar desde BD
  try {
    const dbSession = await db.gameSession.findUnique({ where: { sessionId } });
    
    if (dbSession) {
      const gestor = new GestorBalance(dbSession.balanceInicial);
      gestor.restaurarDesdePersistencia({
        balanceActual: dbSession.balanceActual,
        balanceInicial: dbSession.balanceInicial,
        ganado: dbSession.ganado,
        perdido: dbSession.perdido,
        totalVictorias: dbSession.totalVictorias,
        totalDerrotas: dbSession.totalDerrotas,
        rachaVictorias: dbSession.rachaVictorias,
        rachaDerrotas: dbSession.rachaDerrotas,
      });
      sesiones.set(sessionId, gestor);
      return gestor;
    }
  } catch (error) {
    console.warn('Error cargando sesión desde BD, usando memoria:', error);
  }

  // 3. Crear nueva sesión
  const gestor = new GestorBalance(balanceInicial);
  sesiones.set(sessionId, gestor);

  // Persistir en BD
  try {
    await db.gameSession.create({
      data: {
        sessionId,
        balanceActual: balanceInicial,
        balanceInicial,
        apuestaActual: 0.2,
      },
    });
  } catch (error) {
    console.warn('Error creando sesión en BD:', error);
  }

  return gestor;
}

/**
 * Sincronizar gestor con BD
 */
async function syncSessionToDB(sessionId: string, gestor: GestorBalance) {
  try {
    const balance = gestor.obtenerBalance();
    await db.gameSession.upsert({
      where: { sessionId },
      update: {
        balanceActual: balance.actual,
        rachaVictorias: balance.racha_actual > 0 ? balance.racha_actual : 0,
        rachaDerrotas: balance.racha_actual < 0 ? Math.abs(balance.racha_actual) : 0,
        totalVictorias: balance.partidas_ganadas,
        totalDerrotas: balance.partidas_perdidas,
        ganado: balance.ganado,
        perdido: balance.perdido,
      },
      create: {
        sessionId,
        balanceActual: balance.actual,
        balanceInicial: balance.inicial,
        ganado: balance.ganado,
        perdido: balance.perdido,
        totalVictorias: balance.partidas_ganadas,
        totalDerrotas: balance.partidas_perdidas,
      },
    });
  } catch (error) {
    console.warn('Error sincronizando sesión a BD:', error);
  }
}

/**
 * GET - Obtener información de la sesión
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId') || 'default';
    
    const gestor = await getOrCreateSession(sessionId);
    
    const balance = gestor.obtenerBalance();
    const estadisticas = gestor.obtenerEstadisticas();
    const grafica = gestor.generarDatosGrafica();
    
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
    console.error('Error al obtener sesión:', error);
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
      tipo,
      apuesta,
      posicionesDescubiertas
    } = body;
    
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
    
    const gestor = await getOrCreateSession(sessionId);
    
    const puedeApostar = gestor.puedeApostar(apuesta);
    if (!puedeApostar.puede) {
      return NextResponse.json(
        { success: false, error: puedeApostar.razon },
        { status: 400 }
      );
    }
    
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
    
    // Sincronizar con BD
    await syncSessionToDB(sessionId, gestor);
    
    const balance = gestor.obtenerBalance();
    const estadisticas = gestor.obtenerEstadisticas();
    const grafica = gestor.generarDatosGrafica();
    
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
    console.error('Error al registrar resultado:', error);
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
    
    const gestor = new GestorBalance(balanceInicial);
    sesiones.set(sessionId, gestor);
    
    // Actualizar en BD
    await syncSessionToDB(sessionId, gestor);
    
    return NextResponse.json({
      success: true,
      message: 'Sesión reiniciada',
      sessionId,
      balance: gestor.obtenerBalance()
    });
    
  } catch (error) {
    console.error('Error al reiniciar sesión:', error);
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
