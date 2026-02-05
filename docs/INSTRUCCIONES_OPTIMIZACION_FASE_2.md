# 🚀 INSTRUCCIONES - OPTIMIZACIÓN FASE 2 APLICADA

## ✅ OPTIMIZACIONES APLICADAS

### 1. Penalizaciones Ultra Agresivas
- **> 4 usos**: -0.50 (antes -0.30) - Penalización BRUTAL
- **> 3 usos**: -0.35 (antes -0.20) - Penalización MUY fuerte
- **> 2 usos**: -0.25 (antes -0.15) - Penalización fuerte
- **> 1 uso**: -0.15 (antes -0.10) - Penalización media

### 2. Penalización por Baja Tasa de Éxito
- **< 50% éxito y > 2 usos**: Q-value reducido a 30% (antes 50%)
- **< 40% éxito y > 3 usos**: Q-value reducido a 20% (nuevo)

### 3. Exploración Aumentada
- **MIN_EPSILON**: 35% (antes 25%) - Más exploración constante
- **Reset adaptativo**: Se activa con tasa < 48% (antes < 45%)
- **Epsilon post-reset**: 40% (antes 35%)

### 4. Bonus de Novedad Aumentado
- **0 usos**: +0.30 (antes +0.20) - Bonus ENORME
- **1 uso**: +0.15 (antes +0.10) - Bonus grande

### 5. Máxima Variedad
- **Top candidatos**: 12 posiciones (antes 8)
- **Peso diversidad**: 40% (antes 30%)
- **Peso éxito**: 60% (antes 70%)

## 📋 PASOS A SEGUIR

### 1. Reiniciar Servidor
```bash
# Detener servidor actual (Ctrl+C)
# Iniciar servidor nuevamente
npm run dev
```

### 2. Jugar 30 Partidas Nuevas
- Juega 30 partidas completas
- Sigue las sugerencias del sistema
- Anota cualquier comportamiento extraño

### 3. Ejecutar Análisis
```bash
# Análisis de últimas 30 partidas
npx tsx analisis/analizar-ultimas-30-partidas.ts

# Comparación entre fases (si hay 60+ partidas)
npx tsx analisis/comparar-fases-optimizacion.ts
```

### 4. Verificar Resultados
Busca estos indicadores:

✅ **ÉXITO** (Continuar con sistema actual):
- Tasa de éxito > 55%
- Racha máxima derrotas < 5
- Ninguna posición con > 4 usos
- Distribución uniforme de posiciones

⚠️ **MEJORÍA PARCIAL** (Ajustar parámetros):
- Tasa de éxito 48-55%
- Racha máxima derrotas 5-7
- Pocas posiciones con > 4 usos

❌ **FALLO** (Cambio de estrategia necesario):
- Tasa de éxito < 48%
- Racha máxima derrotas > 7
- Muchas posiciones con > 4 usos

## 🎯 OBJETIVOS FASE 2

| Métrica | Objetivo | Actual (Pre-Fase 2) |
|---------|----------|---------------------|
| Tasa de éxito | > 55% | 40.0% ❌ |
| Racha máx derrotas | < 5 | 7 ❌ |
| Posiciones > 4 usos | 0 | 3 ❌ |
| Diversidad | Alta | Media ⚠️ |

## 🔄 PRÓXIMOS PASOS SEGÚN RESULTADOS

### Si Tasa > 55% ✅
1. Mantener configuración actual
2. Monitorear por 100 partidas más
3. Documentar patrones exitosos

### Si Tasa 48-55% ⚠️
1. Aumentar MIN_EPSILON a 40%
2. Aumentar penalización > 4 usos a -0.60
3. Reducir posiciones "seguras" a 0 (eliminar completamente)

### Si Tasa < 48% ❌
1. Considerar FASE 3: Cambio de estrategia completo
2. Opciones:
   - Implementar sistema de zonas rotativas
   - Usar solo exploración aleatoria (epsilon = 1.0)
   - Implementar anti-patrón basado en historial de Mystake

## 📊 SCRIPTS DISPONIBLES

```bash
# Análisis básico de últimas 30 partidas
npx tsx analisis/analizar-ultimas-30-partidas.ts

# Comparación entre fases de optimización
npx tsx analisis/comparar-fases-optimizacion.ts

# Análisis de decisiones de retiro
npx tsx analisis/analizar-decisiones-retiro.ts

# Verificar estado de la base de datos
npx tsx utilidades/scripts/count-games.ts
```

## 🔧 PARÁMETROS ACTUALES

```typescript
// Aprendizaje
LEARNING_RATE = 0.15
DISCOUNT_FACTOR = 0.85
MIN_EPSILON = 0.35 (35%)
EPSILON_DECAY = 0.998

// Memoria y diversidad
SAFE_SEQUENCE_LENGTH = 15
TOP_CANDIDATES = 12
SAFE_POSITIONS = 2 (pos 7 y 23)

// Penalizaciones
> 4 usos: -0.50
> 3 usos: -0.35
> 2 usos: -0.25
> 1 uso: -0.15

// Bonus
0 usos: +0.30
1 uso: +0.15
```

## 📝 NOTAS IMPORTANTES

1. **No modificar código durante las 30 partidas de prueba**
2. **Anotar cualquier patrón sospechoso de Mystake**
3. **Si el sistema sugiere la misma posición 3+ veces seguidas, reportar**
4. **Verificar que las rachas se actualicen correctamente en pantalla**

## 🆘 SOPORTE

Si encuentras problemas:
1. Verificar que el servidor esté corriendo
2. Revisar consola del navegador (F12)
3. Verificar logs del servidor
4. Ejecutar `npx tsx utilidades/scripts/check-db.ts`

---

**Fecha de aplicación**: 2026-02-04
**Versión**: Fase 2 - Ultra Agresiva
**Estado**: ✅ Aplicada y lista para pruebas
