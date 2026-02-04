# Guía del ML Predictor V5 Standalone

## 🚀 Script Independiente de Machine Learning

Este script usa el sistema ML V5 directamente, sin depender del servidor Next.js.

---

## 📦 Instalación

No requiere instalación adicional. Solo necesitas tener el proyecto configurado.

---

## 🎯 Comandos Disponibles

### 1. Obtener Predicción

```bash
npx tsx ml-predictor-standalone.ts predict
```

**Salida**:
```
🤖 ML PREDICTOR V5 - PREDICCIÓN
================================================================================

✨ PREDICCIÓN:
   Posición: 19
   Estrategia: EXPLOIT
   Zona: ZONE_B
   Confianza: 85%
   Q-Value: 0.850
   Epsilon: 0.182

📊 ESTADÍSTICAS ML:
   Total partidas: 100
   Exploraciones: 18 (18.0%)
   Explotaciones: 82
   Última zona: ZONE_A
   Memoria (últimas 7): [15, 23, 13, 19, 17, 10, 21]

🏆 TOP 5 POSICIONES:
   1. Pos 15: Q=0.850 | Win Rate=85.0%
   2. Pos 19: Q=0.820 | Win Rate=82.0%
   3. Pos 23: Q=0.810 | Win Rate=81.0%
   4. Pos 13: Q=0.780 | Win Rate=78.0%
   5. Pos 17: Q=0.750 | Win Rate=75.0%
```

**Con posiciones ya reveladas**:
```bash
npx tsx ml-predictor-standalone.ts predict 1,2,3
```

---

### 2. Actualizar ML (Después de Jugar)

```bash
# Después de una VICTORIA
npx tsx ml-predictor-standalone.ts update 15 true

# Después de una DERROTA
npx tsx ml-predictor-standalone.ts update 9 false
```

**Salida**:
```
📈 ML PREDICTOR V5 - ACTUALIZACIÓN
================================================================================

🎮 Actualizando con:
   Posición: 15
   Resultado: ✅ VICTORIA
   Recompensa: 1

✅ ML actualizado exitosamente
   Epsilon actual: 0.181
   Total partidas: 101
   Q-value Pos 15: 0.855 | Win Rate: 85.5%
```

---

### 3. Ver Estadísticas Completas

```bash
npx tsx ml-predictor-standalone.ts stats
```

**Salida**:
```
📊 ML PREDICTOR V5 - ESTADÍSTICAS COMPLETAS
================================================================================

🎯 ESTADO GENERAL:
   Total partidas: 100
   Epsilon (exploración): 0.182 (18.2%)
   Exploraciones: 18
   Explotaciones: 82
   Tasa exploración: 18.0%

🗺️ ZONAS:
   Última zona usada: ZONE_A
   Próxima zona: ZONE_B

🔄 MEMORIA DE SECUENCIA (últimas 7 posiciones seguras):
   1. Posición 15
   2. Posición 23
   3. Posición 13
   4. Posición 19
   5. Posición 17
   6. Posición 10
   7. Posición 21

🏆 TOP 10 POSICIONES (por Q-value):
    1. Pos 15: Q=0.850 ████████████████ | Win Rate=85.0%
    2. Pos 19: Q=0.820 ████████████████ | Win Rate=82.0%
    3. Pos 23: Q=0.810 ████████████████ | Win Rate=81.0%
    4. Pos 13: Q=0.780 ███████████████  | Win Rate=78.0%
    5. Pos 17: Q=0.750 ███████████████  | Win Rate=75.0%
    6. Pos 10: Q=0.720 ██████████████   | Win Rate=72.0%
    7. Pos 21: Q=0.700 ██████████████   | Win Rate=70.0%
    8. Pos 14: Q=0.680 █████████████    | Win Rate=68.0%
    9. Pos  4: Q=0.650 █████████████    | Win Rate=65.0%
   10. Pos  7: Q=0.620 ████████████     | Win Rate=62.0%

⚙️ PARÁMETROS DE APRENDIZAJE:
   Learning Rate (α): 0.1
   Discount Factor (γ): 0.9
   Epsilon mínimo: 0.05

📈 ESTADÍSTICAS DE PARTIDAS REALES:
   Total partidas en DB: 672
   Últimas 20 partidas: 12 victorias (60.0%)
```

---

### 4. Probar Variedad (Test)

```bash
# Probar con 10 predicciones
npx tsx ml-predictor-standalone.ts test 10

# Probar con 20 predicciones
npx tsx ml-predictor-standalone.ts test 20
```

**Salida**:
```
🧪 ML PREDICTOR V5 - TEST (10 predicciones)
================================================================================

1. Pos 19 | ZONE_B | EXPLOIT | Q=0.820
2. Pos 15 | ZONE_A | EXPLOIT | Q=0.850
3. Pos 23 | ZONE_B | EXPLOIT | Q=0.810
4. Pos 13 | ZONE_A | EXPLOIT | Q=0.780
5. Pos 17 | ZONE_B | EXPLORE | Q=0.750
6. Pos 10 | ZONE_A | EXPLOIT | Q=0.720
7. Pos 21 | ZONE_B | EXPLOIT | Q=0.700
8. Pos 14 | ZONE_A | EXPLOIT | Q=0.680
9. Pos  4 | ZONE_B | EXPLORE | Q=0.650
10. Pos  7 | ZONE_A | EXPLOIT | Q=0.620

📊 ANÁLISIS DE VARIEDAD:
   Posiciones únicas: 10/10 (100.0%)
   Zona A: 5 (50.0%)
   Zona B: 5 (50.0%)
   Exploraciones: 2 (20.0%)
   Explotaciones: 8 (80.0%)

📈 FRECUENCIA DE POSICIONES:
   Pos 19: 1 veces █
   Pos 15: 1 veces █
   Pos 23: 1 veces █
   Pos 13: 1 veces █
   Pos 17: 1 veces █
   Pos 10: 1 veces █
   Pos 21: 1 veces █
   Pos 14: 1 veces █
   Pos  4: 1 veces █
   Pos  7: 1 veces █

🔄 ALTERNANCIA DE ZONAS:
   ✅ Todas las zonas alternaron correctamente
```

