# Tabla de Condiciones del Predictor V4

## 📋 Sistema de Evaluación Completo

El predictor V4 evalúa **8 condiciones principales** para cada posición disponible y calcula un score total.

---

## 🎯 Tabla de Condiciones y Puntuación

| # | Condición | Criterio | Puntos | Tipo | Prioridad | Ejemplo |
|---|-----------|----------|--------|------|-----------|---------|
| **1** | **Posición Siempre Segura** | Posición está en lista [4,7,10,13,14,15,17,18,19,20,21,23] | **+100** | Bonus | ⭐⭐⭐⭐⭐ | Pos 15 → +100 pts |
| **2** | **Posición Muy Estable** | Posición está en lista [15,19,23,13,17,22,10,14,4,8] | **+50** | Bonus | ⭐⭐⭐⭐ | Pos 19 → +50 pts |
| **3** | **Posición Quemada** | Posición está en lista [12,22] | **-80** | Penalización | 🚫🚫🚫🚫 | Pos 12 → -80 pts |
| **4a** | **Uso Muy Reciente** | Usada hace menos de 3 partidas | **-60** | Penalización | 🚫🚫🚫 | Usada hace 2 → -60 pts |
| **4b** | **Uso Reciente** | Usada hace 3-4 partidas | **-30** | Penalización | 🚫🚫 | Usada hace 4 → -30 pts |
| **4c** | **Nunca Usada** | No usada en últimas 20 partidas | **+40** | Bonus | ⭐⭐⭐ | 0 usos → +40 pts |
| **5** | **Frecuencia de Uso** | Por cada vez usada en últimas 20 partidas | **-10** × usos | Penalización | 🚫 | 5 usos → -50 pts |
| **6** | **Frecuencia de Huesos** | Tasa de huesos encontrados en esa posición | **-100** × tasa | Penalización | 🚫🚫🚫🚫 | 20% huesos → -20 pts |
| **7** | **Ventana de Seguridad** | Posición con ventana amplia (2,11,6,9) y poco usada | **+30** | Bonus | ⭐⭐ | Pos 2 con 1 uso → +30 pts |
| **8** | **Contra-Adaptación** | Mystake adaptándose (>50% pérdidas) Y posición nunca usada | **+60** | Bonus | ⭐⭐⭐⭐ | Adaptación + 0 usos → +60 pts |
| **9** | **Ruido Aleatorio** | Aleatoriedad para impredecibilidad | **+0 a +30** | Aleatorio | 🎲 | Random → +15 pts |

---

## 📊 Ejemplos de Cálculo Detallado

### Ejemplo 1: Posición 15 (Ideal)

| Condición | Aplica | Puntos | Acumulado |
|-----------|--------|--------|-----------|
| Base | - | 0 | 0 |
| ✅ Siempre Segura | SÍ (está en lista) | +100 | 100 |
| ✅ Muy Estable | SÍ (está en lista) | +50 | 150 |
| ❌ Quemada | NO | 0 | 150 |
| ✅ Nunca Usada | SÍ (0 usos) | +40 | 190 |
| Frecuencia Uso | 0 usos | 0 | 190 |
| Frecuencia Huesos | 0% huesos | 0 | 190 |
| Ventana Seguridad | NO aplica | 0 | 190 |
| Contra-Adaptación | NO (no adaptándose) | 0 | 190 |
| 🎲 Ruido Aleatorio | Random | +15 | **205** |

**Resultado**: 205 puntos → **EXCELENTE CANDIDATA** ✅✅✅

---

### Ejemplo 2: Posición 2 (Usada Frecuentemente)

| Condición | Aplica | Puntos | Acumulado |
|-----------|--------|--------|-----------|
| Base | - | 0 | 0 |
| ❌ Siempre Segura | NO (no está en lista) | 0 | 0 |
| ❌ Muy Estable | NO | 0 | 0 |
| ❌ Quemada | NO | 0 | 0 |
| ❌ Uso Muy Reciente | SÍ (usada hace 1 partida) | -60 | -60 |
| Frecuencia Uso | 5 usos | -50 | -110 |
| Frecuencia Huesos | 20% huesos (4/20) | -20 | -130 |
| ✅ Ventana Seguridad | SÍ (ventana 82, solo 5 usos) | +30 | -100 |
| Contra-Adaptación | NO (ya usada) | 0 | -100 |
| 🎲 Ruido Aleatorio | Random | +10 | **-90** |

