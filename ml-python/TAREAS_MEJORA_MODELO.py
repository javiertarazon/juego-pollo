"""
═══════════════════════════════════════════════════════════════════════
 PLAN DE TAREAS PARA MEJORAR EL ASESOR CON MODELO PYTHON
 Basado en análisis de 150 partidas reales limpias
 Fecha: 2026-02-07
═══════════════════════════════════════════════════════════════════════

ESTADO ACTUAL:
─────────────────────────────────────────────────────────────────────
✅ BD limpia: 150 partidas reales, 0 simuladas, 0 inconsistentes
✅ Datos exportados: games_clean.json, transitions.json, position_stats.json,
   bone_patterns.json, cash_out_analysis.json, lstm_sequences.json
✅ Nuevas features implementadas: pattern_features.py (8 nuevas features)
✅ Modelos antiguos eliminados (requieren reentrenamiento con datos limpios)

HALLAZGOS CLAVE DEL ANÁLISIS:
─────────────────────────────────────────────────────────────────────
1. INVERSIÓN: 13.34% pollo→hueso, 13.34% hueso→pollo por partida
   → ~3.3 posiciones cambian de estado entre partidas consecutivas
2. REPETICIÓN: Solo 0.66 huesos promedio se repiten de partida anterior
   → 46.3% veces NO se repite ningún hueso
3. ADYACENCIA: 85.3% de partidas tienen huesos adyacentes
4. VOLATILIDAD: Posiciones 24,2,8,14,13 cambian >32% entre partidas
   ESTABILIDAD: Posiciones 19,6,1,25,5 cambian <22%
5. PARES FRECUENTES: [2-22], [8-12], [7-14], [14-23], [22-24]
6. SESGO COLUMNA: Col 2 = 18.9% huesos vs Col 1 = 13.5%
7. RETIRO: 78.9% retiros tras 3 pollos → el asesor acertó bien
8. MIGRACIÓN: Bordes→Bordes 49.7%, Bordes→Centro 38.2%

═══════════════════════════════════════════════════════════════════════
 TAREAS ORDENADAS POR PRIORIDAD
═══════════════════════════════════════════════════════════════════════

FASE 1: REENTRENAMIENTO CON DATOS LIMPIOS (Prioridad: CRÍTICA)
─────────────────────────────────────────────────────────────────────

TAREA 1.1: Reentrenar ensemble con datos limpios
  - Ejecutar POST /train en el servidor Python
  - Los modelos ahora incluirán las 8 nuevas pattern features
  - Verificar que el extractor lea correctamente las 150 partidas
  - Comando: curl -X POST http://localhost:8100/train
  Estado: PENDIENTE

TAREA 1.2: Validar métricas post-reentrenamiento
  - Verificar AUC-ROC, precision, recall de cada modelo
  - Comparar con métricas anteriores (si las hay)
  - Walk-forward validation debe mejorar bone identification rate
  Estado: PENDIENTE


FASE 2: MEJORAS AL FEATURE ENGINEERING (Prioridad: ALTA)
─────────────────────────────────────────────────────────────────────

TAREA 2.1: ✅ Implementar pattern_features.py (COMPLETADA)
  - volatility_score, pair_danger_score, adjacency_bone_pressure
  - zone_migration_prob, inversion_momentum, repetition_score
  - cluster_score, column_bias
  Estado: COMPLETADA

TAREA 2.2: Agregar features de "hot streaks" temporales
  Archivo: ml-python/data/feature_engineering.py
  - Feature: posiciones que llevan N partidas siendo pollo → más prob hueso
  - Feature: posiciones que llevan N partidas siendo hueso → prob de cambiar
  - Basado en el hallazgo: avg racha sin hueso = 3-5 partidas
  Estado: PENDIENTE

TAREA 2.3: Agregar features de patrones de pares dinámicos
  Archivo: ml-python/data/pattern_features.py
  - Pre-computar los top 20 pares de huesos frecuentes
  - Feature binaria: ¿El primer hueso del par está en partida anterior?
  - Si sí, aumentar probabilidad del segundo del par
  Estado: PENDIENTE


FASE 3: MEJORAS AL MODELO LSTM (Prioridad: ALTA)
─────────────────────────────────────────────────────────────────────

TAREA 3.1: Ajustar LSTM para dataset pequeño (150 partidas)
  Archivo: ml-python/config.py + ml-python/models/lstm_model.py
  - Reducir LSTM_HIDDEN_SIZE: 128 → 64
  - Reducir LSTM_NUM_LAYERS: 2 → 1
  - Aumentar LSTM_DROPOUT: 0.3 → 0.4 (prevenir overfitting)
  - Reducir SEQUENCE_LENGTH: 10 → 5 (pocas partidas)
  - Añadir augmentación de datos: rotaciones del tablero 5x5
  Estado: PENDIENTE

TAREA 3.2: Implementar Attention mechanism en LSTM
  Archivo: ml-python/models/lstm_model.py
  - Atención temporal: qué partidas pasadas son más relevantes
  - Atención posicional: qué posiciones influyen más en cada predicción
  - Esto capturará mejor los patrones de migración descubiertos
  Estado: PENDIENTE


FASE 4: NUEVAS ESTRATEGIAS DE PREDICCIÓN (Prioridad: MEDIA-ALTA)
─────────────────────────────────────────────────────────────────────

TAREA 4.1: Implementar predictor de "anti-repetición"
  Archivo: ml-python/models/anti_repeat_model.py (NUEVO)
  - Dado que 46.3% de veces 0 huesos se repiten:
    Estrategia: penalizar posiciones que fueron hueso en partida anterior
  - Dado que solo 0.7% tiene 3+ huesos repetidos:
    Si los 4 huesos se repiten = evento casi imposible
  Estado: PENDIENTE

TAREA 4.2: Implementar predictor basado en cadenas de Markov de 2do orden
  Archivo: ml-python/models/markov_predictor.py (NUEVO)
  - Usar transiciones no solo de t-1→t sino de (t-2, t-1)→t
  - Capturar patrones como: "si pos X fue hueso 2 partidas seguidas, 
    probabilidad de ser hueso en la siguiente"
  - Integrar al ensemble con peso adaptativo
  Estado: PENDIENTE

TAREA 4.3: Implementar predictor de "dispersión"
  Archivo: ml-python/models/dispersion_predictor.py (NUEVO)
  - Basado en hallazgo: 85.3% tienen huesos adyacentes
  - Calcular distancia esperada entre huesos
  - Predecir configuraciones con dispersión realista
  Estado: PENDIENTE


FASE 5: MEJORAS AL SISTEMA DE AUTO-APRENDIZAJE (Prioridad: MEDIA)
─────────────────────────────────────────────────────────────────────

TAREA 5.1: Implementar feedback loop más granular
  Archivo: ml-python/models/ensemble.py → register_result()
  - Guardar TODAS las predicciones vs resultados reales
  - Calcular recall@K: de las K posiciones sugeridas como seguras,
    ¿cuántas realmente lo fueron?
  - Ajustar pesos del ensemble basado en recall, no solo MSE
  Estado: PENDIENTE

TAREA 5.2: Implementar sistema de confianza calibrada
  Archivo: ml-python/models/ensemble.py → predict()
  - En lugar de probabilidades crudas, calibrar con Platt scaling
  - El frontend mostrará confianza real, no optimista
  - Añadir campo "uncertainty" basado en varianza entre modelos
  Estado: PENDIENTE

TAREA 5.3: Guardar features de patrones en BD para análisis continuo
  Archivo: scripts/export-ml-data.js (ejecutar periódicamente)
  - Exportar automáticamente tras cada 10 partidas nuevas
  - Recalcular estadísticas acumuladas
  - Alimentar el modelo con datos frescos
  Estado: PENDIENTE


FASE 6: RECOLECCIÓN DE MÁS DATOS (Prioridad: CONTINUA)
─────────────────────────────────────────────────────────────────────

TAREA 6.1: Mejorar el guardado de partidas en el frontend
  Archivo: src/app/api/chicken/result/route.ts
  - Asegurar que SIEMPRE se guarde boneCount correctamente
  - Validar que positions tenga exactamente 25 registros
  - Validar que el número de huesos en positions = boneCount
  - Rechazar partidas mal formadas antes de guardar
  Estado: PENDIENTE

TAREA 6.2: Objetivo: 300+ partidas reales limpias
  - Con 150 partidas el modelo tiene limitaciones
  - A 300 partidas el LSTM empezará a ser más efectivo
  - A 500 partidas se pueden detectar patrones más sutiles
  Estado: EN PROGRESO (150/300)


FASE 7: DASHBOARD DE MÉTRICAS (Prioridad: BAJA)
─────────────────────────────────────────────────────────────────────

TAREA 7.1: Mostrar en dashboard las nuevas métricas
  - Posiciones más peligrosas actuales (últimas 5/10)
  - Volatilidad por posición
  - Tasa de acierto del asesor en tiempo real
  - Feature importance del ensemble
  Estado: PENDIENTE


═══════════════════════════════════════════════════════════════════════
 ORDEN DE EJECUCIÓN RECOMENDADO
═══════════════════════════════════════════════════════════════════════

1. [AHORA]     Tarea 1.1 → Reentrenar con datos limpios + nuevas features
2. [AHORA]     Tarea 3.1 → Ajustar LSTM para dataset pequeño
3. [PRONTO]    Tarea 6.1 → Validar guardado para futuras partidas
4. [PRONTO]    Tarea 2.2 + 2.3 → Más features temporales
5. [DESPUÉS]   Tarea 4.1 → Anti-repetición
6. [DESPUÉS]   Tarea 4.2 → Cadenas de Markov 2do orden
7. [CONTINUO]  Tarea 6.2 → Seguir jugando para llegar a 300 partidas
8. [CONTINUO]  Tarea 5.1-5.3 → Auto-aprendizaje mejorado
"""
