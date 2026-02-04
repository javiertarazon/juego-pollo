/**
 * 🎯 API ENDPOINT: PREDICCIÓN CON ENSEMBLE INTELIGENTE
 * 
 * Endpoint que utiliza el sistema de ensemble para predicciones robustas
 * combinando múltiples modelos de ML.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { EnsembleInteligente } from '@/../../ml/algoritmos/ensemble-inteligente';

// Instancia global del ensemble (se entrena una vez)
let ensembleGlobal: EnsembleInteligente | null = null;
let ultimoEntrenamiento: Date | null = null;
const INTERVALO_REENTRENAMIENTO = 1000 * 60 * 60; // 1 hora

/**
 * Obtiene o entrena el ensemble
 */
async function obtenerEnsemble(): Promise<EnsembleInteligente> {
  const ahora = new Date();
  
  // Si no existe o necesita reentrenamiento
  if (!ensembleGlobal || 
      !ultimoEntrenamiento || 
      (ahora.getTime() - ultimoEntrenamiento.getTime()) > INTERVALO_REENTRENAMIENTO) {
    
    console.log('🔄 Entrenando ensemble...');
    
    // Cargar datos de entrenamiento
    const partidas = await db.chickenGame.findMany({
      where: {
        isSimulated: false,
        boneCount: 4
      },
      include: {
        positions: {
          orderBy: { position: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 500
    });
    
    // Formatear datos
    const partidas_formateadas = partidas.map(partida => ({
      id: partida.id,
      boneCount: partida.boneCount,
      hitBone: partida.hitBone,
      bonePositions: partida.positions
        .filter(p => !p.isChicken)
        .map(p => p.position),
      positions: partida.positions
    }));
    
    // Crear y entrenar
    ensembleGlobal = new EnsembleInteligente();
    await ensembleGlobal.entrenar(partidas_formateadas);
    ultimoEntrenamiento = ahora;
    
    console.log('✅ Ensemble entrenado');
  }
  
  return ensembleGlobal;
}

/**
 * POST /api/chicken/predict-ensemble
 * 
 * Body:
 * {
 *   posiciones_reveladas: number[],
 *   posiciones_huesos: number[],
 *   num_predicciones: number (opcional, default: 5)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      posiciones_reveladas = [],
      posiciones_huesos = [],
      num_predicciones = 5
    } = body;
    
    // Validar entrada
    if (!Array.isArray(posiciones_reveladas) || !Array.isArray(posiciones_huesos)) {
      return NextResponse.json(
        { error: 'posiciones_reveladas y posiciones_huesos deben ser arrays' },
        { status: 400 }
      );
    }
    
    // Obtener ensemble
    const ensemble = await obtenerEnsemble();
    
    // Realizar predicción
    const prediccion = await ensemble.predecir(
      posiciones_reveladas,
      posiciones_huesos,
      num_predicciones
    );
    
    // Formatear respuesta
    const respuesta = {
      success: true,
      prediccion: {
        posiciones_seguras: prediccion.posiciones_seguras,
        confianza_global: prediccion.confianza_global,
        contribuciones_modelos: prediccion.contribuciones_modelos,
        probabilidades: Array.from(prediccion.probabilidades_combinadas.entries())
          .map(([pos, prob]) => ({
            posicion: pos,
            probabilidad: prob,
            intervalo_confianza: prediccion.intervalos_confianza.get(pos)
          }))
          .sort((a, b) => b.probabilidad - a.probabilidad)
          .slice(0, num_predicciones),
        metricas_modelos: {
          series_temporales: {
            precision: prediccion.metricas_individuales.series_temporales.precision,
            f1_score: prediccion.metricas_individuales.series_temporales.f1_score
          },
          q_learning: {
            precision: prediccion.metricas_individuales.q_learning.precision,
            f1_score: prediccion.metricas_individuales.q_learning.f1_score
          },
          markov: {
            precision: prediccion.metricas_individuales.markov.precision,
            f1_score: prediccion.metricas_individuales.markov.f1_score
          }
        }
      },
      metadata: {
        timestamp: new Date().toISOString(),
        ultimo_entrenamiento: ultimoEntrenamiento?.toISOString(),
        posiciones_reveladas_count: posiciones_reveladas.length,
        posiciones_huesos_count: posiciones_huesos.length
      }
    };
    
    return NextResponse.json(respuesta);
    
  } catch (error) {
    console.error('❌ Error en predicción ensemble:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al realizar predicción',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/chicken/predict-ensemble/stats
 * 
 * Obtiene estadísticas del ensemble
 */
export async function GET(req: NextRequest) {
  try {
    const ensemble = await obtenerEnsemble();
    const estadisticas = ensemble.obtenerEstadisticas();
    
    return NextResponse.json({
      success: true,
      estadisticas: {
        pesos_actuales: estadisticas.pesos_actuales,
        metricas_modelos: Array.from(estadisticas.metricas_modelos.entries()).map(([nombre, metricas]) => ({
          modelo: nombre,
          precision: metricas.precision,
          recall: metricas.recall,
          f1_score: metricas.f1_score,
          aciertos: metricas.aciertos,
          total_predicciones: metricas.total_predicciones
        })),
        total_predicciones: estadisticas.total_predicciones,
        estadisticas_individuales: {
          series_temporales: {
            total_secuencias: estadisticas.estadisticas_individuales.series_temporales.total_secuencias,
            ventana_analisis: estadisticas.estadisticas_individuales.series_temporales.ventana_analisis
          },
          q_learning: {
            estados_unicos: estadisticas.estadisticas_individuales.q_learning.estados_unicos,
            total_actualizaciones: estadisticas.estadisticas_individuales.q_learning.total_actualizaciones,
            epsilon_actual: estadisticas.estadisticas_individuales.q_learning.epsilon_actual
          },
          markov: {
            total_transiciones: estadisticas.estadisticas_individuales.markov.total_transiciones
          }
        }
      },
      metadata: {
        timestamp: new Date().toISOString(),
        ultimo_entrenamiento: ultimoEntrenamiento?.toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error al obtener estadísticas:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener estadísticas',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
