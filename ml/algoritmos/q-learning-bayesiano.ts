/**
 * 🧠 Q-LEARNING BAYESIANO AVANZADO
 * 
 * Implementación de Q-Learning con intervalos de credibilidad bayesianos
 * para predicción de posiciones seguras con cuantificación de incertidumbre.
 * 
 * FUNDAMENTO MATEMÁTICO:
 * - Q-Learning: Q(s,a) = Q(s,a) + α[r + γ·max(Q(s',a')) - Q(s,a)]
 * - Prior Bayesiano: Beta(α, β) para probabilidades
 * - Posterior: Beta(α + éxitos, β + fallos)
 * - Intervalo de credibilidad: Percentiles 2.5% y 97.5%
 * 
 * VALIDACIÓN:
 * - Intervalos de credibilidad del 95%
 * - Convergencia del algoritmo
 * - Exploración epsilon-greedy adaptativa
 */

import { calcularIntervaloConfianzaProporcion, type IntervaloConfianza } from '../../analisis/validacion-cientifica/validacion-estadistica';

export interface EstadoAccion {
  estado: string;  // Representación del estado del juego
  accion: number;  // Posición seleccionada
}

export interface DistribucionBeta {
  alpha: number;  // Parámetro α (éxitos + 1)
  beta: number;   // Parámetro β (fallos + 1)
}

export interface IntervaloCredibilidad {
  limite_inferior: number;
  limite_superior: number;
  media: number;
  moda: number;
}

export interface PrediccionQLearning {
  posiciones_seguras: number[];
  q_values: Map<number, number>;
  confianza_bayesiana: Map<number, IntervaloCredibilidad>;
  epsilon_actual: number;
  estrategia: 'EXPLORAR' | 'EXPLOTAR';
}

/**
 * Clase principal del Q-Learning Bayesiano
 */
export class QLearningBayesiano {
  private q_values: Map<string, number>;
  private distribuciones_beta: Map<string, DistribucionBeta>;
  private historial_recompensas: Map<string, number[]>;
  
  // Hiperparámetros
  private tasa_aprendizaje: number = 0.1;  // α
  private factor_descuento: number = 0.9;  // γ
  private epsilon: number = 0.3;           // Exploración inicial
  private epsilon_min: number = 0.05;      // Exploración mínima
  private epsilon_decay: number = 0.995;   // Decaimiento de epsilon
  
  // Estadísticas
  private total_actualizaciones: number = 0;
  private exploraciones: number = 0;
  private explotaciones: number = 0;
  
  constructor(
    tasa_aprendizaje: number = 0.1,
    factor_descuento: number = 0.9,
    epsilon_inicial: number = 0.3
  ) {
    this.q_values = new Map();
    this.distribuciones_beta = new Map();
    this.historial_recompensas = new Map();
    this.tasa_aprendizaje = tasa_aprendizaje;
    this.factor_descuento = factor_descuento;
    this.epsilon = epsilon_inicial;
  }
  
  /**
   * Entrena el modelo con datos históricos
   */
  async entrenar(partidas: any[]): Promise<void> {
    console.log(`🧠 Entrenando Q-Learning Bayesiano con ${partidas.length} partidas...`);
    
    let actualizaciones = 0;
    
    for (const partida of partidas) {
      if (!partida.bonePositions || partida.bonePositions.length === 0) {
        continue;
      }
      
      const posiciones_huesos = new Set(partida.bonePositions as number[]);
      const exito = !partida.hitBone;
      
      // Simular secuencia de decisiones
      const posiciones_reveladas: number[] = [];
      
      // Si la partida fue exitosa, todas las posiciones reveladas fueron seguras
      if (partida.positions) {
        const reveladas = partida.positions
          .filter((p: any) => p.revealed && p.revealOrder !== null)
          .sort((a: any, b: any) => (a.revealOrder || 0) - (b.revealOrder || 0));
        
        for (const pos of reveladas) {
          const estado = this.codificarEstado(posiciones_reveladas, Array.from(posiciones_huesos));
          const accion = pos.position;
          const recompensa = pos.isChicken ? 1 : -1;
          
          // Actualizar Q-value y distribución bayesiana
          await this.actualizarQValue(estado, accion, recompensa, posiciones_reveladas);
          
          posiciones_reveladas.push(accion);
          actualizaciones++;
        }
      }
    }
    
    console.log(`✅ Q-Learning entrenado con ${actualizaciones} actualizaciones`);
    console.log(`   Epsilon actual: ${this.epsilon.toFixed(3)}`);
    console.log(`   Estados únicos: ${this.q_values.size}`);
  }
  
