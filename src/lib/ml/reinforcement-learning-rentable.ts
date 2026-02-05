// Sistema de Aprendizaje por Refuerzo - ASESOR RENTABLE 2-3 POSICIONES
import { db } from '@/lib/db';

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
};

// Parámetros de aprendizaje RENTABLE
const LEARNING_RATE = 0.15;
const DISCOUNT_FACTOR = 0.90; // Mayor para valorar seguridad a largo plazo
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
  });
  
  // Inicializar posiciones peligrosas con valor bajo
  POSICIONES_PELIGROSAS.forEach(pos => {
    mlStateRentable.positionQValues[pos] = 0.10; // Valor bajo inicial
    mlStateRentable.positionSuccessRate[pos] = { wins: 0, total: 0 };
  });
  
  // Resto de posiciones con valor neutral
  for (let pos = 1; pos <= 25; pos++) {
    if (!mlStateRentable.positionQValues[pos]) {
      mlStateRentable.positionQValues[pos] = 0.50;
      mlStateRentable.positionSuccessRate[pos] = { wins: 0, total: 0 };
    }
  }
}

/**
 * Obtener posiciones calientes (evitar)
 */
async function getHotPositions(): Promise<number[]> {
  try {
    const ultimas5 = await db.chickenGame.findMany({
      where: { isSimulated: false },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { positions: true },
    });

    const posicionesCalientes = new Map<number, number>();

    ultimas5.forEach((partida) => {
      const primeraPos = partida.positions
        .filter((p) => p.revealed && p.revealOrder !== null)
        .sort((a, b) => (a.revealOrder || 0) - (b.revealOrder || 0))[0];

      if (primeraPos) {
        posicionesCalientes.set(
          primeraPos.position,
          (posicionesCalientes.get(primeraPos.position) || 0) + 1
        );
      }
    });

    const calientes = Array.from(posicionesCalientes.entries())
      .filter(([, count]) => count >= 2)
      .map(([pos]) => pos);

    if (calientes.length > 0) {
      console.log(`🔥 Posiciones CALIENTES detectadas (evitar): ${calientes.join(', ')}`);
    }

    return calientes;
  } catch (error) {
    console.error('Error obteniendo posiciones calientes:', error);
    return [];
  }
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
  // Actualizar objetivo
  mlStateRentable.objetivo = objetivo;
  
  // Inicializar si es necesario
  if (Object.keys(mlStateRentable.positionQValues).length === 0) {
    initializeMLStateRentable();
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
    // EXPLOTACIÓN: Elegir la mejor según Q-values
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

      return { pos, score };
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

  // Actualizar epsilon (reducir exploración gradualmente)
  mlStateRentable.epsilon = Math.max(MIN_EPSILON, mlStateRentable.epsilon * EPSILON_DECAY);

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
    // Aquí se cargaría desde DB en producción
    initializeMLStateRentable();
    console.log('ML RENTABLE State loaded');
  } catch (error) {
    console.error('Error loading ML RENTABLE state:', error);
    initializeMLStateRentable();
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
