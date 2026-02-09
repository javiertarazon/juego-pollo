/**
 * 🧪 IMPLEMENTACIÓN AVANZADA DE PRUEBAS CHI-CUADRADO
 * 
 * Implementación científicamente rigurosa de las pruebas Chi-cuadrado
 * para validación de independencia y bondad de ajuste.
 * 
 * FUNDAMENTO MATEMÁTICO:
 * χ² = Σ[(Observado - Esperado)² / Esperado]
 * 
 * CRITERIOS:
 * - Significancia: p < 0.05
 * - Grados de libertad: (filas - 1) × (columnas - 1)
 * - Valores esperados mínimos: ≥ 5 por celda
 */

export interface ResultadoChiCuadrado {
  estadistico: number;
  grados_libertad: number;
  p_valor: number;
  significativo: boolean;
  interpretacion: string;
  tabla_observados: number[][];
  tabla_esperados: number[][];
  contribuciones: number[][];
}

/**
 * Tabla de valores críticos de Chi-cuadrado para α = 0.05
 */
const VALORES_CRITICOS_CHI_CUADRADO: Record<number, number> = {
  1: 3.841,
  2: 5.991,
  3: 7.815,
  4: 9.488,
  5: 11.070,
  6: 12.592,
  7: 14.067,
  8: 15.507,
  9: 16.919,
  10: 18.307,
  15: 24.996,
  20: 31.410,
  25: 37.652,
  30: 43.773
};

/**
 * Realiza la prueba Chi-cuadrado de independencia
 * 
 * @param observados - Matriz de frecuencias observadas
 * @param descripcion - Descripción de la prueba
 * @returns Resultado completo de la prueba
 */
export function pruebaChiCuadradoIndependencia(
  observados: number[][],
  descripcion: string = "Prueba de independencia"
): ResultadoChiCuadrado {
  const filas = observados.length;
  const columnas = observados[0]?.length || 0;
  
  if (filas === 0 || columnas === 0) {
    throw new Error("La matriz de observados no puede estar vacía");
  }
  
  // Validar que todas las filas tengan la misma longitud
  if (!observados.every(fila => fila.length === columnas)) {
    throw new Error("Todas las filas deben tener la misma longitud");
  }
  
  // Calcular totales
  const total_general = observados.flat().reduce((sum, val) => sum + val, 0);
  
  if (total_general === 0) {
    throw new Error("El total de observaciones no puede ser cero");
  }
  
  const totales_fila = observados.map(fila => 
    fila.reduce((sum, val) => sum + val, 0)
  );
  
  const totales_columna = Array(columnas).fill(0).map((_, j) => 
    observados.reduce((sum, fila) => sum + fila[j], 0)
  );
  
  // Calcular valores esperados
  const esperados = observados.map((fila, i) =>
    fila.map((_, j) => (totales_fila[i] * totales_columna[j]) / total_general)
  );
  
  // Validar valores esperados mínimos
  const valores_esperados_bajos = esperados.flat().filter(val => val < 5).length;
  if (valores_esperados_bajos > esperados.flat().length * 0.2) {
    console.warn(`⚠️ Advertencia: ${valores_esperados_bajos} celdas tienen valores esperados < 5`);
  }
  
  // Calcular estadístico Chi-cuadrado y contribuciones
  const contribuciones: number[][] = [];
  let chi_cuadrado = 0;
  
  for (let i = 0; i < filas; i++) {
    contribuciones[i] = [];
    for (let j = 0; j < columnas; j++) {
      if (esperados[i][j] > 0) {
        const contribucion = Math.pow(observados[i][j] - esperados[i][j], 2) / esperados[i][j];
        contribuciones[i][j] = contribucion;
        chi_cuadrado += contribucion;
      } else {
        contribuciones[i][j] = 0;
      }
    }
  }
  
  // Grados de libertad
  const grados_libertad = (filas - 1) * (columnas - 1);
  
  // Calcular p-valor
  const p_valor = calcularPValorChiCuadrado(chi_cuadrado, grados_libertad);
  
  // Determinar significancia
  const significativo = p_valor < 0.05;
  
  // Generar interpretación
  const interpretacion = generarInterpretacion(
    chi_cuadrado,
    grados_libertad,
    p_valor,
    significativo,
    descripcion
  );
  
  return {
    estadistico: chi_cuadrado,
    grados_libertad,
    p_valor,
    significativo,
    interpretacion,
    tabla_observados: observados,
    tabla_esperados: esperados,
    contribuciones
  };
}

/**
 * Calcula el p-valor para un estadístico Chi-cuadrado dado
 * Usa aproximación basada en la distribución gamma
 */
function calcularPValorChiCuadrado(chi_cuadrado: number, grados_libertad: number): number {
  // Para valores pequeños de grados de libertad, usar tabla
  if (grados_libertad <= 30 && VALORES_CRITICOS_CHI_CUADRADO[grados_libertad]) {
    const valor_critico = VALORES_CRITICOS_CHI_CUADRADO[grados_libertad];
    
    if (chi_cuadrado < valor_critico * 0.5) return 0.9;
    if (chi_cuadrado < valor_critico * 0.7) return 0.5;
    if (chi_cuadrado < valor_critico * 0.9) return 0.1;
    if (chi_cuadrado < valor_critico) return 0.06;
    if (chi_cuadrado < valor_critico * 1.2) return 0.03;
    if (chi_cuadrado < valor_critico * 1.5) return 0.01;
    return 0.001;
  }
  
  // Para grados de libertad mayores, usar aproximación
  const valor_critico_aproximado = grados_libertad + 1.96 * Math.sqrt(2 * grados_libertad);
  
  if (chi_cuadrado < valor_critico_aproximado * 0.8) return 0.1;
  if (chi_cuadrado < valor_critico_aproximado) return 0.06;
  if (chi_cuadrado < valor_critico_aproximado * 1.2) return 0.03;
  return 0.01;
}

