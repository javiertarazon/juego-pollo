// Sistema de Aprendizaje por Refuerzo para Predicción de Posiciones
import { db } from '@/lib/db';
import {
  analizarUltimasPartidas,
  calcularScoreSeguridad,
  detectarRotacionActiva,
} from './adaptive-pattern-analyzer';
import { saveMLStateToFile, loadMLStateFromFile } from './persistence';
import {
  getHotPositions as getHotPositionsCommon,
  calculateSuccessRate,
  degradeEpsilon,
  calculateNoveltyBonus,
  calculateDiversityPenalty,
  calculateSuccessPenalty,
  detectMystakeAdaptation,
  getUnexploredPositions,
  selectRandomPosition,
  calculateZoneBonus,
} from './ml-common';

// Zonas frías opuestas (dividir tablero en 2 zonas)
const COLD_ZONES = {
  ZONE_A: [1, 2, 3, 4, 5, 11, 12, 13, 14, 15], // Mitad superior
  ZONE_B: [16, 17, 18, 19, 20, 21, 22, 23, 24, 25], // Mitad inferior
};

// Posiciones siempre seguras por zona - MÍNIMAS para máxima diversidad
const SAFE_POSITIONS_BY_ZONE = {
  ZONE_A: [7], // Solo 1 posición "segura" en zona A
  ZONE_B: [23], // Solo 1 posición "segura" en zona B
};

interface MLState {
  epsilon: number; // Factor de exploración (0-1)
  totalGames: number; // Total de partidas jugadas
  consecutiveSafePositions: number[]; // Últimas 7 posiciones seguras usadas
  lastZoneUsed: 'ZONE_A' | 'ZONE_B'; // Última zona utilizada
  positionQValues: Record<number, number>; // Q-values por posición (aprendizaje)
  positionSuccessRate: Record<number, { wins: number; total: number }>; // Tasa de éxito
  explorationCount: number; // Contador de exploraciones
  // Análisis adaptativo
  lastAdaptiveAnalysis: Date | null;
  adaptiveScores: Record<number, number>; // Scores adaptativos por posición
  // NUEVO: Sistema de stop-loss
  rachaDerrota: number; // Contador de derrotas consecutivas
  stopLossActivado: boolean; // Bandera de stop-loss activo
  // Control de inicialización
  initialized: boolean; // Indica si ya se cargaron los datos de BD
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
  lastAdaptiveAnalysis: null,
  adaptiveScores: {},
  // Sistema de stop-loss
  rachaDerrota: 0,
  stopLossActivado: false,
  // Control de inicialización
  initialized: false,
};

// Parámetros de aprendizaje - FASE 2: OPTIMIZADO + ADAPTATIVO
const LEARNING_RATE = 0.15; // Alpha: aumentado para aprender más rápido de errores
const DISCOUNT_FACTOR = 0.85; // Gamma: reducido para priorizar recompensas inmediatas
const MIN_EPSILON = 0.15; // Epsilon mínimo optimizado a 15% para mejor balance
const EPSILON_DECAY = 0.998; // Degradación más lenta para mantener exploración
const SAFE_SEQUENCE_LENGTH = 15; // Memoria aumentada a 15 para evitar repeticiones
const ADAPTIVE_ANALYSIS_INTERVAL = 60000; // Actualizar análisis cada 60 segundos
const ADAPTIVE_WEIGHT = 0.4; // Peso del análisis adaptativo (40%)

/**
 * Resetear sistema de stop-loss (útil para entrenamiento)
 */
export function resetStopLoss(): void {
  mlState.rachaDerrota = 0;
  mlState.stopLossActivado = false;
  console.log('🔄 Stop-loss reseteado');
}

/**
 * Actualizar análisis adaptativo si es necesario
 */
async function actualizarAnalisisAdaptativo(): Promise<void> {
  const ahora = new Date();
  const ultimoAnalisis = mlState.lastAdaptiveAnalysis;

  // Actualizar si nunca se ha hecho o si pasó el intervalo
  if (!ultimoAnalisis || (ahora.getTime() - ultimoAnalisis.getTime()) > ADAPTIVE_ANALYSIS_INTERVAL) {
    console.log('🔄 Actualizando análisis adaptativo de últimas 10 partidas...');
    
    try {
      // Analizar últimas 10 partidas
      const analisis = await analizarUltimasPartidas(10);
      
      // Actualizar scores adaptativos para cada posición
      for (let pos = 1; pos <= 25; pos++) {
        const scoreData = await calcularScoreSeguridad(pos, 10);
        mlState.adaptiveScores[pos] = scoreData.score / 100; // Normalizar a 0-1
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

      mlState.lastAdaptiveAnalysis = ahora;
    } catch (error) {
      console.error('❌ Error en análisis adaptativo:', error);
    }
  }
}

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
    if (!mlState.adaptiveScores[pos]) {
      mlState.adaptiveScores[pos] = 0.75; // Score neutral inicial
    }
  }
}

