# 🎯 GUÍA DEL SISTEMA DE ENSEMBLE INTELIGENTE

## 📋 Descripción General

El Sistema de Ensemble Inteligente combina tres modelos de Machine Learning para proporcionar predicciones robustas y científicamente validadas:

1. **Modelo de Series Temporales** - Análisis de tendencias y patrones temporales
2. **Q-Learning Bayesiano** - Aprendizaje por refuerzo con cuantificación de incertidumbre
3. **Modelo de Transición Markoviana** - Cadenas de Markov para predicción de estados

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                  ENSEMBLE INTELIGENTE                        │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Series     │  │  Q-Learning  │  │    Markov    │     │
│  │  Temporales  │  │  Bayesiano   │  │  Transición  │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                  │              │
│         └─────────────────┴──────────────────┘              │
│                           │                                 │
│                    Votación Ponderada                       │
│                           │                                 │
│                    Predicción Final                         │
└─────────────────────────────────────────────────────────────┘
```

## 🔬 Fundamento Matemático

### Votación Ponderada

```
P_ensemble = Σ(w_i * P_i) donde Σw_i = 1
```

Donde:
- `P_ensemble`: Probabilidad combinada del ensemble
- `w_i`: Peso del modelo i (basado en rendimiento histórico)
- `P_i`: Probabilidad del modelo i

### Pesos Adaptativos

Los pesos se actualizan automáticamente basándose en el F1-Score de cada modelo:

```
w_i = F1_i / Σ(F1_j)
```

### Intervalos de Confianza Combinados

```
IC_ensemble = Σ(w_i * IC_i)
```

## 📁 Estructura de Archivos

```
ml/algoritmos/
├── ensemble-inteligente.ts          # Sistema principal de ensemble
├── modelo-series-temporales.ts      # Modelo de series temporales
├── q-learning-bayesiano.ts          # Q-Learning con inferencia bayesiana
└── modelo-transicion-markoviana.ts  # Cadenas de Markov

src/app/api/chicken/
└── predict-ensemble/
    └── route.ts                     # API endpoint para predicciones

test-ensemble-system.ts              # Script de prueba
```

## 🚀 Uso

### 1. Entrenamiento

```typescript
import { EnsembleInteligente } from './ml/algoritmos/ensemble-inteligente';

const ensemble = new EnsembleInteligente();

// Entrenar con datos históricos
await ensemble.entrenar(partidas);
```

### 2. Predicción

```typescript
const prediccion = await ensemble.predecir(
  posiciones_reveladas,  // Posiciones ya reveladas
  posiciones_huesos,     // Huesos conocidos
  5                      // Número de predicciones
);

console.log('Posiciones seguras:', prediccion.posiciones_seguras);
console.log('Confianza global:', prediccion.confianza_global);
console.log('Contribuciones:', prediccion.contribuciones_modelos);
```

### 3. API REST

#### Realizar Predicción

```bash
POST /api/chicken/predict-ensemble
Content-Type: application/json

{
  "posiciones_reveladas": [4, 7, 10],
  "posiciones_huesos": [6],
  "num_predicciones": 5
}
```

Respuesta:
```json
{
  "success": true,
  "prediccion": {
    "posiciones_seguras": [13, 14, 15, 17, 18],
    "confianza_global": 0.78,
    "contribuciones_modelos": {
      "series_temporales": 0.35,
      "q_learning": 0.32,
      "markov": 0.33
    },
    "probabilidades": [
      {
        "posicion": 13,
        "probabilidad": 0.85,
        "intervalo_confianza": {
          "limite_inferior": 0.78,
          "limite_superior": 0.92
        }
      }
    ]
  }
}
```

#### Obtener Estadísticas

```bash
GET /api/chicken/predict-ensemble/stats
```

## 🧪 Pruebas

### Ejecutar Script de Prueba

```bash
# Con Node.js
npx tsx test-ensemble-system.ts

# Con Bun
bun run test-ensemble-system.ts
```

### Salida Esperada

```
🎯 PRUEBA DEL SISTEMA DE ENSEMBLE INTELIGENTE
================================================================================

📊 Cargando datos de entrenamiento...
✅ Cargadas 500 partidas reales con 4 huesos

🎯 Creando sistema de Ensemble...
🔄 Entrenando modelos...

📈 Entrenando modelo de series temporales con 500 partidas...
✅ Modelo temporal entrenado con 500 secuencias

🧠 Entrenando Q-Learning Bayesiano con 500 partidas...
✅ Q-Learning entrenado con 2500 actualizaciones

🔬 Entrenando modelo markoviano con 500 partidas...
✅ Modelo entrenado con 1500 transiciones

✅ Ensemble entrenado exitosamente

📊 ESTADÍSTICAS DEL ENSEMBLE
--------------------------------------------------------------------------------

