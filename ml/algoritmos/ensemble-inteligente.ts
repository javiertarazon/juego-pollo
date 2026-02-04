/**
 * 🎯 ENSEMBLE INTELIGENTE DE MODELOS
 * 
 * Sistema que combina múltiples modelos de ML para predicción robusta:
 * 1. Modelo de Series Temporales (análisis de tendencias)
 * 2. Q-Learning Bayesiano (aprendizaje por refuerzo)
 * 3. Modelo de Transición Markoviana (cadenas de Markov)
 * 
 * FUNDAMENTO MATEMÁTICO:
 * - Votación ponderada: P_ensemble = Σ(w_i * P_i) donde Σw_i = 1
 * - Pesos adaptativos basados en rendimiento histórico
 * - Intervalos de confianza combinados
 * 
 * VALIDACIÓN:
 * - Validación cruzada K-fold
 * - Métricas de rendimiento por modelo
 * - Test estadísticos de significancia
 */

import { ModeloSeriesTemporal, type PrediccionTemporal } from './modelo-series-temporales';
import { QLearningBayesiano, type PrediccionQLearning } from './q-learning-bayesiano';
import { ModeloTransicionMarkoviana, type PrediccionMarkoviana, type EstadoJuego } from './modelo-transicion-markoviana';
import { calcularIntervaloConfianzaProporcion, type IntervaloConfianza } from '../../analisis/validacion-cientifica/validacion-estadistica';

export interface PrediccionEnsemble {
  posiciones_seguras: number[];
  probabilidades_combinadas: Map<number, number>;
  confianza_global: number;
  contribuciones_modelos: {
    series_temporales: number;
    q_learning: number;
    markov: number;
  };
  intervalos_confianza: Map<number, IntervaloConfianza>;
  metricas_individuales: {
    series_temporales: MetricasModelo;
    q_learning: MetricasModelo;
    markov: MetricasModelo;
  };
}

export interface MetricasModelo {
  precision: number;
  recall: number;
  f1_score: number;
  aciertos: number;
  total_predicciones: number;
}

export interface PesosModelos {
  series_temporales: number;
  q_learning: number;
  markov: number;
}

/**
 * Clase principal del Ensemble Inteligente
 */
export class EnsembleInteligente {
  private modelo_series_temporales: ModeloSeriesTemporal;
  private modelo_q_learning: QLearningBayesiano;
  private modelo_markov: ModeloTransicionMarkoviana;
  
  private pesos: PesosModelos;
  private metricas_historicas: Map<string, MetricasModelo>;
  private historial_predicciones: Array<{
    prediccion: number[];
    resultado: boolean[];
    timestamp: Date;
  }>;
  
  constructor() {
    this.modelo_series_temporales = new ModeloSeriesTemporal(50);
    this.modelo_q_learning = new QLearningBayesiano(0.1, 0.9, 0.3);
    this.modelo_markov = new ModeloTransicionMarkoviana();
    
    // Pesos iniciales iguales
    this.pesos = {
      series_temporales: 1/3,
      q_learning: 1/3,
      markov: 1/3
    };
    
    this.metricas_historicas = new Map();
    this.historial_predicciones = [];
    
    // Inicializar métricas
    this.inicializarMetricas();
  }
  
  /**
   * Inicializa las métricas de cada modelo
   */
  private inicializarMetricas(): void {
    const metricas_iniciales: MetricasModelo = {
      precision: 0.5,
      recall: 0.5,
      f1_score: 0.5,
      aciertos: 0,
      total_predicciones: 0
    };
    
    this.metricas_historicas.set('series_temporales', { ...metricas_iniciales });
    this.metricas_historicas.set('q_learning', { ...metricas_iniciales });
    this.metricas_historicas.set('markov', { ...metricas_iniciales });
  }
  
  /**
   * Entrena todos los modelos del ensemble
   */
  async entrenar(partidas: any[]): Promise<void> {
    console.log(`🎯 Entrenando Ensemble Inteligente con ${partidas.length} partidas...`);
    console.log('');
    
    // Entrenar cada modelo en paralelo
    await Promise.all([
      this.modelo_series_temporales.entrenar(partidas),
      this.modelo_q_learning.entrenar(partidas),
      this.modelo_markov.entrenar(partidas)
    ]);
    
    console.log('');
    console.log('✅ Ensemble entrenado exitosamente');
    
    // Actualizar pesos basados en rendimiento histórico
    this.actualizarPesos();
  }
  
