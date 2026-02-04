/**
 * 🛠️ CONFIGURACIÓN DE RUTAS DEL SISTEMA
 * 
 * Configuración centralizada de todas las rutas del sistema de predicción avanzado.
 * Todas las rutas están organizadas según la nueva estructura de directorios.
 */

export const RUTAS_SISTEMA = {
  // 📊 Análisis de patrones y estadísticas
  ANALISIS: {
    BASE: 'analisis',
    PATRONES_MYSTAKE: 'analisis/patrones-mystake',
    ESTADISTICAS: 'analisis/estadisticas', 
    REPORTES: 'analisis/reportes',
    VALIDACION_CIENTIFICA: 'analisis/validacion-cientifica'
  },

  // 📈 Gestión de datos
  DATOS: {
    BASE: 'datos',
    EXPORTACION: 'datos/exportacion',
    IMPORTACION: 'datos/importacion',
    VALIDACION: 'datos/validacion',
    TRANSFORMACION: 'datos/transformacion'
  },

  // 🤖 Machine Learning
  ML: {
    BASE: 'ml',
    ALGORITMOS: 'ml/algoritmos',
    ENTRENAMIENTO: 'ml/entrenamiento',
    VALIDACION: 'ml/validacion',
    PREDICCION: 'ml/prediccion',
    OPTIMIZACION: 'ml/optimizacion'
  },

  // 📚 Documentación
  DOCUMENTACION: {
    BASE: 'documentacion',
    ESPECIFICACIONES: 'documentacion/especificaciones',
    MANUALES: 'documentacion/manuales',
    INVESTIGACION: 'documentacion/investigacion',
    API: 'documentacion/api'
  },

  // 🛠️ Utilidades
  UTILIDADES: {
    BASE: 'utilidades',
    MONITOREO: 'utilidades/monitoreo',
    TESTING: 'utilidades/testing',
    CONFIGURACION: 'utilidades/configuracion',
    SCRIPTS: 'utilidades/scripts'
  },

  // 🌐 Código fuente principal (existente)
  SRC: {
    BASE: 'src',
    APP: 'src/app',
    LIB: 'src/lib',
    COMPONENTS: 'src/components'
  }
} as const;

/**
 * Obtiene la ruta completa para un tipo de archivo específico
 */
export function obtenerRuta(categoria: keyof typeof RUTAS_SISTEMA, subcategoria?: string): string {
  const base = RUTAS_SISTEMA[categoria];
  
  if (typeof base === 'string') {
    return base;
  }
  
  if (subcategoria && subcategoria in base) {
    return base[subcategoria as keyof typeof base];
  }
  
  return base.BASE;
}

/**
 * Valida que una ruta existe en la configuración
 */
export function validarRuta(ruta: string): boolean {
  const todasLasRutas = Object.values(RUTAS_SISTEMA).flatMap(categoria => 
    typeof categoria === 'string' ? [categoria] : Object.values(categoria)
  );
  
  return todasLasRutas.includes(ruta);
}

/**
 * Obtiene todas las rutas de una categoría
 */
export function obtenerRutasCategoria(categoria: keyof typeof RUTAS_SISTEMA): string[] {
  const base = RUTAS_SISTEMA[categoria];
  
  if (typeof base === 'string') {
    return [base];
  }
  
  return Object.values(base);
}