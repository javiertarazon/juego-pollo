/**
 * 📈 MODELO DE ANÁLISIS DE SERIES TEMPORALES
 * 
 * Implementación de análisis temporal para detectar patrones y tendencias
 * en las secuencias de posiciones de huesos.
 * 
 * FUNDAMENTO MATEMÁTICO:
 * - Autocorrelación: ρ(k) = Cov(X_t, X_{t-k}) / Var(X_t)
 * - Tendencia lineal: y = mx + b (regresión lineal)
 * - Test de Ljung-Box: Q = n(n+2)Σ[ρ²(k)/(n-k)]
 * 
 * VALIDACIÓN:
 * - Test de Ljung-Box para autocorrelación
 * - Intervalos de confianza del 95%
 * - Detección de estacionalidad
 */

import { calcularIntervaloConfianzaProporcion, type IntervaloConfianza } from '../../analisis/validacion-cientifica/validacion-estadistica';

export interface AnalisisTemporal {
  autocorrelacion: number[];
  tendencia_lineal: {
    pendiente: number;
    intercepto: number;
    r_cuadrado: number;
  };
  estacionalidad: {
    detectada: boolean;
    periodo: number;
    amplitud: number;
  };
  test_ljung_box: {
    estadistico: number;
    p_valor: number;
    significativo: boolean;
  };
}

export interface PrediccionTemporal {
  posiciones_seguras: number[];
  probabilidades: Map<number, number>;
  confianza_temporal: number;
  patron_detectado: string;
  intervalos_confianza: Map<number, IntervaloConfianza>;
}

/**
 * Clase principal del modelo de series temporales
 */
export class ModeloSeriesTemporal {
  private secuencias_historicas: number[][];
  private frecuencias_posicion: Map<number, number[]>;
  private ventana_analisis: number = 50; // Últimas N partidas
  private max_lag_autocorrelacion: number = 10;
  
  constructor(ventana_analisis: number = 50) {
    this.secuencias_historicas = [];
    this.frecuencias_posicion = new Map();
    this.ventana_analisis = ventana_analisis;
  }
  
  /**
   * Entrena el modelo con datos históricos
   */
  async entrenar(partidas: any[]): Promise<void> {
    console.log(`📈 Entrenando modelo de series temporales con ${partidas.length} partidas...`);
    
    this.secuencias_historicas = [];
    this.frecuencias_posicion = new Map();
    
    // Extraer secuencias de posiciones de huesos
    for (const partida of partidas) {
      if (!partida.bonePositions || partida.bonePositions.length === 0) {
        continue;
      }
      
      this.secuencias_historicas.push(partida.bonePositions);
      
      // Registrar frecuencias por posición a lo largo del tiempo
      for (const pos of partida.bonePositions) {
        if (!this.frecuencias_posicion.has(pos)) {
          this.frecuencias_posicion.set(pos, []);
        }
        this.frecuencias_posicion.get(pos)!.push(this.secuencias_historicas.length - 1);
      }
    }
    
    console.log(`✅ Modelo temporal entrenado con ${this.secuencias_historicas.length} secuencias`);
  }
  
  /**
   * Analiza patrones temporales en las secuencias
   */
  async analizarPatronesTemporal(): Promise<AnalisisTemporal> {
    // Calcular autocorrelación para cada posición
    const autocorrelaciones: number[] = [];
    
    for (let lag = 1; lag <= this.max_lag_autocorrelacion; lag++) {
      const autocorr = this.calcularAutocorrelacion(lag);
      autocorrelaciones.push(autocorr);
    }
    
    // Calcular tendencia lineal
    const tendencia = this.calcularTendenciaLineal();
    
    // Detectar estacionalidad
    const estacionalidad = this.detectarEstacionalidad();
    
    // Realizar test de Ljung-Box
    const test_ljung_box = this.testLjungBox(autocorrelaciones);
    
    return {
      autocorrelacion: autocorrelaciones,
      tendencia_lineal: tendencia,
      estacionalidad,
      test_ljung_box
    };
  }
  
  /**
   * Calcula la autocorrelación para un lag dado
   */
  private calcularAutocorrelacion(lag: number): number {
    if (this.secuencias_historicas.length < lag + 1) {
      return 0;
    }
    
    // Crear serie temporal de primera posición de cada secuencia
    const serie = this.secuencias_historicas.map(seq => seq[0] || 0);
    const n = serie.length;
    
    if (n < lag + 1) {
      return 0;
    }
    
    // Calcular media
    const media = serie.reduce((sum, val) => sum + val, 0) / n;
    
    // Calcular covarianza con lag
    let covarianza = 0;
    let varianza = 0;
    
    for (let i = 0; i < n - lag; i++) {
      covarianza += (serie[i] - media) * (serie[i + lag] - media);
    }
    
    for (let i = 0; i < n; i++) {
      varianza += Math.pow(serie[i] - media, 2);
    }
    
    if (varianza === 0) {
      return 0;
    }
    
    return covarianza / varianza;
  }
  
