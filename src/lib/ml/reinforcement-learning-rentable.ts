// Sistema de Aprendizaje por Refuerzo - ASESOR RENTABLE 2-3 POSICIONES
import { db } from '@/lib/db';
import {
  analizarUltimasPartidas,
  calcularScoreSeguridad,
  detectarRotacionActiva,
} from './adaptive-pattern-analyzer';
import {
  getHotPositions as getHotPositionsCommon,
  degradeEpsilon as degradeEpsilonCommon,
  detectMystakeAdaptation as detectMystakeAdaptationCommon,
  getUnexploredPositions as getUnexploredPositionsCommon,
  selectRandomPosition as selectRandomPositionCommon,
} from './ml-common';

// CONFIGURACIÓN RENTABLE: Solo posiciones MÁS SEGURAS (93%+ pollos)
const POSICIONES_ULTRA_SEGURAS = [19, 13, 7, 18, 11, 10, 6, 25, 22, 1];

// Posiciones PELIGROSAS a evitar completamente
const POSICIONES_PELIGROSAS = [24, 3, 8, 16, 5, 9, 12, 14];

interface MLStateRentable {
  epsilon: number; // Factor de exploración REDUCIDO (25%)
  totalGames: number;
  consecutiveSafePositions: number[]; // Últimas 10 posiciones usadas
  positionQValues: Record<number, number>;
  positionSuccessRate: Record<number, { wins: number; total: number }>;
  explorationCount: number;
  objetivo: 2 | 3; // Objetivo de posiciones
  lastAdaptiveAnalysis: Date | null;
  adaptiveScores: Record<number, number>;
  rachaDerrota: number; // Contador de derrotas consecutivas (stop-loss)
  stopLossActivado: boolean; // Flag si se activó stop-loss
  initialized: boolean; // Control de inicialización de datos
}

// Estado global del ML RENTABLE
let mlStateRentable: MLStateRentable = {
  epsilon: 0.25, // 25% exploración (REDUCIDO para mayor consistencia)
  totalGames: 0,
  consecutiveSafePositions: [],
  positionQValues: {},
  positionSuccessRate: {},
  explorationCount: 0,
  objetivo: 2, // Objetivo por defecto: 2 posiciones
  lastAdaptiveAnalysis: null,
  adaptiveScores: {},
  rachaDerrota: 0, // Inicializar contador stop-loss
  stopLossActivado: false, // Inicializar flag stop-loss
  initialized: false, // No inicializado al inicio
};

// Parámetros de aprendizaje RENTABLE
const LEARNING_RATE = 0.15;
const MIN_EPSILON = 0.10; // Mínimo 10% exploración
const EPSILON_DECAY = 0.995;
const SAFE_SEQUENCE_LENGTH = 10; // Memoria de 10 posiciones

/**
 * Inicializar Q-values para posiciones SEGURAS
 */
export function initializeMLStateRentable() {
  // Inicializar solo posiciones seguras con valor alto
  POSICIONES_ULTRA_SEGURAS.forEach(pos => {
    mlStateRentable.positionQValues[pos] = 0.85; // Valor alto inicial
    mlStateRentable.positionSuccessRate[pos] = { wins: 0, total: 0 };
    mlStateRentable.adaptiveScores[pos] = 0.85; // Score adaptativo inicial alto
  });
  
  // Inicializar posiciones peligrosas con valor bajo
  POSICIONES_PELIGROSAS.forEach(pos => {
    mlStateRentable.positionQValues[pos] = 0.10; // Valor bajo inicial
    mlStateRentable.positionSuccessRate[pos] = { wins: 0, total: 0 };
    mlStateRentable.adaptiveScores[pos] = 0.10; // Score adaptativo inicial bajo
  });
  
  // Resto de posiciones con valor neutral
  for (let pos = 1; pos <= 25; pos++) {
    if (!mlStateRentable.positionQValues[pos]) {
      mlStateRentable.positionQValues[pos] = 0.50;
      mlStateRentable.positionSuccessRate[pos] = { wins: 0, total: 0 };
      mlStateRentable.adaptiveScores[pos] = 0.75; // Score neutral inicial
    }
  }
}

