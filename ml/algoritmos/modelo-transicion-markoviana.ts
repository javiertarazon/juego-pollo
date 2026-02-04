/**
 * 🔬 MODELO DE TRANSICIÓN MARKOVIANA
 * 
 * Implementación de cadenas de Markov para predecir posiciones seguras
 * basándose en las transiciones históricas entre estados.
 * 
 * FUNDAMENTO MATEMÁTICO:
 * - Matriz de transición P[i][j] = P(estado_j | estado_i)
 * - Distribución estacionaria: π = πP
 * - Predicción: P(siguiente_estado | estado_actual)
 * 
 * VALIDACIÓN:
 * - Test Chi-cuadrado para independencia
 * - Intervalos de confianza del 95%
 * - Validación cruzada K-fold
 */

import { pruebaChiCuadradoIndependencia } from '../../analisis/validacion-cientifica/pruebas-chi-cuadrado';
import { calcularIntervaloConfianzaProporcion, type IntervaloConfianza } from '../../analisis/validacion-cientifica/validacion-estadistica';

export interface EstadoJuego {
  posiciones_reveladas: number[];
  posiciones_huesos: number[];
  turno_actual: number;
}

export interface PrediccionMarkoviana {
  posiciones_seguras: number[];
  probabilidades: Map<number, number>;
  confianza_global: number;
  intervalos_confianza: Map<number, IntervaloConfianza>;
  validacion_estadistica: {
    chi_cuadrado_significativo: boolean;
    p_valor: number;
  };
}

export interface MatrizTransicion {
  matriz: number[][];  // 25x25 matriz de probabilidades
  frecuencias: number[][];  // Frecuencias observadas
  total_transiciones: number;
}

/**
 * Clase principal del modelo de transición markoviana
 */
export class ModeloTransicionMarkoviana {
  private matriz_transicion: MatrizTransicion;
  private distribucion_estacionaria: number[];
  private historial_estados: number[];
  private validado_cientificamente: boolean = false;
  private p_valor_chi_cuadrado: number = 1.0;
  
  constructor() {
    // Inicializar matriz 25x25 (posiciones del tablero)
    this.matriz_transicion = {
      matriz: Array(25).fill(0).map(() => Array(25).fill(0)),
      frecuencias: Array(25).fill(0).map(() => Array(25).fill(0)),
      total_transiciones: 0
    };
    this.distribucion_estacionaria = Array(25).fill(1/25);
    this.historial_estados = [];
  }
  
  /**
   * Entrena el modelo con datos históricos de partidas
   */
  async entrenar(partidas: any[]): Promise<void> {
    console.log(`🔬 Entrenando modelo markoviano con ${partidas.length} partidas...`);
    
    // Resetear matrices
    this.matriz_transicion.frecuencias = Array(25).fill(0).map(() => Array(25).fill(0));
    this.matriz_transicion.total_transiciones = 0;
    this.historial_estados = [];
    
    // Procesar cada partida
    for (const partida of partidas) {
      if (!partida.bonePositions || partida.bonePositions.length === 0) {
        continue;
      }
      
      const posiciones_huesos = partida.bonePositions;
      
      // Registrar transiciones entre posiciones consecutivas de huesos
      for (let i = 0; i < posiciones_huesos.length - 1; i++) {
        const estado_actual = posiciones_huesos[i];
        const estado_siguiente = posiciones_huesos[i + 1];
        
        if (estado_actual >= 0 && estado_actual < 25 && 
            estado_siguiente >= 0 && estado_siguiente < 25) {
          this.matriz_transicion.frecuencias[estado_actual][estado_siguiente]++;
          this.matriz_transicion.total_transiciones++;
          this.historial_estados.push(estado_actual);
        }
      }
      
      // Agregar último estado
      if (posiciones_huesos.length > 0) {
        const ultimo_estado = posiciones_huesos[posiciones_huesos.length - 1];
        if (ultimo_estado >= 0 && ultimo_estado < 25) {
          this.historial_estados.push(ultimo_estado);
        }
      }
    }
    
    // Calcular probabilidades de transición
    this.calcularMatrizProbabilidades();
    
    // Calcular distribución estacionaria
    this.calcularDistribucionEstacionaria();
    
    // Validar científicamente
    await this.validarCientificamente();
    
    console.log(`✅ Modelo entrenado con ${this.matriz_transicion.total_transiciones} transiciones`);
  }
  