  /**
   * Codifica el estado del juego como string
   */
  private codificarEstado(posiciones_reveladas: number[], posiciones_huesos: number[]): string {
    // Crear representación compacta del estado
    const reveladas_ordenadas = [...posiciones_reveladas].sort((a, b) => a - b);
    const huesos_conocidos = posiciones_huesos.filter(h => posiciones_reveladas.includes(h)).sort((a, b) => a - b);
    
    return `R:${reveladas_ordenadas.join(',')}_H:${huesos_conocidos.join(',')}`;
  }
  
  /**
   * Obtiene el Q-value para un par estado-acción
   */
  private obtenerQValue(estado: string, accion: number): number {
    const clave = `${estado}_A:${accion}`;
    return this.q_values.get(clave) || 0.5; // Valor neutral inicial
  }
  
  /**
   * Establece el Q-value para un par estado-acción
   */
  private establecerQValue(estado: string, accion: number, valor: number): void {
    const clave = `${estado}_A:${accion}`;
    this.q_values.set(clave, Math.max(0, Math.min(1, valor))); // Clamp entre 0-1
  }
  
  /**
   * Actualiza el Q-value usando la fórmula de Q-Learning
   */
  private async actualizarQValue(
    estado: string,
    accion: number,
    recompensa: number,
    posiciones_reveladas: number[]
  ): Promise<void> {
    const q_actual = this.obtenerQValue(estado, accion);
    
    // Calcular max Q-value del siguiente estado
    const siguiente_estado = this.codificarEstado([...posiciones_reveladas, accion], []);
    const max_q_siguiente = this.calcularMaxQValue(siguiente_estado, posiciones_reveladas);
    
    // Fórmula Q-Learning: Q(s,a) = Q(s,a) + α[r + γ·max(Q(s',a')) - Q(s,a)]
    const nuevo_q = q_actual + this.tasa_aprendizaje * (
      recompensa + this.factor_descuento * max_q_siguiente - q_actual
    );
    
    this.establecerQValue(estado, accion, nuevo_q);
    
    // Actualizar distribución bayesiana
    await this.actualizarDistribucionBayesiana(estado, accion, recompensa > 0);
    
    // Registrar recompensa
    const clave = `${estado}_A:${accion}`;
    if (!this.historial_recompensas.has(clave)) {
      this.historial_recompensas.set(clave, []);
    }
    this.historial_recompensas.get(clave)!.push(recompensa);
    
    this.total_actualizaciones++;
  }
  
  /**
   * Calcula el máximo Q-value para un estado dado
   */
  private calcularMaxQValue(estado: string, posiciones_reveladas: number[]): number {
    const posiciones_disponibles = this.obtenerPosicionesDisponibles(posiciones_reveladas);
    
    if (posiciones_disponibles.length === 0) {
      return 0;
    }
    
    const q_values = posiciones_disponibles.map(pos => this.obtenerQValue(estado, pos));
    return Math.max(...q_values, 0.5);
  }
  
  /**
   * Actualiza la distribución Beta bayesiana
   */
  private async actualizarDistribucionBayesiana(
    estado: string,
    accion: number,
    exito: boolean
  ): Promise<void> {
    const clave = `${estado}_A:${accion}`;
    
    // Obtener distribución actual o inicializar con prior uniforme Beta(1,1)
    const dist_actual = this.distribuciones_beta.get(clave) || { alpha: 1, beta: 1 };
    
    // Actualización bayesiana
    const nueva_dist: DistribucionBeta = {
      alpha: dist_actual.alpha + (exito ? 1 : 0),
      beta: dist_actual.beta + (exito ? 0 : 1)
    };
    
    this.distribuciones_beta.set(clave, nueva_dist);
  }
  
  /**
   * Calcula el intervalo de credibilidad del 95% para una distribución Beta
   */
  private calcularIntervaloCredibilidad(dist: DistribucionBeta): IntervaloCredibilidad {
    const { alpha, beta } = dist;
    
    // Media de Beta(α, β) = α / (α + β)
    const media = alpha / (alpha + beta);
    
    // Moda de Beta(α, β) = (α - 1) / (α + β - 2) para α,β > 1
    const moda = (alpha > 1 && beta > 1) 
      ? (alpha - 1) / (alpha + beta - 2)
      : media;
    
    // Aproximación del intervalo de credibilidad usando la desviación estándar
    // Varianza de Beta(α, β) = αβ / [(α + β)²(α + β + 1)]
    const varianza = (alpha * beta) / (Math.pow(alpha + beta, 2) * (alpha + beta + 1));
    const desviacion = Math.sqrt(varianza);
    
    // Intervalo aproximado (1.96 desviaciones estándar para 95%)
    const margen = 1.96 * desviacion;
    
    return {
      limite_inferior: Math.max(0, media - margen),
      limite_superior: Math.min(1, media + margen),
      media,
      moda
    };
  }
  
