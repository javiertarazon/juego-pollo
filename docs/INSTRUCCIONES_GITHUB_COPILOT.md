# 🤖 INSTRUCCIONES PARA GITHUB COPILOT - SISTEMA CHICKEN AI ADVISOR

**Fecha de creación**: 5 de febrero de 2026  
**Versión del sistema**: V5 ML Reinforcement Learning  
**Idioma**: Español (todos los comentarios, respuestas y documentación)

---

## 📋 CONTEXTO GENERAL DEL SISTEMA

### Descripción del Proyecto

**Chicken AI Advisor** es un sistema de predicción inteligente para el juego "Chicken" de Mystake utilizando **Machine Learning con Reinforcement Learning (Q-Learning)**. El objetivo principal es predecir posiciones seguras (pollos) con alta precisión y rentabilidad mediante el análisis de partidas reales.

### Componentes Principales

1. **Asesor Original** (`reinforcement-learning.ts`)
   - Objetivo: 5 posiciones reveladas
   - Estrategia: Agresiva con alta exploración (30% → 15%)
   - Tasa de éxito esperada: 50-55%
   - Multiplicador: 2.58x (+158% ganancia)

2. **Asesor Rentable** (`reinforcement-learning-rentable.ts`)
   - Objetivo: 2-3 posiciones reveladas (configurable)
   - Estrategia: Conservadora con 10 posiciones ultra seguras (93%+ pollos)
   - Tasa de éxito esperada: 75-85%
   - Multiplicador: 1.41x-1.71x (+41%-71% ganancia)

3. **Sistema de Análisis Adaptativo** (`adaptive-pattern-analyzer.ts`)
   - Analiza últimas N partidas para detectar patrones
   - Identifica zonas calientes y rotaciones
   - Calcula scores de seguridad dinámicos
   - Se actualiza cada 60 segundos

4. **Base de Datos**
   - Total partidas: ~18,605
   - Partidas reales: ~1,005 (fuente principal de entrenamiento)
   - Partidas simuladas: ~17,600
   - ORM: Prisma

---

## 🎯 OBJETIVO PRINCIPAL DEL SISTEMA

**Meta crítica**: Hacer que el asesor prediga posiciones seguras (pollos) con **alto porcentaje de éxito (>75%) y alta rentabilidad** mediante:

1. **Análisis de patrones reales**: Usar únicamente las 1,005 partidas reales con posiciones de pollos y huesos
2. **Predicción adaptativa**: Ajustar predicciones basándose en comportamiento reciente de Mystake
3. **Diversidad de posiciones**: Evitar repetir patrones que Mystake pueda detectar
4. **Balance exploración/explotación**: Usar Q-Learning para optimizar selección de posiciones

### Métricas de Éxito Actuales

- **Tasa de éxito general**: 50% (último análisis 100 partidas)
- **Objetivo a alcanzar**: >75% con asesor rentable, >55% con asesor original
- **Racha máxima de derrotas**: 12 (objetivo: <5)
- **Posiciones ultra seguras identificadas**: 10 posiciones con 93-96% de pollos
- **Top posiciones**: 19 (96%), 5 (94%), 23 (94%), 4 (92%), 10 (92%)

---

## 🔍 ANÁLISIS EXHAUSTIVO - PROBLEMAS IDENTIFICADOS

### 1. ❌ Código Duplicado (Prioridad Alta)

**Ubicación**: Entre `reinforcement-learning.ts` y `reinforcement-learning-rentable.ts`

**Problema**: ~60% de código duplicado entre ambos asesores

**Funciones duplicadas**:
```typescript
// Ambos archivos tienen esta función idéntica
async function getHotPositions(): Promise<number[]> {
  // ... código 100% duplicado ...
}
```

**Solución recomendada**:
- Crear módulo compartido `src/lib/ml/ml-common.ts`
- Extraer funciones comunes: `getHotPositions`, `initializeQValues`, `calculateSuccessRate`, `degradeEpsilon`
- Importar en ambos asesores
- Reducir duplicación del 60% al 20%

### 2. ⚠️ Variable No Utilizada (Prioridad Alta)

**Ubicación**: `src/lib/ml/reinforcement-learning-rentable.ts` línea 28

**Problema**:
```typescript
const DISCOUNT_FACTOR = 0.90; // ⚠️ DECLARADA PERO NUNCA USADA
```

**Solución recomendada**:
```typescript
// OPCIÓN 1: Eliminar (recomendado para asesor rentable)
// Eliminar la línea completamente

// OPCIÓN 2: Usar en Q-learning (si se necesita complejidad adicional)
const maxNextQ = Math.max(...Object.values(mlStateRentable.positionQValues), 0.5);
const newQ = currentQ + LEARNING_RATE * (reward + DISCOUNT_FACTOR * maxNextQ - currentQ);
```

### 3. 🔴 Epsilon Mínimo Muy Alto (Ya Corregido)

**Ubicación**: `src/lib/ml/reinforcement-learning.ts` línea 44

**Estado**: ✅ Ya corregido de 35% a 15%

```typescript
const MIN_EPSILON = 0.15; // ✅ Correcto: 15% es el estándar en RL
```

### 4. 📉 Tasa de Éxito Baja (Crítico)

**Problema**: Tasa de éxito actual es 50%, por debajo del objetivo

**Causas identificadas**:
1. Deterioro progresivo desde partida 40 (de 75% a 30%)
2. Racha máxima de derrotas muy alta (12 consecutivas)
3. Posibles cambios en algoritmo de Mystake
4. Falta de stop-loss después de rachas negativas

**Soluciones propuestas**:
1. Implementar stop-loss automático después de 3 derrotas consecutivas
2. Investigar causa del deterioro progresivo
3. Forzar exploración de 3 posiciones nunca usadas (12, 16, 24)
4. Priorizar posiciones con 100% éxito histórico

### 5. 🔥 Sistema de Posiciones Calientes (Implementado)

**Estado**: ✅ Implementado y funcionando

**Función**: Evita posiciones usadas 2+ veces en últimas 5 partidas

**Beneficios**:
- Reduce predictibilidad para Mystake
- Aumenta diversidad de selección
- Previene sobre-uso de posiciones

### 6. 🚫 Falta de Validación en API

**Ubicación**: `src/app/api/chicken/predict/route.ts`

**Problema**: No valida entrada de parámetros

**Solución**: ✅ Ya implementada con Zod
```typescript
const requestSchema = z.object({
  revealedPositions: z.array(z.number().int().min(1).max(25)).max(24).optional().default([]),
  tipoAsesor: z.enum(['original', 'rentable']).optional().default('original'),
  objetivoRentable: z.union([z.literal(2), z.literal(3)]).optional().default(2),
});
```

### 7. 📝 Exceso de Console.log

**Problema**: Más de 50 console.log en código de producción

**Solución recomendada**:
- Implementar sistema de logging profesional (Winston, Pino)
- Niveles de log: ERROR, WARN, INFO, DEBUG
- Desactivar DEBUG en producción
- Mantener solo logs críticos

### 8. ⚡ Falta de Caché en Análisis Adaptativo

**Problema**: Recalcula análisis en cada llamada