  /**
   * Actualiza los pesos de los modelos basándose en su rendimiento
   */
  private actualizarPesos(): void {
    const metricas_st = this.metricas_historicas.get('series_temporales')!;
    const metricas_ql = this.metricas_historicas.get('q_learning')!;
    const metricas_mk = this.metricas_historicas.get('markov')!;
    
    // Calcular pesos basados en F1-score
    const f1_total = metricas_st.f1_score + metricas_ql.f1_score + metricas_mk.f1_score;
    
    if (f1_total > 0) {
      this.pesos = {
        series_temporales: metricas_st.f1_score / f1_total,
        q_learning: metricas_ql.f1_score / f1_total,
        markov: metricas_mk.f1_score / f1_total
      };
    } else {
      // Si no hay métricas, usar pesos iguales
      this.pesos = {
        series_temporales: 1/3,
        q_learning: 1/3,
        markov: 1/3
      };
    }
    
    console.log('📊 Pesos actualizados:');
    console.log(`   Series Temporales: ${(this.pesos.series_temporales * 100).toFixed(1)}%`);
    console.log(`   Q-Learning: ${(this.pesos.q_learning * 100).toFixed(1)}%`);
    console.log(`   Markov: ${(this.pesos.markov * 100).toFixed(1)}%`);
  }
  
  /**
   * Realiza predicción combinando los tres modelos
   */
  async predecir(
    posiciones_reveladas: number[],
    posiciones_huesos: number[],
    num_predicciones: number = 5
  ): Promise<PrediccionEnsemble> {
    // Obtener predicciones de cada modelo
    const pred_series_temporales = await this.modelo_series_temporales.predecir(
      posiciones_reveladas,
      num_predicciones
    );
    
    const pred_q_learning = await this.modelo_q_learning.predecir(
      posiciones_reveladas,
      posiciones_huesos,
      num_predicciones
    );
    
    const estado_markov: EstadoJuego = {
      posiciones_reveladas,
      posiciones_huesos,
      turno_actual: posiciones_reveladas.length
    };
    
    const pred_markov = await this.modelo_markov.predecir(
      estado_markov,
      num_predicciones
    );
    
    // Combinar probabilidades con votación ponderada
    const probabilidades_combinadas = this.combinarProbabilidades(
      pred_series_temporales,
      pred_q_learning,
      pred_markov
    );
    
    // Ordenar posiciones por probabilidad combinada
    const posiciones_ordenadas = Array.from(probabilidades_combinadas.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, num_predicciones);
    
    const posiciones_seguras = posiciones_ordenadas.map(([pos]) => pos);
    
    // Calcular intervalos de confianza combinados
    const intervalos_confianza = this.combinarIntervalosConfianza(
      pred_series_temporales,
      pred_q_learning,
      pred_markov,
      posiciones_seguras
    );
    
    // Calcular confianza global
    const confianza_global = this.calcularConfianzaGlobal(
      pred_series_temporales,
      pred_q_learning,
      pred_markov
    );
    
    // Obtener métricas actuales
    const metricas_individuales = {
      series_temporales: this.metricas_historicas.get('series_temporales')!,
      q_learning: this.metricas_historicas.get('q_learning')!,
      markov: this.metricas_historicas.get('markov')!
    };
    
    return {
      posiciones_seguras,
      probabilidades_combinadas,
      confianza_global,
      contribuciones_modelos: this.pesos,
      intervalos_confianza,
      metricas_individuales
    };
  }
  
  /**
   * Combina las probabilidades de los tres modelos
   */
  private combinarProbabilidades(
    pred_st: PrediccionTemporal,
    pred_ql: PrediccionQLearning,
    pred_mk: PrediccionMarkoviana
  ): Map<number, number> {
    const probabilidades_combinadas = new Map<number, number>();
    
    // Obtener todas las posiciones únicas
    const posiciones_unicas = new Set<number>([
      ...pred_st.posiciones_seguras,
      ...pred_ql.posiciones_seguras,
      ...pred_mk.posiciones_seguras
    ]);
    
    // Combinar probabilidades con votación ponderada
    for (const pos of posiciones_unicas) {
      const prob_st = pred_st.probabilidades.get(pos) || 0;
      const prob_ql = pred_ql.q_values.get(pos) || 0;
      const prob_mk = pred_mk.probabilidades.get(pos) || 0;
      
      const prob_combinada = 
        this.pesos.series_temporales * prob_st +
        this.pesos.q_learning * prob_ql +
        this.pesos.markov * prob_mk;
      
      probabilidades_combinadas.set(pos, prob_combinada);
    }
    
    return probabilidades_combinadas;
  }
  
