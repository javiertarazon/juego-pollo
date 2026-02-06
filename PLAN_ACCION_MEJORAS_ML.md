# 🎯 PLAN DE ACCIÓN - MEJORAS DEL SISTEMA ML

**Fecha**: 5 de febrero de 2026  
**Basado en**: ANALISIS_EXHAUSTIVO_SISTEMA_ML.md  
**Estado**: Listo para ejecutar

---

## 📋 RESUMEN EJECUTIVO

Este plan de acción contiene las mejoras identificadas en el análisis exhaustivo del sistema ML, organizadas por prioridad y con instrucciones específicas de implementación.

---

## 🔴 PRIORIDAD ALTA - Implementar Inmediatamente

### Tarea 1: Eliminar Variable No Usada

**Archivo**: `src/lib/ml/reinforcement-learning-rentable.ts`  
**Línea**: 28  
**Tiempo estimado**: 5 minutos

**Problema**:
```typescript
const DISCOUNT_FACTOR = 0.90; // ⚠️ NO USADO
```

**Solución Opción 1 - Eliminar** (Recomendado):
```typescript
// Simplemente eliminar la línea 28
```

**Solución Opción 2 - Usar en Q-learning**:
```typescript
// En la función updateMLFromGameRentable, línea ~180
// ANTES:
const newQ = currentQ + LEARNING_RATE * (reward - currentQ);

// DESPUÉS:
const maxNextQ = Math.max(...Object.values(mlStateRentable.positionQValues), 0.5);
const newQ = currentQ + LEARNING_RATE * (reward + DISCOUNT_FACTOR * maxNextQ - currentQ);
```

**Recomendación**: Opción 1 (eliminar), ya que el asesor rentable no necesita Q-learning complejo.



### Tarea 2: Reducir Epsilon Mínimo en Asesor Original

**Archivo**: `src/lib/ml/reinforcement-learning.ts`  
**Línea**: 44  
**Tiempo estimado**: 5 minutos

**Problema**:
```typescript
const MIN_EPSILON = 0.35; // 35% exploración es demasiado alto
```

**Solución**:
```typescript
const MIN_EPSILON = 0.15; // 15% es más razonable
```

**Impacto esperado**:
- Menos decisiones aleatorias
- Mayor uso de Q-learning
- Tasa de éxito +5-10%

**Justificación**:
- 35% significa que 1 de cada 3 decisiones es aleatoria
- 15% es el estándar en RL para fase de explotación
- Permite mejor uso del conocimiento aprendido



### Tarea 3: Integrar Análisis Adaptativo en Asesor Rentable

**Archivo**: `src/lib/ml/reinforcement-learning-rentable.ts`  
**Tiempo estimado**: 30 minutos

**Problema**: El asesor rentable no se adapta a cambios en Mystake

**Solución**:

**Paso 1**: Importar funciones adaptativas (línea 2)
```typescript
import {
  analizarUltimasPartidas,
  calcularScoreSeguridad,
  detectarRotacionActiva,
} from './adaptive-pattern-analyzer';
```

**Paso 2**: Agregar estado adaptativo (línea 20)
```typescript
interface MLStateRentable {
  // ... campos existentes
  lastAdaptiveAnalysis: Date | null;
  adaptiveScores: Record<number, number>;
}
```

**Paso 3**: Inicializar scores adaptativos (línea 40)
```typescript
mlStateRentable = {
  // ... campos existentes
  lastAdaptiveAnalysis: null,
  adaptiveScores: {},
};
```

**Paso 4**: Crear función de actualización (nueva función)
```typescript
async function actualizarAnalisisAdaptativoRentable(): Promise<void> {
  const ahora = new Date();
  const ultimoAnalisis = mlStateRentable.lastAdaptiveAnalysis;
  const INTERVALO = 60000; // 60 segundos

  if (!ultimoAnalisis || (ahora.getTime() - ultimoAnalisis.getTime()) > INTERVALO) {
    console.log('🔄 Actualizando análisis adaptativo rentable...');
    
    const analisis = await analizarUltimasPartidas(10);
    
    // Actualizar posiciones seguras dinámicamente
    for (const pos of POSICIONES_ULTRA_SEGURAS) {
      const scoreData = await calcularScoreSeguridad(pos, 10);
      mlStateRentable.adaptiveScores[pos] = scoreData.score / 100;
    }

    mlStateRentable.lastAdaptiveAnalysis = ahora;
  }
}
```