**Solución recomendada**:
```typescript
let cacheAnalisis: { data: AnalisisAdaptativo; timestamp: number } | null = null;
const CACHE_TTL = 60000; // 60 segundos

export async function analizarUltimasPartidas(limite: number = 10): Promise<AnalisisAdaptativo> {
  const ahora = Date.now();
  if (cacheAnalisis && (ahora - cacheAnalisis.timestamp) < CACHE_TTL) {
    return cacheAnalisis.data;
  }
  
  // ... realizar análisis ...
  
  cacheAnalisis = { data: resultado, timestamp: ahora };
  return resultado;
}
```

---

## 🛠️ MEJORAS PRIORITARIAS A IMPLEMENTAR

### Prioridad 🔴 CRÍTICA (Implementar Inmediatamente)

#### 1. Crear Módulo Compartido para Eliminar Código Duplicado

**Archivo nuevo**: `src/lib/ml/ml-common.ts`

**Contenido**:
```typescript
import { db } from '@/lib/db';

/**
 * Obtener posiciones calientes (usadas 2+ veces en últimas N partidas)
 * Evita repetir patrones que Mystake pueda detectar
 */
export async function getHotPositions(limite: number = 5): Promise<number[]> {
  try {
    const ultimas = await db.chickenGame.findMany({
      where: { isSimulated: false },
      orderBy: { createdAt: 'desc' },
      take: limite,
      include: { positions: true },
    });

    const posicionesCalientes = new Map<number, number>();

    ultimas.forEach((partida) => {
      const primeraPos = partida.positions
        .filter((p) => p.revealed && p.revealOrder !== null)
        .sort((a, b) => (a.revealOrder || 0) - (b.revealOrder || 0))[0];

      if (primeraPos) {
        posicionesCalientes.set(
          primeraPos.position,
          (posicionesCalientes.get(primeraPos.position) || 0) + 1
        );
      }
    });

    const calientes = Array.from(posicionesCalientes.entries())
      .filter(([, count]) => count >= 2)
      .map(([pos]) => pos);

    if (calientes.length > 0) {
      console.log(`🔥 Posiciones CALIENTES detectadas (evitar): ${calientes.join(', ')}`);
    }

    return calientes;
  } catch (error) {
    console.error('Error obteniendo posiciones calientes:', error);
    return [];
  }
}

/**
 * Inicializar Q-values para un rango de posiciones
 */
export function initializeQValues(
  positions: number[],
  initialValue: number = 0.5
): Record<number, number> {
  const qValues: Record<number, number> = {};
  positions.forEach((pos) => {
    qValues[pos] = initialValue;
  });
  return qValues;
}

/**
 * Calcular tasa de éxito de una posición
 */
export function calculateSuccessRate(stats: { wins: number; total: number }): number {
  if (stats.total === 0) return 0.5; // Valor neutral para posiciones sin datos
  return stats.wins / stats.total;
}

/**
 * Degradar epsilon según configuración
 */
export function degradeEpsilon(
  currentEpsilon: number,
  minEpsilon: number,
  decayRate: number
): number {
  return Math.max(minEpsilon, currentEpsilon * decayRate);
}
```

**Actualizar imports en ambos asesores**:
```typescript
// En reinforcement-learning.ts y reinforcement-learning-rentable.ts
import { 
  getHotPositions, 
  initializeQValues, 
  calculateSuccessRate, 
  degradeEpsilon 
} from './ml-common';

// Eliminar las funciones duplicadas de ambos archivos
```

#### 2. Implementar Sistema de Stop-Loss

**Ubicación**: `src/lib/ml/reinforcement-learning.ts` y `reinforcement-learning-rentable.ts`

**Agregar al interface MLState**:
```typescript
interface MLState {
  // ... campos existentes
  rachaDerrota: number; // Nueva: contador de derrotas consecutivas
  stopLossActivado: boolean; // Nueva: bandera de stop-loss
}
```

**Implementar lógica**:
```typescript
export async function selectPositionML(revealedPositions: number[]): Promise<{
  position: number;
  confidence: number;
  strategy: 'EXPLORE' | 'EXPLOIT' | 'STOP_LOSS';
  reason: string;
}> {
  // ⛔ STOP-LOSS: Detener si hay 3+ derrotas consecutivas
  if (mlState.rachaDerrota >= 3) {
    mlState.stopLossActivado = true;
    console.log('⛔ STOP-LOSS ACTIVADO: 3+ derrotas consecutivas. Pausar juego.');
    throw new Error('STOP_LOSS_ACTIVADO: Se recomienda pausar el juego.');
  }
  
  // ... resto de la lógica
}

export async function updateMLFromGame(
  position: number,
  wasSuccessful: boolean,
  reward: number
): Promise<void> {
  // Actualizar racha de derrotas
  if (wasSuccessful) {
    mlState.rachaDerrota = 0; // Resetear en victoria
    mlState.stopLossActivado = false;
  } else {
    mlState.rachaDerrota++;
    console.log(`📉 Racha de derrotas: ${mlState.rachaDerrota}`);
  }
  
  // ... resto de la lógica
}
```

#### 3. Forzar Exploración de Posiciones No Usadas

**Ubicación**: `src/lib/ml/reinforcement-learning.ts`

**Agregar lógica**:
```typescript
export async function selectPositionML(revealedPositions: number[]): Promise<...> {
  // Identificar posiciones nunca usadas
  const posicionesNuncaUsadas = Array.from({ length: 25 }, (_, i) => i + 1).filter(
    (pos) => !mlState.positionSuccessRate[pos] || mlState.positionSuccessRate[pos].total === 0
  );

  // Forzar exploración cada 20 partidas si hay posiciones no exploradas
  if (mlState.totalGames % 20 === 0 && posicionesNuncaUsadas.length > 0) {
    const posicionNoExplorada = posicionesNuncaUsadas[
      Math.floor(Math.random() * posicionesNuncaUsadas.length)
    ];
    
    console.log(`🆕 FORZANDO EXPLORACIÓN de posición nunca usada: ${posicionNoExplorada}`);
    
    return {
      position: posicionNoExplorada,
      confidence: 0.5,
      strategy: 'EXPLORE',
      reason: 'Exploración forzada de posición nueva',
      zone: getZoneForPosition(posicionNoExplorada),
      qValue: 0.5,
      epsilon: mlState.epsilon,
    };
  }
  
  // ... resto de la lógica
}
```

### Prioridad 🟡 ALTA (Implementar Esta Semana)

#### 4. Implementar Sistema de Caché para Análisis Adaptativo

**Ubicación**: `src/lib/ml/adaptive-pattern-analyzer.ts`

**Implementación**:
```typescript
// Cache global con TTL de 60 segundos
let cacheAnalisis: { 
  data: AnalisisAdaptativo; 
  timestamp: number;
  limite: number; 
} | null = null;

const CACHE_TTL = 60000; // 60 segundos

export async function analizarUltimasPartidas(limite: number = 10): Promise<AnalisisAdaptativo> {
  const ahora = Date.now();
  
  // Retornar cache si es válido y límite coincide
  if (cacheAnalisis && 
      cacheAnalisis.limite === limite &&
      (ahora - cacheAnalisis.timestamp) < CACHE_TTL) {
    console.log('📦 Usando análisis en caché');
    return cacheAnalisis.data;
  }
  
  console.log('🔄 Calculando nuevo análisis...');
  
  // ... realizar análisis completo ...
  const resultado: AnalisisAdaptativo = {
    // ... datos del análisis
  };
  
  // Guardar en cache
  cacheAnalisis = { 
    data: resultado, 
    timestamp: ahora,
    limite 
  };
  
  return resultado;
}

// Función para invalidar cache manualmente
export function invalidarCacheAnalisis(): void {
  cacheAnalisis = null;
  console.log('🗑️ Cache de análisis invalidado');
}
```