  /**
   * Predice posiciones seguras usando estrategia epsilon-greedy
   */
  async predecir(
    posiciones_reveladas: number[],
    posiciones_huesos: number[],
    num_predicciones: number = 5
  ): Promise<PrediccionQLearning> {
    const estado = this.codificarEstado(posiciones_reveladas, posiciones_huesos);
    const posiciones_disponibles = this.obtenerPosicionesDisponibles(posiciones_reveladas);
    
    const q_values = new Map<number, number>();
    const confianza_bayesiana = new Map<number, IntervaloCredibilidad>();
    
    // Calcular Q-values y confianza para todas las posiciones disponibles
    for (const pos of posiciones_disponibles) {
      const q_value = this.obtenerQValue(estado, pos);
      q_values.set(pos, q_value);
      
      const clave = `${estado}_A:${pos}`;
      const dist = this.distribuciones_beta.get(clave) || { alpha: 1, beta: 1 };
      const intervalo = this.calcularIntervaloCredibilidad(dist);
      confianza_bayesiana.set(pos, intervalo);
    }
    
    // Decidir estrategia: explorar o explotar
    const explorar = Math.random() < this.epsilon;
    let posiciones_seguras: number[];
    let estrategia: 'EXPLORAR' | 'EXPLOTAR';
    
    if (explorar) {
      // EXPLORACIÓN: Selección aleatoria
      estrategia = 'EXPLORAR';
      const posiciones_aleatorias = [...posiciones_disponibles]
        .sort(() => Math.random() - 0.5)
        .slice(0, num_predicciones);
      posiciones_seguras = posiciones_aleatorias;
      this.exploraciones++;
    } else {
      // EXPLOTACIÓN: Seleccionar mejores Q-values
      estrategia = 'EXPLOTAR';
      const posiciones_ordenadas = [...posiciones_disponibles]
        .sort((a, b) => (q_values.get(b) || 0) - (q_values.get(a) || 0));
      
      // Seleccionar top N con algo de aleatoriedad
      const top_candidatos = Math.min(num_predicciones * 2, posiciones_ordenadas.length);
      posiciones_seguras = posiciones_ordenadas
        .slice(0, top_candidatos)
        .sort(() => Math.random() - 0.5)
        .slice(0, num_predicciones);
      
      this.explotaciones++;
    }
    
    // Degradar epsilon
    this.epsilon = Math.max(this.epsilon_min, this.epsilon * this.epsilon_decay);
    
    return {
      posiciones_seguras,
      q_values,
      confianza_bayesiana,
      epsilon_actual: this.epsilon,
      estrategia
    };
  }
  
  /**
   * Obtiene posiciones disponibles (no reveladas)
   */
  private obtenerPosicionesDisponibles(posiciones_reveladas: number[]): number[] {
    const reveladas_set = new Set(posiciones_reveladas);
    const disponibles: number[] = [];
    
    for (let i = 0; i < 25; i++) {
      if (!reveladas_set.has(i)) {
        disponibles.push(i);
      }
    }
    
    return disponibles;
  }
  
  /**
   * Obtiene estadísticas del modelo
   */
  obtenerEstadisticas(): {
    total_actualizaciones: number;
    estados_unicos: number;
    epsilon_actual: number;
    exploraciones: number;
    explotaciones: number;
    top_q_values: Array<{ estado_accion: string; q_value: number; confianza: IntervaloCredibilidad }>;
  } {
    // Obtener top 10 Q-values
    const q_values_array = Array.from(this.q_values.entries())
      .map(([clave, q_value]) => {
        const dist = this.distribuciones_beta.get(clave) || { alpha: 1, beta: 1 };
        const confianza = this.calcularIntervaloCredibilidad(dist);
        return { estado_accion: clave, q_value, confianza };
      })
      .sort((a, b) => b.q_value - a.q_value)
      .slice(0, 10);
    
    return {
      total_actualizaciones: this.total_actualizaciones,
      estados_unicos: this.q_values.size,
      epsilon_actual: this.epsilon,
      exploraciones: this.exploraciones,
      explotaciones: this.explotaciones,
      top_q_values: q_values_array
    };
  }
}