**Paso 5**: Usar en selección (en selectPositionMLRentable)
```typescript
// Antes de calcular scores
await actualizarAnalisisAdaptativoRentable();

// Al calcular score
const adaptiveScore = mlStateRentable.adaptiveScores[pos] || 0.75;
const combinedScore = (score * 0.7) + (adaptiveScore * 0.3);
```



---

## 🟡 PRIORIDAD MEDIA - Implementar Esta Semana

### Tarea 4: Crear Módulo Compartido

**Archivo nuevo**: `src/lib/ml/ml-common.ts`  
**Tiempo estimado**: 1 hora

**Objetivo**: Eliminar código duplicado entre asesores

**Contenido del archivo**:

```typescript
import { db } from '@/lib/db';

/**
 * Obtener posiciones calientes (usadas 2+ veces en últimas N partidas)
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
      console.log(`🔥 Posiciones CALIENTES detectadas: ${calientes.join(', ')}`);
    }

    return calientes;
  } catch (error) {
    console.error('Error obteniendo posiciones calientes:', error);
    return [];
  }
}

/**
 * Inicializar Q-values para posiciones
 */
export function initializeQValues(
  positions: number[],
  initialValue: number = 0.5
): Record<number, number> {
  const qValues: Record<number, number> = {};
  positions.forEach(pos => {
    qValues[pos] = initialValue;
  });
  return qValues;
}

/**
 * Calcular tasa de éxito de una posición
 */
export function calculateSuccessRate(stats: { wins: number; total: number }): number {
  if (stats.total === 0) return 0.5;
  return stats.wins / stats.total;
}

/**
 * Degradar epsilon
 */
export function degradeEpsilon(
  currentEpsilon: number,
  minEpsilon: number,
  decayRate: number
): number {
  return Math.max(minEpsilon, currentEpsilon * decayRate);
}
```

**Paso 2**: Actualizar imports en ambos asesores

En `reinforcement-learning.ts` y `reinforcement-learning-rentable.ts`:
```typescript
import { getHotPositions, initializeQValues, calculateSuccessRate, degradeEpsilon } from './ml-common';
```

**Paso 3**: Eliminar funciones duplicadas de ambos archivos



### Tarea 5: Agregar Validación en API

**Archivo**: `src/app/api/chicken/predict/route.ts`  
**Tiempo estimado**: 20 minutos

**Paso 1**: Instalar Zod (si no está instalado)
```bash
npm install zod
```

**Paso 2**: Agregar validación (línea 5)
```typescript
import { z } from 'zod';

const requestSchema = z.object({
  revealedPositions: z
    .array(z.number().int().min(1).max(25))
    .max(24)
    .default([]),
  tipoAsesor: z
    .enum(['original', 'rentable'])
    .default('original'),
  objetivoRentable: z
    .enum([2, 3])
    .default(2),
});
```

**Paso 3**: Validar en POST handler (línea 15)
```typescript
export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    
    // Validar entrada
    const validated = requestSchema.parse(requestBody);
    const { revealedPositions, tipoAsesor, objetivoRentable } = validated;

    // ... resto del código
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validación fallida', 
          details: err.errors 
        },
        { status: 400 }
      );
    }
    // ... resto del manejo de errores
  }
}
```



### Tarea 6: Implementar Caché en Análisis Adaptativo

**Archivo**: `src/lib/ml/adaptive-pattern-analyzer.ts`  
**Tiempo estimado**: 15 minutos

**Paso 1**: Agregar variables de caché (línea 80)
```typescript
// Caché para análisis adaptativo
let cacheAnalisis: AnalisisAdaptativo | null = null;
let cacheTimestamp: Date | null = null;
const CACHE_DURATION = 60000; // 60 segundos
```

**Paso 2**: Modificar función analizarUltimasPartidas (línea 100)
```typescript
export async function analizarUltimasPartidas(limite: number = 10): Promise<AnalisisAdaptativo> {
  const ahora = new Date();
  
  // Verificar caché
  if (cacheAnalisis && cacheTimestamp) {
    const diff = ahora.getTime() - cacheTimestamp.getTime();
    if (diff < CACHE_DURATION) {
      console.log('📦 Usando caché de análisis adaptativo');
      return cacheAnalisis;
    }
  }
  
  console.log('🔄 Calculando nuevo análisis adaptativo...');
  
  // Obtener últimas partidas reales
  const partidas = await prisma.chickenGame.findMany({
    // ... código existente
  });

  // ... resto del análisis

  // Actualizar caché
  const analisis: AnalisisAdaptativo = {
    // ... resultado del análisis
  };
  
  cacheAnalisis = analisis;
  cacheTimestamp = ahora;
  
  return analisis;
}
```