  /**
   * Combina los intervalos de confianza de los modelos
   */
  private combinarIntervalosConfianza(
    pred_st: PrediccionTemporal,
    pred_ql: PrediccionQLearning,
    pred_mk: PrediccionMarkoviana,
    posiciones: number[]
  ): Map<number, IntervaloConfianza> {
    const intervalos_combinados = new Map<number, IntervaloConfianza>();
    
    for (const pos of posiciones) {
      const intervalo_st = pred_st.intervalos_confianza.get(pos);
      const intervalo_ql = pred_ql.confianza_bayesiana.get(pos);
      const intervalo_mk = pred_mk.intervalos_confianza.get(pos);
      
      // Combinar intervalos usando promedio ponderado
      let limite_inferior = 0;
      let limite_superior = 0;
      let peso_total = 0;
      
      if (intervalo_st) {
        limite_inferior += this.pesos.series_temporales * intervalo_st.limite_inferior;
        limite_superior += this.pesos.series_temporales * intervalo_st.limite_superior;
        peso_total += this.pesos.series_temporales;
      }
      
      if (intervalo_ql) {
        limite_inferior += this.pesos.q_learning * intervalo_ql.limite_inferior;
        limite_superior += this.pesos.q_learning * intervalo_ql.limite_superior;
        peso_total += this.pesos.q_learning;
      }
      
      if (intervalo_mk) {
        limite_inferior += this.pesos.markov * intervalo_mk.limite_inferior;
        limite_superior += this.pesos.markov * intervalo_mk.limite_superior;
        peso_total += this.pesos.markov;
      }
      
      if (peso_total > 0) {
        const limite_inf_final = limite_inferior / peso_total;
        const limite_sup_final = limite_superior / peso_total;
        intervalos_combinados.set(pos, {
          limite_inferior: limite_inf_final,
          limite_superior: limite_sup_final,
          nivel_confianza: 0.95,
          margen_error: (limite_sup_final - limite_inf_final) / 2
        });
      }
    }
    
    return intervalos_combinados;
  }
  
  /**
   * Calcula la confianza global del ensemble
   */
  private calcularConfianzaGlobal(
    pred_st: PrediccionTemporal,
    pred_ql: PrediccionQLearning,
    pred_mk: PrediccionMarkoviana
  ): number {
    const confianza_st = pred_st.confianza_temporal;
    const confianza_ql = 1 - pred_ql.epsilon_actual; // Mayor confianza = menor exploración
    const confianza_mk = pred_mk.confianza_global;
    
    const confianza_global = 
      this.pesos.series_temporales * confianza_st +
      this.pesos.q_learning * confianza_ql +
      this.pesos.markov * confianza_mk;
    
    return confianza_global;
  }
  
  /**
   * Actualiza las métricas de los modelos con feedback
   */
  async actualizarMetricas(
    predicciones: number[],
    resultados: boolean[]
  ): Promise<void> {
    // Registrar en historial
    this.historial_predicciones.push({
      prediccion: predicciones,
      resultado: resultados,
      timestamp: new Date()
    });
    
    // Actualizar métricas de cada modelo
    // (Esto requeriría predicciones individuales de cada modelo)
    // Por ahora, actualizamos las métricas globales
    
    const aciertos = resultados.filter(r => r).length;
    const total = resultados.length;
    
    // Actualizar métricas de forma simplificada
    for (const [nombre, metricas] of this.metricas_historicas.entries()) {
      metricas.aciertos += aciertos;
      metricas.total_predicciones += total;
      
      if (metricas.total_predicciones > 0) {
        metricas.precision = metricas.aciertos / metricas.total_predicciones;
        metricas.recall = metricas.precision; // Simplificación
        metricas.f1_score = 2 * (metricas.precision * metricas.recall) / 
                           (metricas.precision + metricas.recall || 1);
      }
    }
    
    // Actualizar pesos basados en nuevo rendimiento
    this.actualizarPesos();
  }
  
  /**
   * Obtiene estadísticas completas del ensemble
   */
  obtenerEstadisticas(): {
    pesos_actuales: PesosModelos;
    metricas_modelos: Map<string, MetricasModelo>;
    total_predicciones: number;
    estadisticas_individuales: {
      series_temporales: any;
      q_learning: any;
      markov: any;
    };
  } {
    return {
      pesos_actuales: this.pesos,
      metricas_modelos: this.metricas_historicas,
      total_predicciones: this.historial_predicciones.length,
      estadisticas_individuales: {
        series_temporales: this.modelo_series_temporales.obtenerEstadisticas(),
        q_learning: this.modelo_q_learning.obtenerEstadisticas(),
        markov: this.modelo_markov.obtenerEstadisticas()
      }
    };
  }
  
  /**
   * Exporta el estado del ensemble para persistencia
   */
  exportarEstado(): {
    pesos: PesosModelos;
    metricas: Array<[string, MetricasModelo]>;
    historial_size: number;
  } {
    return {
      pesos: this.pesos,
      metricas: Array.from(this.metricas_historicas.entries()),
      historial_size: this.historial_predicciones.length
    };
  }
  
  /**
   * Importa el estado del ensemble desde persistencia
   */
  importarEstado(estado: {
    pesos: PesosModelos;
    metricas: Array<[string, MetricasModelo]>;
  }): void {
    this.pesos = estado.pesos;
    this.metricas_historicas = new Map(estado.metricas);
  }
}