  /**
   * Calcula la tendencia lineal de las frecuencias
   */
  private calcularTendenciaLineal(): {
    pendiente: number;
    intercepto: number;
    r_cuadrado: number;
  } {
    const n = this.secuencias_historicas.length;
    
    if (n < 2) {
      return { pendiente: 0, intercepto: 0, r_cuadrado: 0 };
    }
    
    // Calcular frecuencia promedio por índice temporal
    const frecuencias_tiempo: number[] = [];
    
    for (let t = 0; t < n; t++) {
      const freq = this.secuencias_historicas[t].length;
      frecuencias_tiempo.push(freq);
    }
    
    // Regresión lineal: y = mx + b
    const x_media = (n - 1) / 2;
    const y_media = frecuencias_tiempo.reduce((sum, val) => sum + val, 0) / n;
    
    let numerador = 0;
    let denominador = 0;
    
    for (let i = 0; i < n; i++) {
      numerador += (i - x_media) * (frecuencias_tiempo[i] - y_media);
      denominador += Math.pow(i - x_media, 2);
    }
    
    const pendiente = denominador !== 0 ? numerador / denominador : 0;
    const intercepto = y_media - pendiente * x_media;
    
    // Calcular R²
    let ss_res = 0;
    let ss_tot = 0;
    
    for (let i = 0; i < n; i++) {
      const y_pred = pendiente * i + intercepto;
      ss_res += Math.pow(frecuencias_tiempo[i] - y_pred, 2);
      ss_tot += Math.pow(frecuencias_tiempo[i] - y_media, 2);
    }
    
    const r_cuadrado = ss_tot !== 0 ? 1 - (ss_res / ss_tot) : 0;
    
    return { pendiente, intercepto, r_cuadrado };
  }
  
  /**
   * Detecta patrones de estacionalidad
   */
  private detectarEstacionalidad(): {
    detectada: boolean;
    periodo: number;
    amplitud: number;
  } {
    const n = this.secuencias_historicas.length;
    
    if (n < 10) {
      return { detectada: false, periodo: 0, amplitud: 0 };
    }
    
    // Buscar periodicidad en las autocorrelaciones
    const autocorrelaciones: number[] = [];
    const max_periodo = Math.min(20, Math.floor(n / 2));
    
    for (let lag = 1; lag <= max_periodo; lag++) {
      autocorrelaciones.push(this.calcularAutocorrelacion(lag));
    }
    
    // Encontrar picos en autocorrelación
    let max_autocorr = 0;
    let periodo_detectado = 0;
    
    for (let i = 1; i < autocorrelaciones.length; i++) {
      if (autocorrelaciones[i] > max_autocorr && autocorrelaciones[i] > 0.3) {
        max_autocorr = autocorrelaciones[i];
        periodo_detectado = i + 1;
      }
    }
    
    const detectada = max_autocorr > 0.3;
    
    return {
      detectada,
      periodo: periodo_detectado,
      amplitud: max_autocorr
    };
  }
  
  /**
   * Realiza el test de Ljung-Box para autocorrelación
   */
  private testLjungBox(autocorrelaciones: number[]): {
    estadistico: number;
    p_valor: number;
    significativo: boolean;
  } {
    const n = this.secuencias_historicas.length;
    const h = autocorrelaciones.length;
    
    if (n < h + 1) {
      return { estadistico: 0, p_valor: 1, significativo: false };
    }
    
    // Estadístico Q de Ljung-Box: Q = n(n+2)Σ[ρ²(k)/(n-k)]
    let q = 0;
    
    for (let k = 0; k < h; k++) {
      const rho_k = autocorrelaciones[k];
      q += Math.pow(rho_k, 2) / (n - k - 1);
    }
    
    q *= n * (n + 2);
    
    // Aproximación del p-valor usando distribución Chi-cuadrado
    // con h grados de libertad
    const p_valor = this.aproximarPValorChiCuadrado(q, h);
    
    return {
      estadistico: q,
      p_valor,
      significativo: p_valor < 0.05
    };
  }
  