**Resultado**: -90 puntos → **EVITAR** ❌❌❌

---

### Ejemplo 3: Posición 12 (Quemada)

| Condición | Aplica | Puntos | Acumulado |
|-----------|--------|--------|-----------|
| Base | - | 0 | 0 |
| ❌ Siempre Segura | NO | 0 | 0 |
| ❌ Muy Estable | NO | 0 | 0 |
| 🚫 Quemada | SÍ (en lista negra) | -80 | -80 |
| ❌ Uso Muy Reciente | SÍ (usada hace 2 partidas) | -60 | -140 |
| Frecuencia Uso | 2 usos | -20 | -160 |
| Frecuencia Huesos | 20% huesos | -20 | -180 |
| Ventana Seguridad | NO aplica | 0 | -180 |
| Contra-Adaptación | NO | 0 | -180 |
| 🎲 Ruido Aleatorio | Random | +5 | **-175** |

**Resultado**: -175 puntos → **NUNCA USAR** 🚫🚫🚫🚫

---

### Ejemplo 4: Posición 19 (Con Contra-Adaptación)

| Condición | Aplica | Puntos | Acumulado |
|-----------|--------|--------|-----------|
| Base | - | 0 | 0 |
| ✅ Siempre Segura | SÍ | +100 | 100 |
| ✅ Muy Estable | SÍ | +50 | 150 |
| ❌ Quemada | NO | 0 | 150 |
| ✅ Nunca Usada | SÍ | +40 | 190 |
| Frecuencia Uso | 0 usos | 0 | 190 |
| Frecuencia Huesos | 0% huesos | 0 | 190 |
| Ventana Seguridad | NO aplica | 0 | 190 |
| ✅ Contra-Adaptación | SÍ (Mystake adaptándose + 0 usos) | +60 | 250 |
| 🎲 Ruido Aleatorio | Random | +20 | **270** |

**Resultado**: 270 puntos → **PERFECTA** ✅✅✅✅✅

---

### Ejemplo 5: Posición 9 (Moderadamente Usada)

| Condición | Aplica | Puntos | Acumulado |
|-----------|--------|--------|-----------|
| Base | - | 0 | 0 |
| ❌ Siempre Segura | NO | 0 | 0 |
| ❌ Muy Estable | NO | 0 | 0 |
| ❌ Quemada | NO | 0 | 0 |
| ⚠️ Uso Reciente | SÍ (usada hace 4 partidas) | -30 | -30 |
| Frecuencia Uso | 5 usos | -50 | -80 |
| Frecuencia Huesos | 0% huesos | 0 | -80 |
| ✅ Ventana Seguridad | SÍ (ventana 30, solo 5 usos) | +30 | -50 |
| Contra-Adaptación | NO | 0 | -50 |
| 🎲 Ruido Aleatorio | Random | +25 | **-25** |

**Resultado**: -25 puntos → **NO RECOMENDADA** ⚠️

---

## 🎯 Listas de Referencia

### Lista 1: Posiciones SIEMPRE SEGURAS (12 posiciones)
```
4, 7, 10, 13, 14, 15, 17, 18, 19, 20, 21, 23
```
**Criterio**: Nunca fueron hueso en primer movimiento en 672 partidas
**Bonus**: +100 puntos

### Lista 2: Posiciones MUY ESTABLES (10 posiciones)
```
15, 19, 23, 13, 17, 22, 10, 14, 4, 8
```
**Criterio**: 96-97% de estabilidad (no cambian entre partidas)
**Bonus**: +50 puntos

### Lista 3: Posiciones QUEMADAS (2 posiciones)
```
12, 22
```
**Criterio**: Mystake coloca hueso rápidamente (6-7 usos)
**Penalización**: -80 puntos

### Lista 4: Ventanas de Seguridad Amplias (4 posiciones)
```
Posición 2:  82 usos seguros
Posición 11: 93 usos seguros
Posición 6:  35 usos seguros
Posición 9:  30 usos seguros
```
**Criterio**: Pueden usarse muchas veces antes de que Mystake coloque hueso
**Bonus**: +30 puntos (si poco usada)

---

## 🔄 Proceso de Selección Final

Después de calcular scores para todas las posiciones:

