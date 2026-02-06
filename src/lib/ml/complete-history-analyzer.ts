/**
 * Analizador de Historial Completo de Partidas Reales
 * 
 * Este módulo analiza TODAS las partidas reales almacenadas en la base de datos
 * para identificar patrones estadísticamente significativos, calcular métricas
 * robustas y generar reportes con recomendaciones de mejora para el modelo ML.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.7
 */

import { db as prisma } from '@/lib/db';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Representa una partida analizada con todos sus datos relevantes
 */
export interface PartidaAnalizada {
  id: string;
  fecha: Date;
  posicionesHuesos: number[];
  posicionesPollos: number[];
  secuenciaJugadas: number[];
  objetivo: number;
  exitosa: boolean;
  cashOutPosition: number | null;
}

/**
 * Métricas de efectividad calculadas del historial completo
 */
export interface MetricasEfectividad {
  tasaAcierto: number; // % de predicciones correctas
  tasaExito: number; // % de partidas ganadas
  promedioRetiro: number; // Promedio de posiciones antes de retiro
  mejorRacha: number; // Mejor racha de victorias
  posicionesMasSeguras: { posicion: number; tasa: number }[];
  posicionesMasPeligrosas: { posicion: number; tasa: number }[];
}

/**
 * Patrón identificado en el historial con significancia estadística
 */
export interface PatronIdentificado {
  tipo: 'secuencia' | 'rotacion' | 'zona_caliente' | 'zona_fria';
  descripcion: string;
  frecuencia: number; // Número de veces que aparece
  confianza: number; // % de confianza (0-100)
  posicionesAfectadas: number[];
  significanciaEstadistica?: number; // p-value o chi-cuadrado
}

/**
 * Reporte completo de análisis del historial
 */
export interface ReporteAnalisis {
  id: string;
  timestamp: Date;
  partidasAnalizadas: number;
  metricas: MetricasEfectividad;
  patrones: PatronIdentificado[];
  recomendaciones: string[];
  comparacionPredicciones: {
    predichas: number[];
    reales: number[];
    coincidencias: number;
    tasaCoincidencia: number;
  };
}

// ============================================================================
// FUNCIONES PRINCIPALES
// ============================================================================

/**
 * Recupera TODAS las partidas reales de la base de datos
 * Requirements: 1.1
 */