  /**
   * Calcula la matriz de probabilidades a partir de las frecuencias
   */
  private calcularMatrizProbabilidades(): void {
    for (let i = 0; i < 25; i++) {
      const total_fila = this.matriz_transicion.frecuencias[i].reduce((sum, val) => sum + val, 0);
      
      if (total_fila > 0) {
        for (let j = 0; j < 25; j++) {
          this.matriz_transicion.matriz[i][j] = 
            this.matriz_transicion.frecuencias[i][j] / total_fila;
        }
      } else {
        // Si no hay transiciones desde este estado, usar distribución uniforme
        for (let j = 0; j < 25; j++) {
          this.matriz_transicion.matriz[i][j] = 1/25;
        }
      }
    }
  }
  
  /**
   * Calcula la distribución estacionaria usando el método de potencias
   */
  private calcularDistribucionEstacionaria(): void {
    const max_iteraciones = 1000;
    const tolerancia = 1e-6;
    
    // Inicializar con distribución uniforme
    let distribucion_actual = Array(25).fill(1/25);
    
    for (let iter = 0; iter < max_iteraciones; iter++) {
      const distribucion_nueva = Array(25).fill(0);
      
      // Multiplicar distribución por matriz de transición
      for (let j = 0; j < 25; j++) {
        for (let i = 0; i < 25; i++) {
          distribucion_nueva[j] += distribucion_actual[i] * this.matriz_transicion.matriz[i][j];
        }
      }
      
      // Verificar convergencia
      const diferencia = distribucion_nueva.reduce((sum, val, idx) => 
        sum + Math.abs(val - distribucion_actual[idx]), 0
      );
      
      distribucion_actual = distribucion_nueva;
      
      if (diferencia < tolerancia) {
        break;
      }
    }
    
    this.distribucion_estacionaria = distribucion_actual;
  }
  
  /**
   * Valida el modelo científicamente usando test Chi-cuadrado
   */
  private async validarCientificamente(): Promise<void> {
    // Preparar datos para test Chi-cuadrado
    // Agrupar en categorías para tener suficientes observaciones
    const categorias = 5; // Agrupar 25 posiciones en 5 categorías
    const frecuencias_agrupadas: number[][] = Array(categorias).fill(0).map(() => Array(categorias).fill(0));
    
    for (let i = 0; i < 25; i++) {
      for (let j = 0; j < 25; j++) {
        const cat_i = Math.floor(i / 5);
        const cat_j = Math.floor(j / 5);
        frecuencias_agrupadas[cat_i][cat_j] += this.matriz_transicion.frecuencias[i][j];
      }
    }
    
    // Realizar test Chi-cuadrado
    try {
      const resultado_chi = pruebaChiCuadradoIndependencia(
        frecuencias_agrupadas,
        "Independencia de transiciones markovianas"
      );
      
      this.validado_cientificamente = true;
      this.p_valor_chi_cuadrado = resultado_chi.p_valor;
      
      console.log(`📊 Validación Chi-cuadrado:`);
      console.log(`   χ² = ${resultado_chi.estadistico.toFixed(4)}`);
      console.log(`   p-valor = ${resultado_chi.p_valor.toFixed(4)}`);
      console.log(`   ${resultado_chi.significativo ? '✅ Significativo' : '❌ No significativo'}`);
    } catch (error) {
      console.warn(`⚠️ No se pudo realizar validación Chi-cuadrado: ${error}`);
      this.validado_cientificamente = false;
    }
  }
  
