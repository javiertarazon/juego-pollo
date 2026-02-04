# 🎯 INSTRUCCIONES PRIORITARIAS DE COMPORTAMIENTO
## Sistema de Predicción Avanzado de Posiciones Seguras

---

## 🚨 REGLAS FUNDAMENTALES INQUEBRANTABLES

### 1. 🇪🇸 IDIOMA EXCLUSIVO: ESPAÑOL
**TODOS** los elementos del proyecto DEBEN estar en español:
- ✅ Comentarios en código
- ✅ Nombres de variables y funciones
- ✅ Documentación técnica
- ✅ Mensajes de error y logs
- ✅ Interfaces de usuario
- ✅ Reportes y análisis
- ✅ Comunicación y respuestas

**PROHIBIDO**: Cualquier texto en inglés excepto palabras técnicas universales (API, HTTP, JSON, etc.)

### 2. 🔬 VALIDACIÓN CIENTÍFICA OBLIGATORIA
**TODOS** los cálculos y algoritmos DEBEN incluir:
- ✅ Base matemática documentada
- ✅ Validación estadística rigurosa
- ✅ Intervalos de confianza del 95%
- ✅ Pruebas de significancia (p < 0.05)
- ✅ Reproducibilidad garantizada

**PROHIBIDO**: Algoritmos sin validación científica o "cajas negras"

### 3. 🎯 OBJETIVO INQUEBRANTABLE
**Precisión mínima del 60%** en predicción de posiciones seguras:
- ✅ Medición continua y documentada
- ✅ Mejora progresiva con más datos
- ✅ Validación cruzada obligatoria
- ✅ Monitoreo en tiempo real

**PROHIBIDO**: Desplegar sistema con precisión < 60%

---

## 📁 ESTRUCTURA ORGANIZACIONAL OBLIGATORIA

### Directorio Raíz Reorganizado:
```
proyecto-prediccion-pollos/
├── 📊 analisis/                    # Análisis de patrones y estadísticas
│   ├── patrones-mystake/           # Análisis específicos de Mystake
│   ├── estadisticas/               # Análisis estadísticos rigurosos
│   ├── reportes/                   # Reportes generados automáticamente
│   └── validacion-cientifica/      # Validaciones estadísticas
│
├── 📈 datos/                       # Gestión completa de datos
│   ├── exportacion/                # Scripts de exportación CSV/JSON
│   ├── importacion/                # Scripts de importación y limpieza
│   ├── validacion/                 # Validación de integridad de datos
│   └── transformacion/             # ETL y preprocesamiento
│
├── 🤖 ml/                          # Machine Learning y algoritmos
│   ├── algoritmos/                 # Implementaciones de algoritmos
│   ├── entrenamiento/              # Scripts de entrenamiento
│   ├── validacion/                 # Validación de modelos
│   ├── prediccion/                 # Sistema de predicción
│   └── optimizacion/               # Optimización de hiperparámetros
│
├── 📚 documentacion/               # Documentación técnica completa
│   ├── especificaciones/           # Especificaciones del sistema
│   ├── manuales/                   # Manuales de usuario y técnicos
│   ├── investigacion/              # Papers y documentos científicos
│   └── api/                        # Documentación de APIs
│
├── 🛠️ utilidades/                  # Herramientas auxiliares
│   ├── monitoreo/                  # Monitoreo y alertas
│   ├── testing/                    # Pruebas automatizadas
│   ├── configuracion/              # Configuraciones del sistema
│   └── scripts/                    # Scripts de utilidad
│
└── 🌐 src/                         # Código fuente principal (existente)
    ├── app/                        # Aplicación Next.js
    ├── lib/                        # Librerías compartidas
    └── components/                 # Componentes UI
```

---

## 🔬 METODOLOGÍA CIENTÍFICA OBLIGATORIA

### Proceso de Validación para CADA Algoritmo:

#### 1. Formulación de Hipótesis
```
H0 (Hipótesis Nula): El algoritmo no mejora la precisión vs. azar
H1 (Hipótesis Alternativa): El algoritmo mejora la precisión significativamente
Criterio de Rechazo: p < 0.05 con corrección de Bonferroni
```

#### 2. Diseño Experimental
- **Grupo Control**: Predicciones aleatorias
- **Grupo Experimental**: Algoritmo propuesto
- **Tamaño de Muestra**: Mínimo 100 partidas por grupo
- **Aleatorización**: Asignación aleatoria de partidas