#### 5. Mejorar Sistema de Logging

**Crear nuevo archivo**: `src/lib/logger.ts`

**Implementación**:
```typescript
type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const LOG_LEVELS: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const CURRENT_LEVEL: LogLevel = process.env.NODE_ENV === 'production' ? 'WARN' : 'DEBUG';

class Logger {
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[CURRENT_LEVEL];
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('DEBUG')) {
      console.log(`🔍 [DEBUG] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('INFO')) {
      console.log(`ℹ️ [INFO] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('WARN')) {
      console.warn(`⚠️ [WARN] ${message}`, ...args);
    }
  }

  error(message: string, error?: any): void {
    if (this.shouldLog('ERROR')) {
      console.error(`❌ [ERROR] ${message}`, error);
    }
  }

  ml(message: string, data?: any): void {
    if (this.shouldLog('INFO')) {
      console.log(`🤖 [ML] ${message}`, data || '');
    }
  }

  success(message: string, ...args: any[]): void {
    if (this.shouldLog('INFO')) {
      console.log(`✅ [SUCCESS] ${message}`, ...args);
    }
  }
}

export const logger = new Logger();
```

**Reemplazar console.log en código**:
```typescript
// ANTES
console.log('ML: Pos 15 | EXPLORE | Q=0.850');

// DESPUÉS
logger.ml('Pos 15 | EXPLORE | Q=0.850');
```

#### 6. Agregar Rate Limiting en API

**Ubicación**: `src/app/api/chicken/predict/route.ts`

**Implementación simple con Map**:
```typescript
// Rate limiter simple (en producción usar Redis)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = 60; // 60 requests
  const window = 60000; // por minuto
  
  const record = requestCounts.get(ip);
  
  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + window });
    return true;
  }
  
  if (record.count >= limit) {
    return false;
  }
  
  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }
  
  // ... resto del código
}
```

### Prioridad 🟢 MEDIA (Considerar Implementar)

#### 7. Optimizar Complejidad del Asesor Original

**Problema**: 450+ líneas con alta complejidad ciclomática

**Solución**: Refactorizar en funciones más pequeñas
```typescript
// Extraer lógicas específicas
function calcularBonusZona(zone: string, lastZoneUsed: string): number {
  return zone !== lastZoneUsed ? 0.15 : 0;
}

function calcularPenalizacionFrecuencia(usageRate: number): number {
  if (usageRate > 0.15) return -0.20;
  if (usageRate > 0.10) return -0.10;
  return 0;
}

function calcularBonusNovedad(pos: number, recentPositions: number[]): number {
  if (!recentPositions.includes(pos)) return 0.10;
  if (recentPositions.filter(p => p === pos).length === 1) return 0.05;
  return 0;
}
```

#### 8. Agregar Tests Unitarios

**Crear**: `src/lib/ml/__tests__/reinforcement-learning.test.ts`

**Ejemplo**:
```typescript
import { calculateSuccessRate, degradeEpsilon } from '../ml-common';

describe('ML Common Functions', () => {
  test('calculateSuccessRate con datos válidos', () => {
    const rate = calculateSuccessRate({ wins: 8, total: 10 });
    expect(rate).toBe(0.8);
  });

  test('calculateSuccessRate sin datos retorna neutral', () => {
    const rate = calculateSuccessRate({ wins: 0, total: 0 });
    expect(rate).toBe(0.5);
  });

  test('degradeEpsilon respeta mínimo', () => {
    const epsilon = degradeEpsilon(0.08, 0.10, 0.995);
    expect(epsilon).toBe(0.10);
  });

  test('degradeEpsilon aplica decay correctamente', () => {
    const epsilon = degradeEpsilon(0.30, 0.10, 0.995);
    expect(epsilon).toBeCloseTo(0.2985, 4);
  });
});
```

---

## 📊 ESTRUCTURA DE DATOS Y MODELOS

### Base de Datos (Prisma Schema)

```prisma
model ChickenGame {
  id          String    @id @default(cuid())
  gameId      String    @unique
  balance     Float
  betAmount   Float
  multiplier  Float
  payout      Float
  profit      Float
  hitBone     Boolean
  isSimulated Boolean   @default(false)
  createdAt   DateTime  @default(now())
  positions   ChickenPosition[]
}

model ChickenPosition {
  id         String      @id @default(cuid())
  gameId     String
  position   Int
  isChicken  Boolean
  revealed   Boolean     @default(false)
  revealOrder Int?
  game       ChickenGame @relation(fields: [gameId], references: [gameId])
  
  @@index([gameId])
  @@index([position])
}
```

### Interface MLState (Asesor Original)

```typescript
interface MLState {
  epsilon: number; // Factor de exploración (0-1)
  totalGames: number; // Total partidas jugadas
  consecutiveSafePositions: number[]; // Últimas N posiciones seguras
  lastZoneUsed: 'ZONE_A' | 'ZONE_B'; // Última zona utilizada
  positionQValues: Record<number, number>; // Q-values por posición
  positionSuccessRate: Record<number, { wins: number; total: number }>;
  explorationCount: number; // Contador de exploraciones
  lastAdaptiveAnalysis: Date | null; // Última actualización adaptativa
  adaptiveScores: Record<number, number>; // Scores adaptativos
  rachaDerrota: number; // ⚠️ AGREGAR: Racha derrotas consecutivas
  stopLossActivado: boolean; // ⚠️ AGREGAR: Bandera stop-loss
}
```

### Interface MLStateRentable

```typescript
interface MLStateRentable {
  epsilon: number; // REDUCIDO: 25% inicial
  totalGames: number;
  consecutiveSafePositions: number[]; // Últimas 10 posiciones
  positionQValues: Record<number, number>;
  positionSuccessRate: Record<number, { wins: number; total: number }>;
  explorationCount: number;
  objetivo: 2 | 3; // Objetivo de posiciones
  lastAdaptiveAnalysis: Date | null;
  adaptiveScores: Record<number, number>;
}
```

---

## 🎮 FLUJO DE PREDICCIÓN

### 1. Usuario Inicia Partida
```
Frontend → POST /api/chicken/predict
  {
    revealedPositions: [],
    tipoAsesor: 'rentable',
    objetivoRentable: 2
  }
```

### 2. Sistema Selecciona Posición
```typescript
// 1. Cargar estado ML desde memoria
await loadMLState();

// 2. Actualizar análisis adaptativo si pasaron 60 segundos
await actualizarAnalisisAdaptativo();

// 3. Obtener posiciones calientes (evitar)
const hotPositions = await getHotPositions();

// 4. Filtrar posiciones disponibles
const available = posiciones.filter(
  p => !revealed.includes(p) && !hotPositions.includes(p)
);

// 5. Decidir estrategia (EXPLORE vs EXPLOIT)
const shouldExplore = Math.random() < epsilon;

// 6. Si EXPLORE: selección aleatoria
// 7. Si EXPLOIT: mejor Q-value + scores adaptativos

// 8. Retornar predicción
return {
  position: 19,
  confidence: 0.92,
  strategy: 'EXPLOIT',
  zone: 'ZONE_B',
  qValue: 0.850
};
```

### 3. Usuario Revela Posición
```
Frontend → POST /api/chicken/result
  {
    position: 19,
    wasChicken: true
  }
```

### 4. Sistema Actualiza ML
```typescript
// 1. Calcular recompensa
const reward = wasChicken ? 1.0 : -1.0;

// 2. Actualizar Q-value con Q-Learning
const newQ = currentQ + LEARNING_RATE * (reward - currentQ);

// 3. Actualizar tasa de éxito
stats.total++;
if (wasChicken) stats.wins++;

// 4. Degradar epsilon
epsilon = Math.max(MIN_EPSILON, epsilon * EPSILON_DECAY);

// 5. Actualizar racha de derrotas
if (wasChicken) {
  rachaDerrota = 0;
} else {
  rachaDerrota++;
}

// 6. Guardar estado
await saveMLState();
```

---

## 🔧 CONFIGURACIÓN Y PARÁMETROS

### Asesor Original (Agresivo)

```typescript
const LEARNING_RATE = 0.15; // Alpha: tasa de aprendizaje
const DISCOUNT_FACTOR = 0.85; // Gamma: peso futuro
const MIN_EPSILON = 0.15; // Exploración mínima 15%
const EPSILON_DECAY = 0.998; // Degradación lenta
const SAFE_SEQUENCE_LENGTH = 15; // Memoria de posiciones
const ADAPTIVE_ANALYSIS_INTERVAL = 60000; // 60 seg
const ADAPTIVE_WEIGHT = 0.4; // 40% peso adaptativo

// Objetivo: 5 posiciones
// Tasa esperada: 50-55%
```

### Asesor Rentable (Conservador)

```typescript
const LEARNING_RATE = 0.15;
const MIN_EPSILON = 0.10; // Exploración mínima 10%
const EPSILON_DECAY = 0.995;
const SAFE_SEQUENCE_LENGTH = 10;

// Posiciones ultra seguras (SOLO estas 10)
const POSICIONES_ULTRA_SEGURAS = [19, 13, 7, 18, 11, 10, 6, 25, 22, 1];

// Posiciones peligrosas (NUNCA usar)
const POSICIONES_PELIGROSAS = [24, 3, 8, 16, 5, 9, 12, 14];

// Objetivo: 2-3 posiciones (configurable)
// Tasa esperada: 75-85%
```

---

## 📝 CONVENCIONES DE CÓDIGO

### Nombres de Variables y Funciones

```typescript
// ✅ CORRECTO: camelCase para funciones y variables
async function selectPositionML(revealedPositions: number[]) { }
const posicionesDisponibles = [];

// ✅ CORRECTO: PascalCase para interfaces y tipos
interface MLState { }
type EstadoPartida = 'activa' | 'terminada';

// ✅ CORRECTO: UPPER_SNAKE_CASE para constantes
const MAX_EPSILON = 0.30;
const POSICIONES_ULTRA_SEGURAS = [19, 13, 7];

// ❌ INCORRECTO: snake_case
const max_epsilon = 0.30; // ❌
function select_position_ml() { } // ❌
```

### Comentarios en Español

```typescript
// ✅ CORRECTO: Comentarios claros en español
// Actualizar análisis adaptativo si pasaron 60 segundos
if (shouldUpdate) {
  await actualizarAnalisisAdaptativo();
}

// ✅ CORRECTO: JSDoc en español
/**
 * Selecciona la mejor posición usando Q-Learning
 * @param revealedPositions - Posiciones ya reveladas
 * @returns Predicción con posición, confianza y estrategia
 */
async function selectPositionML(revealedPositions: number[]) { }

// ❌ INCORRECTO: Mezclar idiomas
// Update ML state con nuevo reward // ❌
```

### Logging y Mensajes

```typescript
// ✅ CORRECTO: Emojis + español descriptivo
logger.ml('Pos 19 | EXPLOIT | Q=0.850');
logger.success('✅ Simulador entrenado exitosamente');
logger.warn('⚠️ Tasa de éxito muy baja');
logger.error('❌ Error en análisis adaptativo', error);

// ✅ CORRECTO: Incluir datos relevantes
console.log(`🔥 Posiciones CALIENTES: ${calientes.join(', ')}`);
console.log(`📊 Tasa éxito: ${tasa.toFixed(1)}% | Objetivo: >75%`);

// ❌ INCORRECTO: Genérico sin contexto
console.log('Error'); // ❌
console.log('Success'); // ❌
```

### Manejo de Errores

```typescript
// ✅ CORRECTO: Try-catch con logging descriptivo
try {
  const analisis = await analizarUltimasPartidas(10);
} catch (error) {
  logger.error('Error al analizar últimas partidas', error);
  // Retornar valor por defecto o re-lanzar
  return valorPorDefecto;
}

// ✅ CORRECTO: Validar datos antes de usar
if (!posicionesDisponibles || posicionesDisponibles.length === 0) {
  throw new Error('No hay posiciones disponibles para seleccionar');
}

// ❌ INCORRECTO: Silenciar errores
try {
  await operacionPeligrosa();
} catch (error) {
  // Vacío - nunca hacer esto ❌
}
```

---

## 🎯 CASOS DE USO Y EJEMPLOS

### Caso 1: Entrenar el Simulador

```typescript
// API: POST /api/chicken/train-simulator
// Analiza 1,005 partidas reales para identificar patrones

const resultado = await entrenarSimulador();
/*
Resultado esperado:
{
  success: true,
  training: {
    partidasReales: 1005,
    posicionesSeguras: 10,  // Pos con 93%+ pollos
    posicionesPeligrosas: 4,  // Pos con 9%+ huesos
    overlapPercentage: 0.19,  // 4.68% overlap
    topSafePositions: [
      { position: 19, chickenRate: 0.965 },
      { position: 13, chickenRate: 0.952 },
      { position: 7, chickenRate: 0.948 },
      { position: 18, chickenRate: 0.937 },
      { position: 11, chickenRate: 0.931 }
    ]
  }
}
*/
```

### Caso 2: Obtener Predicción del Asesor Rentable

```typescript
// API: POST /api/chicken/predict
const request = {
  revealedPositions: [],
  tipoAsesor: 'rentable',
  objetivoRentable: 2
};

const response = await fetch('/api/chicken/predict', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(request)
});

const data = await response.json();
/*
Respuesta esperada:
{
  success: true,
  tipoAsesor: 'rentable',
  objetivoRentable: 2,
  suggestion: {
    position: 19,
    confidence: 0.92,
    strategy: 'EXPLOIT',
    zone: 'ZONE_B',
    qValue: '0.850'
  },
  ml: {
    epsilon: '0.100',
    totalGames: 250,
    explorationRate: '12.3%',
    posicionesSeguras: 10,
    posicionesPeligrosas: 8
  }
}
*/
```

### Caso 3: Actualizar ML Después de Partida

```typescript
// API: POST /api/chicken/result
const update = {
  position: 19,
  wasSuccessful: true,  // true si fue pollo, false si fue hueso
  tipoAsesor: 'rentable'
};

await fetch('/api/chicken/result', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(update)
});

// El sistema automáticamente:
// 1. Actualiza Q-value de la posición 19
// 2. Incrementa contador de victorias
// 3. Degrada epsilon
// 4. Resetea racha de derrotas
// 5. Guarda estado en memoria
```

### Caso 4: Analizar Últimas Partidas

```typescript
// Análisis de patrones recientes
const analisis = await analizarUltimasPartidas(10);

console.log(`📊 Partidas analizadas: ${analisis.totalPartidas}`);
console.log(`✅ Tasa de éxito: ${analisis.tasaExito.toFixed(1)}%`);
console.log(`🔥 Zonas calientes:`);
analisis.zonasCalientes.forEach(z => {
  console.log(`   Pos ${z.posicion}: ${z.frecuencia.toFixed(0)}% uso`);
});

// Detectar rotación de Mystake
const rotacion = await detectarRotacionActiva(10);
if (rotacion.hayRotacion) {
  console.log(`🔄 ${rotacion.descripcion} (${rotacion.confianza.toFixed(0)}% confianza)`);
}
```

---

## 🧪 TESTING Y VALIDACIÓN

### Scripts de Análisis Disponibles

```bash
# Análisis exhaustivo de 100 partidas
npx tsx analisis/analisis-exhaustivo-100-partidas.ts

# Análisis profundo de 300 partidas
npx tsx analisis/analisis-profundo-300-partidas.ts

# Enfrentamiento asesor vs simulador (100 partidas)
npx tsx analisis/enfrentamiento-asesor-vs-simulador.ts 100 5

# Test de posiciones calientes
npx tsx analisis/test-posiciones-calientes.ts

# Verificar sistema completo
npx tsx verificar-sistema.ts

# Analizar frecuencia de posiciones
npx tsx analisis/analyze-chicken-frequency.ts

# Analizar patrones de Mystake
npx tsx analisis/analyze-mystake-patterns.ts
```

### Métricas a Validar

```typescript
// Después de implementar mejoras, ejecutar:
const metricas = {
  tasaExito: 0, // Objetivo: >75% (rentable) o >55% (original)
  rachaMaxDerrotas: 0, // Objetivo: <5
  diversidadPosiciones: 0, // Objetivo: usar >20/25 posiciones
  posicionesCalientes: 0, // Objetivo: 0 posiciones calientes
  stopLossActivaciones: 0, // Monitorear cuántas veces se activa
  exploracionesForzadas: 0, // Monitorear posiciones no exploradas
};

// Validar después de 100 partidas
if (metricas.tasaExito >= 75 && metricas.rachaMaxDerrotas <= 5) {
  console.log('✅ Sistema funcionando correctamente');
} else {
  console.log('⚠️ Ajustar parámetros ML');
}
```

---

## 🚀 COMANDOS RÁPIDOS Y FLUJO DE TRABAJO

### Iniciar Desarrollo

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar servidor de desarrollo
npm run dev

# 3. Abrir en navegador
# http://localhost:3000

# 4. En otra terminal, ejecutar análisis
npx tsx verificar-sistema.ts
```

### Workflow de Mejora

```bash
# 1. Crear rama para feature
git checkout -b mejora/stop-loss-sistema

# 2. Implementar cambios
# ... editar archivos ...

# 3. Verificar que funciona
npm run dev
npx tsx analisis/enfrentamiento-asesor-vs-simulador.ts 100 5

# 4. Commit y push
git add .
git commit -m "feat: implementar sistema de stop-loss"
git push origin mejora/stop-loss-sistema
```

### Deployment

```bash
# Producción (Vercel)
npm run build
vercel --prod

# O con GitHub Actions (configurado en .github/workflows)
git push origin main  # Auto-deploy
```

---

## � ESTRATEGIAS ANTI-DETECCIÓN DE MYSTAKE

### Problema Crítico Identificado

Mystake está **detectando y adaptándose** a nuestros patrones:
- **87.5% overlap**: Mystake coloca huesos en posiciones sugeridas
- **Patrón fijo**: Secuencias predecibles son identificadas
- **Adaptación activa**: Mystake cambia comportamiento tras detectar patrones

### Soluciones Implementadas

#### 1. Aleatoriedad Estratégica
```typescript
// ❌ ANTES: Predecible - siempre la posición #1
const bestPosition = sortedPositions[0];

// ✅ AHORA: Aleatorio entre top 5 más seguras
const topSafe = sortedPositions.slice(0, 5);
const randomIndex = Math.floor(Math.random() * topSafe.length);
const selectedPosition = topSafe[randomIndex];
```

#### 2. Rotación de Estrategias
- **Estrategia A (40%)**: Posiciones más seguras
- **Estrategia B (30%)**: Posiciones menos frecuentes  
- **Estrategia C (30%)**: Posiciones aleatorias ponderadas

#### 3. Evitar Posiciones "Quemadas"
```typescript
// Penalizar posiciones que tuvieron huesos recientemente
const recentBones = getLastNGames(3).flatMap(g => g.bones);
const burnedPositions = new Set(recentBones);

if (burnedPositions.has(position)) {
  score *= 0.3; // 70% menos probable de seleccionar
}
```

#### 4. Detección de Adaptación de Mystake
```typescript
const last5Games = getLastNGames(5);
const lossRate = last5Games.filter(g => g.hitBone).length / 5;

if (lossRate > 0.6) {
  // Mystake está adaptándose activamente
  // Cambiar completamente de estrategia
  useCounterStrategy();
}
```

#### 5. Sistema de Memoria de Patrones
```typescript
// Evitar repetir secuencias de los últimos 10 juegos
const recentPatterns = getRecentPatterns(10);
const avoidSequences = detectBurnedSequences(recentPatterns);

// Filtrar secuencias conocidas por Mystake
candidates = candidates.filter(seq => !avoidSequences.has(seq));
```

### Métricas Anti-Detección

| Métrica | Antes | Objetivo |
|---------|-------|----------|
| **Predictibilidad** | 52% | <30% |
| **Overlap con huesos** | 87.5% | <40% |
| **Variedad 1ra posición** | 2-3 posiciones | 10+ posiciones |
| **Entropía de sugerencias** | Baja | Alta |
| **Rachas de pérdidas** | 4-12 consecutivas | <3 consecutivas |

**Referencia**: [docs/SOLUCION_ANTI_DETECCION.md](docs/SOLUCION_ANTI_DETECCION.md)

---

## 🎯 SISTEMA DE ENSEMBLE INTELIGENTE

### Arquitectura Avanzada

El sistema implementa un **Ensemble de 3 modelos** con votación ponderada:

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

#### Modelo 1: Series Temporales
- Análisis de tendencias temporales
- Detección de patrones cíclicos
- Test de Ljung-Box para validación

#### Modelo 2: Q-Learning Bayesiano
- Aprendizaje por refuerzo con incertidumbre cuantificada
- Distribuciones Beta para intervalos de credibilidad
- Actualización de creencias en tiempo real

#### Modelo 3: Transición Markoviana
- Cadenas de Markov 25x25
- Probabilidades de transición entre estados
- Validación con Chi-cuadrado

### Votación Ponderada Matemática

```typescript
// Predicción combinada
P_ensemble = Σ(w_i * P_i) donde Σw_i = 1

// Pesos adaptativos basados en F1-Score
w_i = F1_i / Σ(F1_j)

// Intervalos de confianza combinados
IC_ensemble = Σ(w_i * IC_i)
```

### API del Ensemble

```bash
POST /api/chicken/predict-ensemble
{
  "posiciones_reveladas": [4, 7, 10],
  "posiciones_huesos": [6],
  "num_predicciones": 5
}
```

**Respuesta**:
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
    "probabilidades": [...]
  }
}
```

**Referencia**: [docs/ENSEMBLE_SYSTEM_GUIDE.md](docs/ENSEMBLE_SYSTEM_GUIDE.md)

---

## 🧪 FEATURE ENGINEERING AVANZADO - FASE 2

### 38 Features Implementadas

El sistema incluye **Feature Engineering de nivel profesional** con 38 características organizadas:

#### 1. Features Básicas (3)
- `position`: Posición en el tablero (1-25)
- `boneCount`: Número de huesos en el juego
- `revealedCount`: Posiciones ya reveladas

#### 2. Features Históricas (4)
- `historicalWinRate`: Tasa de éxito histórica
- `recentWinRate`: Tasa de éxito reciente (últimas 50 partidas)
- `positionFrequency`: Frecuencia de uso de la posición
- `timeSinceLastBone`: Tiempo desde último hueso

#### 3. Features Espaciales (5)
- `distanceToBones`: Distancia mínima a huesos conocidos
- `adjacentBones`: Número de huesos adyacentes
- `clusterDensity`: Densidad de huesos en la zona
- `edgeDistance`: Distancia al borde del tablero
- `cornerProximity`: Proximidad a esquinas

#### 4. Features Temporales (4)
- `hourOfDay`: Hora del día (0-23)
- `dayOfWeek`: Día de la semana (0-6)
- `timeOfDayBin`: Franja horaria ('morning', 'afternoon', 'evening', 'night')
- `isWeekend`: Fin de semana (booleano)

#### 5. Features de Patrones (6)
- `sequencePattern`: Patrón de secuencia detectado
- `markovProbability`: Probabilidad según cadenas de Markov
- `transitionLikelihood`: Probabilidad de transición
- `patternConfidence`: Confianza en el patrón
- `historicalSequence`: Secuencia histórica detectada
- `predictionEntropy`: Entropía de la predicción

#### 6. Features Estadísticas (5)
- `entropy`: Entropía de Shannon de la posición
- `spatialCorrelation`: Correlación espacial con vecinos
- `volatility`: Volatilidad histórica de la posición
- `zScore`: Z-score normalizado
- `outlierScore`: Score de anomalía

#### 7. Features Meta (5)
- `modelConfidence`: Confianza del modelo
- `dataQuality`: Calidad de los datos (0-1)
- `sampleSize`: Tamaño de muestra disponible
- `predictionUncertainty`: Incertidumbre de la predicción
- `ensembleAgreement`: Acuerdo entre modelos del ensemble

#### 8. Features de Interacción (3)
- `positionTimeInteraction`: position × hourOfDay / 24
- `boneCountPositionInteraction`: boneCount × position / 25
- `spatialTemporalInteraction`: distancia × tiempo

#### 9. Features Polinómicas (3)
- `positionSquared`: (position / 25)²
- `winRateSquared`: historicalWinRate²
- `distanceSquared`: distanceToBones²

### Cross-Validation Implementado

```typescript
// K-Fold con métricas estándar
interface ValidationResult {
  accuracy: number;      // Exactitud general
  precision: number;     // Precisión (positivos correctos)
  recall: number;        // Sensibilidad
  f1Score: number;       // Media armónica P-R
  auc: number;           // Área bajo curva ROC
  confusionMatrix: number[][];
  confidenceInterval: [number, number];
}

// Análisis multidimensional
byBoneCount: Record<2|3|4, ValidationResult>
byPosition: Record<1-25, ValidationResult>
byTimeOfDay: Record<string, ValidationResult>
```

### Optimización de Hiperparámetros

```typescript
interface HyperparameterConfig {
  learningRate: number;           // 0.001 - 0.1
  regularization: number;         // 0.0001 - 0.1
  maxIterations: number;          // 100 - 2000
  threshold: number;              // 0.3 - 0.7
  featureSelectionRatio: number;  // 0.5 - 1.0
  temporalWeight: number;         // 0.1 - 2.0
  spatialWeight: number;          // 0.1 - 2.0
  patternWeight: number;          // 0.1 - 2.0
}

// Bayesian Optimization con Expected Improvement
// Grid Search para comparación exhaustiva
// Early Stopping basado en convergencia
```

**Referencia**: [docs/PHASE_2_COMPLETION_REPORT.md](docs/PHASE_2_COMPLETION_REPORT.md)

---

## 📚 DOCUMENTACIÓN RELACIONADA

### Archivos de Documentación Clave

1. **ESTADO_ACTUAL.md** - Estado actual del sistema
2. **INICIO_RAPIDO.md** - Guía de inicio rápido
3. **INSTRUCCIONES_USUARIO.md** - Instrucciones para usuario final
4. **ANALISIS_EXHAUSTIVO_SISTEMA_ML.md** - Análisis técnico completo
5. **PLAN_ACCION_MEJORAS_ML.md** - Plan de mejoras prioritarias
6. **RESUMEN_ASESOR_RENTABLE.md** - Documentación del asesor rentable
7. **CORRECCIONES_APLICADAS.md** - Correcciones ya implementadas

### Documentación Avanzada en `/docs`

8. **PHASE_2_COMPLETION_REPORT.md** - Sistema ML Fase 2 (38 features, cross-validation)
9. **RESUMEN_SISTEMA_COMPLETO_FINAL.md** - Documentación completa del sistema
10. **ENSEMBLE_SYSTEM_GUIDE.md** - Guía del sistema de ensemble inteligente
11. **SOLUCION_ANTI_DETECCION.md** - Estrategias anti-detección de Mystake
12. **SISTEMA_ENTRENAMIENTO_AUTOMATICO.md** - Sistema de entrenamiento automático
13. **INSTRUCCIONES_PRIORITARIAS.md** - Reglas fundamentales y metodología científica
14. **OPTIMIZACION_URGENTE_FASE_2.md** - Optimizaciones críticas aplicadas

### Archivos de Código Principal

```
src/
├── lib/
│   ├── ml/
│   │   ├── reinforcement-learning.ts          # Asesor original (5 pos)
│   │   ├── reinforcement-learning-rentable.ts # Asesor rentable (2-3 pos)
│   │   ├── adaptive-pattern-analyzer.ts       # Análisis adaptativo
│   │   ├── complete-history-analyzer.ts       # Análisis histórico
│   │   ├── feature-engineering.ts             # 38 features avanzadas (Fase 2)
│   │   ├── cross-validation.ts                # K-Fold CV y métricas ML
│   │   ├── hyperparameter-optimization.ts     # Optimización bayesiana
│   │   ├── ab-testing.ts                      # Framework A/B testing
│   │   └── ml-common.ts                       # ⚠️ CREAR: Funciones compartidas
│   ├── db.ts                                  # Prisma client
│   └── logger.ts                              # ⚠️ CREAR: Sistema de logging
├── app/
│   ├── api/
│   │   └── chicken/
│   │       ├── predict/route.ts               # Endpoint de predicción
│   │       ├── predict-ensemble/route.ts      # Predicción con ensemble
│   │       ├── result/route.ts                # Actualizar ML
│   │       ├── simulate/route.ts              # Simulador realista
│   │       ├── train-simulator/route.ts       # Entrenar simulador
│   │       └── train-advisor/route.ts         # Entrenar asesor
│   └── page.tsx                               # Interfaz principal
│
ml/algoritmos/                                  # Modelos de ensemble
├── ensemble-inteligente.ts                    # Sistema principal
├── modelo-series-temporales.ts                # Series temporales
├── q-learning-bayesiano.ts                    # Q-Learning bayesiano
└── modelo-transicion-markoviana.ts            # Cadenas de Markov
```

---

## 🚀 SISTEMA DE ENTRENAMIENTO AUTOMÁTICO

### Flujo de Entrenamiento Completo

#### 1. Entrenar Simulador (Automático)
```bash
POST /api/ml/train-simulator
```

**Proceso**:
1. Analiza TODAS las partidas reales en BD (mínimo 50)
2. Calcula frecuencias REALES de huesos por posición
3. Identifica posiciones seguras (90%+ pollos)
4. Identifica posiciones peligrosas (10%+ huesos)
5. Calcula rotación real (overlap promedio)
6. Analiza comportamiento de retiro
7. Guarda configuración en `ml-simulator-config.json`

**Resultado esperado**:
```json
{
  "success": true,
  "training": {
    "partidasReales": 300,
    "posicionesSeguras": 10,
    "posicionesPeligrosas": 4,
    "averageOverlap": "0.19",
    "overlapPercentage": "4.68%"
  },
  "patterns": {
    "topSeguras": [19, 13, 7, 18, 11],
    "topPeligrosas": [24, 3, 8, 16],
    "mostRevealedPositions": [...],
    "cashOutBehavior": {
      "5pollos": 45,
      "4pollos": 25,
      "3pollos": 20
    }
  }
}
```

#### 2. Entrenar Asesor (MANUAL - Crítico)
```bash
POST /api/ml/train-advisor
{
  "trainingGames": 100,
  "targetPositions": 5,
  "validateAfter": true
}
```

**⚠️ IMPORTANTE**: Solo entrenar cuando:
- Simulador tenga tasa > 55%
- Métricas hayan mejorado
- Patrones sean consistentes

**Proceso**:
1. Verifica que simulador esté entrenado
2. Genera partidas simuladas con patrones REALES
3. Entrena asesor ML con esas partidas
4. Actualiza Q-values y estrategias
5. Valida con 50 partidas adicionales
6. Compara uso de posiciones seguras

**Resultado esperado**:
```json
{
  "success": true,
  "training": {
    "games": 100,
    "victorias": 52,
    "derrotas": 48,
    "tasaExito": 52.00,
    "promedioPosiciones": 3.91
  },
  "validation": {
    "games": 50,
    "victorias": 26,
    "tasaExito": 52.00
  },
  "analysis": {
    "topPosiciones": [...],
    "porcentajeSeguras": 90.0
  },
  "recommendation": "✅ Bueno: El asesor funciona bien"
}
```

#### 3. Validación en Producción
```bash
# Enfrentamiento asesor vs simulador
npx tsx analisis/enfrentamiento-asesor-vs-simulador.ts 100 5
```

**Métricas esperadas**:
- Tasa de éxito: >55%
- Uso de posiciones seguras: >80%
- Balance EXPLORE/EXPLOIT: 30%/70%

**Referencia**: [docs/SISTEMA_ENTRENAMIENTO_AUTOMATICO.md](docs/SISTEMA_ENTRENAMIENTO_AUTOMATICO.md)

---

## 📊 METODOLOGÍA CIENTÍFICA OBLIGATORIA

### Reglas Fundamentales Inquebrantables

#### 1. 🇪🇸 Idioma Exclusivo: Español
**TODOS** los elementos DEBEN estar en español:
- ✅ Comentarios en código
- ✅ Nombres de variables y funciones
- ✅ Documentación técnica
- ✅ Mensajes de error y logs
- ✅ Interfaces de usuario
- ❌ PROHIBIDO: Texto en inglés (excepto términos técnicos: API, HTTP, JSON)

#### 2. 🔬 Validación Científica Obligatoria
**TODOS** los algoritmos DEBEN incluir:
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
  
  // Validación cruzada K-Fold
  validacion_cruzada: {
    k_folds: 10;
    precision_promedio: number;
    desviacion_estandar: number;
    intervalo_confianza_cv: [number, number];
  };
}
```

#### 3. 🎯 Objetivo Inquebrantable
- **Precisión mínima**: 60% en predicción de posiciones seguras
- **Medición continua**: Monitoreo en tiempo real
- **Mejora progresiva**: Con cada 100 partidas nuevas
- **Validación cruzada**: K-Fold obligatorio (k=10)
- ❌ PROHIBIDO: Desplegar sistema con precisión <60%

#### 4. Proceso de Validación para CADA Algoritmo

**Formulación de Hipótesis**:
```
H0 (Nula): Algoritmo NO mejora vs azar
H1 (Alternativa): Algoritmo mejora significativamente
Criterio: p < 0.05 con corrección de Bonferroni
```

**Diseño Experimental**:
- Grupo Control: Predicciones aleatorias
- Grupo Experimental: Algoritmo propuesto
- Tamaño muestra: Mínimo 100 partidas/grupo
- Aleatorización: Asignación aleatoria

**Análisis Estadístico**:
- Chi-cuadrado para independencia
- Kolmogorov-Smirnov para distribuciones
- Mann-Whitney para diferencias
- Intervalos de confianza 95%

**Documentación Científica**:
- Fundamento teórico con base matemática
- Metodología detallada del proceso
- Resultados con intervalos de confianza
- Limitaciones y sesgos identificados
- Instrucciones de reproducibilidad

**Referencia**: [docs/INSTRUCCIONES_PRIORITARIAS.md](docs/INSTRUCCIONES_PRIORITARIAS.md)

---

## 🔍 OPTIMIZACIONES FASE 2 APLICADAS

### Cambios Ultra-Agresivos para Mejorar Tasa de Éxito

#### Problema Detectado (Fase 1)
- Tasa de éxito: 40% (muy baja)
- Racha máxima derrotas: 7 consecutivas
- Sobre-uso de 3 posiciones (20, 9, 6)
- Posiciones con 40% éxito siguen siendo seleccionadas

#### Optimizaciones Implementadas

**1. Penalizaciones Brutales por Uso Excesivo**
```typescript
// ANTES (Fase 1):
if (usageCount > 4) diversityPenalty = -0.30;

// AHORA (Fase 2):
if (usageCount > 4) diversityPenalty = -0.50; // BRUTAL
else if (usageCount > 3) diversityPenalty = -0.35;
else if (usageCount > 2) diversityPenalty = -0.25;
```

**2. Penalización por Baja Tasa de Éxito**
```typescript
// Posiciones con <50% éxito y >2 usos: Q-value reducido a 30%
if (successRate < 0.5 && usageCount > 2) {
  mlState.positionQValues[position] = Math.max(0.1, balancedQValue * 0.3);
}
```

**3. Exploración Mínima Aumentada**
```typescript
// ANTES: MIN_EPSILON = 0.25 (25%)
// AHORA: MIN_EPSILON = 0.35 (35%)
```

**4. Bonus de Novedad Aumentado**
```typescript
// ANTES:
const noveltyBonus = usageCount === 0 ? 0.20 : usageCount === 1 ? 0.10 : 0;

// AHORA:
const noveltyBonus = usageCount === 0 ? 0.30 : usageCount === 1 ? 0.15 : 0;
```

**5. Top Candidatos Ampliado**
```typescript
// ANTES: topN = 8
// AHORA: topN = 12 (máxima variedad)
```

**6. Priorizar Diversidad sobre Éxito**
```typescript
// ANTES: 70% éxito + 30% uso
// AHORA: 60% éxito + 40% uso
```

**7. Reset Adaptativo Más Sensible**
```typescript
// ANTES: Reset si tasa < 45%
// AHORA: Reset si tasa < 48%
```

### Objetivos Fase 2
- ✅ Tasa de éxito >55%
- ✅ Racha máxima derrotas <5
- ✅ Ninguna posición con >4 usos
- ✅ Distribución uniforme de posiciones

**Referencia**: [docs/OPTIMIZACION_URGENTE_FASE_2.md](docs/OPTIMIZACION_URGENTE_FASE_2.md)

---

## 📊 ANÁLISIS Y MÉTRICAS CLAVE

### Resultados de Análisis de 300 Partidas Reales

**Frecuencias Reales por Posición**:
- **Posiciones seguras** (93%+ pollos): 19, 13, 7, 18, 11, 10, 6, 25, 22, 1
- **Posiciones peligrosas** (10%+ huesos): 24, 3, 8, 16
- **Rotación real**: 4.68% overlap (0.19 huesos promedio)
- **Comportamiento retiro**: 45% en 5 pollos, 25% en 4 pollos

**Patrones Detectados**:
1. Secuencias consecutivas con 84-88% correlación
2. Zonas de alta seguridad: Centro y bordes superiores
3. Posiciones "calientes" deben evitarse (2+ usos en 5 partidas)
4. Primera posición más segura: Pos 1, 2, 3 (100% en 50 partidas)

### Enfrentamiento Asesor vs Simulador

**Métricas Actuales** (100 partidas):
- Tasa de éxito: 52%
- Uso de posiciones seguras: 90% (9/10)
- Balance estratégico: 33.5% EXPLORE / 66.5% EXPLOIT
- Promedio posiciones reveladas: 3.91

**Problemas Identificados**:
- Pos 3 con solo 66.7% éxito (es peligrosa en datos reales)
- Necesidad de actualizar patrones con más partidas

**Referencia**: [docs/RESUMEN_SISTEMA_COMPLETO_FINAL.md](docs/RESUMEN_SISTEMA_COMPLETO_FINAL.md)

---

## 📁 Estructura Organizacional Completa

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
│   │   ├── ensemble-inteligente.ts
│   │   ├── modelo-series-temporales.ts
│   │   ├── q-learning-bayesiano.ts
│   │   └── modelo-transicion-markoviana.ts
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
└── 🌐 src/                         # Código fuente principal
    ├── app/                        # Aplicación Next.js
    ├── lib/                        # Librerías compartidas
    └── components/                 # Componentes UI
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Prioridad CRÍTICA 🔴

- [ ] Crear `src/lib/ml/ml-common.ts` con funciones compartidas
- [ ] Actualizar imports en `reinforcement-learning.ts`
- [ ] Actualizar imports en `reinforcement-learning-rentable.ts`
- [ ] Eliminar funciones duplicadas de ambos asesores
- [ ] Implementar sistema de stop-loss (3+ derrotas)
- [ ] Agregar contador de racha de derrotas a MLState
- [ ] Forzar exploración de posiciones no usadas cada 20 partidas
- [ ] Probar con 100 partidas y validar tasas de éxito

### Prioridad ALTA 🟡

- [ ] Implementar sistema de caché en `adaptive-pattern-analyzer.ts`
- [ ] Crear `src/lib/logger.ts` con niveles de log
- [ ] Reemplazar console.log por logger en todos los archivos
- [ ] Implementar rate limiting en `/api/chicken/predict`
- [ ] Eliminar variable `DISCOUNT_FACTOR` no usada en asesor rentable
- [ ] Documentar todas las funciones con JSDoc en español

### Prioridad MEDIA 🟢

- [ ] Refactorizar asesor original en funciones más pequeñas
- [ ] Agregar tests unitarios con Jest
- [ ] Crear tests de integración para endpoints API
- [ ] Implementar sistema de métricas en tiempo real
- [ ] Agregar dashboard de monitoreo de ML

---

## 💡 CONSEJOS PARA GITHUB COPILOT

### Al Generar Código

1. **Siempre en Español**: Comentarios, nombres de variables descriptivos, mensajes de error
2. **Usar Logger**: Reemplazar console.log por logger.ml(), logger.info(), etc.
3. **Validar Entrada**: Usar Zod para validar parámetros de API
4. **Manejo de Errores**: Try-catch con logging descriptivo
5. **TypeScript Estricto**: Definir tipos e interfaces claros
6. **Performance**: Implementar caché cuando sea apropiado

### Al Refactorizar

1. **Extraer Duplicación**: Buscar código similar entre archivos
2. **Simplificar Lógica**: Funciones >50 líneas deben dividirse
3. **Mejorar Nombres**: Variables descriptivas (no x, y, temp)
4. **Reducir Anidación**: Máximo 3 niveles de if/for anidados
5. **Documentar**: JSDoc en funciones públicas

### Al Depurar

1. **Logs Informativos**: Incluir valores de variables clave
2. **Validación Temprana**: Verificar datos antes de procesarlos
3. **Mensajes Claros**: Errores que expliquen qué falló y por qué
4. **Stack Traces**: Mantener información de error original

---

## 🎯 OBJETIVO FINAL - RECORDATORIO

**Meta crítica del sistema**:
> Lograr que el asesor (especialmente el rentable) prediga posiciones seguras con **>75% de tasa de éxito** mediante análisis inteligente de las 1,005 partidas reales, maximizando rentabilidad y minimizando pérdidas por rachas negativas.

### Factores Clave de Éxito

1. ✅ **Datos Reales**: Usar SOLO las 1,005 partidas reales, ignorar simuladas
2. ✅ **Adaptabilidad**: Sistema que detecta cambios en comportamiento de Mystake
3. ✅ **Diversidad**: Evitar patrones repetitivos mediante posiciones calientes
4. ✅ **Stop-Loss**: Proteger capital con pausas automáticas tras rachas negativas
5. ✅ **Exploración Inteligente**: Probar nuevas posiciones periódicamente
6. ✅ **Validación Continua**: Análisis de métricas cada 100 partidas

---

## 📞 CONTACTO Y SOPORTE

Para dudas sobre la implementación:

1. Revisar documentación en `/docs/`
2. Ejecutar scripts de análisis en `/analisis/`
3. Consultar archivos MD de resumen en raíz del proyecto
4. Revisar comentarios en código fuente

**Repositorio**: https://github.com/javiertarazon/juego-pollo.git  
**Última actualización**: 5 de febrero de 2026  
**Versión**: V5 ML Reinforcement Learning

---

## 🎉 CONCLUSIÓN

Este sistema representa un enfoque avanzado de Machine Learning aplicado a predicción de juegos de azar, con énfasis en:

- **Análisis basado en datos reales**
- **Adaptabilidad a cambios del sistema**
- **Protección de capital con stop-loss**
- **Optimización continua mediante Q-Learning**
- **Diversidad para evitar detección de patrones**

Con las mejoras propuestas implementadas, se espera alcanzar tasas de éxito superiores al 75% con el asesor rentable y superiores al 55% con el asesor original.

---

**GitHub Copilot**: Usa estas instrucciones como contexto completo para generar código, refactorizar, depurar y mejorar el sistema Chicken AI Advisor. Recuerda siempre mantener el código en español, validar entradas, manejar errores adecuadamente y priorizar la experiencia del usuario final.