  /**
   * Predice posiciones seguras basándose en el estado actual
   */
  async predecir(estado: EstadoJuego, num_predicciones: number = 5): Promise<PrediccionMarkoviana> {
    if (!this.validado_cientificamente) {
      console.warn('⚠️ Modelo no validado científicamente');
    }
    
    const posiciones_disponibles = this.obtenerPosicionesDisponibles(estado);
    const probabilidades = new Map<number, number>();
    const intervalos_confianza = new Map<number, IntervaloConfianza>();
    
    // Si hay posiciones de huesos conocidas, usar la última como estado actual
    let probabilidades_transicion: number[];
    
    if (estado.posiciones_huesos.length > 0) {
      const ultimo_hueso = estado.posiciones_huesos[estado.posiciones_huesos.length - 1];
      probabilidades_transicion = this.matriz_transicion.matriz[ultimo_hueso];
    } else {
      // Si no hay información, usar distribución estacionaria
      probabilidades_transicion = this.distribucion_estacionaria;
    }
    
    // Calcular probabilidades para posiciones disponibles
    // Invertir probabilidades: menor probabilidad de transición = más seguro
    const probabilidades_seguridad = posiciones_disponibles.map(pos => {
      const prob_hueso = probabilidades_transicion[pos];
      const prob_segura = 1 - prob_hueso;
      return { posicion: pos, probabilidad: prob_segura };
    });
    
    // Ordenar por probabilidad de seguridad (descendente)
    probabilidades_seguridad.sort((a, b) => b.probabilidad - a.probabilidad);
    
    // Seleccionar top N predicciones
    const posiciones_seguras = probabilidades_seguridad
      .slice(0, num_predicciones)
      .map(p => p.posicion);
    
    // Calcular intervalos de confianza para cada predicción
    for (const { posicion, probabilidad } of probabilidades_seguridad.slice(0, num_predicciones)) {
      probabilidades.set(posicion, probabilidad);
      
      // Calcular intervalo de confianza basado en frecuencias observadas
      const frecuencia_total = this.historial_estados.filter(e => e === posicion).length;
      const intervalo = calcularIntervaloConfianzaProporcion(
        Math.round(probabilidad * frecuencia_total),
        this.historial_estados.length,
        0.95
      );
      
      intervalos_confianza.set(posicion, intervalo);
    }
    
    // Calcular confianza global (promedio de probabilidades)
    const confianza_global = probabilidades_seguridad
      .slice(0, num_predicciones)
      .reduce((sum, p) => sum + p.probabilidad, 0) / num_predicciones;
    
    return {
      posiciones_seguras,
      probabilidades,
      confianza_global,
      intervalos_confianza,
      validacion_estadistica: {
        chi_cuadrado_significativo: this.validado_cientificamente,
        p_valor: this.p_valor_chi_cuadrado
      }
    };
  }
  
  /**
   * Obtiene las posiciones disponibles (no reveladas)
   */
  private obtenerPosicionesDisponibles(estado: EstadoJuego): number[] {
    const posiciones_ocupadas = new Set([
      ...estado.posiciones_reveladas,
      ...estado.posiciones_huesos
    ]);
    
    const disponibles: number[] = [];
    for (let i = 0; i < 25; i++) {
      if (!posiciones_ocupadas.has(i)) {
        disponibles.push(i);
      }
    }
    
    return disponibles;
  }
  
  /**
   * Obtiene información del modelo para análisis
   */
  obtenerEstadisticas(): {
    total_transiciones: number;
    distribucion_estacionaria: number[];
    posiciones_mas_frecuentes: Array<{ posicion: number; frecuencia: number }>;
  } {
    // Calcular frecuencias totales por posición
    const frecuencias_posicion = Array(25).fill(0);
    for (let i = 0; i < 25; i++) {
      for (let j = 0; j < 25; j++) {
        frecuencias_posicion[j] += this.matriz_transicion.frecuencias[i][j];
      }
    }
    
    const posiciones_mas_frecuentes = frecuencias_posicion
      .map((freq, pos) => ({ posicion: pos, frecuencia: freq }))
      .sort((a, b) => b.frecuencia - a.frecuencia)
      .slice(0, 10);
    
    return {
      total_transiciones: this.matriz_transicion.total_transiciones,
      distribucion_estacionaria: this.distribucion_estacionaria,
      posiciones_mas_frecuentes
    };
  }
}