/**
 * Actualizar análisis adaptativo si es necesario
 */
async function actualizarAnalisisAdaptativoRentable(): Promise<void> {
  const ahora = new Date();
  const ultimoAnalisis = mlStateRentable.lastAdaptiveAnalysis;
  const INTERVALO = 60000; // 60 segundos

  // Actualizar si nunca se ha hecho o si pasó el intervalo
  if (!ultimoAnalisis || (ahora.getTime() - ultimoAnalisis.getTime()) > INTERVALO) {
    console.log('🔄 Actualizando análisis adaptativo rentable...');
    
    try {
      // Analizar últimas 10 partidas
      const analisis = await analizarUltimasPartidas(10);
      
      // Actualizar scores adaptativos para posiciones seguras
      for (const pos of POSICIONES_ULTRA_SEGURAS) {
        const scoreData = await calcularScoreSeguridad(pos, 10);
        mlStateRentable.adaptiveScores[pos] = scoreData.score / 100; // Normalizar a 0-1
      }

      // Detectar rotación activa
      const rotacion = await detectarRotacionActiva(10);
      if (rotacion.hayRotacion) {
        console.log(`🔄 Rotación detectada: ${rotacion.descripcion} (${rotacion.confianza.toFixed(1)}% confianza)`);
      }

      // Mostrar zonas calientes
      if (analisis.zonasCalientes.length > 0) {
        console.log(`🔥 Zonas calientes: ${analisis.zonasCalientes.slice(0, 5).map(z => `${z.posicion}(${z.frecuencia.toFixed(0)}%)`).join(', ')}`);
      }

      mlStateRentable.lastAdaptiveAnalysis = ahora;
    } catch (error) {
      console.error('❌ Error en análisis adaptativo rentable:', error);
    }
  }
}

/**
 * Obtener posiciones calientes (evitar)
 */
async function getHotPositions(): Promise<number[]> {
  // Usar función común con 5 juegos de ventana
  const hotCommon = await getHotPositionsCommon(5);
  
  // Combinar con análisis adaptativo si está disponible
  const analisis = await analizarUltimasPartidas(5);
  const hotFromAnalysis = analisis.zonasCalientes
    .filter(z => z.frecuencia > 40) // >40% frecuencia = caliente
    .map(z => z.posicion);
  
  // Unir y devolver únicos
  return [...new Set([...hotCommon, ...hotFromAnalysis])];
}

/**
 * Seleccionar posición usando estrategia RENTABLE
 */
