import { NextRequest, NextResponse } from 'next/server';
import { featureEngineer } from '@/lib/ml/feature-engineering';
import { monitoring, logError } from '@/lib/monitoring';
import { validateBoneCount, validatePositions } from '@/lib/validation';

// POST /api/ml/features - Extract features for a position
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      position, 
      boneCount, 
      revealedPositions = [], 
      timestamp,
      includeExplanations = true 
    } = body;

    // Validate inputs
    if (!Number.isInteger(position) || position < 1 || position > 25) {
      return NextResponse.json({
        error: 'Invalid position: must be integer between 1 and 25'
      }, { status: 400 });
    }

    const validatedBoneCount = validateBoneCount(boneCount);
    const validatedPositions = validatePositions(revealedPositions);

    if (validatedPositions.includes(position)) {
      return NextResponse.json({
        error: 'Position is already revealed'
      }, { status: 400 });
    }

    // Extract features
    const gameContext = timestamp ? { timestamp: new Date(timestamp) } : undefined;
    const features = await featureEngineer.extractFeatures(
      position,
      validatedBoneCount,
      validatedPositions,
      gameContext
    );

    // Generate feature explanations if requested
    let explanations = {};
    if (includeExplanations) {
      explanations = generateFeatureExplanations(features);
    }

    // Log feature extraction
    await monitoring.logMetric('feature_extraction', 1, validatedBoneCount, {
      position,
      revealedCount: validatedPositions.length,
      dataQuality: features.features.dataQuality,
    });

    return NextResponse.json({
      success: true,
      position,
      boneCount: validatedBoneCount,
      revealedPositions: validatedPositions,
      features,
      explanations: includeExplanations ? explanations : undefined,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logError(error as Error, { endpoint: 'feature-extraction' });
    
    return NextResponse.json({
      error: 'Feature extraction failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// GET /api/ml/features - Get feature importance and statistics
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const boneCount = searchParams.get('boneCount');
    const analysisType = searchParams.get('type') || 'importance';

    const validatedBoneCount = boneCount ? validateBoneCount(parseInt(boneCount)) : undefined;

    switch (analysisType) {
      case 'importance':
        return await getFeatureImportance(validatedBoneCount);
      case 'statistics':
        return await getFeatureStatistics(validatedBoneCount);
      case 'correlation':
        return await getFeatureCorrelations(validatedBoneCount);
      default:
        return NextResponse.json({
          error: 'Invalid analysis type. Supported types: importance, statistics, correlation'
        }, { status: 400 });
    }

  } catch (error) {
    logError(error as Error, { endpoint: 'features-get' });
    
    return NextResponse.json({
      error: 'Failed to get feature analysis',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// Helper functions
function generateFeatureExplanations(features: any) {
  const basic = features.features;
  const engineered = features.engineeredFeatures;

  return {
    basic: {
      historicalWinRate: {
        value: basic.historicalWinRate,
        explanation: `Esta posición ha sido pollo en ${Math.round(basic.historicalWinRate * 100)}% de partidas históricas`,
        impact: basic.historicalWinRate > 0.6 ? 'positive' : basic.historicalWinRate < 0.4 ? 'negative' : 'neutral'
      },
      recentWinRate: {
        value: basic.recentWinRate,
        explanation: `En las últimas 10 partidas, ha sido pollo ${Math.round(basic.recentWinRate * 100)}% de las veces`,
        impact: basic.recentWinRate > basic.historicalWinRate ? 'improving' : basic.recentWinRate < basic.historicalWinRate ? 'declining' : 'stable'
      },
      distanceToNearestBone: {
        value: basic.distanceToNearestBone,
        explanation: `Distancia al hueso más cercano: ${basic.distanceToNearestBone.toFixed(1)} posiciones`,
        impact: basic.distanceToNearestBone > 2 ? 'positive' : 'negative'
      },
      clusterDensity: {
        value: basic.clusterDensity,
        explanation: `Densidad de huesos en área cercana: ${Math.round(basic.clusterDensity * 100)}%`,
        impact: basic.clusterDensity < 0.3 ? 'positive' : basic.clusterDensity > 0.6 ? 'negative' : 'neutral'
      },
      patternMatchConfidence: {
        value: basic.patternMatchConfidence,
        explanation: `Confianza en patrones detectados: ${Math.round(basic.patternMatchConfidence * 100)}%`,
        impact: basic.patternMatchConfidence > 0.7 ? 'high_confidence' : basic.patternMatchConfidence < 0.4 ? 'low_confidence' : 'medium_confidence'
      },
      volatilityIndex: {
        value: basic.volatilityIndex,
        explanation: `Índice de volatilidad: ${Math.round(basic.volatilityIndex * 100)}% (qué tan impredecible es)`,
        impact: basic.volatilityIndex < 0.3 ? 'stable' : basic.volatilityIndex > 0.7 ? 'volatile' : 'moderate'
      }
    },
    engineered: {
      riskScore: {
        value: engineered.riskScore,
        explanation: `Puntuación de riesgo calculada: ${Math.round(engineered.riskScore * 100)}%`,
        impact: engineered.riskScore < 0.3 ? 'low_risk' : engineered.riskScore > 0.7 ? 'high_risk' : 'medium_risk'
      },
      opportunityScore: {
        value: engineered.opportunityScore,
        explanation: `Puntuación de oportunidad: ${Math.round(engineered.opportunityScore * 100)}%`,
        impact: engineered.opportunityScore > 0.7 ? 'high_opportunity' : engineered.opportunityScore < 0.4 ? 'low_opportunity' : 'medium_opportunity'
      },
      stabilityScore: {
        value: engineered.stabilityScore,
        explanation: `Puntuación de estabilidad: ${Math.round(engineered.stabilityScore * 100)}%`,
        impact: engineered.stabilityScore > 0.7 ? 'very_stable' : engineered.stabilityScore < 0.4 ? 'unstable' : 'moderately_stable'
      },
      positionZone: {
        value: engineered.positionZone,
        explanation: `Zona del tablero: ${engineered.positionZone === 'corner' ? 'esquina' : engineered.positionZone === 'edge' ? 'borde' : 'centro'}`,
        impact: engineered.positionZone === 'center' ? 'strategic' : engineered.positionZone === 'corner' ? 'defensive' : 'balanced'
      }
    },
    summary: {
      overallAssessment: generateOverallAssessment(basic, engineered),
      keyFactors: identifyKeyFactors(basic, engineered),
      recommendations: generateRecommendations(basic, engineered)
    }
  };
}

function generateOverallAssessment(basic: any, engineered: any): string {
  const riskLevel = engineered.riskScore < 0.3 ? 'bajo' : engineered.riskScore > 0.7 ? 'alto' : 'medio';
  const opportunity = engineered.opportunityScore > 0.7 ? 'alta' : engineered.opportunityScore < 0.4 ? 'baja' : 'media';
  const stability = engineered.stabilityScore > 0.7 ? 'muy estable' : engineered.stabilityScore < 0.4 ? 'inestable' : 'moderadamente estable';
  
  return `Esta posición presenta riesgo ${riskLevel}, oportunidad ${opportunity} y es ${stability}. ` +
         `Con un win rate histórico del ${Math.round(basic.historicalWinRate * 100)}% y confianza del modelo del ${Math.round(basic.modelConfidence * 100)}%.`;
}

function identifyKeyFactors(basic: any, engineered: any): string[] {
  const factors: string[] = [];
  
  if (basic.historicalWinRate > 0.7) factors.push('Excelente historial de éxito');
  if (basic.historicalWinRate < 0.3) factors.push('Historial riesgoso');
  
  if (basic.recentWinRate > basic.historicalWinRate + 0.1) factors.push('Tendencia positiva reciente');
  if (basic.recentWinRate < basic.historicalWinRate - 0.1) factors.push('Tendencia negativa reciente');
  
  if (basic.distanceToNearestBone > 3) factors.push('Bien alejado de huesos');
  if (basic.distanceToNearestBone < 1.5) factors.push('Muy cerca de huesos');
  
  if (basic.clusterDensity > 0.6) factors.push('En zona de alta densidad');
  if (basic.clusterDensity < 0.2) factors.push('En zona limpia');
  
  if (basic.patternMatchConfidence > 0.8) factors.push('Patrones muy predecibles');
  if (basic.patternMatchConfidence < 0.3) factors.push('Comportamiento impredecible');
  
  if (engineered.riskScore < 0.2) factors.push('Riesgo muy bajo calculado');
  if (engineered.riskScore > 0.8) factors.push('Riesgo muy alto calculado');
  
  return factors.length > 0 ? factors : ['Análisis estándar sin factores destacables'];
}

function generateRecommendations(basic: any, engineered: any): string[] {
  const recommendations: string[] = [];
  
  if (engineered.riskScore < 0.3 && engineered.opportunityScore > 0.7) {
    recommendations.push('Recomendación FUERTE: Excelente oportunidad con bajo riesgo');
  } else if (engineered.riskScore > 0.7) {
    recommendations.push('PRECAUCIÓN: Alto riesgo detectado, considera evitar');
  } else if (engineered.opportunityScore > 0.8) {
    recommendations.push('OPORTUNIDAD: Alta probabilidad de éxito');
  }
  
  if (basic.modelConfidence < 0.4) {
    recommendations.push('ADVERTENCIA: Baja confianza del modelo, usar con precaución');
  } else if (basic.modelConfidence > 0.9) {
    recommendations.push('ALTA CONFIANZA: El modelo está muy seguro de esta predicción');
  }
  
  if (basic.volatilityIndex > 0.8) {
    recommendations.push('VOLATILIDAD ALTA: Posición muy impredecible');
  } else if (basic.volatilityIndex < 0.2) {
    recommendations.push('ESTABILIDAD: Posición muy predecible');
  }
  
  return recommendations.length > 0 ? recommendations : ['Posición estándar sin recomendaciones especiales'];
}

async function getFeatureImportance(boneCount?: number) {
  // This would typically come from a trained model
  // For now, return mock feature importance based on domain knowledge
  const featureImportance = {
    historicalWinRate: 0.25,
    recentWinRate: 0.15,
    distanceToNearestBone: 0.12,
    clusterDensity: 0.10,
    patternMatchConfidence: 0.08,
    riskScore: 0.07,
    opportunityScore: 0.06,
    stabilityScore: 0.05,
    volatilityIndex: 0.04,
    positionZone: 0.03,
    temporalFeatures: 0.03,
    correlationScore: 0.02,
  };

  return NextResponse.json({
    success: true,
    boneCount,
    featureImportance,
    description: 'Feature importance scores (higher = more important for predictions)',
    timestamp: new Date().toISOString(),
  });
}

async function getFeatureStatistics(boneCount?: number) {
  // Mock feature statistics
  const statistics = {
    historicalWinRate: { mean: 0.52, std: 0.18, min: 0.1, max: 0.9 },
    recentWinRate: { mean: 0.51, std: 0.22, min: 0.0, max: 1.0 },
    distanceToNearestBone: { mean: 2.3, std: 1.4, min: 0.0, max: 5.0 },
    clusterDensity: { mean: 0.35, std: 0.25, min: 0.0, max: 1.0 },
    patternMatchConfidence: { mean: 0.48, std: 0.28, min: 0.0, max: 1.0 },
    riskScore: { mean: 0.45, std: 0.22, min: 0.0, max: 1.0 },
    opportunityScore: { mean: 0.52, std: 0.19, min: 0.0, max: 1.0 },
    stabilityScore: { mean: 0.58, std: 0.24, min: 0.0, max: 1.0 },
  };

  return NextResponse.json({
    success: true,
    boneCount,
    statistics,
    description: 'Statistical distribution of features across all positions',
    timestamp: new Date().toISOString(),
  });
}

async function getFeatureCorrelations(boneCount?: number) {
  // Mock correlation matrix
  const correlations = {
    'historicalWinRate-recentWinRate': 0.72,
    'historicalWinRate-riskScore': -0.85,
    'historicalWinRate-opportunityScore': 0.91,
    'distanceToNearestBone-clusterDensity': -0.68,
    'riskScore-opportunityScore': -0.78,
    'stabilityScore-volatilityIndex': -0.82,
    'patternMatchConfidence-modelConfidence': 0.65,
  };

  return NextResponse.json({
    success: true,
    boneCount,
    correlations,
    description: 'Correlation coefficients between key features',
    timestamp: new Date().toISOString(),
  });
}