import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { selectPositionML, getMLStats } from "@/lib/ml/reinforcement-learning";
import {
  selectPositionMLRentable,
  getMLStatsRentable,
} from "@/lib/ml/reinforcement-learning-rentable";
import {
  isMLServiceAvailable,
  getPythonPrediction,
} from "@/lib/python-ml-client";

const requestSchema = z.object({
  revealedPositions: z
    .array(z.number().int().min(1).max(25))
    .max(24)
    .optional()
    .default([]),
  tipoAsesor: z
    .enum(["original", "rentable"])
    .optional()
    .default("original"),
  objetivoRentable: z
    .union([z.literal(2), z.literal(3)])
    .optional()
    .default(2),
  boneCount: z.number().int().min(2).max(4).optional().default(4),
  recentBonePositions: z
    .array(z.array(z.number().int().min(1).max(25)))
    .optional()
    .default([]),
  usePythonML: z.boolean().optional().default(true),
});

function formatMaybeNumber(value: unknown, digits: number): string {
  if (typeof value === "number" && Number.isFinite(value)) return value.toFixed(digits);
  if (typeof value === "string" && value.length > 0) return value;
  return "N/A";
}

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const validated = requestSchema.parse(requestBody);
    const {
      revealedPositions,
      tipoAsesor,
      objetivoRentable,
      boneCount,
      recentBonePositions,
      usePythonML,
    } = validated;

    // 1. INTENTAR SERVICIO PYTHON ML PRIMERO
    if (usePythonML) {
      const pythonAvailable = await isMLServiceAvailable();

      if (pythonAvailable) {
        const pythonResult = await getPythonPrediction({
          revealedPositions,
          boneCount,
          advisorType: tipoAsesor,
          targetPositions: objetivoRentable,
          recentBonePositions,
        });

          if (pythonResult && pythonResult.success) {
            const tsStats =
              tipoAsesor === "rentable" ? getMLStatsRentable() : getMLStats();
            const lastZoneUsed =
              tsStats && typeof tsStats === "object" && "lastZoneUsed" in tsStats
                ? (tsStats as { lastZoneUsed?: unknown }).lastZoneUsed
                : undefined;
            const consecutiveSafePositions =
              tsStats && typeof tsStats === "object" && "consecutiveSafePositions" in tsStats
                ? (tsStats as { consecutiveSafePositions?: unknown }).consecutiveSafePositions
                : undefined;
            const topPositions =
              tsStats && typeof tsStats === "object" && "topPositions" in tsStats
                ? (tsStats as { topPositions?: unknown }).topPositions
                : undefined;

          return NextResponse.json({
            success: true,
            engine: "PYTHON_ML",
            tipoAsesor,
            objetivoRentable: tipoAsesor === "rentable" ? objetivoRentable : undefined,
            suggestion: {
              position: pythonResult.suggestion.position,
              confidence: pythonResult.suggestion.confidence,
              strategy: pythonResult.suggestion.strategy,
              model: pythonResult.suggestion.model,
              zone: "N/A",
              qValue: "N/A",
            },
            pythonAnalysis: {
              safePositions: pythonResult.analysis.safe_positions,
              dangerousPositions: pythonResult.analysis.dangerous_positions,
              patternDetected: pythonResult.analysis.pattern_detected,
              rotationActive: pythonResult.analysis.rotation_active,
              modelsContributions: pythonResult.models_contributions,
            },
            ml: {
              epsilon: formatMaybeNumber(tsStats.epsilon, 3),
              totalGames: tsStats.totalGames,
              explorationRate: tsStats.explorationCount > 0
                ? ((tsStats.explorationCount / tsStats.totalGames) * 100).toFixed(1) + "%"
                : "0%",
              lastZoneUsed: typeof lastZoneUsed === "string" ? lastZoneUsed : "N/A",
              consecutiveSafePositions: Array.isArray(consecutiveSafePositions)
                ? consecutiveSafePositions.length
                : typeof consecutiveSafePositions === "number"
                  ? consecutiveSafePositions
                  : 0,
              topPositions: Array.isArray(topPositions) ? topPositions.slice(0, 5) : [],
            },
            analysis: {
              version: "PYTHON_V2_ENSEMBLE",
              features: [
                "Red Neuronal Profunda (MLP 128-64-32)",
                "Random Forest (200 estimators)",
                "Gradient Boosting (100 estimators)",
                "Cadenas de Markov (2do orden)",
                "Análisis Adaptativo de Patrones",
                "Ensemble con votación ponderada",
                "Detección de adaptación Mystake",
              ],
              pythonVersion: pythonResult.version,
            },
          });
        }
      }
    }

    // 2. FALLBACK: SISTEMA TYPESCRIPT ML
    let prediction;
    let statistics;

    if (tipoAsesor === "rentable") {
      prediction = await selectPositionMLRentable(revealedPositions, objetivoRentable);
      statistics = getMLStatsRentable();
    } else {
      prediction = await selectPositionML(revealedPositions);
      statistics = getMLStats();
    }

    return NextResponse.json({
      success: true,
      engine: "TYPESCRIPT_ML",
      tipoAsesor,
      objetivoRentable: tipoAsesor === "rentable" ? objetivoRentable : undefined,
      suggestion: {
        position: prediction.position,
        confidence: prediction.confidence,
        strategy: prediction.strategy,
        zone: prediction.zone || "N/A",
        qValue: prediction.qValue?.toFixed(3) || "N/A",
      },
      ml: {
        epsilon: prediction.epsilon?.toFixed(3) || statistics.epsilon?.toFixed(3) || "N/A",
        totalGames: statistics.totalGames,
        explorationRate: statistics.explorationCount > 0
          ? ((statistics.explorationCount / statistics.totalGames) * 100).toFixed(1) + "%"
          : "0%",
        lastZoneUsed: statistics.lastZoneUsed || "N/A",
        consecutiveSafePositions: statistics.consecutiveSafePositions || 0,
        topPositions: statistics.topPositions?.slice(0, 5) || [],
      },
      analysis: {
        version: tipoAsesor === "rentable" ? "RENTABLE_2-3_POSICIONES" : "V5_ML_REINFORCEMENT_LEARNING",
        features: tipoAsesor === "rentable" ? [
          "Solo posiciones ultra seguras (93%+ pollos)",
          "Exploracion reducida (25%)",
          "Objetivo: 2-3 posiciones",
          "Q-Learning optimizado",
        ] : [
          "Epsilon-greedy con degradacion",
          "Zonas frias opuestas alternadas",
          "Memoria de secuencia (7 posiciones)",
          "Q-Learning",
        ],
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validación fallida", details: err.issues }, { status: 400 });
    }
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Prediction failed", details: errorMessage }, { status: 500 });
  }
}