**Paso 3**: Agregar función para invalidar caché
```typescript
/**
 * Invalidar caché (llamar después de guardar nueva partida)
 */
export function invalidarCacheAnalisis(): void {
  cacheAnalisis = null;
  cacheTimestamp = null;
  console.log('🗑️ Caché de análisis invalidado');
}
```



---

## 🟢 PRIORIDAD BAJA - Mejoras Futuras

### Tarea 7: Implementar Estrategia Híbrida

**Archivo nuevo**: `src/lib/ml/hybrid-strategy.ts`  
**Tiempo estimado**: 2 horas

**Concepto**: Combinar ambos asesores según contexto

```typescript
export async function selectHybridPosition(
  revealedPositions: number[],
  mlStats: { totalGames: number; recentWinRate: number }
): Promise<{ position: number; strategy: string }> {
  const { totalGames, recentWinRate } = mlStats;
  
  // Fase 1: Primeras 20 partidas → Rentable (conservador)
  if (totalGames < 20) {
    return await selectPositionMLRentable(revealedPositions, 2);
  }
  
  // Fase 2: Tasa de éxito baja → Rentable (recuperación)
  if (recentWinRate < 0.60) {
    return await selectPositionMLRentable(revealedPositions, 2);
  }
  
  // Fase 3: Tasa de éxito media → Rentable agresivo
  if (recentWinRate >= 0.60 && recentWinRate < 0.75) {
    return await selectPositionMLRentable(revealedPositions, 3);
  }
  
  // Fase 4: Tasa de éxito alta → Original (agresivo)
  return await selectPositionML(revealedPositions);
}
```

### Tarea 8: Agregar Tests Unitarios

**Archivo nuevo**: `src/lib/ml/__tests__/ml-common.test.ts`  
**Tiempo estimado**: 3 horas

**Framework**: Jest o Vitest

```typescript
import { describe, it, expect } from 'vitest';
import { calculateSuccessRate, degradeEpsilon } from '../ml-common';

describe('ml-common', () => {
  describe('calculateSuccessRate', () => {
    it('debe calcular tasa de éxito correctamente', () => {
      expect(calculateSuccessRate({ wins: 8, total: 10 })).toBe(0.8);
      expect(calculateSuccessRate({ wins: 0, total: 10 })).toBe(0);
      expect(calculateSuccessRate({ wins: 10, total: 10 })).toBe(1);
    });

    it('debe retornar 0.5 si total es 0', () => {
      expect(calculateSuccessRate({ wins: 0, total: 0 })).toBe(0.5);
    });
  });

  describe('degradeEpsilon', () => {
    it('debe degradar epsilon correctamente', () => {
      expect(degradeEpsilon(0.30, 0.10, 0.995)).toBeCloseTo(0.2985);
    });

    it('no debe bajar del mínimo', () => {
      expect(degradeEpsilon(0.10, 0.10, 0.995)).toBe(0.10);
    });
  });
});
```



### Tarea 9: Implementar Rate Limiting

**Archivo**: `src/middleware.ts` (nuevo)  
**Tiempo estimado**: 1 hora

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Almacenar requests por IP
const requestCounts = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT = 60; // 60 requests
const WINDOW_MS = 60000; // por minuto

export function middleware(request: NextRequest) {
  // Solo aplicar a API de predicción
  if (!request.nextUrl.pathname.startsWith('/api/chicken/predict')) {
    return NextResponse.next();
  }

  const ip = request.ip || 'unknown';
  const now = Date.now();
  
  const record = requestCounts.get(ip);
  
  if (!record || now > record.resetTime) {
    // Nuevo período
    requestCounts.set(ip, {
      count: 1,
      resetTime: now + WINDOW_MS,
    });
    return NextResponse.next();
  }
  
  if (record.count >= RATE_LIMIT) {
    // Límite excedido
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }
  
  // Incrementar contador
  record.count++;
  return NextResponse.next();
}