export async function selectPositionMLRentable(
  revealedPositions: number[],
  objetivo: 2 | 3 = 2
): Promise<{
  position: number;
  confidence: number;
  strategy: 'EXPLORE' | 'EXPLOIT';
  reason: string;
}> {
  // ⛔ STOP-LOSS: Detener si hay 3+ derrotas consecutivas
  if (mlStateRentable.rachaDerrota >= 3) {
    mlStateRentable.stopLossActivado = true;
    throw new Error(
      `⛔ STOP-LOSS ACTIVADO - ${mlStateRentable.rachaDerrota} derrotas consecutivas. Detener juego.`
    );
  }

  // Actualizar objetivo
  mlStateRentable.objetivo = objetivo;
  
  // Cargar datos si NO está inicializado (primera vez o reinicio servidor)
  if (!mlStateRentable.initialized) {
    await loadMLStateRentable();
  }

  // Actualizar análisis adaptativo
  await actualizarAnalisisAdaptativoRentable();

  // 🔍 Detectar si Mystake se está adaptando (>60% pérdidas recientes)
  const mystakeAdapting = await detectMystakeAdaptationCommon();
  if (mystakeAdapting) {
    console.log('⚠️ MYSTAKE ADAPTÁNDOSE - Aumentando exploración +20%');
    mlStateRentable.epsilon = Math.min(0.80, mlStateRentable.epsilon + 0.20);
  }

  // 🔄 EXPLORACIÓN FORZADA cada 20 partidas para posiciones no exploradas
  const unexploredPositions = await getUnexploredPositionsCommon();
  if (mlStateRentable.totalGames > 0 && mlStateRentable.totalGames % 20 === 0 && unexploredPositions.length > 0) {
    const unexploredAvailable = unexploredPositions.filter(p => !revealedPositions.includes(p));
    if (unexploredAvailable.length > 0) {
      const position = await selectRandomPositionCommon(unexploredAvailable);
      console.log(`🔄 EXPLORACIÓN FORZADA (cada 20 juegos) - Pos ${position} (no explorada)`);
      
      // Actualizar memoria
      mlStateRentable.consecutiveSafePositions.push(position);
      if (mlStateRentable.consecutiveSafePositions.length > SAFE_SEQUENCE_LENGTH) {
        mlStateRentable.consecutiveSafePositions.shift();
      }
      
      return {
        position,
        confidence: 50,
        strategy: 'EXPLORE',
        reason: 'Exploración forzada de posiciones no probadas',
      };
    }
  }

  // Obtener posiciones calientes
  const hotPositions = await getHotPositions();

  // Filtrar posiciones disponibles: SOLO SEGURAS
  let availablePositions = POSICIONES_ULTRA_SEGURAS.filter(
    (p) => !revealedPositions.includes(p) && !hotPositions.includes(p)
  );

  // Si no hay posiciones seguras disponibles, usar cualquiera excepto peligrosas
  if (availablePositions.length === 0) {
    availablePositions = Array.from({ length: 25 }, (_, i) => i + 1).filter(
      (p) =>
        !revealedPositions.includes(p) &&
        !hotPositions.includes(p) &&
        !POSICIONES_PELIGROSAS.includes(p)
    );
  }

  // Si aún no hay, permitir cualquiera
  if (availablePositions.length === 0) {
    availablePositions = Array.from({ length: 25 }, (_, i) => i + 1).filter(
      (p) => !revealedPositions.includes(p)
    );
  }

  if (availablePositions.length === 0) {
    throw new Error('No hay posiciones disponibles');
  }

  // Evitar repetir posiciones recientes
  const recentPositions = mlStateRentable.consecutiveSafePositions.slice(-SAFE_SEQUENCE_LENGTH);
  const freshPositions = availablePositions.filter((p) => !recentPositions.includes(p));

  const candidatePositions = freshPositions.length > 0 ? freshPositions : availablePositions;

  // Decidir estrategia: EXPLOIT (75%) o EXPLORE (25%)
  const shouldExplore = Math.random() < mlStateRentable.epsilon;

  let selectedPosition: number;
  let strategy: 'EXPLORE' | 'EXPLOIT';
  let reason: string;

  if (shouldExplore) {
    // EXPLORACIÓN: Elegir aleatoriamente de posiciones seguras
    selectedPosition = candidatePositions[Math.floor(Math.random() * candidatePositions.length)];
    strategy = 'EXPLORE';
    reason = 'Exploración de posiciones seguras';
    mlStateRentable.explorationCount++;
  } else {
    // EXPLOTACIÓN: Elegir la mejor según Q-values + scores adaptativos
    const positionsWithScores = candidatePositions.map((pos) => {
      let score = mlStateRentable.positionQValues[pos] || 0.5;

      // BONUS MASIVO para posiciones ultra seguras
      if (POSICIONES_ULTRA_SEGURAS.includes(pos)) {
        score += 0.30;
      }

      // PENALIZACIÓN BRUTAL para posiciones peligrosas
      if (POSICIONES_PELIGROSAS.includes(pos)) {
        score -= 0.50;
      }

      // Bonus por tasa de éxito histórica
      const stats = mlStateRentable.positionSuccessRate[pos];
      if (stats && stats.total > 0) {
        const successRate = stats.wins / stats.total;
        score += successRate * 0.20;
      }

      // Bonus por novedad (no usada recientemente)
      if (!recentPositions.includes(pos)) {
        score += 0.15;
      }

      // NUEVO: Combinar con score adaptativo (30% peso)
      const adaptiveScore = mlStateRentable.adaptiveScores[pos] || 0.75;
      const combinedScore = (score * 0.7) + (adaptiveScore * 0.3);

      return { pos, score: combinedScore };
    });

    // Ordenar por score y elegir la mejor
    positionsWithScores.sort((a, b) => b.score - a.score);
    selectedPosition = positionsWithScores[0].pos;
    strategy = 'EXPLOIT';
    reason = `Q-value: ${positionsWithScores[0].score.toFixed(3)}`;
  }

  // Actualizar memoria
  mlStateRentable.consecutiveSafePositions.push(selectedPosition);
  if (mlStateRentable.consecutiveSafePositions.length > SAFE_SEQUENCE_LENGTH) {
    mlStateRentable.consecutiveSafePositions.shift();
  }

  // Calcular confianza
  const qValue = mlStateRentable.positionQValues[selectedPosition] || 0.5;
  const stats = mlStateRentable.positionSuccessRate[selectedPosition];
  const successRate = stats && stats.total > 0 ? stats.wins / stats.total : 0.5;
  const confidence = (qValue * 0.6 + successRate * 0.4) * 100;

  // Logging
  const esSegura = POSICIONES_ULTRA_SEGURAS.includes(selectedPosition) ? '✅' : '';
  const esPeligrosa = POSICIONES_PELIGROSAS.includes(selectedPosition) ? '⚠️' : '';
  console.log(
    `ML RENTABLE: Pos ${selectedPosition} ${esSegura}${esPeligrosa} | ${strategy} | ` +
    `Epsilon=${mlStateRentable.epsilon.toFixed(3)} | Q=${qValue.toFixed(3)} | ` +
    `Objetivo=${objetivo} posiciones`
  );

  return {
    position: selectedPosition,
    confidence,
    strategy,
    reason,
  };
}