---

### 5. Resetear ML

```bash
npx tsx ml-predictor-standalone.ts reset
```

**Salida**:
```
🔄 ML PREDICTOR V5 - RESET
================================================================================

✅ Estado del ML reseteado
   Epsilon: 0.3 (30%)
   Total partidas: 0
   Q-values: Todos en 0.5 (neutral)
```

---

### 6. Ayuda

```bash
npx tsx ml-predictor-standalone.ts help
```

---

## 🎮 Flujo de Uso Completo

### Ejemplo de Sesión de Juego

```bash
# 1. Ver estadísticas iniciales
npx tsx ml-predictor-standalone.ts stats

# 2. Obtener primera predicción
npx tsx ml-predictor-standalone.ts predict
# Resultado: Posición 19

# 3. Jugar en Mystake con posición 19
# Resultado: ✅ VICTORIA

# 4. Actualizar ML con victoria
npx tsx ml-predictor-standalone.ts update 19 true

# 5. Obtener segunda predicción
npx tsx ml-predictor-standalone.ts predict
# Resultado: Posición 15

# 6. Jugar en Mystake con posición 15
# Resultado: ✅ VICTORIA

# 7. Actualizar ML con victoria
npx tsx ml-predictor-standalone.ts update 15 true

# 8. Continuar el ciclo...

# 9. Después de 10 partidas, ver estadísticas
npx tsx ml-predictor-standalone.ts stats

# 10. Probar variedad
npx tsx ml-predictor-standalone.ts test 20
```

---

## 📊 Interpretación de Resultados

### Q-Value
- **0.8-1.0**: Excelente - Muy alta probabilidad de éxito
- **0.6-0.8**: Buena - Alta probabilidad de éxito
- **0.4-0.6**: Regular - Probabilidad media
- **0.2-0.4**: Baja - Baja probabilidad de éxito
- **0.0-0.2**: Muy baja - Evitar

### Epsilon (Exploración)
- **30%**: Inicial - Explora mucho
- **20%**: Intermedio - Balancea exploración/explotación
- **10%**: Avanzado - Explota conocimiento
- **5%**: Mínimo - Casi siempre explota

### Estrategia
- **EXPLOIT**: Usa la mejor posición conocida (Q-value más alto)
- **EXPLORE**: Prueba posición aleatoria para aprender

### Zona
- **ZONE_A**: Mitad superior del tablero (posiciones 1-15)
- **ZONE_B**: Mitad inferior del tablero (posiciones 16-25)
- **Alternancia**: Cambia entre A y B para confundir a Mystake

---

## 🔧 Solución de Problemas

### Error: "Cannot find module"
```bash
# Asegúrate de estar en la raíz del proyecto
cd /ruta/al/proyecto

# Verifica que el archivo existe
ls ml-predictor-standalone.ts
```

### Error: "Database connection failed"
```bash
# Verifica que la base de datos existe
ls db/custom.db

# Regenera Prisma client
npx prisma generate
```

### Predicciones repetitivas
```bash
# Verifica la memoria de secuencia
npx tsx ml-predictor-standalone.ts stats

# Si la memoria está vacía, juega más partidas
# Si epsilon es muy bajo, resetea el ML
npx tsx ml-predictor-standalone.ts reset
```

---

## 📈 Métricas de Éxito

### Después de 50 Partidas

| Métrica | Objetivo | Cómo Verificar |
|---------|----------|----------------|
| Win Rate | >60% | Ver stats → "Últimas 20 partidas" |
| Posiciones únicas | >15 | Ejecutar `test 20` |
| Alternancia zonas | 100% | Ejecutar `test 20` |
| Epsilon | <0.15 | Ver stats → "Epsilon" |
| Q-values top 5 | >0.75 | Ver stats → "TOP 10 POSICIONES" |

---

## 🎯 Ventajas del Script Standalone

1. ✅ **No depende de Next.js** - Sin problemas de cache
2. ✅ **Ejecución directa** - Resultados inmediatos
3. ✅ **Fácil de usar** - Comandos simples
4. ✅ **Estadísticas detalladas** - Información completa
5. ✅ **Pruebas rápidas** - Comando `test` para verificar variedad
6. ✅ **Colores en terminal** - Fácil de leer

---

## 🚀 Próximos Pasos

1. **Jugar 10 partidas** usando el script
2. **Verificar variedad** con `test 20`
3. **Analizar estadísticas** con `stats`
4. **Ajustar si es necesario** (resetear si no funciona bien)

---

**Versión**: V5 - Machine Learning Standalone
**Fecha**: 2026-02-03
**Estado**: ✅ Listo para usar