🎯 Pesos de los modelos:
   Series Temporales: 33.3%
   Q-Learning: 33.3%
   Markov: 33.3%
```

## 📊 Métricas de Rendimiento

### Métricas por Modelo

Cada modelo mantiene sus propias métricas:

- **Precisión**: Proporción de predicciones correctas
- **Recall**: Proporción de casos positivos identificados
- **F1-Score**: Media armónica de precisión y recall
- **Aciertos/Total**: Contadores absolutos

### Confianza Global

La confianza global del ensemble se calcula como:

```
Confianza_global = Σ(w_i * Confianza_i)
```

Donde cada modelo aporta su nivel de confianza individual.

## 🔄 Reentrenamiento Automático

El sistema se reentrena automáticamente cada hora cuando se usa a través de la API:

```typescript
const INTERVALO_REENTRENAMIENTO = 1000 * 60 * 60; // 1 hora
```

Esto asegura que el modelo siempre esté actualizado con los datos más recientes.

## 📈 Ventajas del Ensemble

1. **Robustez**: Combina múltiples perspectivas para reducir errores
2. **Adaptabilidad**: Pesos dinámicos basados en rendimiento
3. **Confianza Cuantificada**: Intervalos de confianza combinados
4. **Validación Científica**: Cada modelo incluye pruebas estadísticas
5. **Transparencia**: Contribución de cada modelo es visible

## 🎯 Casos de Uso

### Inicio de Partida

```typescript
// Sin información previa
const pred = await ensemble.predecir([], [], 5);
// Usa distribución estacionaria y patrones históricos
```

### Partida Avanzada

```typescript
// Con posiciones reveladas
const pred = await ensemble.predecir([4, 7, 10, 13], [], 5);
// Usa patrones temporales y transiciones
```

### Con Información de Huesos

```typescript
// Con huesos conocidos
const pred = await ensemble.predecir([4, 7, 10], [6, 9], 5);
// Usa Q-Learning para evitar patrones de huesos
```

## 🔧 Configuración Avanzada

### Ajustar Hiperparámetros

```typescript
// Series Temporales
const modelo_st = new ModeloSeriesTemporal(
  50  // Ventana de análisis (últimas N partidas)
);

// Q-Learning
const modelo_ql = new QLearningBayesiano(
  0.1,  // Tasa de aprendizaje (α)
  0.9,  // Factor de descuento (γ)
  0.3   // Epsilon inicial (exploración)
);
```

### Persistencia del Estado

```typescript
// Exportar estado
const estado = ensemble.exportarEstado();
localStorage.setItem('ensemble_state', JSON.stringify(estado));

// Importar estado
const estado_guardado = JSON.parse(localStorage.getItem('ensemble_state'));
ensemble.importarEstado(estado_guardado);
```

## 📚 Referencias Científicas

### Series Temporales
- Autocorrelación: ρ(k) = Cov(X_t, X_{t-k}) / Var(X_t)
- Test de Ljung-Box: Q = n(n+2)Σ[ρ²(k)/(n-k)]

### Q-Learning Bayesiano
- Q-Learning: Q(s,a) = Q(s,a) + α[r + γ·max(Q(s',a')) - Q(s,a)]
- Prior Bayesiano: Beta(α, β)
- Posterior: Beta(α + éxitos, β + fallos)

### Cadenas de Markov
- Matriz de transición: P[i][j] = P(estado_j | estado_i)
- Distribución estacionaria: π = πP

## 🐛 Troubleshooting

### Error: "No hay datos de entrenamiento"

Asegúrate de tener partidas reales en la base de datos:

```sql
SELECT COUNT(*) FROM ChickenGame WHERE isSimulated = false AND boneCount = 4;
```

### Error: "Ensemble no entrenado"

El ensemble se entrena automáticamente en el primer uso. Si persiste:

```typescript
ensembleGlobal = null;
ultimoEntrenamiento = null;
```

### Predicciones con baja confianza

- Aumenta el tamaño de la ventana de análisis
- Recolecta más datos de entrenamiento
- Ajusta los pesos manualmente si es necesario

## 📝 Notas Importantes

1. **Datos de Calidad**: El ensemble requiere al menos 100 partidas reales para entrenamiento efectivo
2. **Memoria**: El sistema mantiene estado en memoria; considera persistencia para producción
3. **Rendimiento**: El entrenamiento puede tomar 5-10 segundos con 500 partidas
4. **Validación**: Todos los modelos incluyen validación estadística científica

## 🚀 Próximos Pasos

1. Implementar persistencia en base de datos
2. Agregar más modelos al ensemble (Random Forest, Neural Networks)
3. Implementar A/B testing automático
4. Dashboard de visualización de métricas
5. Sistema de alertas para degradación de rendimiento

---

**Última actualización**: 2026-02-04
**Versión**: 1.0.0
**Autor**: Sistema de ML Avanzado