/**
 * Actualizar ML después de un juego
 */
export async function updateMLFromGameRentable(
  position: number,
  wasSuccessful: boolean,
  reward: number
): Promise<void> {
  // Actualizar estadísticas
  const stats = mlStateRentable.positionSuccessRate[position];
  if (stats) {
    stats.total++;
    if (wasSuccessful) {
      stats.wins++;
    }
  }

  // Actualizar Q-value usando Q-learning
  const currentQ = mlStateRentable.positionQValues[position] || 0.5;
  const newQ = currentQ + LEARNING_RATE * (reward - currentQ);
  mlStateRentable.positionQValues[position] = Math.max(0, Math.min(1, newQ));

  // Actualizar racha de derrotas (stop-loss)
  if (wasSuccessful) {
    mlStateRentable.rachaDerrota = 0; // Reset en victoria
    mlStateRentable.stopLossActivado = false;
  } else {
    mlStateRentable.rachaDerrota++;
    console.log(`📉 Racha de derrotas: ${mlStateRentable.rachaDerrota}`);
  }

  // Actualizar epsilon (reducir exploración gradualmente) usando función común
  mlStateRentable.epsilon = degradeEpsilonCommon(
    mlStateRentable.epsilon,
    MIN_EPSILON,
    EPSILON_DECAY
  );

  // Incrementar contador de juegos
  mlStateRentable.totalGames++;

  console.log(
    `ML RENTABLE Updated: Pos ${position} | Success=${wasSuccessful} | ` +
    `NewQ=${mlStateRentable.positionQValues[position].toFixed(3)} | ` +
    `Epsilon=${mlStateRentable.epsilon.toFixed(3)}`
  );
}

/**
 * Guardar estado del ML en base de datos
 */
export async function saveMLStateRentable(): Promise<void> {
  try {
    // Aquí se guardaría en DB en producción
    console.log('ML RENTABLE State saved:', {
      totalGames: mlStateRentable.totalGames,
      epsilon: mlStateRentable.epsilon,
      explorationCount: mlStateRentable.explorationCount,
    });
  } catch (error) {
    console.error('Error saving ML RENTABLE state:', error);
  }
}

/**
 * Cargar estado del ML desde base de datos
 */