### Paso 1: Ordenar por Score
```
Posición 19: 270 puntos
Posición 15: 205 puntos
Posición 23: 198 puntos
Posición 13: 175 puntos
Posición 17: 165 puntos
...
Posición 2:  -90 puntos
Posición 12: -175 puntos
```

### Paso 2: Seleccionar Top N Candidatas
```
topN = random(8, 15)  // Entre 8 y 15 candidatas
candidates = top N posiciones con mejor score
```

### Paso 3: Selección Ponderada
```
Pesos exponenciales:
Candidata #1: 100% peso (1.0)
Candidata #2: 80% peso (0.8)
Candidata #3: 64% peso (0.64)
Candidata #4: 51% peso (0.51)
...

Selección aleatoria ponderada favorece mejores posiciones
pero permite variedad
```

---

## 📈 Rangos de Puntuación

| Rango de Score | Clasificación | Acción | Probabilidad |
|----------------|---------------|--------|--------------|
| **200+** | 🌟 EXCELENTE | Usar con alta confianza | 40-50% |
| **150-199** | ✅ MUY BUENA | Usar con confianza | 30-40% |
| **100-149** | ✔️ BUENA | Usar con precaución | 15-25% |
| **50-99** | ⚠️ REGULAR | Considerar alternativas | 5-10% |
| **0-49** | ❌ MALA | Evitar si hay mejores | 1-5% |
| **<0** | 🚫 PÉSIMA | NO USAR | 0% |

---

## 🎲 Factor de Aleatoriedad

El ruido aleatorio (+0 a +30 puntos) asegura:

1. **Impredecibilidad**: Mystake no puede predecir exactamente
2. **Variedad**: Posiciones similares rotan
3. **Exploración**: Ocasionalmente prueba posiciones nuevas

**Impacto**: Puede cambiar una posición de 175 pts a 205 pts, alterando el orden

---

## 🔍 Detección de Adaptación de Mystake

### Criterio
```typescript
lossRate = pérdidas / totalPartidas
mystakeAdapting = lossRate > 0.5  // Más del 50% pérdidas
```

### Efecto
Si `mystakeAdapting = true`:
- Posiciones **nunca usadas** reciben **+60 puntos** extra
- Favorece exploración de territorio nuevo
- Evita posiciones conocidas por Mystake

---

## 📊 Resumen Visual

```
SCORE FINAL = 
  + 100 (si siempre segura)
  + 50  (si muy estable)
  - 80  (si quemada)
  - 60  (si usada hace <3 partidas)
  - 30  (si usada hace 3-4 partidas)
  + 40  (si nunca usada)
  - 10  (por cada uso en últimas 20)
  - 100 × tasa_huesos
  + 30  (si ventana amplia y poco usada)
  + 60  (si contra-adaptación activa)
  + 0-30 (ruido aleatorio)
```

---

## 🎯 Ejemplo de Sesión Completa (10 Partidas)

| Partida | Posición | Score | Razones | Resultado |
|---------|----------|-------|---------|-----------|
| 1 | 15 | 205 | Siempre segura, Muy estable, Nunca usada | ✅ Victoria |
| 2 | 19 | 198 | Siempre segura, Muy estable, Nunca usada | ✅ Victoria |
| 3 | 23 | 192 | Siempre segura, Muy estable, Nunca usada | ✅ Victoria |
| 4 | 13 | 185 | Siempre segura, Muy estable, Nunca usada | ✅ Victoria |
| 5 | 17 | 178 | Siempre segura, Muy estable, Nunca usada | ✅ Victoria |
| 6 | 10 | 165 | Siempre segura, Muy estable, Nunca usada | ✅ Victoria |
| 7 | 21 | 158 | Siempre segura, Nunca usada | ✅ Victoria |
| 8 | 14 | 152 | Siempre segura, Muy estable, Nunca usada | ✅ Victoria |
| 9 | 4 | 145 | Siempre segura, Muy estable, Nunca usada | ✅ Victoria |
| 10 | 7 | 138 | Siempre segura, Nunca usada | ✅ Victoria |

**Resultado**: 10/10 victorias, 10 posiciones diferentes, 0% repetición ✅

---

**Versión**: V4 - Data Driven
**Fecha**: 2026-02-03
**Basado en**: Análisis de 672 partidas reales
