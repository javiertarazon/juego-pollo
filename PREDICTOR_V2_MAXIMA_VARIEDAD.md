# Predictor V2: Máxima Variedad y Anti-Detección Agresiva

## Problema Persistente

Análisis de últimas 20 partidas mostró:
- **88.9% overlap**: Mystake sigue colocando huesos en nuestras posiciones
- **Posiciones quemadas**: 2, 9, 8, 12, 7 (las más sugeridas)
- **Racha de 7 pérdidas**: Mystake muy adaptado
- **Predictibilidad**: 38.7% (mejor que antes pero insuficiente)

## Cambios en V2

### 1. Inversión de Prioridades

**Antes (V1)**: Favorecía posiciones "históricamente seguras"
```typescript
23: 0.95, 15: 0.93, 14: 0.91 // Máxima prioridad
2: 0.62, 9: 0.66, 6: 0.64   // Baja prioridad
```

**Ahora (V2)**: Favorece posiciones MENOS EXPLORADAS
```typescript
// Grupo A: Históricamente seguras (REDUCIDAS - Mystake las conoce)
23: 0.50, 15: 0.50, 14: 0.50

// Grupo C: Menos exploradas (PRIORIDAD ALTA)
5: 0.80, 16: 0.80, 24: 0.80

// Grupo D: Raramente usadas (MÁXIMA PRIORIDAD)
10: 0.90, 17: 0.90
```

**Razón**: Mystake está colocando huesos en las posiciones "seguras" conocidas. Necesitamos explorar territorio nuevo.

### 2. Penalización Extrema de Posiciones Quemadas

**Antes**: 70% menos probable
```typescript
if (burnedPositions.has(pos)) {
  score *= 0.3; // 70% reducción
}
```

**Ahora**: 90% menos probable + BONUS para limpias
```typescript
if (burnedPositions.has(pos)) {
  score *= 0.1; // 90% reducción
  reasons.push('🔥 QUEMADA - Evitar');
} else {
  score *= 1.5; // 50% BONUS
  reasons.push('✅ Limpia');
}
```

### 3. Máxima Aleatoriedad

**Antes**: +/- 15% de ruido
```typescript
const noise = (Math.random() - 0.5) * 0.3;
```

**Ahora**: +/- 40% de ruido
```typescript
const noise = (Math.random() - 0.5) * 0.8;
```

### 4. Rango de Candidatos Ampliado

**Antes**: Top 3-7 posiciones
```typescript
const topN = Math.floor(Math.random() * 5) + 3;
```

**Ahora**: Top 5-12 posiciones
```typescript
const topN = Math.floor(Math.random() * 8) + 5;
```

### 5. Contra-Estrategia Agresiva

**Antes**: 50% bonus para posiciones raras
```typescript
if (mystakeAdapting && score < 0.7) {
  score *= 1.5;
}
```

**Ahora**: 100% bonus (DOBLE score)
```typescript
if (mystakeAdapting && score < 0.6) {
  score *= 2.0; // DOBLE
  reasons.push('🎯 Contra-estrategia ACTIVA');
}
```

## Estrategia de Exploración

### Posiciones a PRIORIZAR (Menos Exploradas)

Basado en el análisis, estas posiciones tienen MENOS huesos:
```
Grupo ALTO: 10, 17, 5, 16, 24
Grupo MEDIO: 11, 21, 4, 25, 18, 20
Grupo BAJO: 23, 15, 14, 19, 13
```

### Posiciones a EVITAR (Quemadas)

Estas tienen ALTA frecuencia de huesos:
```
EVITAR: 8, 12, 7, 2, 3, 9
```

## Resultados Esperados

### Métricas Objetivo

| Métrica | V1 | V2 Objetivo |
|---------|-----|-------------|
| Overlap | 88.9% | <30% |
| Predictibilidad | 38.7% | <20% |
| Entropía | 2.85 bits | >4.0 bits |
| Posiciones únicas (20 partidas) | 9 | 18+ |
| Racha máxima pérdidas | 7 | 2 |

### Distribución Esperada de Sugerencias

En 20 partidas, deberíamos ver:
```
Posición 10: 2-3 veces (10-15%)
Posición 17: 2-3 veces (10-15%)
Posición 5:  2-3 veces (10-15%)
Posición 16: 2-3 veces (10-15%)
Posición 24: 1-2 veces (5-10%)
... (15+ posiciones diferentes)
```

NO deberíamos ver:
```
Posición 2: 0-1 veces (0-5%)
Posición 9: 0-1 veces (0-5%)
Posición 8: 0 veces (0%)
Posición 12: 0 veces (0%)
```

## Logs del Sistema V2

El predictor ahora muestra información detallada:
```
🎯 Predicción V2: Pos 17 (score: 0.87, top8, burned: 6, mystake: true)
```

Información:
- `Pos 17`: Posición sugerida
- `score: 0.87`: Confianza (0-1)
- `top8`: Consideró 8 candidatos
- `burned: 6`: 6 posiciones quemadas detectadas
- `mystake: true`: Detectó adaptación de Mystake

## Respuesta de API Mejorada

```json
{
  "success": true,
  "suggestion": {
    "position": 17,
    "confidence": 87,
    "reasons": ["✅ Limpia", "🎯 Contra-estrategia ACTIVA"],
    "winRate": 87
  },
  "alternatives": [
    { "position": 10, "confidence": 85 },
    { "position": 5, "confidence": 82 },
    { "position": 16, "confidence": 79 },
    ...
  ],
  "analysis": {
    "mystakeAdapting": true,
    "burnedPositionsCount": 6,
    "burnedPositions": [2, 9, 8, 12, 7, 3],
    "strategyUsed": "COUNTER-ATTACK",
    "randomnessLevel": "MAXIMUM",
    "topCandidatesConsidered": 8
  }
}
```

## Cómo Probar

1. **Jugar 10 partidas** con el nuevo sistema
2. **Observar variedad**: Deberías ver posiciones como 10, 17, 5, 16, 24
3. **Evitar quemadas**: NO deberías ver 2, 9, 8, 12, 7
4. **Ejecutar análisis**:
```bash
npx tsx analyze-recent-pattern-detection.ts
```

## Indicadores de Éxito

Después de 10 partidas:
- ✅ Al menos 8 posiciones diferentes como primer movimiento
- ✅ Ninguna posición sugerida más de 2 veces
- ✅ Overlap < 50%
- ✅ No más de 2 pérdidas consecutivas

## Filosofía V2

> "Si Mystake conoce nuestras posiciones 'seguras', entonces las posiciones 'peligrosas' se vuelven seguras"

El sistema ahora:
1. **Explora territorio nuevo**: Posiciones 5, 10, 16, 17, 24
2. **Evita territorio quemado**: Posiciones 2, 7, 8, 9, 12
3. **Máxima impredecibilidad**: 40% de ruido, top 5-12
4. **Contra-ataque activo**: Doble score cuando detecta adaptación

## Próximos Pasos

1. Probar 10 partidas
2. Si overlap sigue >50%:
   - Aumentar ruido a 60%
   - Expandir rango a top 8-15
   - Penalizar quemadas al 95%
3. Si funciona bien:
   - Mantener configuración
   - Monitorear cada 20 partidas
   - Ajustar pesos según resultados

---

**Estado**: ✅ Implementado
**Servidor**: ✅ http://localhost:3000
**Versión**: V2 - Máxima Variedad
**Fecha**: 2026-02-03
