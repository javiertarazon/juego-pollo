/**
 * Analizador Adaptativo de Patrones de Mystake
 * 
 * Analiza las últimas 10 partidas para detectar:
 * - Rotación de huesos según ORDEN de sugerencias (1ra, 2da, 3ra sugerencia)
 * - Zonas calientes con huesos (para evitar)
 * - Frecuencia y rotación de huesos en tiempo real
 * - Patrones de comportamiento de Mystake según historial
 */

import { db } from '@/lib/db';

// Caché para análisis adaptativo
let cacheAnalisis: AnalisisAdaptativo | null = null;
let cacheTimestamp: Date | null = null;
const CACHE_DURATION = 60000; // 60 segundos

interface PatronRotacion {
  ordenSugerencias: string; // Ej: "1ra,2da,3ra" o "1ra,2da" o "1ra"
  posicionesSugeridas: number[][]; // Posiciones sugeridas en ese orden
  huesosEncontrados: number[]; // Huesos que aparecieron después
  frecuencia: number;
}

interface ZonaCaliente {
  posicion: number;
  vecesHueso: number;
  frecuencia: number; // % de veces que es hueso
  ultimasApariciones: number[]; // IDs de partidas donde apareció
  ordenSugerencia: number[]; // En qué orden de sugerencia apareció (1, 2, 3, etc)
}

interface AnalisisAdaptativo {
  ultimasPartidas: number;
  patronesRotacion: PatronRotacion[];
  zonasCalientes: ZonaCaliente[];
  posicionesSeguras: number[];
  posicionesPeligrosas: number[];
  patronesPorOrden: {
    primerasSugerencias: { posicion: number; vecesPollo: number; vecesHueso: number }[];
    segundasSugerencias: { posicion: number; vecesPollo: number; vecesHueso: number }[];
    tercerasSugerencias: { posicion: number; vecesPollo: number; vecesHueso: number }[];
  };
  recomendaciones: string[];
  timestamp: Date;
}

/**
 * Analiza las últimas N partidas para detectar patrones de rotación
 * según el ORDEN de las sugerencias del asesor
 */
