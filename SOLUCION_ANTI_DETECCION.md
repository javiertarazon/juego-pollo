# Solución Anti-Detección de Mystake

## Problema Identificado

Mystake está detectando nuestro patrón porque:
- **55% de las veces** sugerimos posición 2 como primer movimiento
- **87.5% overlap**: Mystake coloca huesos en nuestras posiciones sugeridas
- **Patrón fijo**: 2 → 9 → 6 → 7 → 4 → 17 (siempre igual)
- **4 pérdidas consecutivas**: Mystake adaptándose activamente

## Estrategia de Solución

### 1. Introducir Aleatoriedad Estratégica

En lugar de siempre sugerir la posición "más segura", usar:

```typescript
// Antes (PREDECIBLE):
const bestPosition = sortedPositions[0]; // Siempre la #1

// Ahora (ALEATORIO ESTRATÉGICO):
const topSafe = sortedPositions.slice(0, 5); // Top 5 más seguras
const randomIndex = Math.floor(Math.random() * topSafe.length);
const selectedPosition = topSafe[randomIndex]; // Aleatorio entre top 5
```

### 2. Rotación de Estrategias

Alternar entre 3 estrategias diferentes:

**Estrategia A (40%)**: Posiciones más seguras (actual)
**Estrategia B (30%)**: Posiciones menos frecuentes
**Estrategia C (30%)**: Posiciones aleatorias ponderadas

### 3. Evitar Posiciones "Quemadas"

Si una posición ha tenido huesos en las últimas 3 partidas, reducir su prioridad:

```typescript
const recentBones = getLastNGames(3).flatMap(g => g.bones);
const burnedPositions = new Set(recentBones);

// Penalizar posiciones quemadas
if (burnedPositions.has(position)) {
  score *= 0.3; // 70% menos probable
}
```

### 4. Patrón de Movimientos Variable

En lugar de seguir siempre el mismo orden, variar:

```typescript
// Antes: 2 → 9 → 6 → 7 → 4 → 17 (FIJO)

// Ahora: Generar secuencia aleatoria cada vez
const sequence = generateRandomSequence(topSafePositions);
// Ejemplo: 15 → 23 → 11 → 7 → 19 → 14
```

### 5. Detección de Adaptación de Mystake

Monitorear si Mystake está adaptándose:

```typescript
const last5Games = getLastNGames(5);
const lossRate = last5Games.filter(g => g.hitBone).length / 5;

if (lossRate > 0.6) {
  // Mystake está adaptándose
  // Cambiar completamente de estrategia
  useCounterStrategy();
}
```

## Implementación

### Paso 1: Modificar el Predictor

Agregar aleatoriedad al endpoint `/api/chicken/predict`:

```typescript
// Seleccionar entre top N posiciones aleatoriamente
const topN = Math.floor(Math.random() * 3) + 3; // Entre 3 y 5
const candidates = sortedPositions.slice(0, topN);
const selected = candidates[Math.floor(Math.random() * candidates.length)];
```

### Paso 2: Implementar Rotación de Estrategias

```typescript
const strategy = selectStrategy();

switch(strategy) {
  case 'safe':
    return getSafestPositions();
  case 'rare':
    return getRarestPositions();
  case 'random':
    return getWeightedRandomPositions();
}
```

### Paso 3: Sistema de Memoria

Recordar últimas N partidas y evitar patrones:

```typescript
const recentPatterns = getRecentPatterns(10);
const avoidPositions = detectBurnedPositions(recentPatterns);

// Filtrar posiciones quemadas
candidates = candidates.filter(p => !avoidPositions.has(p));
```

## Resultados Esperados

Con estas mejoras:

- **Predictibilidad**: 52% → <30%
- **Overlap**: 87.5% → <40%
- **Win rate**: Debería mejorar después de 5-10 partidas
- **Detección**: Mystake tardará más en adaptarse

## Métricas de Éxito

Monitorear:
1. Entropía de sugerencias (debe aumentar)
2. Overlap con huesos (debe disminuir)
3. Rachas de pérdidas (no más de 2 consecutivas)
4. Variedad de primeras posiciones (al menos 10 diferentes en 20 partidas)

## Código de Ejemplo

```typescript
function getAntiDetectionSuggestion(
  safePositions: number[],
  recentGames: Game[]
): number {
  // 1. Detectar si Mystake está adaptándose
  const isAdapting = detectMystakeAdaptation(recentGames);
  
  if (isAdapting) {
    // Cambiar completamente de estrategia
    return getCounterStrategyPosition(safePositions);
  }
  
  // 2. Obtener posiciones quemadas
  const burned = getBurnedPositions(recentGames, 3);
  
  // 3. Filtrar candidatos
  const candidates = safePositions
    .filter(p => !burned.has(p))
    .slice(0, 8); // Top 8 en lugar de top 1
  
  // 4. Selección aleatoria ponderada
  const weights = candidates.map((_, i) => 
    Math.pow(0.8, i) // Decae exponencialmente
  );
  
  return weightedRandom(candidates, weights);
}
```

## Próximos Pasos

1. Implementar aleatoriedad en predictor
2. Agregar sistema de memoria de partidas
3. Implementar rotación de estrategias
4. Monitorear métricas durante 20 partidas
5. Ajustar parámetros según resultados
