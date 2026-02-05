# 🎮 CÓMO USAR EL SIMULADOR EN LA INTERFAZ

## 📋 UBICACIÓN

**Pestaña**: "Simulador" en http://localhost:3000

---

## ✅ SIMULADOR REALISTA ACTIVO

El simulador en la interfaz **YA ESTÁ USANDO** los patrones reales de 300 partidas documentados en:
- `docs/SIMULADOR_MEJORADO.md`
- `docs/SIMULADOR_REALISTA_Y_ENFRENTAMIENTO.md`

### Patrones Implementados:

✅ **Frecuencias REALES de huesos por posición**
- Basado en análisis de 300 partidas reales
- Pos 24: 11.67% huesos (más peligrosa)
- Pos 19: 94.00% pollos (más segura)

✅ **Rotación realista: 4.68% overlap**
- 83.6% de partidas: 0 huesos repetidos
- 14.4% de partidas: 1 hueso repetido
- Solo 1.7%: 2 huesos repetidos

✅ **Posiciones seguras REALES (93%+ pollos)**
- 19, 13, 7, 18, 11, 10, 6, 25, 22, 1

✅ **Comportamiento de retiro REAL**
- 45% retiran en 5 pollos (más común)
- 25% retiran en 4 pollos
- 16.25% retiran en 6 pollos

✅ **Distribución por zonas REAL**
- Fila 5: 7% huesos (más segura)
- Fila 2: 24% huesos (más peligrosa)

---

## 🎯 CÓMO USAR EL SIMULADOR

### Paso 1: Entrenar el Simulador (PRIMERO)

**Ubicación**: Pestaña "Simulador" → Botón "Entrenar Simulador"

**Qué hace**:
1. Analiza TODAS las partidas reales en la base de datos (1,005 partidas)
2. Calcula frecuencias reales de huesos por posición
3. Identifica posiciones seguras (90%+ pollos)
4. Identifica posiciones peligrosas (10%+ huesos)
5. Calcula rotación real de huesos
6. Guarda configuración en `ml-simulator-config.json`

**Resultado esperado**:
```
✅ Simulador entrenado exitosamente

📊 Partidas analizadas: 1,005
🎯 Posiciones seguras: 10
⚠️  Posiciones peligrosas: 4
🔄 Overlap promedio: 0.19 (4.68%)

Top 5 posiciones seguras:
  Pos 19: 96.5% pollos
  Pos 13: 95.2% pollos
  Pos 7: 94.8% pollos
  Pos 18: 93.7% pollos
  Pos 11: 93.1% pollos
```

**Cuándo hacerlo**:
- Primera vez que usas el sistema
- Cada 50-100 partidas reales nuevas
- Cuando la tasa de éxito baje significativamente

---

### Paso 2: Configurar la Simulación

**Parámetros disponibles**:

1. **Número de Huesos**: 2, 3 o 4
   - Recomendado: 4 (más realista)

2. **Número de Partidas a Simular**: 1-1000
   - Prueba rápida: 100 partidas
   - Entrenamiento: 500-1000 partidas

3. **Objetivo de Posiciones Consecutivas**: 3-8
   - 3 posiciones: 95% win rate (Muy Fácil)
   - 4 posiciones: 75% win rate (Fácil)
   - 5 posiciones: 45% win rate (Medio) ← **Recomendado**
   - 6 posiciones: 20% win rate (Difícil)
   - 7 posiciones: 8% win rate (Muy Difícil)
   - 8 posiciones: <5% win rate (Extremo)

4. **Usar Patrones Entrenados**: ✅ Activado (recomendado)
   - ✅ Activado: Usa patrones REALES de 300 partidas
   - ❌ Desactivado: Simulación aleatoria (no recomendado)

---

### Paso 3: Iniciar Simulación

**Botón**: "Iniciar Simulación"

**Qué hace**:
1. Genera partidas usando patrones REALES del simulador entrenado
2. Simula comportamiento de jugadores exitosos
3. Aplica rotación realista de huesos (4.68% overlap)
4. Usa posiciones seguras identificadas
5. Guarda partidas simuladas en la base de datos

**Resultado esperado**:
```
✅ Simulación completada con objetivo de 5 posiciones

📊 Resultados:
• Juegos procesados: 100
• Victorias: 52 (52%)
• Derrotas: 48
• Promedio revelado: 3.91

📈 Estadísticas detalladas por posición:
• 3 posiciones: 95 alcanzadas, 90 victorias (94%)
• 4 posiciones: 78 alcanzadas, 65 victorias (83%)
• 5 posiciones: 52 alcanzadas, 52 victorias (100%)
• 6 posiciones: 23 alcanzadas, 15 victorias (65%)
• 7 posiciones: 8 alcanzadas, 2 victorias (25%)

✅ Objetivo de 5 posiciones es alcanzable
```

---

### Paso 4: Entrenar el Asesor (MANUAL)

**Botón**: "Entrenar Asesor"

**⚠️ IMPORTANTE**: Solo entrenar cuando:
- El simulador esté entrenado
- Tengas al menos 100 partidas simuladas
- La tasa de éxito del simulador sea > 55%

**Qué hace**:
1. Verifica que el simulador esté entrenado
2. Genera partidas simuladas con patrones REALES
3. Entrena al asesor ML con esas partidas
4. Valida con 50 partidas adicionales
5. Compara uso de posiciones seguras