/**
 * Obtener posiciones "calientes" (usadas 2+ veces en últimas 5 partidas)
 * MEJORADO: Usa función del módulo común + análisis adaptativo
 */
async function getHotPositions(): Promise<number[]> {
  try {
    // Actualizar análisis adaptativo si es necesario
    await actualizarAnalisisAdaptativo();

    // Usar función del módulo común
    const calientes = await getHotPositionsCommon(5);
    
    // Agregar zonas calientes del análisis adaptativo
    const analisis = await analizarUltimasPartidas(10);
    const zonasCalientes = analisis.zonasCalientes
      .filter(z => z.frecuencia >= 30) // Mínimo 30% de frecuencia
      .map(z => z.posicion);

    // Combinar ambos conjuntos sin duplicados
    const todasCalientes = [...new Set([...calientes, ...zonasCalientes])];

    return todasCalientes;
  } catch (error) {
    console.error('❌ Error obteniendo posiciones calientes:', error);
    return [];
  }
}

/**
 * Cargar estado del ML desde la base de datos o disco
 */
export async function loadMLState() {
  try {
    // 1. Intentar cargar persistencia local primero (más rápido y continuidad)
    const persistedState = loadMLStateFromFile();
    if (persistedState) {
      // Validar estructura básica
      if (persistedState.positionQValues && persistedState.positionSuccessRate) {
        // Combinar estado base con persistido para asegurar integridad
        mlState = { ...mlState, ...persistedState, initialized: true };
        
        // RESET DE SEGURIDAD: Resetear contadores de racha al cargar
        // Esto evita que el sistema arranque bloqueado por un Stop-Loss previo
        mlState.rachaDerrota = 0;
        mlState.stopLossActivado = false;

        console.log(`✅ ML State restaurado: ${mlState.totalGames} partidas, epsilon: ${mlState.epsilon.toFixed(3)}`);
        return;
      }
    }

    console.log('⚠️ Reconstruyendo estado desde BD (sin persistencia previa)...');

    // SOLO PARTIDAS REALES para entrenamiento ML
    const games = await db.chickenGame.findMany({
      where: { isSimulated: false }, // Solo partidas reales
      orderBy: { createdAt: 'desc' },
      take: 200, // Aumentado para mejor análisis
      include: { positions: true },
    });

    mlState.totalGames = games.length;

    // Inicializar contadores para TODAS las posiciones
    for (let pos = 1; pos <= 25; pos++) {
      if (!mlState.positionSuccessRate[pos]) {
        mlState.positionSuccessRate[pos] = { wins: 0, total: 0 };
      }
    }

    // Calcular tasa de éxito general de las últimas 30 partidas
    const last30Games = games.slice(0, 30);
    const victorias = last30Games.filter(g => !g.hitBone).length;
    const tasaExitoGeneral = (victorias / last30Games.length) * 100;
    
    console.log(`📊 Tasa de éxito últimas 30 partidas: ${tasaExitoGeneral.toFixed(1)}%`);
    
    // RESET ADAPTATIVO: Si tasa de éxito < 48%, resetear Q-values (más sensible)
    if (tasaExitoGeneral < 48 && mlState.totalGames > 30) {
      console.log('🔄 RESET ADAPTATIVO: Tasa de éxito muy baja, reseteando Q-values');
      for (let pos = 1; pos <= 25; pos++) {
        mlState.positionQValues[pos] = 0.5; // Resetear a neutral
        mlState.positionSuccessRate[pos] = { wins: 0, total: 0 };
      }
      mlState.epsilon = 0.40; // Aumentar exploración después de reset a 40%
      mlState.consecutiveSafePositions = [];
      console.log('✅ Q-values reseteados, epsilon aumentado a 40%');
    }

    // Calcular tasas de éxito por posición SOLO con partidas reales
    games.forEach((game) => {
      const revealed = game.positions
        .filter((p) => p.revealed && p.revealOrder > 0)
        .sort((a, b) => (a.revealOrder || 0) - (b.revealOrder || 0));

      // Analizar TODAS las posiciones reveladas, no solo la primera
      revealed.forEach((pos, index) => {
        const position = pos.position;
        const wasSuccess = pos.isChicken;

        if (!mlState.positionSuccessRate[position]) {
          mlState.positionSuccessRate[position] = { wins: 0, total: 0 };
        }

        mlState.positionSuccessRate[position].total++;
        if (wasSuccess) {
          mlState.positionSuccessRate[position].wins++;
        }

        // Calcular Q-value balanceado
        const successRate =
          mlState.positionSuccessRate[position].wins /
          mlState.positionSuccessRate[position].total;
        
        // Peso balanceado: 60% tasa de éxito + 40% frecuencia de uso (priorizar diversidad)
        const usageWeight = Math.min(mlState.positionSuccessRate[position].total / 50, 1);
        const balancedQValue = (successRate * 0.6) + (usageWeight * 0.4);
        
        // Penalizar posiciones con 100% de éxito pero pocos datos
        if (successRate === 1.0 && mlState.positionSuccessRate[position].total < 5) {
          mlState.positionQValues[position] = 0.6; // Reducir confianza más
        } else if (successRate < 0.5 && mlState.positionSuccessRate[position].total > 2) {
          // Penalizar BRUTALMENTE posiciones con < 50% éxito
          mlState.positionQValues[position] = Math.max(0.1, balancedQValue * 0.3);
        } else if (successRate < 0.4 && mlState.positionSuccessRate[position].total > 3) {
          // Penalizar aún más fuerte si < 40% éxito
          mlState.positionQValues[position] = Math.max(0.05, balancedQValue * 0.2);
        } else {
          mlState.positionQValues[position] = balancedQValue;
        }
      });
    });

    // Penalizar posiciones sin datos
    for (let pos = 1; pos <= 25; pos++) {
      if (mlState.positionSuccessRate[pos].total === 0) {
        mlState.positionQValues[pos] = 0.5; // Valor neutral
      }
    }

    // Obtener últimas 15 posiciones seguras usadas (aumentado de 10)
    const recentSafeGames = games
      .filter((g) => !g.hitBone)
      .slice(0, SAFE_SEQUENCE_LENGTH);

    mlState.consecutiveSafePositions = recentSafeGames
      .map((g) => {
        const revealed = g.positions
          .filter((p) => p.revealed && p.revealOrder > 0)
          .sort((a, b) => (a.revealOrder || 0) - (b.revealOrder || 0));
        return revealed.length > 0 ? revealed[0].position : null;
      })
      .filter((p) => p !== null) as number[];

    // Degradar epsilon basado en total de partidas REALES
    mlState.epsilon = Math.max(
      MIN_EPSILON,
      0.35 * Math.pow(EPSILON_DECAY, mlState.totalGames)
    );

    console.log(`ML State cargado: ${mlState.totalGames} partidas REALES, epsilon: ${mlState.epsilon.toFixed(3)}`);
    console.log(`Posiciones con datos: ${Object.values(mlState.positionSuccessRate).filter(s => s.total > 0).length}/25`);
    
    mlState.initialized = true; // Marcar como inicializado
  } catch (error) {
    console.error('Error cargando ML state:', error);
    initializeMLState();
    mlState.initialized = true;
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
  revealedPositions: number[] = [],
  ignoreStopLoss: boolean = false
): Promise<{
  position: number;
  strategy: 'EXPLOIT' | 'EXPLORE';
  zone: 'ZONE_A' | 'ZONE_B';
  epsilon: number;
  qValue: number;
  confidence: number;
}> {
  // ⛔ STOP-LOSS: Detener si hay 3+ derrotas consecutivas (excepto durante entrenamiento)
  if (!ignoreStopLoss && mlState.rachaDerrota >= 3) {
    mlState.stopLossActivado = true;
    console.log('⛔ STOP-LOSS ACTIVADO: 3+ derrotas consecutivas. Se recomienda PAUSAR el juego.');
    console.log(`📉 Racha actual: ${mlState.rachaDerrota} derrotas`);
    
    throw new Error(
      `STOP_LOSS_ACTIVADO: Racha de ${mlState.rachaDerrota} derrotas. ` +
      'Se recomienda pausar y analizar patrones antes de continuar.'
    );
  }

  // Cargar estado si NO está inicializado
  if (!mlState.initialized) {
    await loadMLState();
    initializeMLState();
  }

  // 🆕 EXPLORACIÓN FORZADA: Cada 20 partidas, explorar posición no usada
  if (mlState.totalGames > 0 && mlState.totalGames % 20 === 0) {
    const posicionesNoExploradas = getUnexploredPositions(mlState.positionSuccessRate, 0);
    
    if (posicionesNoExploradas.length > 0) {
      // Filtrar posiciones no reveladas
      const disponibles = posicionesNoExploradas.filter(p => !revealedPositions.includes(p));
      
      if (disponibles.length > 0) {
        const posicionNoExplorada = selectRandomPosition(disponibles);
        
        console.log(`🆕 EXPLORACIÓN FORZADA (partida ${mlState.totalGames}): Posición ${posicionNoExplorada} (nunca usada)`);
        
        // Determinar zona de la posición
        const zone = COLD_ZONES.ZONE_A.includes(posicionNoExplorada) ? 'ZONE_A' : 'ZONE_B';
        
        return {
          position: posicionNoExplorada,
          confidence: 0.5,
          strategy: 'EXPLORE',
          zone,
          qValue: 0.5,
          epsilon: mlState.epsilon,
        };
      }
    }
  }

  // Detectar si Mystake está adaptándose
  if (mlState.totalGames >= 5) {
    try {
      const recentGames = await db.chickenGame.findMany({
        where: { isSimulated: false },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
      
      if (detectMystakeAdaptation(recentGames)) {
        console.log('🔄 ADAPTACIÓN DE MYSTAKE DETECTADA: Aumentando exploración');
        // Aumentar temporalmente epsilon para cambiar estrategia
        mlState.epsilon = Math.min(0.5, mlState.epsilon * 1.2);
      }
    } catch (error) {
      console.error('Error detectando adaptación:', error);
    }
  }

  // Obtener posiciones calientes (a evitar)
  const hotPositions = await getHotPositions();

  // Obtener TODAS las posiciones disponibles (excluyendo calientes)
  const allAvailable = Array.from({ length: 25 }, (_, i) => i + 1).filter(
    (p) => 
      !revealedPositions.includes(p) && 
      canUsePosition(p) &&
      !hotPositions.includes(p) // NUEVO: Evitar posiciones calientes
  );

  // Si no hay posiciones disponibles (memoria llena o todas calientes), relajar restricciones
  let finalAvailable = allAvailable;
  if (finalAvailable.length === 0) {
    console.log('⚠️  No hay posiciones disponibles, relajando restricciones...');
    // Primero intentar sin memoria pero manteniendo filtro de calientes
    finalAvailable = Array.from({ length: 25 }, (_, i) => i + 1).filter(
      (p) => !revealedPositions.includes(p) && !hotPositions.includes(p)
    );
    
    // Si aún no hay, ignorar también calientes (último recurso)
    if (finalAvailable.length === 0) {
      console.log('⚠️  Ignorando posiciones calientes por necesidad');
      finalAvailable = Array.from({ length: 25 }, (_, i) => i + 1).filter(
        (p) => !revealedPositions.includes(p)
      );
    }
  }

  // Determinar zona para anti-detección
  const targetZone = getOppositeZone();
  const zonePositions = COLD_ZONES[targetZone];
  
  let selectedPosition: number;
  let strategy: 'EXPLOIT' | 'EXPLORE';

  // Decisión: Explorar o Explotar
  if (shouldExplore()) {
    // EXPLORACIÓN: Selección aleatoria de TODAS las posiciones disponibles
    strategy = 'EXPLORE';
    selectedPosition =
      finalAvailable[Math.floor(Math.random() * finalAvailable.length)];
    mlState.explorationCount++;
  } else {
    // EXPLOTACIÓN: Seleccionar mejor Q-value
    strategy = 'EXPLOIT';
    
    // Actualizar análisis adaptativo si es necesario
    await actualizarAnalisisAdaptativo();
    
    // Calcular score combinado: Q-value + bonus de zona + penalizaciones AGRESIVAS + SCORE ADAPTATIVO
    const positionsWithScores = finalAvailable.map((pos) => {
      const qValue = mlState.positionQValues[pos] || 0.5;
      const usageCount = mlState.positionSuccessRate[pos]?.total || 0;
      const successRate = mlState.positionSuccessRate[pos]?.wins || 0;
      const failureRate = usageCount - successRate;
      
      // NUEVO: Score adaptativo basado en últimas 10 partidas
      const adaptiveScore = mlState.adaptiveScores[pos] || 0.75;
      
      // Bonus por estar en zona objetivo (muy reducido)
      const zoneBonus = zonePositions.includes(pos) ? 0.02 : 0;
      
      // Penalización BRUTAL por uso excesivo - FASE 2
      let diversityPenalty = 0;
      if (usageCount > 4) {
        diversityPenalty = -0.50; // Penalización BRUTAL para > 4 usos
      } else if (usageCount > 3) {
        diversityPenalty = -0.35; // Penalización MUY fuerte para > 3 usos
      } else if (usageCount > 2) {
        diversityPenalty = -0.25; // Penalización fuerte para > 2 usos
      } else if (usageCount > 1) {
        diversityPenalty = -0.15; // Penalización media para > 1 uso
      }
      
      // Penalización por tasa de fallo alta
      const failurePenalty = failureRate > 2 ? -0.25 : failureRate > 1 ? -0.15 : 0;
      
      // Bonus ENORME por posiciones poco usadas - FASE 2
      const noveltyBonus = usageCount === 0 ? 0.30 : usageCount === 1 ? 0.15 : 0;
      
      // Bonus por posiciones con éxito reciente
      const recentSuccessBonus = successRate > 0 && usageCount <= 2 ? 0.10 : 0;
      
      // NUEVO: Combinar Q-value con score adaptativo (40% peso adaptativo)
      const combinedQValue = (qValue * (1 - ADAPTIVE_WEIGHT)) + (adaptiveScore * ADAPTIVE_WEIGHT);
      
      const finalScore = combinedQValue + zoneBonus + diversityPenalty + noveltyBonus + failurePenalty + recentSuccessBonus;
      
      return {
        position: pos,
        qValue: combinedQValue,
        score: Math.max(0, Math.min(1, finalScore)), // Clamp entre 0-1
        usageCount,
        adaptiveScore, // Para debug
      };
    });

    // Ordenar por score descendente
    positionsWithScores.sort((a, b) => b.score - a.score);
    
    // Seleccionar entre top 12 para MÁXIMA variedad - FASE 2 (antes top 8)
    const topN = Math.min(12, positionsWithScores.length);
    const topCandidates = positionsWithScores.slice(0, topN);
    
    // Selección ponderada: mayor probabilidad para mejores scores
    const totalScore = topCandidates.reduce((sum, c) => sum + c.score, 0);
    
    // Si todos tienen score muy bajo, forzar exploración
    if (totalScore < 0.5) {
      console.log('⚠️ Scores muy bajos, forzando exploración aleatoria');
      selectedPosition = finalAvailable[Math.floor(Math.random() * finalAvailable.length)];
    } else {
      let random = Math.random() * totalScore;
      
      let selected = topCandidates[0];
      for (const candidate of topCandidates) {
        random -= candidate.score;
        if (random <= 0) {
          selected = candidate;
          break;
        }
      }
      
      selectedPosition = selected.position;
    }
  }

  // Actualizar estado
  mlState.lastZoneUsed = targetZone;

  const qValue = mlState.positionQValues[selectedPosition] || 0.5;
  const confidence = Math.round(qValue * 100);

  const isHot = hotPositions.includes(selectedPosition);
  console.log(
    `ML: Pos ${selectedPosition} | ${strategy} | Zona ${targetZone} | Epsilon=${mlState.epsilon.toFixed(3)} | Q=${qValue.toFixed(3)}${isHot ? ' 🔥 CALIENTE' : ''}`
  );

  return {
    position: selectedPosition,
    strategy,
    zone: targetZone,
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

  // Guardar estado en disco para persistencia
  saveMLStateToFile(mlState);

  // Actualizar secuencia de posiciones seguras
  if (wasSuccess) {
    mlState.consecutiveSafePositions.unshift(position);
    if (mlState.consecutiveSafePositions.length > SAFE_SEQUENCE_LENGTH) {
      mlState.consecutiveSafePositions.pop();
    }
  }

  // Actualizar racha de derrotas (stop-loss)
  if (wasSuccess) {
    mlState.rachaDerrota = 0; // Reset en victoria
    mlState.stopLossActivado = false;
  } else {
    mlState.rachaDerrota++;
    console.log(`📉 Racha de derrotas: ${mlState.rachaDerrota}`);
  }

  // Degradar epsilon (menos exploración con el tiempo)
  mlState.epsilon = degradeEpsilon(
    mlState.epsilon,
    MIN_EPSILON,
    EPSILON_DECAY
  );

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