export async function loadMLStateRentable(): Promise<void> {
  try {
    // CARGAR PARTIDAS REALES desde la base de datos
    const games = await db.chickenGame.findMany({
      where: { isSimulated: false }, // Solo partidas reales
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { positions: true },
    });

    mlStateRentable.totalGames = games.length;

    // Inicializar contadores para todas las posiciones
    for (let pos = 1; pos <= 25; pos++) {
      if (!mlStateRentable.positionSuccessRate[pos]) {
        mlStateRentable.positionSuccessRate[pos] = { wins: 0, total: 0 };
      }
    }

    // Procesar partidas para calcular tasas de éxito
    games.forEach((game) => {
      const revealed = game.positions
        .filter((p) => p.revealed && p.revealOrder > 0)
        .sort((a, b) => (a.revealOrder || 0) - (b.revealOrder || 0));

      revealed.forEach((pos) => {
        const position = pos.position;
        const wasSuccess = pos.isChicken;

        if (!mlStateRentable.positionSuccessRate[position]) {
          mlStateRentable.positionSuccessRate[position] = { wins: 0, total: 0 };
        }

        mlStateRentable.positionSuccessRate[position].total++;
        if (wasSuccess) {
          mlStateRentable.positionSuccessRate[position].wins++;
        }

        // Calcular Q-value basado en tasa de éxito
        const successRate =
          mlStateRentable.positionSuccessRate[position].wins /
          mlStateRentable.positionSuccessRate[position].total;
        
        mlStateRentable.positionQValues[position] = successRate;
      });
    });

    // Degradar epsilon basado en partidas reales
    mlStateRentable.epsilon = Math.max(
      0.15,
      0.25 * Math.pow(0.998, mlStateRentable.totalGames)
    );

    console.log(`ML RENTABLE State cargado: ${mlStateRentable.totalGames} partidas REALES, epsilon: ${mlStateRentable.epsilon.toFixed(3)}`);
    console.log(`Posiciones con datos: ${Object.values(mlStateRentable.positionSuccessRate).filter(s => s.total > 0).length}/25`);
    
    mlStateRentable.initialized = true; // Marcar como inicializado
    
    initializeMLStateRentable();
  } catch (error) {
    console.error('Error loading ML RENTABLE state:', error);
    initializeMLStateRentable();
    mlStateRentable.initialized = true; // Marcar como inicializado incluso si falla
  }
}

/**
 * Obtener estadísticas del ML
 */
export function getMLStatsRentable() {
  const totalPositions = Object.keys(mlStateRentable.positionSuccessRate).length;
  const positionsWithData = Object.values(mlStateRentable.positionSuccessRate).filter(
    (s) => s.total > 0
  ).length;

  const avgQValue =
    Object.values(mlStateRentable.positionQValues).reduce((sum, q) => sum + q, 0) /
    Object.keys(mlStateRentable.positionQValues).length;

  return {
    totalGames: mlStateRentable.totalGames,
    epsilon: mlStateRentable.epsilon,
    explorationCount: mlStateRentable.explorationCount,
    totalPositions,
    positionsWithData,
    avgQValue,
    objetivo: mlStateRentable.objetivo,
    posicionesSeguras: POSICIONES_ULTRA_SEGURAS.length,
    posicionesPeligrosas: POSICIONES_PELIGROSAS.length,
  };
}

/**
 * Resetear estado del ML
 */
export function resetMLStateRentable(): void {
  mlStateRentable = {
    epsilon: 0.25,
    totalGames: 0,
    consecutiveSafePositions: [],
    positionQValues: {},
    positionSuccessRate: {},
    explorationCount: 0,
    objetivo: 2,
    lastAdaptiveAnalysis: null,
    adaptiveScores: {},
    rachaDerrota: 0,
    stopLossActivado: false,
    initialized: false, // Resetear bandera
  };
  initializeMLStateRentable();
  console.log('ML RENTABLE State reset');
}

/**
 * Configurar objetivo de posiciones
 */
export function setObjetivoRentable(objetivo: 2 | 3): void {
  mlStateRentable.objetivo = objetivo;
  console.log(`ML RENTABLE: Objetivo actualizado a ${objetivo} posiciones`);
}
