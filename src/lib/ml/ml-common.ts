// Módulo compartido para funciones comunes de Machine Learning
// Elimina duplicación de código entre asesores
import { db } from '@/lib/db';

/**
 * Obtener posiciones calientes (usadas 2+ veces en últimas N partidas)
 * Evita repetir patrones que Mystake pueda detectar
 * 
 * @param limite - Número de partidas recientes a analizar (default: 5)
 * @returns Array de posiciones calientes a evitar
 */
export async function getHotPositions(limite: number = 5): Promise<number[]> {
  try {
    const ultimas = await db.chickenGame.findMany({
      where: { isSimulated: false },
      orderBy: { createdAt: 'desc' },
      take: limite,
      include: { positions: true },
    });

    const posicionesCalientes = new Map<number, number>();

    ultimas.forEach((partida) => {
      const primeraPos = partida.positions
        .filter((p) => p.revealed && p.revealOrder > 0)
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
    console.error('❌ Error obteniendo posiciones calientes:', error);
    return [];
  }
}

/**
 * Inicializar Q-values para un rango de posiciones
 * 
 * @param positions - Array de posiciones a inicializar
 * @param initialValue - Valor inicial para Q-values (default: 0.5)
 * @returns Objeto con Q-values inicializados
 */
export function initializeQValues(
  positions: number[],
  initialValue: number = 0.5
): Record<number, number> {
  const qValues: Record<number, number> = {};
  positions.forEach((pos) => {
    qValues[pos] = initialValue;
  });
  return qValues;
}

/**
 * Calcular tasa de éxito de una posición
 * 
 * @param stats - Objeto con victorias y total de intentos
 * @returns Tasa de éxito (0-1), 0.5 si no hay datos
 */
export function calculateSuccessRate(stats: { wins: number; total: number }): number {
  if (stats.total === 0) return 0.5; // Valor neutral para posiciones sin datos
  return stats.wins / stats.total;
}

/**
 * Degradar epsilon según configuración
 * Asegura que epsilon no baje del mínimo configurado
 * 
 * @param currentEpsilon - Valor actual de epsilon
 * @param minEpsilon - Valor mínimo permitido
 * @param decayRate - Tasa de degradación (default: 0.995)
 * @returns Nuevo valor de epsilon
 */
export function degradeEpsilon(
  currentEpsilon: number,
  minEpsilon: number,
  decayRate: number = 0.995
): number {
  return Math.max(minEpsilon, currentEpsilon * decayRate);
}

/**
 * Calcular bonus de novedad para una posición
 * Incentiva exploración de posiciones poco usadas
 * 
 * @param usageCount - Número de veces que se ha usado la posición
 * @returns Bonus de novedad (0-0.30)
 */
export function calculateNoveltyBonus(usageCount: number): number {
  if (usageCount === 0) return 0.30; // Posición nunca usada
  if (usageCount === 1) return 0.15; // Posición usada solo 1 vez
  return 0; // Sin bonus para posiciones muy usadas
}

/**
 * Calcular penalización por uso excesivo (Fase 2 - Ultra agresivo)
 * Penaliza fuertemente posiciones sobre-utilizadas
 * 
 * @param usageCount - Número de veces que se ha usado la posición
 * @param totalGames - Total de partidas jugadas
 * @returns Penalización (0 a -0.50)
 */
export function calculateDiversityPenalty(
  usageCount: number,
  totalGames: number
): number {
  const usageRate = totalGames > 0 ? usageCount / totalGames : 0;
  
  // Fase 2: Penalizaciones ultra agresivas
  if (usageCount > 4) return -0.50; // BRUTAL: -50%
  if (usageCount > 3) return -0.35; // Muy alta: -35%
  if (usageCount > 2) return -0.25; // Alta: -25%
  
  // Penalización adicional por tasa de uso
  if (usageRate > 0.15) return -0.20; // Más del 15% de partidas
  if (usageRate > 0.10) return -0.10; // Más del 10% de partidas
  
  return 0; // Sin penalización
}

/**
 * Calcular penalización por baja tasa de éxito (Fase 2)
 * Penaliza posiciones con mal rendimiento histórico
 * 
 * @param successRate - Tasa de éxito de la posición (0-1)
 * @param usageCount - Número de veces usada
 * @returns Factor multiplicador (0.2 a 1.0)
 */
export function calculateSuccessPenalty(
  successRate: number,
  usageCount: number
): number {
  // Solo penalizar si hay suficientes datos
  if (usageCount < 2) return 1.0;
  
  // Penalización brutal para posiciones malas
  if (successRate < 0.4 && usageCount > 3) return 0.2; // -80%
  if (successRate < 0.5 && usageCount > 2) return 0.3; // -70%
  
  return 1.0; // Sin penalización
}

/**
 * Detectar si Mystake está adaptándose al sistema
 * Analiza rachas de derrotas recientes
 * 
 * @param recentGames - Últimas N partidas
 * @returns true si se detecta adaptación (>60% derrotas en últimas 5)
 */
export function detectMystakeAdaptation(
  recentGames: Array<{ hitBone: boolean }> | undefined | null
): boolean {
  if (!recentGames || recentGames.length < 5) return false;
  
  const last5 = recentGames.slice(0, 5);
  const lossRate = last5.filter(g => g.hitBone).length / 5;
  
  return lossRate > 0.6; // Más del 60% de derrotas = adaptación
}

/**
 * Obtener posiciones no exploradas
 * Identifica posiciones que nunca o casi nunca se han usado
 * 
 * @param positionStats - Estadísticas de todas las posiciones
 * @param maxUsage - Uso máximo para considerar "no explorada" (default: 0)
 * @returns Array de posiciones no exploradas
 */
export function getUnexploredPositions(
  positionStats: Record<number, { wins: number; total: number }> | undefined | null,
  maxUsage: number = 0
): number[] {
  const unexplored: number[] = [];
  
  if (!positionStats) {
    // Si no hay stats, todas están sin explorar
    return Array.from({ length: 25 }, (_, i) => i + 1);
  }
  
  for (let pos = 1; pos <= 25; pos++) {
    const stats = positionStats[pos];
    if (!stats || stats.total <= maxUsage) {
      unexplored.push(pos);
    }
  }
  
  return unexplored;
}

/**
 * Seleccionar posición aleatoria de un array
 * Útil para exploración
 * 
 * @param positions - Array de posiciones candidatas
 * @returns Posición seleccionada aleatoriamente
 */
export function selectRandomPosition(positions: number[]): number {
  if (positions.length === 0) {
    throw new Error('No hay posiciones disponibles para seleccionar');
  }
  return positions[Math.floor(Math.random() * positions.length)];
}

/**
 * Normalizar score entre 0 y 1
 * 
 * @param value - Valor a normalizar
 * @param min - Valor mínimo del rango
 * @param max - Valor máximo del rango
 * @returns Valor normalizado (0-1)
 */
export function normalizeScore(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/**
 * Calcular bonus por zona (zonas frías opuestas)
 * 
 * @param zone - Zona actual ('ZONE_A' | 'ZONE_B')
 * @param lastZoneUsed - Última zona utilizada
 * @returns Bonus por cambio de zona (0 o 0.15)
 */
export function calculateZoneBonus(
  zone: 'ZONE_A' | 'ZONE_B',
  lastZoneUsed: 'ZONE_A' | 'ZONE_B'
): number {
  return zone !== lastZoneUsed ? 0.15 : 0;
}
