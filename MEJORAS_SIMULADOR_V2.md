# Mejoras del Simulador V2

## Problema Identificado

Los resultados anteriores eran mediocres:
- **Win rate**: 31% para objetivo de 4 posiciones
- **Promedio revelado**: 2.82 posiciones (muy bajo)
- **Problema**: El simulador era demasiado conservador y no aprovechaba los patrones aprendidos

## Cambios Implementados

### 1. Nueva Estrategia de Selección de Posiciones

**Antes:**
- Usaba una cola fija basada en `mostRevealedPositions`
- No optimizaba para alcanzar el objetivo

**Ahora:**
- Ordena TODAS las posiciones por seguridad (menor frecuencia de huesos)
- Selecciona las TOP 15 posiciones más seguras
- Las mezcla aleatoriamente para evitar patrones predecibles
- Enfoque: **maximizar probabilidad de alcanzar el objetivo**

### 2. Ajuste de Pesos de Frecuencia

**Antes:**
```typescript
// Varianza muy alta
1: 0.0836  // Posición más peligrosa
23: 0.0200 // Posición más segura
// Diferencia: 4.18x
```

**Ahora:**
```typescript
// Varianza moderada (más realista)
1: 0.0650  // Posición más peligrosa
23: 0.0300 // Posición más segura
// Diferencia: 2.17x
```

**Razón**: La varianza extrema hacía que el simulador evitara demasiado ciertas posiciones, reduciendo las opciones disponibles.

### 3. Rotación Menos Agresiva

**Antes:**
```typescript
weight *= 0.05; // 95% menos probable repetir
```

**Ahora:**
```typescript
weight *= 0.3; // 70% menos probable repetir
```

**Razón**: La rotación extrema limitaba demasiado las opciones, especialmente en juegos consecutivos.

### 4. Ajuste de Impacto de Zonas

**Antes:**
```typescript
weight *= (rowWeight + colWeight) / 2;
// Multiplicaba directamente
```

**Ahora:**
```typescript
weight *= (1 + (rowWeight + colWeight - 0.3) * 0.5);
// Suma con factor de amortiguación
```

**Razón**: El impacto de zonas era demasiado fuerte, creando "zonas muertas" que el simulador nunca exploraba.

## Resultados Esperados

Con estos cambios, esperamos:

### Objetivo 4 Posiciones
- **Win rate esperado**: 50-60% (antes: 31%)
- **Promedio revelado**: 3.5-4.0 (antes: 2.82)
- **Evaluación**: Alcanzable ✅

### Objetivo 5 Posiciones
- **Win rate esperado**: 35-45% (antes: ~20%)
- **Promedio revelado**: 4.0-4.5
- **Evaluación**: Desafiante ⚠️

### Objetivo 6 Posiciones
- **Win rate esperado**: 25-35% (antes: ~10%)
- **Promedio revelado**: 4.5-5.0
- **Evaluación**: Difícil ❌

## Cómo Probar

1. Abre la aplicación en http://localhost:3000
2. Ve a la sección "Simulador Realista"
3. Configura:
   - Cantidad de juegos: 100
   - Huesos: 4
   - Objetivo: 4 posiciones
4. Haz clic en "Iniciar Simulación"
5. Verifica que:
   - Win rate >= 50%
   - Promedio revelado >= 3.5
   - Mensaje: "Objetivo alcanzable"

## Próximos Pasos

Si los resultados siguen siendo bajos:

1. **Aumentar pool de posiciones seguras**: De 15 a 18-20
2. **Ajustar umbral de seguridad**: Usar percentil 60 en lugar de top 15 fijas
3. **Implementar aprendizaje adaptativo**: Ajustar pesos basándose en resultados reales
4. **Considerar patrones temporales**: Analizar si hay patrones por hora/día

## Notas Técnicas

- Los cambios son **retrocompatibles**
- No afectan la API existente
- Los juegos simulados se marcan con `isSimulated: true`
- Las estadísticas se calculan en tiempo real
- No se requiere regenerar la base de datos

## Validación

Para validar que las mejoras funcionan:

```bash
# Ejecutar test automatizado
npx tsx test-improved-simulator.ts

# O probar manualmente en la interfaz
# http://localhost:3000
```

## Conclusión

Estas mejoras hacen que el simulador sea más **agresivo** y **optimista**, pero aún basado en patrones reales. El objetivo es encontrar el balance entre realismo y utilidad práctica para los usuarios.