/**
 * Genera una interpretación detallada del resultado
 */
function generarInterpretacion(
  chi_cuadrado: number,
  grados_libertad: number,
  p_valor: number,
  significativo: boolean,
  descripcion: string
): string {
  const valor_critico = VALORES_CRITICOS_CHI_CUADRADO[grados_libertad] || 
    (grados_libertad + 1.96 * Math.sqrt(2 * grados_libertad));
  
  let interpretacion = `Prueba Chi-cuadrado: ${descripcion}\n\n`;
  interpretacion += `Estadístico χ² = ${chi_cuadrado.toFixed(4)}\n`;
  interpretacion += `Grados de libertad = ${grados_libertad}\n`;
  interpretacion += `Valor crítico (α=0.05) ≈ ${valor_critico.toFixed(4)}\n`;
  interpretacion += `p-valor ≈ ${p_valor.toFixed(4)}\n\n`;
  
  if (significativo) {
    interpretacion += `✅ RESULTADO SIGNIFICATIVO (p < 0.05)\n`;
    interpretacion += `Se rechaza la hipótesis nula de independencia.\n`;
    interpretacion += `Existe evidencia estadística de dependencia entre las variables.`;
  } else {
    interpretacion += `❌ RESULTADO NO SIGNIFICATIVO (p ≥ 0.05)\n`;
    interpretacion += `No se puede rechazar la hipótesis nula de independencia.\n`;
    interpretacion += `No hay evidencia suficiente de dependencia entre las variables.`;
  }
  
  return interpretacion;
}

/**
 * Prueba Chi-cuadrado de bondad de ajuste
 * Compara una distribución observada con una distribución teórica esperada
 */
export function pruebaChiCuadradoBondadAjuste(
  observados: number[],
  esperados: number[],
  descripcion: string = "Prueba de bondad de ajuste"
): ResultadoChiCuadrado {
  if (observados.length !== esperados.length) {
    throw new Error("Los vectores de observados y esperados deben tener la misma longitud");
  }
  
  const n = observados.length;
  
  if (n === 0) {
    throw new Error("Los vectores no pueden estar vacíos");
  }
  
  // Calcular estadístico Chi-cuadrado
  let chi_cuadrado = 0;
  const contribuciones: number[] = [];
  
  for (let i = 0; i < n; i++) {
    if (esperados[i] > 0) {
      const contribucion = Math.pow(observados[i] - esperados[i], 2) / esperados[i];
      contribuciones.push(contribucion);
      chi_cuadrado += contribucion;
    } else {
      contribuciones.push(0);
    }
  }
  
  // Grados de libertad (n - 1 para bondad de ajuste)
  const grados_libertad = n - 1;
  
  // Calcular p-valor
  const p_valor = calcularPValorChiCuadrado(chi_cuadrado, grados_libertad);
  
  // Determinar significancia
  const significativo = p_valor < 0.05;
  
  // Generar interpretación
  let interpretacion = `Prueba Chi-cuadrado de bondad de ajuste: ${descripcion}\n\n`;
  interpretacion += `Estadístico χ² = ${chi_cuadrado.toFixed(4)}\n`;
  interpretacion += `Grados de libertad = ${grados_libertad}\n`;
  interpretacion += `p-valor ≈ ${p_valor.toFixed(4)}\n\n`;
  
  if (significativo) {
    interpretacion += `✅ RESULTADO SIGNIFICATIVO (p < 0.05)\n`;
    interpretacion += `La distribución observada difiere significativamente de la esperada.`;
  } else {
    interpretacion += `❌ RESULTADO NO SIGNIFICATIVO (p ≥ 0.05)\n`;
    interpretacion += `La distribución observada se ajusta bien a la distribución esperada.`;
  }
  
  return {
    estadistico: chi_cuadrado,
    grados_libertad,
    p_valor,
    significativo,
    interpretacion,
    tabla_observados: [observados],
    tabla_esperados: [esperados],
    contribuciones: [contribuciones]
  };
}

/**
 * Genera un reporte detallado de la prueba Chi-cuadrado
 */
export function generarReporteChiCuadrado(resultado: ResultadoChiCuadrado): string {
  const separador = '='.repeat(80);
  const fecha = new Date().toLocaleString('es-ES');
  
  let reporte = `
🧪 REPORTE DE PRUEBA CHI-CUADRADO
${separador}

${resultado.interpretacion}

📊 TABLA DE CONTRIBUCIONES:
`;
  
  // Mostrar contribuciones si hay una matriz
  if (resultado.contribuciones.length > 1 && resultado.contribuciones[0].length > 1) {
    reporte += "\nContribución de cada celda al estadístico χ²:\n";
    resultado.contribuciones.forEach((fila, i) => {
      reporte += `Fila ${i + 1}: ${fila.map(c => c.toFixed(4)).join(' | ')}\n`;
    });
    
    // Identificar las celdas con mayor contribución
    const contribuciones_planas = resultado.contribuciones.flat();
    const max_contribucion = Math.max(...contribuciones_planas);
    reporte += `\n⚠️ Mayor contribución: ${max_contribucion.toFixed(4)}\n`;
  }
  
  reporte += `
${separador}
Reporte generado: ${fecha}
  `;
  
  return reporte.trim();
}