#### 3. Análisis Estadístico Obligatorio
```typescript
interface ValidacionCientifica {
  // Métricas primarias
  precision: number;              // ≥ 0.60
  precision_positiva: number;     // ≥ 0.65
  sensibilidad: number;           // ≥ 0.55
  especificidad: number;          // ≥ 0.65
  f1_score: number;              // ≥ 0.60
  
  // Intervalos de confianza (95%)
  intervalo_confianza: {
    limite_inferior: number;
    limite_superior: number;
    nivel_confianza: 0.95;
  };
  
  // Pruebas estadísticas
  pruebas: {
    chi_cuadrado: { estadistico: number; p_valor: number; };
    kolmogorov_smirnov: { estadistico: number; p_valor: number; };
    mann_whitney: { estadistico: number; p_valor: number; };
  };
  
  // Validación cruzada
  validacion_cruzada: {
    k_folds: 10;
    precision_promedio: number;
    desviacion_estandar: number;
    intervalo_confianza_cv: [number, number];
  };
}
```

#### 4. Documentación Científica Obligatoria
Cada algoritmo DEBE incluir:
- **Fundamento Teórico**: Base matemática y científica
- **Metodología**: Descripción detallada del proceso
- **Resultados**: Métricas con intervalos de confianza
- **Limitaciones**: Restricciones y sesgos identificados
- **Reproducibilidad**: Instrucciones para replicar resultados

---

## 🎯 ALGORITMOS PRIORITARIOS A IMPLEMENTAR

### 1. Ensemble de Modelos Científicamente Validados

#### Modelo A: Análisis de Transición Markoviana
```typescript
// Implementación obligatoria con validación Chi-cuadrado
class ModeloTransicionMarkoviana {
  private matrizTransicion: number[][];
  private validacionCientifica: ValidacionCientifica;
  
  async entrenar(datos: PartidaReal[]): Promise<void> {
    // 1. Calcular matriz de transición 25x25
    // 2. Validar independencia con Chi-cuadrado
    // 3. Calcular intervalos de confianza
    // 4. Documentar resultados en español
  }
  
  async predecir(estado: EstadoActual): Promise<PrediccionValidada> {
    // Predicción con intervalos de confianza
  }
}
```

#### Modelo B: Q-Learning Bayesiano
```typescript
// Implementación con intervalos de credibilidad bayesianos
class QLearningBayesiano {
  private qValues: Map<string, DistribucionBeta>;
  private confianzaBayesiana: Map<string, IntervaloCredibilidad>;
  
  async actualizarCreencias(
    estado: string, 
    accion: string, 
    resultado: boolean
  ): Promise<void> {
    // Actualización bayesiana con distribución Beta
  }
}
```

#### Modelo C: Series Temporales con Validación
```typescript
// Análisis temporal con test de Ljung-Box
class ModeloSeriesTemporal {
  private autocorrelacion: number[];
  private tendencia: TendenciaLineal;
  private validacionLjungBox: PruebaEstadistica;
  
  async analizarPatronesTemporal(
    secuencia: number[]
  ): Promise<AnalisisTemporal> {
    // Análisis con validación estadística rigurosa
  }
}
```

### 2. Sistema de Combinación Inteligente
```typescript
class EnsembleInteligente {
  private modelos: ModeloValidado[];
  private pesos: PesosAdaptativos;
  private validacionEnsemble: ValidacionCientifica;
  
  async combinarPredicciones(
    predicciones: PrediccionValidada[]
  ): Promise<PrediccionFinal> {
    // Combinación ponderada con validación estadística
    // Fórmula: Σ(peso_i × predicción_i × confianza_i) / Σ(peso_i × confianza_i)
  }
}
```

---

## 📊 MÉTRICAS DE ÉXITO OBLIGATORIAS

### Métricas Técnicas (Medición Continua):
1. **Precisión Global**: ≥ 60% (inquebrantable)
2. **Precisión Positiva**: ≥ 65%
3. **Sensibilidad**: ≥ 55%
4. **Especificidad**: ≥ 65%
5. **F1-Score**: ≥ 60%
6. **AUC-ROC**: ≥ 0.70

### Métricas Científicas (Validación Rigurosa):
1. **Significancia Estadística**: p < 0.05 en todas las pruebas
2. **Intervalos de Confianza**: 95% documentados para todas las métricas
3. **Reproducibilidad**: 100% de resultados replicables
4. **Validación Cruzada**: K-fold (k=10) con IC del 95%

