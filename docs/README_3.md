# 🤖 Directorio de Machine Learning

Este directorio contiene todos los algoritmos y modelos de ML del sistema.

## Estructura

### 📁 algoritmos/
Implementaciones de algoritmos de ML:
- `ensemble-inteligente.ts` - Sistema de ensemble que combina modelos
- `modelo-series-temporales.ts` - Análisis de series temporales
- `q-learning-bayesiano.ts` - Q-Learning con inferencia bayesiana
- `modelo-transicion-markoviana.ts` - Cadenas de Markov

### 📁 prediccion/
Sistema de predicción en producción:
- `ml-predictor-standalone.ts` - Predictor standalone

### 📁 entrenamiento/
Scripts de entrenamiento de modelos

### 📁 validacion/
Validación de modelos con métricas científicas

### 📁 optimizacion/
Optimización de hiperparámetros

## Modelos Implementados

### 1. Ensemble Inteligente
Combina tres modelos con votación ponderada adaptativa:
- Series Temporales (autocorrelación, tendencias)
- Q-Learning Bayesiano (aprendizaje por refuerzo)
- Markov (transiciones de estado)

### 2. Validación Científica
Todos los modelos incluyen:
- ✅ Intervalos de confianza del 95%
- ✅ Pruebas estadísticas (p < 0.05)
- ✅ Validación cruzada K-fold
- ✅ Métricas de rendimiento

## Uso

### Entrenar Ensemble
```bash
npx tsx utilidades/testing/test-ensemble-system.ts
```

### API de Predicción
```bash
POST /api/chicken/predict-ensemble
{
  "posiciones_reveladas": [4, 7, 10],
  "posiciones_huesos": [6],
  "num_predicciones": 5
}
```

## Métricas de Éxito

- **Precisión**: ≥ 60% (objetivo inquebrantable)
- **F1-Score**: ≥ 60%
- **Confianza**: Intervalos del 95%
- **Significancia**: p < 0.05
