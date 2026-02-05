/**
 * 📊 API ENDPOINT: DASHBOARD COMPLETO
 * 
 * Proporciona toda la información necesaria para el dashboard:
 * - Estadísticas avanzadas de patrones
 * - Balance y equity
 * - Multiplicadores
 * - Recomendaciones
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { MULTIPLICADORES_4_HUESOS, APUESTA_CONFIG } from '@/lib/multipliers';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    
    // Obtener partidas reales más recientes
    const partidas = await db.chickenGame.findMany({
      where: {
        isSimulated: false,
        boneCount: 4
      },
      include: {
        positions: {
          orderBy: { position: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    
    if (partidas.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No hay partidas disponibles para análisis'
      }, { status: 404 });
    }
    
    // Análisis de últimas 10 partidas
    const ultimas10 = analizarUltimas10Detallado(partidas.slice(0, 10));
    
    // Análisis de frecuencias
    const frecuencias = analizarFrecuenciasDetallado(partidas);
    
    // Análisis de transiciones
    const transiciones = analizarTransicionesDetallado(partidas);
    
    // Identificar patrones capitalizables
    const patrones = identificarPatronesCapitalizables(partidas);
    
    // Generar recomendaciones
    const recomendaciones = generarRecomendacionesAvanzadas(partidas, frecuencias, transiciones);
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      total_partidas_analizadas: partidas.length,
      configuracion: {
        bone_count: 4,
        apuesta_minima: APUESTA_CONFIG.minima,
        apuesta_incremento: APUESTA_CONFIG.incremento,
        multiplicadores: MULTIPLICADORES_4_HUESOS
      },
      ultimas_10_partidas: ultimas10,
      frecuencias,
      transiciones,
      patrones_capitalizables: patrones,
      recomendaciones
    });
    
  } catch (error) {
    console.error('Error en dashboard:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al generar dashboard',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function analizarUltimas10Detallado(partidas: any[]) {
  return partidas.map((partida, idx) => {
    const huesos = partida.positions
      .filter((p: any) => !p.isChicken)
      .map((p: any) => p.position)
      .sort((a: number, b: number) => a - b);
    
    const pollos = partida.positions
      .filter((p: any) => p.isChicken)
      .map((p: any) => p.position)
      .sort((a: number, b: number) => a - b);
    
    let cambios: any = null;
    if (idx < partidas.length - 1) {
      const anterior = partidas[idx + 1];
      const huesos_anterior = anterior.positions
        .filter((p: any) => !p.isChicken)
        .map((p: any) => p.position);
      
      const pollos_anterior = anterior.positions
        .filter((p: any) => p.isChicken)
        .map((p: any) => p.position);
      
      cambios = {
        hueso_a_pollo: huesos_anterior.filter((pos: number) => pollos.includes(pos)),
        pollo_a_hueso: pollos_anterior.filter((pos: number) => huesos.includes(pos)),
        hueso_a_hueso: huesos_anterior.filter((pos: number) => huesos.includes(pos)),
        pollo_a_pollo: pollos_anterior.filter((pos: number) => pollos.includes(pos))
      };
    }
    
    return {
      numero: idx + 1,
      id: partida.id,
      fecha: new Date(partida.createdAt).toLocaleString('es-ES'),
      huesos: {
        posiciones: huesos,
        cantidad: huesos.length,
        consecutivas_con_anterior: cambios ? cambios.hueso_a_hueso.length : null
      },
      pollos: {
        posiciones: pollos,
        cantidad: pollos.length,
        consecutivas_con_anterior: cambios ? cambios.pollo_a_pollo.length : null
      },
      cambios: cambios ? {
        hueso_a_pollo: cambios.hueso_a_pollo.length,
        pollo_a_hueso: cambios.pollo_a_hueso.length,
        posiciones_hueso_a_pollo: cambios.hueso_a_pollo,
        posiciones_pollo_a_hueso: cambios.pollo_a_hueso
      } : null,
      resultado: !partida.hitBone ? 'EXITOSA' : 'FALLIDA',
      reveladas: partida.revealedCount
    };
  });
}


function analizarFrecuenciasDetallado(partidas: any[]) {
  const stats: Record<number, {
    huesos: number;
    pollos: number;
    consecutivas_huesos: number;
    consecutivas_pollos: number;
    ultima_aparicion_hueso: number | null;
    ultima_aparicion_pollo: number | null;
  }> = {};
  
  for (let i = 0; i < 25; i++) {
    stats[i] = {
      huesos: 0,
      pollos: 0,
      consecutivas_huesos: 0,
      consecutivas_pollos: 0,
      ultima_aparicion_hueso: null,
      ultima_aparicion_pollo: null
    };
  }
  
  partidas.forEach((partida, idx) => {
    partida.positions.forEach((pos: any) => {
      if (pos.position < 0 || pos.position >= 25) return;
      
      if (pos.isChicken) {
        stats[pos.position].pollos++;
        stats[pos.position].ultima_aparicion_pollo = idx;
        
        if (idx > 0) {
          const anterior = partidas[idx - 1].positions.find((p: any) => p.position === pos.position);
          if (anterior && anterior.isChicken) {
            stats[pos.position].consecutivas_pollos++;
          }
        }
      } else {
        stats[pos.position].huesos++;
        stats[pos.position].ultima_aparicion_hueso = idx;
        
        if (idx > 0) {
          const anterior = partidas[idx - 1].positions.find((p: any) => p.position === pos.position);
          if (anterior && !anterior.isChicken) {
            stats[pos.position].consecutivas_huesos++;
          }
        }
      }
    });
  });
  
  const resultado = Object.entries(stats).map(([pos, data]) => {
    const total = data.huesos + data.pollos;
    return {
      posicion: parseInt(pos),
      huesos: {
        frecuencia: data.huesos,
        porcentaje: total > 0 ? (data.huesos / total * 100).toFixed(2) + '%' : '0%',
        consecutivas: data.consecutivas_huesos,
        ultima_vez: data.ultima_aparicion_hueso !== null ? `Hace ${data.ultima_aparicion_hueso + 1} partidas` : 'Nunca'
      },
      pollos: {
        frecuencia: data.pollos,
        porcentaje: total > 0 ? (data.pollos / total * 100).toFixed(2) + '%' : '0%',
        consecutivas: data.consecutivas_pollos,
        ultima_vez: data.ultima_aparicion_pollo !== null ? `Hace ${data.ultima_aparicion_pollo + 1} partidas` : 'Nunca'
      },
      total_apariciones: total
    };
  });
  
  return {
    por_posicion: resultado,
    top_huesos: resultado
      .sort((a, b) => b.huesos.frecuencia - a.huesos.frecuencia)
      .slice(0, 10),
    top_pollos: resultado
      .sort((a, b) => b.pollos.frecuencia - a.pollos.frecuencia)
      .slice(0, 10),
    posiciones_seguras: resultado
      .filter(item => item.huesos.frecuencia < partidas.length * 0.15)
      .sort((a, b) => a.huesos.frecuencia - b.huesos.frecuencia)
      .slice(0, 10)
  };
}


function analizarTransicionesDetallado(partidas: any[]) {
  const cambios_por_posicion: Record<number, {
    hueso_a_pollo: number[];
    pollo_a_hueso: number[];
  }> = {};
  
  for (let i = 0; i < 25; i++) {
    cambios_por_posicion[i] = {
      hueso_a_pollo: [],
      pollo_a_hueso: []
    };
  }
  
  for (let i = 0; i < partidas.length - 1; i++) {
    const actual = partidas[i];
    const siguiente = partidas[i + 1];
    
    for (let pos = 0; pos < 25; pos++) {
      const pos_actual = actual.positions.find((p: any) => p.position === pos);
      const pos_siguiente = siguiente.positions.find((p: any) => p.position === pos);
      
      if (pos_actual && pos_siguiente) {
        if (!pos_actual.isChicken && pos_siguiente.isChicken) {
          cambios_por_posicion[pos].hueso_a_pollo.push(i + 1);
        } else if (pos_actual.isChicken && !pos_siguiente.isChicken) {
          cambios_por_posicion[pos].pollo_a_hueso.push(i + 1);
        }
      }
    }
  }
  
  const resultado = Object.entries(cambios_por_posicion).map(([pos, data]) => {
    const total_cambios = data.hueso_a_pollo.length + data.pollo_a_hueso.length;
    
    let frecuencia_cambio = 'N/A';
    if (total_cambios > 1) {
      const intervalos_hp: number[] = [];
      for (let i = 1; i < data.hueso_a_pollo.length; i++) {
        intervalos_hp.push(data.hueso_a_pollo[i] - data.hueso_a_pollo[i - 1]);
      }
      const intervalos_ph: number[] = [];
      for (let i = 1; i < data.pollo_a_hueso.length; i++) {
        intervalos_ph.push(data.pollo_a_hueso[i] - data.pollo_a_hueso[i - 1]);
      }
      
      const todos_intervalos = [...intervalos_hp, ...intervalos_ph];
      if (todos_intervalos.length > 0) {
        const promedio = todos_intervalos.reduce((sum, val) => sum + val, 0) / todos_intervalos.length;
        frecuencia_cambio = `Cada ${promedio.toFixed(1)} partidas`;
      }
    }
    
    return {
      posicion: parseInt(pos),
      hueso_a_pollo: data.hueso_a_pollo.length,
      pollo_a_hueso: data.pollo_a_hueso.length,
      total_cambios,
      frecuencia_cambio,
      ultimo_cambio: total_cambios > 0
        ? Math.max(...data.hueso_a_pollo, ...data.pollo_a_hueso)
        : null
    };
  }).filter(item => item.total_cambios > 0);
  
  return {
    por_posicion: resultado,
    posiciones_mas_volatiles: resultado
      .sort((a, b) => b.total_cambios - a.total_cambios)
      .slice(0, 10),
    posiciones_estables: resultado
      .sort((a, b) => a.total_cambios - b.total_cambios)
      .slice(0, 10)
  };
}


function identificarPatronesCapitalizables(partidas: any[]) {
  const patrones: any[] = [];
  
  const frecuencias = analizarFrecuenciasDetallado(partidas);
  const posiciones_muy_seguras = frecuencias.posiciones_seguras.slice(0, 5);
  
  if (posiciones_muy_seguras.length > 0) {
    patrones.push({
      tipo: 'POSICIONES_MUY_SEGURAS',
      confianza: 'ALTA',
      descripcion: 'Posiciones que han sido huesos menos del 15% de las veces',
      posiciones: posiciones_muy_seguras.map(p => p.posicion),
      detalle: posiciones_muy_seguras.map(p => ({
        posicion: p.posicion,
        veces_hueso: p.huesos.frecuencia,
        porcentaje: p.huesos.porcentaje
      }))
    });
  }
  
  const pollos_consecutivos = frecuencias.por_posicion
    .filter(p => p.pollos.consecutivas > partidas.length * 0.3)
    .sort((a, b) => b.pollos.consecutivas - a.pollos.consecutivas)
    .slice(0, 5);
  
  if (pollos_consecutivos.length > 0) {
    patrones.push({
      tipo: 'POLLOS_CONSECUTIVOS',
      confianza: 'MEDIA-ALTA',
      descripcion: 'Posiciones que tienden a repetir como pollos en partidas consecutivas',
      posiciones: pollos_consecutivos.map(p => p.posicion),
      detalle: pollos_consecutivos.map(p => ({
        posicion: p.posicion,
        veces_consecutivas: p.pollos.consecutivas,
        total_pollos: p.pollos.frecuencia
      }))
    });
  }
  
  const transiciones = analizarTransicionesDetallado(partidas);
  const cambios_predecibles = transiciones.por_posicion
    .filter(t => t.frecuencia_cambio !== 'N/A' && parseFloat(t.frecuencia_cambio.split(' ')[1]) < 5)
    .slice(0, 5);
  
  if (cambios_predecibles.length > 0) {
    patrones.push({
      tipo: 'CAMBIOS_PREDECIBLES',
      confianza: 'MEDIA',
      descripcion: 'Posiciones que cambian con frecuencia predecible',
      posiciones: cambios_predecibles.map(c => c.posicion),
      detalle: cambios_predecibles.map(c => ({
        posicion: c.posicion,
        frecuencia: c.frecuencia_cambio,
        ultimo_cambio: c.ultimo_cambio
      }))
    });
  }
  
  return patrones;
}

function generarRecomendacionesAvanzadas(partidas: any[], frecuencias: any, transiciones: any) {
  const recomendaciones: any[] = [];
  
  const mejores_inicio = frecuencias.posiciones_seguras.slice(0, 5);
  recomendaciones.push({
    momento: 'INICIO_PARTIDA',
    prioridad: 'ALTA',
    estrategia: 'Comenzar con las posiciones más seguras estadísticamente',
    posiciones: mejores_inicio.map((p: any) => p.posicion),
    razon: `Estas posiciones han sido huesos solo ${mejores_inicio[0]?.huesos.porcentaje || '0%'} de las veces`,
    apuesta_sugerida: APUESTA_CONFIG.minima
  });
  
  const pollos_frecuentes = frecuencias.top_pollos.slice(0, 5);
  recomendaciones.push({
    momento: 'CONTINUACION',
    prioridad: 'MEDIA',
    estrategia: 'Continuar con posiciones que frecuentemente son pollos',
    posiciones: pollos_frecuentes.map((p: any) => p.posicion),
    razon: `Estas posiciones han sido pollos ${pollos_frecuentes[0]?.pollos.porcentaje || '0%'} de las veces`,
    apuesta_sugerida: APUESTA_CONFIG.minima * 2
  });
  
  const mas_peligrosas = frecuencias.top_huesos.slice(0, 5);
  recomendaciones.push({
    momento: 'SIEMPRE',
    prioridad: 'ALTA',
    estrategia: 'EVITAR estas posiciones que frecuentemente son huesos',
    posiciones: mas_peligrosas.map((p: any) => p.posicion),
    razon: `Estas posiciones han sido huesos ${mas_peligrosas[0]?.huesos.porcentaje || '0%'} de las veces`,
    apuesta_sugerida: null
  });
  
  return recomendaciones;
}
