# Sistema ML V5 - Machine Learning con Reinforcement Learning

## Estado Actual

El sistema ML V5 está completamente implementado y funcional a través del **script standalone**.

### Archivos Principales

1. **`ml-predictor-standalone.ts`** - Script independiente que funciona perfectamente
2. **`src/lib/ml/reinforcement-learning.ts`** - Core del sistema ML V5
3. **`src/app/api/chicken/result/route.ts`** - Auto-actualización del ML después de cada partida
4. **`src/app/api/chicken/predict/route.ts`** - Endpoint de predicción (tiene problemas con Turbopack)

## Cómo Usar el ML V5

### Opción 1: Script Standalone (RECOMENDADO)

```bash
# Obtener predicción
npx tsx ml-predictor-standalone.ts predict

# Actualizar ML después de una partida
npx tsx ml-predictor-standalone.ts update 15 true

# Ver estadísticas
npx tsx ml-predictor-standalone.ts stats

# Probar con 10 predicciones
npx tsx ml-predictor-standalone.ts test 10
```

### Opción 2: API Endpoints (Requiere fix de Turbopack)

```bash
# Obtener predicción
curl -X POST http://localhost:3000/api/chicken/predict \
  -H "Content-Type: application/json" \
  -d '{"revealedPositions": []}'

# Ver estadísticas
curl http://localhost:3000/api/chicken/predict
```

## Características del ML V5

1. **Epsilon-greedy con degradación** (30% → 5%)
2. **Zonas frías opuestas** alternadas (A/B)
3. **Memoria de secuencia**: No repetir posición hasta 7 posiciones seguras después
4. **Q-Learning**: Aprende de victorias y derrotas
5. **Variedad mejorada**: Selección entre top 3 posiciones

## Problema Conocido

Turbopack (Next.js 16.1.6) tiene problemas con caracteres Unicode y caché agresiva.
El archivo `src/app/api/chicken/predict/route.ts` se corrompe al compilar.

**Solución temporal**: Usar el script standalone que funciona perfectamente.

## Documentación Completa

- `PREDICTOR_V5_MACHINE_LEARNING.md` - Especificación técnica
- `IMPLEMENTACION_COMPLETA_RESUMEN.md` - Resumen de implementación
- `ML_PREDICTOR_STANDALONE_GUIDE.md` - Guía del script standalone
- `INICIO_RAPIDO_ML_V5.md` - Inicio rápido
- `RESUMEN_FINAL_ML_V5.md` - Resumen final

## Instalación

```bash
npm install
npx prisma generate
npm run dev
```

## Base de Datos

SQLite en `db/custom.db` con esquema Prisma en `prisma/schema.prisma`.