export async function recuperarTodasLasPartidas(): Promise<PartidaAnalizada[]> {
  console.log('[CompleteHistoryAnalyzer] Recuperando todas las partidas reales...');
  
  const partidas = await prisma.chickenGame.findMany({
    where: {
      isSimulated: false,
    },
    include: {
      positions: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  console.log(`[CompleteHistoryAnalyzer] Total de partidas recuperadas: ${partidas.length}`);

  const partidasAnalizadas: PartidaAnalizada[] = partidas.map((partida) => {
    const posicionesHuesos = partida.positions
      .filter((p) => !p.isChicken)
      .map((p) => p.position);
    
    const posicionesPollos = partida.positions
      .filter((p) => p.isChicken)
      .map((p) => p.position);
    
    const secuenciaJugadas = partida.positions
      .filter((p) => p.revealed && p.revealOrder > 0)
      .sort((a, b) => (a.revealOrder || 0) - (b.revealOrder || 0))
      .map((p) => p.position);

    return {
      id: partida.id,
      fecha: partida.createdAt,
      posicionesHuesos,
      posicionesPollos,
      secuenciaJugadas,
      objetivo: partida.objetivo || 2,
      exitosa: !partida.hitBone && partida.cashOutPosition !== null,
      cashOutPosition: partida.cashOutPosition,
    };
  });

  return partidasAnalizadas;
}

/**
 * Calcula métricas de efectividad del historial completo
 * Requirements: 1.3
 */
export async function calcularMetricasCompletas(
  partidas: PartidaAnalizada[]
): Promise<MetricasEfectividad> {
  console.log('[CompleteHistoryAnalyzer] Calculando métricas completas...');

  if (partidas.length === 0) {
    return {
      tasaAcierto: 0,
      tasaExito: 0,
      promedioRetiro: 0,
      mejorRacha: 0,
      posicionesMasSeguras: [],
      posicionesMasPeligrosas: [],
    };
  }

  // Calcular tasa de éxito
  const partidasExitosas = partidas.filter((p) => p.exitosa).length;
  const tasaExito = (partidasExitosas / partidas.length) * 100;

  // Calcular promedio de retiro
  const retirosValidos = partidas.filter((p) => p.cashOutPosition !== null);
  const promedioRetiro = retirosValidos.length > 0
    ? retirosValidos.reduce((sum, p) => sum + (p.cashOutPosition || 0), 0) / retirosValidos.length
    : 0;

  // Calcular mejor racha
  let rachaActual = 0;
  let mejorRacha = 0;
  for (const partida of partidas) {
    if (partida.exitosa) {
      rachaActual++;
      mejorRacha = Math.max(mejorRacha, rachaActual);
    } else {
      rachaActual = 0;
    }
  }

  // Analizar posiciones más seguras y peligrosas
  const posicionStats = new Map<number, { pollos: number; huesos: number }>();
  
  for (const partida of partidas) {
    for (const pos of partida.posicionesPollos) {
      const stats = posicionStats.get(pos) || { pollos: 0, huesos: 0 };
      stats.pollos++;
      posicionStats.set(pos, stats);
    }
    for (const pos of partida.posicionesHuesos) {
      const stats = posicionStats.get(pos) || { pollos: 0, huesos: 0 };
      stats.huesos++;
      posicionStats.set(pos, stats);
    }
  }

  const posicionesConTasa = Array.from(posicionStats.entries())
    .map(([posicion, stats]) => ({
      posicion,
      tasa: (stats.pollos / (stats.pollos + stats.huesos)) * 100,
      total: stats.pollos + stats.huesos,
    }))
    .filter((p) => p.total >= 5); // Mínimo 5 apariciones para ser significativo

  const posicionesMasSeguras = posicionesConTasa
    .sort((a, b) => b.tasa - a.tasa)
    .slice(0, 5)
    .map((p) => ({ posicion: p.posicion, tasa: p.tasa }));

  const posicionesMasPeligrosas = posicionesConTasa
    .sort((a, b) => a.tasa - b.tasa)
    .slice(0, 5)
    .map((p) => ({ posicion: p.posicion, tasa: p.tasa }));

  // Calcular tasa de acierto (basado en predicciones vs resultados)
  // Por ahora, usamos la tasa de éxito como proxy
  const tasaAcierto = tasaExito;

  return {
    tasaAcierto,
    tasaExito,
    promedioRetiro,
    mejorRacha,
    posicionesMasSeguras,
    posicionesMasPeligrosas,
  };
}

/**
 * Calcula la significancia estadística de un patrón
 * Requirements: 1.4
 */
export function calcularSignificanciaEstadistica(
  patron: PatronIdentificado,
  totalPartidas: number
): number {
  // Calcular chi-cuadrado para determinar significancia
  const frecuenciaEsperada = totalPartidas * 0.05; // 5% como baseline
  const frecuenciaObservada = patron.frecuencia;
  
  const chiCuadrado = Math.pow(frecuenciaObservada - frecuenciaEsperada, 2) / frecuenciaEsperada;
  
  // Convertir chi-cuadrado a p-value aproximado
  // Para 1 grado de libertad, chi-cuadrado > 3.841 indica p < 0.05 (95% confianza)
  // chi-cuadrado > 6.635 indica p < 0.01 (99% confianza)
  
  let pValue: number;
  if (chiCuadrado > 6.635) {
    pValue = 0.01; // 99% confianza
  } else if (chiCuadrado > 3.841) {
    pValue = 0.05; // 95% confianza
  } else {
    pValue = 0.1; // No significativo
  }
  
  return pValue;
}

/**
 * Identifica patrones estadísticamente significativos en el historial
 * Requirements: 1.4
 */
export async function identificarPatronesSignificativos(
  partidas: PartidaAnalizada[]
): Promise<PatronIdentificado[]> {
  console.log('[CompleteHistoryAnalyzer] Identificando patrones significativos...');

  const patrones: PatronIdentificado[] = [];
  const totalPartidas = partidas.length;

  if (totalPartidas === 0) {
    return patrones;
  }

  // 1. Detectar secuencias recurrentes
  const secuencias = new Map<string, number>();
  for (const partida of partidas) {
    if (partida.secuenciaJugadas.length >= 3) {
      const secuencia = partida.secuenciaJugadas.slice(0, 3).join('-');
      secuencias.set(secuencia, (secuencias.get(secuencia) || 0) + 1);
    }
  }

  for (const [secuencia, frecuencia] of secuencias.entries()) {
    const porcentaje = (frecuencia / totalPartidas) * 100;
    if (porcentaje >= 5) { // Mínimo 5% de frecuencia
      const posiciones = secuencia.split('-').map(Number);
      const patron: PatronIdentificado = {
        tipo: 'secuencia',
        descripcion: `Secuencia común: ${secuencia}`,
        frecuencia,
        confianza: porcentaje,
        posicionesAfectadas: posiciones,
      };
      patron.significanciaEstadistica = calcularSignificanciaEstadistica(patron, totalPartidas);
      
      // Solo incluir patrones estadísticamente significativos (p < 0.05)
      if (patron.significanciaEstadistica <= 0.05) {
        patrones.push(patron);
      }
    }
  }

  // 2. Detectar zonas calientes (posiciones frecuentemente seguras)
  const posicionesSeguras = new Map<number, number>();
  for (const partida of partidas) {
    for (const pos of partida.posicionesPollos) {
      posicionesSeguras.set(pos, (posicionesSeguras.get(pos) || 0) + 1);
    }
  }

  for (const [posicion, frecuencia] of posicionesSeguras.entries()) {
    const porcentaje = (frecuencia / totalPartidas) * 100;
    if (porcentaje >= 50) { // Aparece en al menos 50% de partidas
      const patron: PatronIdentificado = {
        tipo: 'zona_caliente',
        descripcion: `Posición ${posicion} es frecuentemente segura`,
        frecuencia,
        confianza: porcentaje,
        posicionesAfectadas: [posicion],
      };
      patron.significanciaEstadistica = calcularSignificanciaEstadistica(patron, totalPartidas);
      
      if (patron.significanciaEstadistica <= 0.05) {
        patrones.push(patron);
      }
    }
  }

  // 3. Detectar zonas frías (posiciones frecuentemente peligrosas)
  const posicionesPeligrosas = new Map<number, number>();
  for (const partida of partidas) {
    for (const pos of partida.posicionesHuesos) {
      posicionesPeligrosas.set(pos, (posicionesPeligrosas.get(pos) || 0) + 1);
    }
  }

  for (const [posicion, frecuencia] of posicionesPeligrosas.entries()) {
    const porcentaje = (frecuencia / totalPartidas) * 100;
    if (porcentaje >= 30) { // Aparece en al menos 30% de partidas
      const patron: PatronIdentificado = {
        tipo: 'zona_fria',
        descripcion: `Posición ${posicion} es frecuentemente peligrosa`,
        frecuencia,
        confianza: porcentaje,
        posicionesAfectadas: [posicion],
      };
      patron.significanciaEstadistica = calcularSignificanciaEstadistica(patron, totalPartidas);
      
      if (patron.significanciaEstadistica <= 0.05) {
        patrones.push(patron);
      }
    }
  }

  console.log(`[CompleteHistoryAnalyzer] Patrones significativos identificados: ${patrones.length}`);
  return patrones;
}

/**
 * Compara predicciones históricas con resultados reales
 * Requirements: 1.5
 */
export async function compararPrediccionesHistoricas(
  partidas: PartidaAnalizada[]
): Promise<ReporteAnalisis['comparacionPredicciones']> {
  console.log('[CompleteHistoryAnalyzer] Comparando predicciones históricas...');

  // Por ahora, retornamos datos simulados ya que no tenemos predicciones almacenadas
  // En una implementación futura, esto debería comparar predicciones reales del ML
  
  const predichas: number[] = [];
  const reales: number[] = [];
  let coincidencias = 0;

  for (const partida of partidas) {
    if (partida.secuenciaJugadas.length > 0) {
      // Simulamos que la predicción fue la primera posición jugada
      const predicha = partida.secuenciaJugadas[0];
      const real = partida.posicionesPollos.includes(predicha) ? predicha : 0;
      
      predichas.push(predicha);
      reales.push(real);
      
      if (predicha === real && real !== 0) {
        coincidencias++;
      }
    }
  }

  const tasaCoincidencia = predichas.length > 0
    ? (coincidencias / predichas.length) * 100
    : 0;

  return {
    predichas,
    reales,
    coincidencias,
    tasaCoincidencia,
  };
}

/**
 * Genera recomendaciones basadas en métricas y patrones
 * Requirements: 1.6
 */
export async function generarRecomendacionesBasadasEnHistorial(
  metricas: MetricasEfectividad,
  patrones: PatronIdentificado[]
): Promise<string[]> {
  console.log('[CompleteHistoryAnalyzer] Generando recomendaciones...');

  const recomendaciones: string[] = [];

  // Recomendaciones basadas en tasa de éxito
  if (metricas.tasaExito < 50) {
    recomendaciones.push(
      `⚠️ Tasa de éxito baja (${metricas.tasaExito.toFixed(1)}%). Considerar ajustar estrategia de predicción.`
    );
  } else if (metricas.tasaExito > 70) {
    recomendaciones.push(
      `✅ Tasa de éxito alta (${metricas.tasaExito.toFixed(1)}%). Mantener estrategia actual.`
    );
  }

  // Recomendaciones basadas en posiciones seguras
  if (metricas.posicionesMasSeguras.length > 0) {
    const posiciones = metricas.posicionesMasSeguras.map((p) => p.posicion).join(', ');
    recomendaciones.push(
      `🎯 Priorizar posiciones más seguras: ${posiciones}`
    );
  }

  // Recomendaciones basadas en posiciones peligrosas
  if (metricas.posicionesMasPeligrosas.length > 0) {
    const posiciones = metricas.posicionesMasPeligrosas.map((p) => p.posicion).join(', ');
    recomendaciones.push(
      `⚠️ Evitar posiciones peligrosas: ${posiciones}`
    );
  }

  // Recomendaciones basadas en patrones
  const zonasCalientes = patrones.filter((p) => p.tipo === 'zona_caliente');
  if (zonasCalientes.length > 0) {
    const posiciones = zonasCalientes.map((p) => p.posicionesAfectadas[0]).join(', ');
    recomendaciones.push(
      `🔥 Zonas calientes detectadas (alta seguridad): ${posiciones}`
    );
  }

  const zonasFrias = patrones.filter((p) => p.tipo === 'zona_fria');
  if (zonasFrias.length > 0) {
    const posiciones = zonasFrias.map((p) => p.posicionesAfectadas[0]).join(', ');
    recomendaciones.push(
      `❄️ Zonas frías detectadas (alto riesgo): ${posiciones}`
    );
  }

  // Recomendaciones basadas en promedio de retiro
  if (metricas.promedioRetiro < 2) {
    recomendaciones.push(
      `📊 Promedio de retiro muy bajo (${metricas.promedioRetiro.toFixed(1)}). Considerar estrategia más conservadora.`
    );
  } else if (metricas.promedioRetiro > 5) {
    recomendaciones.push(
      `📊 Promedio de retiro alto (${metricas.promedioRetiro.toFixed(1)}). Estrategia agresiva funcionando bien.`
    );
  }

  return recomendaciones;
}

/**
 * Guarda el reporte en la base de datos
 * Requirements: 2.7
 */
export async function guardarReporte(reporte: ReporteAnalisis): Promise<void> {
  console.log('[CompleteHistoryAnalyzer] Guardando reporte en base de datos...');

  await prisma.analysisReport.create({
    data: {
      id: reporte.id,
      timestamp: reporte.timestamp,
      partidasAnalizadas: reporte.partidasAnalizadas,
      tasaAcierto: reporte.metricas.tasaAcierto,
      tasaExito: reporte.metricas.tasaExito,
      promedioRetiro: reporte.metricas.promedioRetiro,
      mejorRacha: reporte.metricas.mejorRacha,
      patrones: JSON.stringify(reporte.patrones),
      recomendaciones: JSON.stringify(reporte.recomendaciones),
      comparacionData: JSON.stringify(reporte.comparacionPredicciones),
    },
  });

  console.log(`[CompleteHistoryAnalyzer] Reporte guardado con ID: ${reporte.id}`);
}

/**
 * Función principal: Analiza el historial completo y genera reporte
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.7
 */
export async function analizarHistorialCompleto(): Promise<ReporteAnalisis> {
  console.log('[CompleteHistoryAnalyzer] Iniciando análisis del historial completo...');

  // 1. Recuperar todas las partidas reales
  const partidas = await recuperarTodasLasPartidas();

  if (partidas.length === 0) {
    throw new Error('No hay partidas reales para analizar');
  }

  console.log(`[CompleteHistoryAnalyzer] Analizando ${partidas.length} partidas...`);

  // 2. Calcular métricas
  const metricas = await calcularMetricasCompletas(partidas);

  // 3. Identificar patrones significativos
  const patrones = await identificarPatronesSignificativos(partidas);

  // 4. Comparar predicciones
  const comparacionPredicciones = await compararPrediccionesHistoricas(partidas);

  // 5. Generar recomendaciones
  const recomendaciones = await generarRecomendacionesBasadasEnHistorial(metricas, patrones);

  // 6. Crear reporte
  const reporte: ReporteAnalisis = {
    id: `report-${Date.now()}`,
    timestamp: new Date(),
    partidasAnalizadas: partidas.length,
    metricas,
    patrones,
    recomendaciones,
    comparacionPredicciones,
  };

  // 7. Guardar reporte
  await guardarReporte(reporte);

  console.log('[CompleteHistoryAnalyzer] Análisis completado exitosamente');
  console.log(`[CompleteHistoryAnalyzer] Partidas analizadas: ${partidas.length}`);
  console.log(`[CompleteHistoryAnalyzer] Tasa de éxito: ${metricas.tasaExito.toFixed(1)}%`);
  console.log(`[CompleteHistoryAnalyzer] Patrones identificados: ${patrones.length}`);
  console.log(`[CompleteHistoryAnalyzer] Recomendaciones generadas: ${recomendaciones.length}`);

  return reporte;
}