### Métricas Operacionales (Monitoreo 24/7):
1. **Tiempo de Respuesta**: ≤ 100ms
2. **Disponibilidad**: ≥ 99.9%
3. **Throughput**: ≥ 100 predicciones/segundo
4. **Precisión en Tiempo Real**: Monitoreo continuo

---

## 🔄 PROCESO DE MEJORA CONTINUA OBLIGATORIO

### Ciclo de Mejora Semanal:
```
Lunes: Recolección automática de nuevas partidas reales
Martes: Validación de calidad de datos y limpieza
Miércoles: Reentrenamiento de modelos con datos ampliados
Jueves: Validación científica de mejoras (significancia estadística)
Viernes: Despliegue automático si mejora es significativa (p < 0.05)
Sábado-Domingo: Monitoreo intensivo post-despliegue
```

### Criterios de Despliegue Automático:
1. **Mejora Estadísticamente Significativa**: p < 0.05
2. **Mejora Práctica Mínima**: +2% en precisión
3. **Validación Cruzada Exitosa**: IC del 95% no se superpone
4. **Pruebas Automatizadas**: 100% pasando

### Sistema de Rollback Automático:
- **Trigger**: Precisión < 58% por más de 1 hora
- **Acción**: Rollback automático a versión anterior
- **Notificación**: Alerta inmediata al equipo técnico
- **Investigación**: Análisis automático de causa raíz

---

## 🚨 ALERTAS Y MONITOREO CRÍTICO

### Alertas Críticas (Acción Inmediata):
1. **Precisión < 58%**: Rollback automático + investigación
2. **Deriva del Modelo > 5%**: Reentrenamiento inmediato
3. **Datos Anómalos**: Validación manual requerida
4. **Falla del Sistema**: Activación de sistema de respaldo

### Alertas de Advertencia (Acción en 24h):
1. **Precisión 58-60%**: Análisis de tendencias
2. **Deriva del Modelo 3-5%**: Programar reentrenamiento
3. **Latencia > 200ms**: Optimización de rendimiento
4. **Disponibilidad < 99.5%**: Revisión de infraestructura

### Dashboard de Monitoreo (Actualización en Tiempo Real):
- **Precisión Actual vs. Objetivo**
- **Tendencia de 7 días**
- **Distribución de confianza de predicciones**
- **Métricas de rendimiento del sistema**
- **Estado de validación científica**

---

## 📚 DOCUMENTACIÓN OBLIGATORIA

### Para Cada Algoritmo:
1. **Especificación Técnica** (en español)
2. **Fundamento Matemático** (con fórmulas)
3. **Validación Estadística** (con resultados)
4. **Guía de Uso** (con ejemplos)
5. **Limitaciones Conocidas** (transparencia total)

### Para el Sistema Completo:
1. **Manual de Usuario** (interfaz y uso)
2. **Manual Técnico** (arquitectura y algoritmos)
3. **Guía de Configuración** (instalación y setup)
4. **Documentación de API** (endpoints y parámetros)
5. **Análisis Científico** (metodología y resultados)

---

## ✅ CRITERIOS DE ACEPTACIÓN FINAL

### Técnicos:
- ✅ Precisión ≥ 60% confirmada con IC del 95%
- ✅ Sistema completo funcionando en producción
- ✅ Monitoreo 24/7 operativo
- ✅ Mejora continua automática funcionando

### Científicos:
- ✅ Todas las validaciones estadísticas completadas
- ✅ Significancia estadística p < 0.05 documentada
- ✅ Reproducibilidad del 100% garantizada
- ✅ Limitaciones y sesgos documentados

### Operacionales:
- ✅ Documentación 100% en español
- ✅ Código revisado y validado
- ✅ Pruebas automatizadas con cobertura ≥ 90%
- ✅ Sistema de rollback probado y funcionando

---

## 🎯 COMPROMISO DE CALIDAD

**Este proyecto se compromete a entregar un sistema de predicción que:**

1. **Supere el 60% de precisión** con validación científica rigurosa
2. **Mejore continuamente** con cada nueva partida real analizada
3. **Mantenga transparencia total** en metodología y limitaciones
4. **Opere con confiabilidad** del 99.9% de disponibilidad
5. **Proporcione explicabilidad** de cada predicción realizada

**Todo esto documentado y comunicado exclusivamente en español, con la más alta calidad científica y técnica.**

---

*Documento creado: 4 de febrero de 2026*  
*Versión: 1.0*  
*Estado: Activo y Obligatorio*