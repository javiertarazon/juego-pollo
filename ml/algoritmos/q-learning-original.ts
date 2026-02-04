// Sistema de Aprendizaje por Refuerzo para Predicción de Posiciones
import { db } from '@/lib/db';

// Zonas frías opuestas (dividir tablero en 2 zonas)
const COLD_ZONES = {
  ZONE_A: [1, 2, 3, 4, 5, 11, 12, 13, 14, 15], // Mitad superior
  ZONE_B: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25], // Mitad inferior
};

// Posiciones siempre seguras por zona
const SAFE_POSITIONS_BY_ZONE = {
  ZONE_A: [4, 7, 10, 13, 14, 15], // Seguras en zona A
  ZONE_B: [17, 18, 19, 20, 21, 23], // Seguras en zona B
};

interface MLState {
  epsilon: number; // Factor de exploración (0-1)
  totalGames: number; // Total de partidas jugadas
  consecutiveSafePositions: number[]; // Últimas 7 posiciones seguras usadas
  lastZoneUsed: 'ZONE_A' | 'ZONE_B'; // Última zona utilizada
  positionQValues: Record<number, number>; // Q-values por posición (aprendizaje)
  positionSuccessRate: Record<number, { wins: number; total: number }>; // Tasa de éxito
  explorationCount: number; // Contador de exploraciones
}

// Estado global del ML (en producción, esto debería estar en DB)
let mlState: MLState = {
  epsilon: 0.3, // 30% exploración inicial
  totalGames: 0,
  consecutiveSafePositions: [],
  lastZoneUsed: 'ZONE_A',
  positionQValues: {},
  positionSuccessRate: {},
  explorationCount: 0,
};

// Parámetros de aprendizaje
const LEARNING_RATE = 0.1; // Alpha: qué tan rápido aprende
const DISCOUNT_FACTOR = 0.9; // Gamma: importancia de recompensas futuras
const MIN_EPSILON = 0.05; // Epsilon mínimo (siempre 5% exploración)
const EPSILON_DECAY = 0.995; // Degradación de epsilon por partida
const SAFE_SEQUENCE_LENGTH = 7; // Longitud de secuencia segura antes de repetir

/**
 * Inicializar Q-values para todas las posiciones
 */
export function initializeMLState() {
  for (let pos = 1; pos <= 25; pos++) {
    if (!mlState.positionQValues[pos]) {
      mlState.positionQValues[pos] = 0.5; // Valor neutral inicial
    }
    if (!mlState.positionSuccessRate[pos]) {
      mlState.positionSuccessRate[pos] = { wins: 0, total: 0 };
    }
  }
}

/**
 * Cargar estado del ML desde la base de datos
 */
export async function loadMLState() {
  try {
    // SOLO PARTIDAS REALES para entrenamiento ML
    const games = await db.chickenGame.findMany({
      where: { isSimulated: false }, // Solo partidas reales
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { positions: true },
    });

    mlState.totalGames = games.length;

    // Calcular tasas de éxito por posición SOLO con partidas reales
    games.forEach((game) => {
      const revealed = game.positions
        .filter((p) => p.revealed && p.revealOrder !== null)
        .sort((a, b) => (a.revealOrder || 0) - (b.revealOrder || 0));

      if (revealed.length > 0) {
        const firstPos = revealed[0].position;
        const wasSuccess = revealed[0].isChicken;

        if (!mlState.positionSuccessRate[firstPos]) {
          mlState.positionSuccessRate[firstPos] = { wins: 0, total: 0 };
        }

        mlState.positionSuccessRate[firstPos].total++;
        if (wasSuccess) {
          mlState.positionSuccessRate[firstPos].wins++;
        }

        // Actualizar Q-value basado en éxito histórico REAL
        const successRate =
          mlState.positionSuccessRate[firstPos].wins /
          mlState.positionSuccessRate[firstPos].total;
        mlState.positionQValues[firstPos] = successRate;
      }
    });

    // Obtener últimas 7 posiciones seguras usadas (SOLO REALES)
    const recentSafeGames = games
      .filter((g) => !g.hitBone)
      .slice(0, SAFE_SEQUENCE_LENGTH);

    mlState.consecutiveSafePositions = recentSafeGames
      .map((g) => {
        const revealed = g.positions
          .filter((p) => p.revealed && p.revealOrder !== null)
          .sort((a, b) => (a.revealOrder || 0) - (b.revealOrder || 0));
        return revealed.length > 0 ? revealed[0].position : null;
      })
      .filter((p) => p !== null) as number[];

    // Degradar epsilon basado en total de partidas REALES
    mlState.epsilon = Math.max(
      MIN_EPSILON,
      0.3 * Math.pow(EPSILON_DECAY, mlState.totalGames)
    );

    console.log(`ML State cargado: ${mlState.totalGames} partidas REALES, epsilon: ${mlState.epsilon.toFixed(3)}`);
  } catch (error) {
    console.error('Error cargando ML state:', error);
    initializeMLState();
  }
}

