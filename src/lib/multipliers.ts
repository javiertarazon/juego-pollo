/**
 * 💰 SISTEMA DE MULTIPLICADORES Y GESTIÓN DE BALANCE
 * 
 * Multiplicadores correctos para 4 huesos según posiciones descubiertas
 * Sistema de gestión de balance y apuestas
 */

/**
 * Multiplicadores para 4 huesos según posiciones descubiertas
 */
export const MULTIPLICADORES_4_HUESOS: Record<number, number> = {
  1: 1.17,   // 1 posición descubierta
  2: 1.41,   // 2 posiciones descubiertas
  3: 1.71,   // 3 posiciones descubiertas
  4: 2.09,   // 4 posiciones descubiertas
  5: 2.58,   // 5 posiciones descubiertas
  6: 3.23,   // 6 posiciones descubiertas
  7: 4.09,   // 7 posiciones descubiertas
  8: 5.26,   // 8 posiciones descubiertas
  9: 6.88,   // 9 posiciones descubiertas
  10: 9.17,  // 10 posiciones descubiertas
  11: 12.50, // 11 posiciones descubiertas
  12: 17.50, // 12 posiciones descubiertas
  13: 25.00, // 13 posiciones descubiertas
  14: 37.50, // 14 posiciones descubiertas
  15: 58.33, // 15 posiciones descubiertas
  16: 100.00, // 16 posiciones descubiertas
  17: 183.33, // 17 posiciones descubiertas
  18: 366.67, // 18 posiciones descubiertas
  19: 825.00, // 19 posiciones descubiertas
  20: 2062.50, // 20 posiciones descubiertas
  21: 6187.50  // 21 posiciones descubiertas (máximo posible con 4 huesos)
};

/**
 * Configuración de apuestas
 */
export const APUESTA_CONFIG = {
  minima: 0.2,
  incremento: 0.2,
  maxima: 1000 // Límite de seguridad
};

/**
 * Calcula el multiplicador para un número de posiciones descubiertas
 */
export function obtenerMultiplicador(posicionesDescubiertas: number, boneCount: number = 4): number {
  if (boneCount !== 4) {
    throw new Error('Solo se soportan multiplicadores para 4 huesos actualmente');
  }
  
  if (posicionesDescubiertas < 1 || posicionesDescubiertas > 21) {
    throw new Error('Número de posiciones descubiertas fuera de rango (1-21)');
  }
  
  return MULTIPLICADORES_4_HUESOS[posicionesDescubiertas];
}

/**
 * Calcula la ganancia potencial
 */
export function calcularGanancia(apuesta: number, posicionesDescubiertas: number, boneCount: number = 4): number {
  const multiplicador = obtenerMultiplicador(posicionesDescubiertas, boneCount);
  return apuesta * multiplicador;
}

/**
 * Valida que la apuesta sea válida
 */
export function validarApuesta(apuesta: number): { valida: boolean; error?: string } {
  if (apuesta < APUESTA_CONFIG.minima) {
    return {
      valida: false,
      error: `La apuesta mínima es ${APUESTA_CONFIG.minima}`
    };
  }
  
  if (apuesta > APUESTA_CONFIG.maxima) {
    return {
      valida: false,
      error: `La apuesta máxima es ${APUESTA_CONFIG.maxima}`
    };
  }
  
  // Verificar que sea múltiplo del incremento
  const resto = (apuesta - APUESTA_CONFIG.minima) % APUESTA_CONFIG.incremento;
  if (Math.abs(resto) > 0.001) { // Tolerancia para errores de punto flotante
    return {
      valida: false,
      error: `La apuesta debe ser múltiplo de ${APUESTA_CONFIG.incremento}`
    };
  }
  
  return { valida: true };
}

/**
 * Redondea la apuesta al incremento válido más cercano
 */
export function redondearApuesta(apuesta: number): number {
  const multiplos = Math.round((apuesta - APUESTA_CONFIG.minima) / APUESTA_CONFIG.incremento);
  return APUESTA_CONFIG.minima + (multiplos * APUESTA_CONFIG.incremento);
}

/**
 * Interfaz para gestión de balance
 */
export interface Balance {
  actual: number;
  inicial: number;
  ganado: number;
  perdido: number;
  partidas_jugadas: number;
  partidas_ganadas: number;
  partidas_perdidas: number;
  racha_actual: number; // Positivo = ganadas, Negativo = perdidas
  mejor_racha: number;
  peor_racha: number;
}

/**
 * Clase para gestionar el balance del jugador
 */
export class GestorBalance {
  private balance: Balance;
  private historial: Array<{
    tipo: 'GANANCIA' | 'PERDIDA';
    monto: number;
    balance_anterior: number;
    balance_nuevo: number;
    timestamp: Date;
  }>;
  