  /**
   * Aproxima el p-valor para distribución Chi-cuadrado
   */
  private aproximarPValorChiCuadrado(chi_cuadrado: number, grados_libertad: number): number {
    // Aproximación simple basada en valores críticos
    const valor_critico_05 = grados_libertad + 1.96 * Math.sqrt(2 * grados_libertad);
    
    if (chi_cuadrado < valor_critico_05 * 0.5) return 0.9;
    if (chi_cuadrado < valor_critico_05 * 0.8) return 0.3;
    if (chi_cuadrado < valor_critico_05) return 0.1;
    if (chi_cuadrado < valor_critico_05 * 1.2) return 0.03;
    return 0.01;
  }
  
  /**
   * Predice posiciones seguras basándose en análisis temporal
   */
  async predecir(
    posiciones_reveladas: number[],
    num_predicciones: number = 5
  ): Promise<PrediccionTemporal> {
    // Analizar patrones temporales
    const analisis = await this.analizarPatronesTemporal();
    
    // Obtener posiciones disponibles
    const posiciones_disponibles = this.obtenerPosicionesDisponibles(posiciones_reveladas);
    
    // Calcular probabilidades basadas en frecuencias temporales recientes
    const probabilidades = new Map<number, number>();
    const intervalos_confianza = new Map<number, IntervaloConfianza>();
    
    // Usar ventana deslizante de las últimas N partidas
    const ventana_reciente = this.secuencias_historicas.slice(-this.ventana_analisis);
    const frecuencias_recientes = new Map<number, number>();
    
    // Contar frecuencias en ventana reciente
    for (const seq of ventana_reciente) {
      for (const pos of seq) {
        frecuencias_recientes.set(pos, (frecuencias_recientes.get(pos) || 0) + 1);
      }
    }
    
    // Calcular probabilidades (invertidas: menos frecuente = más seguro)
    const max_frecuencia = Math.max(...Array.from(frecuencias_recientes.values()), 1);
    
    for (const pos of posiciones_disponibles) {
      const frecuencia = frecuencias_recientes.get(pos) || 0;
      const probabilidad_segura = 1 - (frecuencia / max_frecuencia);
      probabilidades.set(pos, probabilidad_segura);
      
      // Calcular intervalo de confianza
      const intervalo = calcularIntervaloConfianzaProporcion(
        frecuencia,
        ventana_reciente.length,
        0.95
      );
      intervalos_confianza.set(pos, intervalo);
    }
    
    // Ordenar por probabilidad y seleccionar top N
    const posiciones_ordenadas = Array.from(probabilidades.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, num_predicciones);
    
    const posiciones_seguras = posiciones_ordenadas.map(([pos]) => pos);
    
    // Calcular confianza temporal basada en R²
    const confianza_temporal = Math.max(0.5, analisis.tendencia_lineal.r_cuadrado);
    
    // Determinar patrón detectado
    let patron_detectado = "Sin patrón claro";
    if (analisis.estacionalidad.detectada) {
      patron_detectado = `Estacionalidad detectada (periodo: ${analisis.estacionalidad.periodo})`;
    } else if (Math.abs(analisis.tendencia_lineal.pendiente) > 0.1) {
      patron_detectado = analisis.tendencia_lineal.pendiente > 0 
        ? "Tendencia creciente"
        : "Tendencia decreciente";
    }
    
    return {
      posiciones_seguras,
      probabilidades,
      confianza_temporal,
      patron_detectado,
      intervalos_confianza
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
    total_secuencias: number;
    ventana_analisis: number;
    posiciones_mas_frecuentes: Array<{ posicion: number; frecuencia: number }>;
    analisis_temporal: AnalisisTemporal;
  } {
    // Calcular frecuencias totales
    const frecuencias_totales = new Map<number, number>();
    
    for (const seq of this.secuencias_historicas) {
      for (const pos of seq) {
        frecuencias_totales.set(pos, (frecuencias_totales.get(pos) || 0) + 1);
      }
    }
    
    const posiciones_mas_frecuentes = Array.from(frecuencias_totales.entries())
      .map(([posicion, frecuencia]) => ({ posicion, frecuencia }))
      .sort((a, b) => b.frecuencia - a.frecuencia)
      .slice(0, 10);
    
    return {
      total_secuencias: this.secuencias_historicas.length,
      ventana_analisis: this.ventana_analisis,
      posiciones_mas_frecuentes,
      analisis_temporal: {
        autocorrelacion: [],
        tendencia_lineal: { pendiente: 0, intercepto: 0, r_cuadrado: 0 },
        estacionalidad: { detectada: false, periodo: 0, amplitud: 0 },
        test_ljung_box: { estadistico: 0, p_valor: 1, significativo: false }
      }
    };
  }
}