/**
 * Determinar si debe explorar o explotar
 */
function shouldExplore(): boolean {
  return Math.random() < mlState.epsilon;
}

/**
 * Obtener zona opuesta a la última usada
 */
function getOppositeZone(): 'ZONE_A' | 'ZONE_B' {
  return mlState.lastZoneUsed === 'ZONE_A' ? 'ZONE_B' : 'ZONE_A';
}

/**
 * Verificar si una posición puede ser usada (no en últimas 7 seguras)
 */
function canUsePosition(position: number): boolean {
  // Si la memoria tiene menos de 7 posiciones, permitir todas
  if (mlState.consecutiveSafePositions.length < SAFE_SEQUENCE_LENGTH) {
    return true;
  }
  
  // Si la memoria está llena, verificar que no esté en ella
  return !mlState.consecutiveSafePositions.includes(position);
}

/**
 * Obtener posiciones disponibles en una zona
 */
function getAvailablePositionsInZone(
  zone: 'ZONE_A' | 'ZONE_B',
  revealedPositions: number[]
): number[] {
  const zonePositions = COLD_ZONES[zone];
  const safePositions = SAFE_POSITIONS_BY_ZONE[zone];

  return safePositions.filter(
    (pos) =>
      !revealedPositions.includes(pos) && // No revelada en partida actual
      canUsePosition(pos) // No en últimas 7 seguras
  );
}

/**
 * Seleccionar posición usando estrategia epsilon-greedy
 */
export async function selectPositionML(
  revealedPositions: number[] = []
): Promise<{
  position: number;
  strategy: 'EXPLOIT' | 'EXPLORE';
  zone: 'ZONE_A' | 'ZONE_B';
  epsilon: number;
  qValue: number;
  confidence: number;
}> {
  // Cargar estado si es primera vez
  if (mlState.totalGames === 0) {
    await loadMLState();
    initializeMLState();
  }

  // Alternar zona (estrategia anti-detección)
  const targetZone = getOppositeZone();
  let availablePositions = getAvailablePositionsInZone(
    targetZone,
    revealedPositions
  );

  // Si no hay posiciones disponibles en zona objetivo, usar la otra
  let finalZone = targetZone;
  let finalAvailable = availablePositions;

  if (finalAvailable.length === 0) {
    finalZone = mlState.lastZoneUsed;
    finalAvailable = getAvailablePositionsInZone(finalZone, revealedPositions);
  }

  // Si aún no hay disponibles, usar cualquier posición segura (ignorando memoria)
  if (finalAvailable.length === 0) {
    const allSafe = [
      ...SAFE_POSITIONS_BY_ZONE.ZONE_A,
      ...SAFE_POSITIONS_BY_ZONE.ZONE_B,
    ];
    finalAvailable = allSafe.filter((p) => !revealedPositions.includes(p));
    
    // Si todavía no hay, usar TODAS las posiciones disponibles
    if (finalAvailable.length === 0) {
      finalAvailable = Array.from({ length: 25 }, (_, i) => i + 1).filter(
        (p) => !revealedPositions.includes(p)
      );
    }
  }

  let selectedPosition: number;
  let strategy: 'EXPLOIT' | 'EXPLORE';

  // Decisión: Explorar o Explotar
  if (shouldExplore()) {
    // EXPLORACIÓN: Selección aleatoria
    strategy = 'EXPLORE';
    selectedPosition =
      finalAvailable[Math.floor(Math.random() * finalAvailable.length)];
    mlState.explorationCount++;
  } else {
    // EXPLOTACIÓN: Seleccionar mejor Q-value
    strategy = 'EXPLOIT';
    const positionsWithQValues = finalAvailable.map((pos) => ({
      position: pos,
      qValue: mlState.positionQValues[pos] || 0.5,
    }));

    // Ordenar por Q-value descendente
    positionsWithQValues.sort((a, b) => b.qValue - a.qValue);
    
    // Seleccionar entre top 3 para agregar variedad
    const topN = Math.min(3, positionsWithQValues.length);
    const topCandidates = positionsWithQValues.slice(0, topN);
    const randomTop = topCandidates[Math.floor(Math.random() * topCandidates.length)];
    selectedPosition = randomTop.position;
  }

  // Actualizar estado
  mlState.lastZoneUsed = finalZone;

  const qValue = mlState.positionQValues[selectedPosition] || 0.5;
  const confidence = Math.round(qValue * 100);

  console.log(
    `ML: Pos ${selectedPosition} | ${strategy} | Zona ${finalZone} | Epsilon=${mlState.epsilon.toFixed(3)} | Q=${qValue.toFixed(3)}`
  );

  return {
    position: selectedPosition,
    strategy,
    zone: finalZone,
    epsilon: mlState.epsilon,
    qValue,
    confidence,
  };
}