  constructor(balanceInicial: number = 100) {
    this.balance = {
      actual: balanceInicial,
      inicial: balanceInicial,
      ganado: 0,
      perdido: 0,
      partidas_jugadas: 0,
      partidas_ganadas: 0,
      partidas_perdidas: 0,
      racha_actual: 0,
      mejor_racha: 0,
      peor_racha: 0
    };
    this.historial = [];
  }
  
  /**
   * Registra una ganancia
   */
  registrarGanancia(apuesta: number, posicionesDescubiertas: number): void {
    const ganancia = calcularGanancia(apuesta, posicionesDescubiertas);
    const ganancia_neta = ganancia - apuesta; // Ganancia sin contar la apuesta
    
    const balance_anterior = this.balance.actual;
    this.balance.actual += ganancia_neta;
    this.balance.ganado += ganancia_neta;
    this.balance.partidas_jugadas++;
    this.balance.partidas_ganadas++;
    
    // Actualizar racha
    if (this.balance.racha_actual >= 0) {
      this.balance.racha_actual++;
    } else {
      this.balance.racha_actual = 1;
    }
    
    if (this.balance.racha_actual > this.balance.mejor_racha) {
      this.balance.mejor_racha = this.balance.racha_actual;
    }
    
    // Registrar en historial
    this.historial.push({
      tipo: 'GANANCIA',
      monto: ganancia_neta,
      balance_anterior,
      balance_nuevo: this.balance.actual,
      timestamp: new Date()
    });
  }
  
  /**
   * Registra una pérdida
   */
  registrarPerdida(apuesta: number): void {
    const balance_anterior = this.balance.actual;
    this.balance.actual -= apuesta;
    this.balance.perdido += apuesta;
    this.balance.partidas_jugadas++;
    this.balance.partidas_perdidas++;
    
    // Actualizar racha
    if (this.balance.racha_actual <= 0) {
      this.balance.racha_actual--;
    } else {
      this.balance.racha_actual = -1;
    }
    
    if (this.balance.racha_actual < this.balance.peor_racha) {
      this.balance.peor_racha = this.balance.racha_actual;
    }
    
    // Registrar en historial
    this.historial.push({
      tipo: 'PERDIDA',
      monto: apuesta,
      balance_anterior,
      balance_nuevo: this.balance.actual,
      timestamp: new Date()
    });
  }
  
  /**
   * Obtiene el balance actual
   */
  obtenerBalance(): Balance {
    return { ...this.balance };
  }
  
  /**
   * Obtiene el historial
   */
  obtenerHistorial(): typeof this.historial {
    return [...this.historial];
  }
  
  /**
   * Calcula estadísticas avanzadas
   */
  obtenerEstadisticas() {
    const roi = this.balance.inicial > 0
      ? ((this.balance.actual - this.balance.inicial) / this.balance.inicial * 100)
      : 0;
    
    const tasa_victoria = this.balance.partidas_jugadas > 0
      ? (this.balance.partidas_ganadas / this.balance.partidas_jugadas * 100)
      : 0;
    
    const ganancia_promedio = this.balance.partidas_ganadas > 0
      ? this.balance.ganado / this.balance.partidas_ganadas
      : 0;
    
    const perdida_promedio = this.balance.partidas_perdidas > 0
      ? this.balance.perdido / this.balance.partidas_perdidas
      : 0;
    
    return {
      balance: this.balance,
      roi: roi.toFixed(2) + '%',
      tasa_victoria: tasa_victoria.toFixed(2) + '%',
      ganancia_promedio: ganancia_promedio.toFixed(2),
      perdida_promedio: perdida_promedio.toFixed(2),
      ratio_ganancia_perdida: perdida_promedio > 0
        ? (ganancia_promedio / perdida_promedio).toFixed(2)
        : 'N/A',
      beneficio_neto: (this.balance.actual - this.balance.inicial).toFixed(2)
    };
  }
  
  /**
   * Genera datos para gráfica de equity
   */
  generarDatosGrafica() {
    const datos = [
      {
        partida: 0,
        balance: this.balance.inicial,
        tipo: 'INICIAL'
      }
    ];
    
    this.historial.forEach((registro, idx) => {
      datos.push({
        partida: idx + 1,
        balance: registro.balance_nuevo,
        tipo: registro.tipo
      });
    });
    
    return datos;
  }
  
  /**
   * Verifica si el jugador puede hacer una apuesta
   */
  puedeApostar(apuesta: number): { puede: boolean; razon?: string } {
    if (apuesta > this.balance.actual) {
      return {
        puede: false,
        razon: `Balance insuficiente. Actual: ${this.balance.actual.toFixed(2)}, Requerido: ${apuesta.toFixed(2)}`
      };
    }
    
    const validacion = validarApuesta(apuesta);
    if (!validacion.valida) {
      return {
        puede: false,
        razon: validacion.error
      };
    }
    
    return { puede: true };
  }
}