export const config = {
  matcher: '/api/chicken/predict/:path*',
};
```

### Tarea 10: Dashboard de Métricas

**Archivo nuevo**: `src/app/dashboard/page.tsx`  
**Tiempo estimado**: 4 horas

**Componentes**:
- Gráfica de tasa de éxito en tiempo real
- Tabla de top posiciones por Q-value
- Historial de epsilon
- Zonas calientes visualizadas en tablero
- Métricas de ambos asesores

**Tecnologías sugeridas**:
- Recharts para gráficas
- TailwindCSS para estilos
- SWR para fetching de datos



---

## 📊 RESUMEN DE TAREAS

### Por Prioridad

| Prioridad | Tareas | Tiempo Total | Impacto |
|-----------|--------|--------------|---------|
| 🔴 Alta | 3 tareas | 40 minutos | Alto |
| 🟡 Media | 3 tareas | 2.5 horas | Medio |
| 🟢 Baja | 4 tareas | 10+ horas | Bajo-Medio |

### Por Impacto

| Tarea | Impacto | Esfuerzo | Prioridad |
|-------|---------|----------|-----------|
| Eliminar variable no usada | Bajo | Muy bajo | Alta |
| Reducir epsilon | Alto | Muy bajo | Alta |
| Integrar análisis adaptativo | Alto | Medio | Alta |
| Crear módulo compartido | Medio | Medio | Media |
| Agregar validación | Medio | Bajo | Media |
| Implementar caché | Medio | Bajo | Media |
| Estrategia híbrida | Alto | Alto | Baja |
| Tests unitarios | Medio | Alto | Baja |
| Rate limiting | Bajo | Medio | Baja |
| Dashboard | Medio | Muy alto | Baja |

---

## 🎯 ORDEN DE EJECUCIÓN RECOMENDADO

### Día 1 (1 hora)
1. ✅ Eliminar variable no usada (5 min)
2. ✅ Reducir epsilon mínimo (5 min)
3. ✅ Integrar análisis adaptativo (30 min)
4. ✅ Implementar caché (15 min)

### Día 2 (2 horas)
5. ✅ Crear módulo compartido (1 hora)
6. ✅ Agregar validación API (20 min)
7. ✅ Probar todas las mejoras (40 min)

### Semana 2 (Opcional)
8. ✅ Implementar estrategia híbrida (2 horas)
9. ✅ Agregar tests unitarios (3 horas)
10. ✅ Implementar rate limiting (1 hora)

### Mes 2 (Opcional)
11. ✅ Crear dashboard de métricas (4+ horas)

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Prioridad Alta
- [ ] Eliminar `DISCOUNT_FACTOR` no usado
- [ ] Reducir `MIN_EPSILON` a 0.15
- [ ] Integrar análisis adaptativo en asesor rentable
  - [ ] Importar funciones
  - [ ] Agregar estado adaptativo
  - [ ] Crear función de actualización
  - [ ] Usar en selección

### Prioridad Media
- [ ] Crear `ml-common.ts`
  - [ ] Implementar funciones compartidas
  - [ ] Actualizar imports en asesores
  - [ ] Eliminar código duplicado
- [ ] Agregar validación con Zod
  - [ ] Instalar Zod
  - [ ] Crear schema
  - [ ] Validar en endpoint
- [ ] Implementar caché
  - [ ] Agregar variables de caché
  - [ ] Modificar función de análisis
  - [ ] Crear función de invalidación

### Prioridad Baja
- [ ] Implementar estrategia híbrida
- [ ] Agregar tests unitarios
- [ ] Implementar rate limiting
- [ ] Crear dashboard de métricas

---

## 📝 NOTAS FINALES

### Antes de Empezar
1. ✅ Hacer backup del código actual
2. ✅ Crear rama nueva: `git checkout -b mejoras-ml`
3. ✅ Leer análisis completo

### Durante la Implementación
1. ✅ Hacer commits frecuentes
2. ✅ Probar cada cambio individualmente
3. ✅ Actualizar documentación

### Después de Implementar
1. ✅ Ejecutar tests
2. ✅ Verificar métricas
3. ✅ Actualizar CHANGELOG
4. ✅ Merge a main

---

**Fecha de creación**: 5 de febrero de 2026  
**Última actualización**: 5 de febrero de 2026  
**Estado**: Listo para ejecutar  
**Próximo paso**: Comenzar con Prioridad Alta