**Resultado esperado**:
```
✅ Asesor ML entrenado exitosamente

🎮 Partidas de entrenamiento: 100
✅ Victorias: 56 (56.0%)
❌ Derrotas: 44
📍 Promedio posiciones: 3.85
🎯 Objetivo: 5 pollos

🔍 Validación (50 partidas):
   Tasa de éxito: 57.0%

📊 Uso de posiciones seguras: 92.0%

✅ Excelente: El asesor está listo para uso en producción
```

---

## 📊 INFORMACIÓN MOSTRADA EN LA INTERFAZ

### Sección: "Patrones Realistas Activos"

Cuando "Usar Patrones Entrenados" está activado, verás:

```
✅ Patrones Realistas Activos
• Frecuencias REALES de huesos por posición
• Rotación realista: 4.68% overlap
• Posiciones seguras: 19, 13, 7, 18, 11, 10, 6, 25, 22, 1
• Comportamiento de retiro: 45% en 5 pollos
• Basado en 300 partidas reales de Mystake
```

Esto confirma que el simulador está usando los patrones documentados.

### Sección: "Estado del Simulador"

Muestra:
- Partidas simuladas totales
- Estado actual (Listo / Simulando)
- Estado de entrenamiento

### Sección: "Datos de Entrenamiento del Simulador"

Después de entrenar, muestra:
- Partidas analizadas
- Posiciones seguras identificadas
- Posiciones peligrosas identificadas
- Overlap calculado

### Sección: "Última Simulación Completada"

Muestra resultados detallados de la última simulación:
- Juegos procesados
- Victorias y derrotas
- Tasa de éxito por objetivo
- Recomendaciones

---

## 🔍 VERIFICAR QUE ESTÁ FUNCIONANDO

### 1. Verificar Patrones Activos

En la interfaz, busca:
```
✅ Usando patrones REALES de 300 partidas
```

Si ves esto, el simulador está usando los patrones correctos.

### 2. Ejecutar Enfrentamiento

Para verificar que el simulador funciona correctamente:

```bash
npx tsx analisis/enfrentamiento-asesor-vs-simulador.ts 100 5
```

**Resultado esperado**:
- Tasa de éxito: 50-55%
- Uso de posiciones seguras: 80-90%
- Balance exploración: 30-35%

### 3. Comparar con Documentación

Los resultados deben coincidir con:
- `docs/SIMULADOR_REALISTA_Y_ENFRENTAMIENTO.md`
- Tasa de éxito: ~52%
- Posiciones seguras usadas: 9/10 (90%)

---

## 🎯 FLUJO COMPLETO DE USO

```
1. Entrenar Simulador
   ↓
2. Verificar que muestre "Patrones Realistas Activos"
   ↓
3. Configurar simulación (100 partidas, objetivo 5)
   ↓
4. Iniciar Simulación
   ↓
5. Revisar resultados (debe mostrar ~50% éxito)
   ↓
6. Si tasa > 55%: Entrenar Asesor
   ↓
7. Validar con partidas reales
```

---

## ⚠️ PROBLEMAS COMUNES

### "Usar Patrones Entrenados" desactivado

**Solución**: Activar el checkbox. Debe mostrar:
```
✅ Usando patrones REALES de 300 partidas
```

### No muestra "Patrones Realistas Activos"

**Causa**: El checkbox está desactivado
**Solución**: Activar "Usar Patrones Entrenados"

### Simulador no entrenado

**Síntoma**: No muestra "Datos de Entrenamiento del Simulador"
**Solución**: Hacer clic en "Entrenar Simulador" primero

### Tasa de éxito muy baja (<40%)

**Causa**: Simulador no entrenado o patrones desactualizados
**Solución**:
1. Entrenar simulador con partidas reales actuales
2. Verificar que "Usar Patrones Entrenados" esté activado
3. Ejecutar enfrentamiento para verificar

---

## 📁 ARCHIVOS RELACIONADOS

### Código
- `src/app/page.tsx` - Interfaz del simulador
- `src/app/api/chicken/simulate/route.ts` - Endpoint del simulador
- `src/app/api/ml/train-simulator/route.ts` - Entrenamiento del simulador
- `src/app/api/ml/train-advisor/route.ts` - Entrenamiento del asesor

### Documentación
- `docs/SIMULADOR_MEJORADO.md` - Patrones del simulador
- `docs/SIMULADOR_REALISTA_Y_ENFRENTAMIENTO.md` - Resultados del enfrentamiento
- `docs/SISTEMA_ENTRENAMIENTO_AUTOMATICO.md` - Guía de entrenamiento

### Scripts
- `analisis/enfrentamiento-asesor-vs-simulador.ts` - Verificar funcionamiento
- `verificar-sistema.ts` - Verificar estado del sistema

---

## ✅ CONFIRMACIÓN

El simulador en la interfaz **SÍ ESTÁ FUNCIONANDO** con los patrones documentados:

✅ Usa frecuencias REALES de 300 partidas
✅ Aplica rotación realista (4.68% overlap)
✅ Usa posiciones seguras REALES
✅ Comportamiento de retiro REAL
✅ Distribución por zonas REAL

**Para verificar**: Activa "Usar Patrones Entrenados" y verás el mensaje confirmando que usa patrones REALES de 300 partidas.

---

**Fecha**: 2026-02-04
**Versión**: Guía de Uso del Simulador v1.0
**Estado**: ✅ Simulador funcionando correctamente