/**
 * Actualizar Q-value después de una partida (aprendizaje)
 */
export async function updateMLFromGame(
  position: number,
  wasSuccess: boolean,
  reward: number
) {
  // Recompensa: +1 por victoria, -1 por derrota
  const immediateReward = wasSuccess ? reward : -reward;

  // Obtener Q-value actual
  const currentQ = mlState.positionQValues[position] || 0.5;

  // Obtener mejor Q-value de posiciones disponibles (para siguiente estado)
  const allQValues = Object.values(mlState.positionQValues);
  const maxNextQ = Math.max(...allQValues, 0.5);

  // Fórmula Q-Learning: Q(s,a) = Q(s,a) + α[r + γ·max(Q(s',a')) - Q(s,a)]
  const newQ =
    currentQ +
    LEARNING_RATE * (immediateReward + DISCOUNT_FACTOR * maxNextQ - currentQ);

  // Actualizar Q-value
  mlState.positionQValues[position] = Math.max(0, Math.min(1, newQ)); // Clamp entre 0-1

  // Actualizar tasa de éxito
  if (!mlState.positionSuccessRate[position]) {
    mlState.positionSuccessRate[position] = { wins: 0, total: 0 };
  }
  mlState.positionSuccessRate[position].total++;
  if (wasSuccess) {
    mlState.positionSuccessRate[position].wins++;
  }

  // Actualizar secuencia de posiciones seguras
  if (wasSuccess) {
    mlState.consecutiveSafePositions.unshift(position);
    if (mlState.consecutiveSafePositions.length > SAFE_SEQUENCE_LENGTH) {
      mlState.consecutiveSafePositions.pop();
    }
  }

  // Degradar epsilon (menos exploración con el tiempo)
  mlState.epsilon = Math.max(MIN_EPSILON, mlState.epsilon * EPSILON_DECAY);

  // Incrementar contador de partidas
  mlState.totalGames++;

  console.log(
    `ML Actualizado: Pos ${position} | ${wasSuccess ? 'EXITO' : 'FALLO'} | Q: ${currentQ.toFixed(3)} -> ${mlState.positionQValues[position].toFixed(3)} | Epsilon: ${mlState.epsilon.toFixed(3)}`
  );
}

/**
 * Obtener estadísticas del ML
 */
export function getMLStats() {
  const topPositions = Object.entries(mlState.positionQValues)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([pos, qValue]) => ({
      position: parseInt(pos),
      qValue: qValue.toFixed(3),
      successRate: mlState.positionSuccessRate[parseInt(pos)]
        ? (
            (mlState.positionSuccessRate[parseInt(pos)].wins /
              mlState.positionSuccessRate[parseInt(pos)].total) *
            100
          ).toFixed(1) + '%'
        : 'N/A',
    }));

  return {
    totalGames: mlState.totalGames,
    epsilon: mlState.epsilon.toFixed(3),
    explorationCount: mlState.explorationCount,
    exploitationCount: mlState.totalGames - mlState.explorationCount,
    lastZoneUsed: mlState.lastZoneUsed,
    consecutiveSafePositions: mlState.consecutiveSafePositions,
    topPositions,
    learningRate: LEARNING_RATE,
    discountFactor: DISCOUNT_FACTOR,
    minEpsilon: MIN_EPSILON,
  };
}

/**
 * Resetear estado del ML (para testing)
 */
export function resetMLState() {
  mlState = {
    epsilon: 0.3,
    totalGames: 0,
    consecutiveSafePositions: [],
    lastZoneUsed: 'ZONE_A',
    positionQValues: {},
    positionSuccessRate: {},
    explorationCount: 0,
  };
  initializeMLState();
}
