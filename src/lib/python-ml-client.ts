/**
 * 🔗 CLIENTE DEL SERVICIO ML PYTHON
 * ==================================
 * Conecta la app Next.js con el servicio FastAPI Python
 * que ejecuta la red neuronal y el ensemble de ML.
 */

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

// Tipos para las respuestas del servicio Python
export interface MLPrediction {
  position: number;
  confidence: number;
  strategy: string;
  model: string;
}

export interface MLAnalysis {
  safe_positions: number[];
  dangerous_positions: number[];
  pattern_detected: string | null;
  rotation_active: boolean;
}

export interface MLPredictResponse {
  success: boolean;
  suggestion: MLPrediction;
  analysis: MLAnalysis;
  models_contributions: Record<string, number>;
  advisor_type: string;
  version: string;
}

export interface MLTrainResponse {
  success: boolean;
  games_processed: number;
  total_games_trained: number;
  metrics: {
    neural_network: Record<string, unknown>;
    pattern_analyzer: Record<string, unknown>;
    markov: Record<string, unknown>;
    ensemble: Record<string, unknown>;
  };
  training_time: string;
}

export interface MLStatsResponse {
  is_trained: boolean;
  total_games_trained: number;
  last_training_time: string | null;
  models: Record<string, Record<string, unknown> | null>;
  version: string;
}

/**
 * Verificar si el servicio Python está disponible
 */
export async function isMLServiceAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Obtener predicción del servicio ML Python
 */
export async function getPythonPrediction(params: {
  revealedPositions: number[];
  boneCount: number;
  advisorType: 'original' | 'rentable';
  targetPositions: number;
  recentBonePositions?: number[][];
}): Promise<MLPredictResponse | null> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        revealed_positions: params.revealedPositions,
        bone_count: params.boneCount,
        advisor_type: params.advisorType,
        target_positions: params.targetPositions,
        recent_bone_positions: params.recentBonePositions || [],
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.warn('Python ML service returned:', response.status);
      return null;
    }

    return await response.json() as MLPredictResponse;
  } catch (error) {
    console.warn('Python ML service unavailable, using TypeScript fallback:', error);
    return null;
  }
}

/**
 * Entrenar modelos del servicio Python
 */
export async function trainPythonModels(games: Array<{
  bonePositions: number[];
  chickenPositions: number[];
  revealedPositions: number[];
  hitBone: boolean;
  boneCount: number;
  cashOutPosition: number;
}>, epochs: number = 100, retrain: boolean = false): Promise<MLTrainResponse | null> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        games: games.map(g => ({
          bone_positions: g.bonePositions,
          chicken_positions: g.chickenPositions,
          revealed_positions: g.revealedPositions,
          hit_bone: g.hitBone,
          bone_count: g.boneCount,
          cash_out_position: g.cashOutPosition,
        })),
        epochs,
        retrain,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) return null;
    return await response.json() as MLTrainResponse;
  } catch (error) {
    console.warn('Error training Python ML:', error);
    return null;
  }
}

/**
 * Enviar feedback de resultado para aprendizaje online
 */
export async function sendPythonFeedback(params: {
  position: number;
  wasChicken: boolean;
  revealedPositions: number[];
  boneCount: number;
}): Promise<boolean> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        position: params.position,
        was_chicken: params.wasChicken,
        revealed_positions: params.revealedPositions,
        bone_count: params.boneCount,
      }),
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Obtener estadísticas del servicio Python
 */
export async function getPythonMLStats(): Promise<MLStatsResponse | null> {
  try {
    const response = await fetch(`${ML_SERVICE_URL}/stats`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    return await response.json() as MLStatsResponse;
  } catch {
    return null;
  }
}