export async function analizarUltimasPartidas(limite: number = 10): Promise<AnalisisAdaptativo> {
  const ahora = new Date();
  
  // Verificar caché
  if (cacheAnalisis && cacheTimestamp) {
    const diff = ahora.getTime() - cacheTimestamp.getTime();
    if (diff < CACHE_DURATION) {
      console.log('📦 Usando caché de análisis adaptativo');
      return cacheAnalisis;
    }
  }
  
  console.log('🔄 Calculando nuevo análisis adaptativo...');
  
  // Obtener últimas partidas reales
  const partidas = await db.chickenGame.findMany({
    where: {
      isSimulated: false,
    },
    include: {
      positions: {
        orderBy: {
          revealOrder: 'asc',
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limite,
  });

  if (partidas.length === 0) {
    const emptyAnalisis = {
      ultimasPartidas: 0,
      patronesRotacion: [],
      zonasCalientes: [],
      posicionesSeguras: [],
      posicionesPeligrosas: [],
      patronesPorOrden: {
        primerasSugerencias: [],
        segundasSugerencias: [],
        tercerasSugerencias: [],
      },
      recomendaciones: ['No hay partidas suficientes para análisis'],
      timestamp: new Date(),
    };
    
    // Guardar en caché
    cacheAnalisis = emptyAnalisis;
    cacheTimestamp = new Date();
    
    return emptyAnalisis;
  }

  // Analizar patrones de rotación según ORDEN de sugerencias
  const patronesMap = new Map<string, { posiciones: number[][]; huesos: number[][]; count: number }>();
  const zonasHuesosMap = new Map<number, { count: number; partidas: number[]; ordenes: number[] }>();
  
  // Análisis por orden de sugerencia
  const primerasSugerencias = new Map<number, { pollo: number; hueso: number }>();
  const segundasSugerencias = new Map<number, { pollo: number; hueso: number }>();
  const tercerasSugerencias = new Map<number, { pollo: number; hueso: number }>();

  let totalPollos = 0;
  let totalHuesos = 0;
  let partidasConRetiro = 0;
  let partidasConHueso = 0;
  let sumaRetiros = 0;

  // Analizar cada partida
  partidas.forEach((partida, idx) => {
    const posiciones = partida.positions.filter(p => p.revealed && p.revealOrder > 0);
    const pollos = posiciones.filter(p => p.isChicken);
    const huesos = posiciones.filter(p => !p.isChicken);

    totalPollos += pollos.length;
    totalHuesos += huesos.length;

    if (partida.hitBone) {
      partidasConHueso++;
    } else {
      partidasConRetiro++;
      if (partida.cashOutPosition) {
        sumaRetiros += partida.cashOutPosition;
      }
    }

    // Analizar por ORDEN de sugerencia (no por posición física)
    posiciones.forEach((pos, orden) => {
      const position = pos.position;
      const esPollo = pos.isChicken;
      
      // Primera sugerencia (orden 0)
      if (orden === 0) {
        if (!primerasSugerencias.has(position)) {
          primerasSugerencias.set(position, { pollo: 0, hueso: 0 });
        }
        const stats = primerasSugerencias.get(position)!;
        if (esPollo) stats.pollo++;
        else stats.hueso++;
      }
      
      // Segunda sugerencia (orden 1)
      if (orden === 1) {
        if (!segundasSugerencias.has(position)) {
          segundasSugerencias.set(position, { pollo: 0, hueso: 0 });
        }
        const stats = segundasSugerencias.get(position)!;
        if (esPollo) stats.pollo++;
        else stats.hueso++;
      }
      
      // Tercera sugerencia (orden 2)
      if (orden === 2) {
        if (!tercerasSugerencias.has(position)) {
          tercerasSugerencias.set(position, { pollo: 0, hueso: 0 });
        }
        const stats = tercerasSugerencias.get(position)!;
        if (esPollo) stats.pollo++;
        else stats.hueso++;
      }
    });

    // Identificar secuencia de posiciones sugeridas (en orden)
    const secuenciaPollos = pollos
      .sort((a, b) => (a.revealOrder || 0) - (b.revealOrder || 0))
      .map(p => p.position);
    
    // Identificar huesos
    const huesosPos = huesos.map(h => h.position).sort((a, b) => a - b);

    // Crear clave según número de sugerencias antes del hueso
    const numSugerencias = pollos.length;
    const clave = numSugerencias > 0 ? `${numSugerencias}_sugerencias` : 'sin_sugerencias';
    
    if (!patronesMap.has(clave)) {
      patronesMap.set(clave, { posiciones: [], huesos: [], count: 0 });
    }
    const patron = patronesMap.get(clave)!;
    patron.posiciones.push(secuenciaPollos);
    patron.huesos.push(huesosPos);
    patron.count++;

    // Registrar zonas calientes con orden de sugerencia
    huesosPos.forEach(posHueso => {
      if (!zonasHuesosMap.has(posHueso)) {
        zonasHuesosMap.set(posHueso, { count: 0, partidas: [], ordenes: [] });
      }
      const zona = zonasHuesosMap.get(posHueso)!;
      zona.count++;
      zona.partidas.push(idx);
      // Determinar en qué orden apareció el hueso
      const ordenHueso = posiciones.findIndex(p => p.position === posHueso);
      if (ordenHueso !== -1) {
        zona.ordenes.push(ordenHueso + 1); // +1 para que sea 1ra, 2da, 3ra
      }
    });
  });

  // Procesar patrones de rotación
  const patronesRotacion: PatronRotacion[] = Array.from(patronesMap.entries())
    .map(([clave, data]) => {
      // Calcular huesos más frecuentes para este patrón
      const huesosFrecuencia = new Map<number, number>();
      data.huesos.forEach(huesos => {
        huesos.forEach(h => {
          huesosFrecuencia.set(h, (huesosFrecuencia.get(h) || 0) + 1);
        });
      });

      const huesosOrdenados = Array.from(huesosFrecuencia.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([pos]) => pos);

      return {
        ordenSugerencias: clave,
        posicionesSugeridas: data.posiciones,
        huesosEncontrados: huesosOrdenados.slice(0, 10), // Top 10 huesos
        frecuencia: data.count,
      };
    })
    .sort((a, b) => b.frecuencia - a.frecuencia);

  // Procesar zonas calientes
  const zonasCalientes: ZonaCaliente[] = Array.from(zonasHuesosMap.entries())
    .map(([posicion, data]) => ({
      posicion,
      vecesHueso: data.count,
      frecuencia: (data.count / partidas.length) * 100,
      ultimasApariciones: data.partidas,
      ordenSugerencia: data.ordenes,
    }))
    .filter(z => z.frecuencia >= 20) // Mínimo 20% de frecuencia
    .sort((a, b) => b.frecuencia - a.frecuencia);

  // Identificar posiciones seguras (nunca o raramente huesos)
  const todasPosiciones = Array.from({ length: 25 }, (_, i) => i + 1);
  const posicionesConHuesos = new Set(zonasCalientes.map(z => z.posicion));
  const posicionesSeguras = todasPosiciones.filter(pos => !posicionesConHuesos.has(pos));

  // Identificar posiciones peligrosas (frecuencia >= 40%)
  const posicionesPeligrosas = zonasCalientes
    .filter(z => z.frecuencia >= 40)
    .map(z => z.posicion);

  // Procesar análisis por orden
  const patronesPorOrden = {
    primerasSugerencias: Array.from(primerasSugerencias.entries())
      .map(([posicion, stats]) => ({
        posicion,
        vecesPollo: stats.pollo,
        vecesHueso: stats.hueso,
      }))
      .sort((a, b) => b.vecesPollo - a.vecesPollo),
    
    segundasSugerencias: Array.from(segundasSugerencias.entries())
      .map(([posicion, stats]) => ({
        posicion,
        vecesPollo: stats.pollo,
        vecesHueso: stats.hueso,
      }))
      .sort((a, b) => b.vecesPollo - a.vecesPollo),
    
    tercerasSugerencias: Array.from(tercerasSugerencias.entries())
      .map(([posicion, stats]) => ({
        posicion,
        vecesPollo: stats.pollo,
        vecesHueso: stats.hueso,
      }))
      .sort((a, b) => b.vecesPollo - a.vecesPollo),
  };

  // Generar recomendaciones
  const recomendaciones: string[] = [];

  if (zonasCalientes.length > 0) {
    recomendaciones.push(
      `Evitar posiciones calientes: ${zonasCalientes.slice(0, 5).map(z => z.posicion).join(', ')}`
    );
  }

  if (posicionesSeguras.length > 0) {
    recomendaciones.push(
      `Posiciones seguras detectadas: ${posicionesSeguras.slice(0, 10).join(', ')}`
    );
  }

  if (patronesRotacion.length > 0) {
    const patronPrincipal = patronesRotacion[0];
    recomendaciones.push(
      `Patrón detectado: Después de ${patronPrincipal.ordenSugerencias}, huesos frecuentes en: ${patronPrincipal.huesosEncontrados.slice(0, 5).join(', ')}`
    );
  }

  // Recomendaciones por orden de sugerencia
  if (patronesPorOrden.primerasSugerencias.length > 0) {
    const mejores = patronesPorOrden.primerasSugerencias
      .filter(p => p.vecesPollo > 0 && p.vecesHueso === 0)
      .slice(0, 3);
    if (mejores.length > 0) {
      recomendaciones.push(
        `Mejores 1ras sugerencias: ${mejores.map(p => p.posicion).join(', ')}`
      );
    }
  }

  // Crear análisis completo
  const analisis: AnalisisAdaptativo = {
    ultimasPartidas: partidas.length,
    patronesRotacion,
    zonasCalientes,
    posicionesSeguras,
    posicionesPeligrosas,
    patronesPorOrden,
    recomendaciones,
    timestamp: new Date(),
  };

  // Actualizar caché
  cacheAnalisis = analisis;
  cacheTimestamp = new Date();

  return analisis;
}

/**
 * Invalidar caché (llamar después de guardar nueva partida)
 */
export function invalidarCacheAnalisis(): void {
  cacheAnalisis = null;
  cacheTimestamp = null;
  console.log('🗑️ Caché de análisis invalidado');
}

/**
 * Obtiene posiciones recomendadas basadas en el análisis adaptativo
 */
export async function obtenerPosicionesRecomendadas(
  posicionesReveladas: number[],
  limite: number = 10
): Promise<number[]> {
  const analisis = await analizarUltimasPartidas(limite);

  // Filtrar posiciones ya reveladas
  const disponibles = Array.from({ length: 25 }, (_, i) => i + 1)
    .filter(pos => !posicionesReveladas.includes(pos));

  // Priorizar posiciones seguras
  const segurasDisponibles = disponibles.filter(pos =>
    analisis.posicionesSeguras.includes(pos)
  );

  // Evitar posiciones peligrosas
  const nosPeligrosas = disponibles.filter(pos =>
    !analisis.posicionesPeligrosas.includes(pos)
  );

  // Combinar: primero seguras, luego no peligrosas
  const recomendadas = [
    ...segurasDisponibles,
    ...nosPeligrosas.filter(pos => !segurasDisponibles.includes(pos)),
  ];

  return recomendadas.slice(0, 10);
}

/**
 * Detecta si Mystake está rotando huesos según un patrón
 * basado en el ORDEN de las sugerencias del asesor
 */
export async function detectarRotacionActiva(limite: number = 10): Promise<{
  hayRotacion: boolean;
  patron: string;
  confianza: number;
  descripcion: string;
}> {
  const analisis = await analizarUltimasPartidas(limite);

  if (analisis.patronesRotacion.length === 0) {
    return {
      hayRotacion: false,
      patron: 'ninguno',
      confianza: 0,
      descripcion: 'No se detectó rotación de huesos',
    };
  }

  // Verificar si hay un patrón dominante
  const patronPrincipal = analisis.patronesRotacion[0];
  const confianza = (patronPrincipal.frecuencia / analisis.ultimasPartidas) * 100;

  if (confianza >= 60) {
    return {
      hayRotacion: true,
      patron: patronPrincipal.ordenSugerencias,
      confianza,
      descripcion: `Rotación detectada: Después de ${patronPrincipal.ordenSugerencias}, huesos frecuentes en: ${patronPrincipal.huesosEncontrados.slice(0, 5).join(', ')}`,
    };
  }

  return {
    hayRotacion: false,
    patron: 'variable',
    confianza,
    descripcion: 'Rotación variable, sin patrón claro',
  };
}

/**
 * Calcula el score de seguridad de una posición basado en análisis adaptativo
 */
export async function calcularScoreSeguridad(
  posicion: number,
  limite: number = 10
): Promise<{
  score: number;
  nivel: 'MUY_SEGURA' | 'SEGURA' | 'NEUTRAL' | 'PELIGROSA' | 'MUY_PELIGROSA';
  razon: string;
}> {
  const analisis = await analizarUltimasPartidas(limite);

  // Verificar si es zona caliente
  const zonaCaliente = analisis.zonasCalientes.find(z => z.posicion === posicion);
  
  if (zonaCaliente) {
    const frecuencia = zonaCaliente.frecuencia;
    
    if (frecuencia >= 60) {
      return {
        score: 0,
        nivel: 'MUY_PELIGROSA',
        razon: `Hueso en ${frecuencia.toFixed(0)}% de últimas ${limite} partidas`,
      };
    } else if (frecuencia >= 40) {
      return {
        score: 25,
        nivel: 'PELIGROSA',
        razon: `Hueso en ${frecuencia.toFixed(0)}% de últimas ${limite} partidas`,
      };
    } else {
      return {
        score: 50,
        nivel: 'NEUTRAL',
        razon: `Hueso en ${frecuencia.toFixed(0)}% de últimas ${limite} partidas`,
      };
    }
  }

  // Si es posición segura
  if (analisis.posicionesSeguras.includes(posicion)) {
    return {
      score: 100,
      nivel: 'MUY_SEGURA',
      razon: `Sin huesos en últimas ${limite} partidas`,
    };
  }

  // Neutral por defecto
  return {
    score: 75,
    nivel: 'SEGURA',
    razon: `Pocos huesos en últimas ${limite} partidas`,
  };
}

/**
 * Genera un reporte completo del análisis adaptativo
 */
export async function generarReporteAdaptativo(limite: number = 10): Promise<string> {
  const analisis = await analizarUltimasPartidas(limite);
  const rotacion = await detectarRotacionActiva(limite);

  let reporte = `\n🔍 ANÁLISIS ADAPTATIVO (Últimas ${analisis.ultimasPartidas} partidas)\n`;
  reporte += `Timestamp: ${analisis.timestamp.toLocaleString()}\n\n`;

  // Rotación detectada
  reporte += `📊 ROTACIÓN DE HUESOS (según orden de sugerencias):\n`;
  reporte += `   ${rotacion.hayRotacion ? '✅' : '❌'} ${rotacion.descripcion}\n`;
  reporte += `   Confianza: ${rotacion.confianza.toFixed(1)}%\n\n`;

  // Análisis por orden de sugerencia
  reporte += `🎯 ANÁLISIS POR ORDEN DE SUGERENCIA:\n\n`;
  
  if (analisis.patronesPorOrden.primerasSugerencias.length > 0) {
    reporte += `   1️⃣ PRIMERAS SUGERENCIAS (Top 5):\n`;
    analisis.patronesPorOrden.primerasSugerencias.slice(0, 5).forEach(p => {
      const total = p.vecesPollo + p.vecesHueso;
      const porcentaje = total > 0 ? (p.vecesPollo / total * 100).toFixed(0) : 0;
      const emoji = p.vecesHueso === 0 ? '✅' : p.vecesPollo > p.vecesHueso ? '⚠️' : '❌';
      reporte += `      ${emoji} Pos ${p.posicion}: ${p.vecesPollo} pollos, ${p.vecesHueso} huesos (${porcentaje}% éxito)\n`;
    });
    reporte += `\n`;
  }

  if (analisis.patronesPorOrden.segundasSugerencias.length > 0) {
    reporte += `   2️⃣ SEGUNDAS SUGERENCIAS (Top 5):\n`;
    analisis.patronesPorOrden.segundasSugerencias.slice(0, 5).forEach(p => {
      const total = p.vecesPollo + p.vecesHueso;
      const porcentaje = total > 0 ? (p.vecesPollo / total * 100).toFixed(0) : 0;
      const emoji = p.vecesHueso === 0 ? '✅' : p.vecesPollo > p.vecesHueso ? '⚠️' : '❌';
      reporte += `      ${emoji} Pos ${p.posicion}: ${p.vecesPollo} pollos, ${p.vecesHueso} huesos (${porcentaje}% éxito)\n`;
    });
    reporte += `\n`;
  }

  if (analisis.patronesPorOrden.tercerasSugerencias.length > 0) {
    reporte += `   3️⃣ TERCERAS SUGERENCIAS (Top 5):\n`;
    analisis.patronesPorOrden.tercerasSugerencias.slice(0, 5).forEach(p => {
      const total = p.vecesPollo + p.vecesHueso;
      const porcentaje = total > 0 ? (p.vecesPollo / total * 100).toFixed(0) : 0;
      const emoji = p.vecesHueso === 0 ? '✅' : p.vecesPollo > p.vecesHueso ? '⚠️' : '❌';
      reporte += `      ${emoji} Pos ${p.posicion}: ${p.vecesPollo} pollos, ${p.vecesHueso} huesos (${porcentaje}% éxito)\n`;
    });
    reporte += `\n`;
  }

  // Zonas calientes
  if (analisis.zonasCalientes.length > 0) {
    reporte += `🔥 ZONAS CALIENTES (Evitar):\n`;
    analisis.zonasCalientes.slice(0, 5).forEach(zona => {
      const ordenesStr = zona.ordenSugerencia.length > 0 
        ? ` (aparece en ${zona.ordenSugerencia[0]}ª sugerencia)`
        : '';
      reporte += `   Posición ${zona.posicion}: ${zona.vecesHueso}/${analisis.ultimasPartidas} huesos (${zona.frecuencia.toFixed(0)}%)${ordenesStr}\n`;
    });
    reporte += `\n`;
  }

  // Posiciones seguras
  if (analisis.posicionesSeguras.length > 0) {
    reporte += `🛡️ POSICIONES SEGURAS:\n`;
    reporte += `   ${analisis.posicionesSeguras.slice(0, 15).join(', ')}\n\n`;
  }

  // Patrones de rotación
  if (analisis.patronesRotacion.length > 0) {
    reporte += `🔄 PATRONES DE ROTACIÓN:\n`;
    analisis.patronesRotacion.slice(0, 3).forEach((patron, idx) => {
      reporte += `   ${idx + 1}. ${patron.ordenSugerencias} → Huesos en: ${patron.huesosEncontrados.slice(0, 5).join(', ')} (${patron.frecuencia} veces)\n`;
    });
    reporte += `\n`;
  }

  // Recomendaciones
  reporte += `💡 RECOMENDACIONES:\n`;
  analisis.recomendaciones.forEach(rec => {
    reporte += `   • ${rec}\n`;
  });

  return reporte;
}

export default {
  analizarUltimasPartidas,
  obtenerPosicionesRecomendadas,
  detectarRotacionActiva,
  calcularScoreSeguridad,
  generarReporteAdaptativo,
};
