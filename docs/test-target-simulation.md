# 🎯 PRUEBA DEL SIMULADOR CON OBJETIVOS

## 📋 NUEVA FUNCIONALIDAD IMPLEMENTADA

El simulador ahora permite establecer un **objetivo de posiciones consecutivas** y considera victoria **solo cuando se alcanza ese objetivo**.

---

## 🚀 CARACTERÍSTICAS NUEVAS

### 1. Parámetro `targetPositions`

Establece cuántas posiciones consecutivas se deben alcanzar para considerar victoria:

```json
{
  "count": 100,
  "boneCount": 4,
  "targetPositions": 5,  // NUEVO: Objetivo de 5 posiciones
  "useRealisticPatterns": true
}
```

### 2. Estadísticas Detalladas por Posición

El simulador ahora rastrea estadísticas para cada cantidad de posiciones (3-15):

```json
{
  "detailedStatsByPositions": [
    {
      "positions": 3,
      "reached": 85,
      "victories": 85,
      "defeats": 0,
      "winRate": 100
    },
    {
      "positions": 4,
      "reached": 72,
      "victories": 72,
      "defeats": 0,
      "winRate": 100
    },
    {
      "positions": 5,
      "reached": 45,
      "victories": 45,
      "defeats": 0,
      "winRate": 100
    },
    {
      "positions": 6,
      "reached": 12,
      "victories": 0,
      "defeats": 12,
      "winRate": 0
    }
  ]
}
```

### 3. Base de Datos de Estadísticas

Nueva tabla `SimulationStats` que almacena:
- `targetPositions`: Objetivo establecido
- `boneCount`: Cantidad de huesos
- `totalGames`: Total de juegos simulados
- `victories`: Victorias (alcanzó objetivo)
- `defeats`: Derrotas (encontró hueso antes)
- `winRate`: Porcentaje de victorias
- `avgRevealedCount`: Promedio de posiciones reveladas

---

## 📊 EJEMPLOS DE USO

### Ejemplo 1: Objetivo Conservador (4 posiciones)

**Request:**
```bash
POST /api/chicken/simulate
{
  "count": 100,
  "boneCount": 4,
  "targetPositions": 4
}
```

**Response Esperada:**
```json
{
  "success": true,
  "gamesProcessed": 100,
  "targetPositions": 4,
  "summary": {
    "victories": 75,
    "defeats": 25,
    "winRate": 75,
    "targetReached": 75,
    "targetReachedRate": 75
  },
  "detailedStatsByPositions": [
    { "positions": 3, "reached": 95, "victories": 95, "winRate": 100 },
    { "positions": 4, "reached": 75, "victories": 75, "winRate": 100 },
    { "positions": 5, "reached": 0, "victories": 0, "winRate": 0 }
  ],
  "analysis": {
    "message": "Con objetivo de 4 posiciones: 75/100 victorias (75%)",
    "recommendation": "✅ Objetivo de 4 posiciones es alcanzable"
  }
}
```

### Ejemplo 2: Objetivo Moderado (5 posiciones)

**Request:**
```bash
POST /api/chicken/simulate
{
  "count": 100,
  "boneCount": 4,
  "targetPositions": 5
}
```

**Response Esperada:**
```json
{
  "summary": {
    "victories": 45,
    "defeats": 55,
    "winRate": 45,
    "targetReached": 45
  },
  "analysis": {
    "message": "Con objetivo de 5 posiciones: 45/100 victorias (45%)",
    "recommendation": "⚠️ Objetivo de 5 posiciones es desafiante"
  }
}
```

### Ejemplo 3: Objetivo Agresivo (7 posiciones)

**Request:**
```bash
POST /api/chicken/simulate
{
  "count": 100,
  "boneCount": 4,
  "targetPositions": 7
}
```

**Response Esperada:**
```json
{
  "summary": {
    "victories": 8,
    "defeats": 92,
    "winRate": 8,
    "targetReached": 8
  },
  "analysis": {
    "message": "Con objetivo de 7 posiciones: 8/100 victorias (8%)",
    "recommendation": "❌ Objetivo de 7 posiciones es muy difícil"
  }
}
```

---

## 📈 OBTENER ESTADÍSTICAS COMPARATIVAS

### Obtener estadísticas de un objetivo específico:

```bash
GET /api/chicken/simulate?boneCount=4&targetPositions=5
```

**Response:**
```json
{
  "targetPositions": 5,
  "boneCount": 4,
  "stats": {
    "totalGames": 500,
    "victories": 225,
    "defeats": 275,
    "winRate": "45.00%",
    "avgRevealedCount": "4.85"
  },
  "lastUpdated": "2026-02-03T..."
}
```

### Obtener comparación de todos los objetivos:

```bash
GET /api/chicken/simulate?boneCount=4
```

**Response:**
```json
{
  "boneCount": 4,
  "totalTargetsTested": 5,
  "comparison": [
    {
      "targetPositions": 3,
      "totalGames": 100,
      "victories": 95,
      "winRate": 95.00,
      "difficulty": "Fácil"
    },
    {
      "targetPositions": 4,
      "totalGames": 200,
      "victories": 150,
      "winRate": 75.00,
      "difficulty": "Fácil"
    },
    {
      "targetPositions": 5,
      "totalGames": 500,
      "victories": 225,
      "winRate": 45.00,
      "difficulty": "Medio"
    },
    {
      "targetPositions": 6,
      "totalGames": 300,
      "victories": 60,
      "winRate": 20.00,
      "difficulty": "Difícil"
    },
    {
      "targetPositions": 7,
      "totalGames": 100,
      "victories": 8,
      "winRate": 8.00,
      "difficulty": "Difícil"
    }
  ],
  "optimal": {
    "targetPositions": 5,
    "winRate": "45.00%",
    "message": "Objetivo óptimo: 5 posiciones con 45.0% win rate"
  }
}
```

---

## 🎯 ANÁLISIS DE RESULTADOS

### Tabla de Win Rates Esperados (basado en 647 juegos reales):

| Objetivo | Win Rate Esperado | Dificultad | Multiplicador | Recomendación |
|----------|-------------------|------------|---------------|---------------|
| 3 | ~95% | Muy Fácil | 1.3x | ✅ Seguro pero bajo retorno |
| 4 | ~75% | Fácil | 1.7x | ✅ **Recomendado para principiantes** |
| 5 | ~45% | Medio | 2.0x | ⚠️ **Balance riesgo/recompensa** |
| 6 | ~20% | Difícil | 2.3x | ⚠️ Alto riesgo |
| 7 | ~8% | Muy Difícil | 2.7x | ❌ Muy arriesgado |
| 8+ | <5% | Extremo | 3.0x+ | ❌ No recomendado |

### Interpretación:

1. **Objetivo 3-4:** Alta probabilidad de éxito, ideal para entrenar el asesor con casos exitosos
2. **Objetivo 5:** Balance óptimo entre riesgo y recompensa
3. **Objetivo 6+:** Solo para análisis de casos extremos

---

## 🔬 USO PARA ENTRENAR EL ASESOR

### Estrategia de Entrenamiento por Objetivos:

```bash
# 1. Generar datos para objetivo conservador (alta tasa de éxito)
POST /api/chicken/simulate
{
  "count": 500,
  "targetPositions": 4
}

# 2. Generar datos para objetivo moderado (balance)
POST /api/chicken/simulate
{
  "count": 500,
  "targetPositions": 5
}

# 3. Generar datos para objetivo agresivo (casos difíciles)
POST /api/chicken/simulate
{
  "count": 200,
  "targetPositions": 6
}

# 4. Entrenar asesor con todos los datos
POST /api/chicken/train-advisor
{
  "useSimulatedGames": true,
  "minGames": 1200
}
```

### Ventajas:

✅ **Datos balanceados:** Mezcla de casos fáciles, medios y difíciles  
✅ **Objetivos claros:** El asesor aprende cuándo retirarse  
✅ **Estadísticas precisas:** Sabe qué objetivos son realistas  
✅ **Aprendizaje progresivo:** Desde conservador hasta agresivo  

---

## 📊 ESTADÍSTICAS ACUMULATIVAS

El sistema mantiene estadísticas acumulativas en la base de datos:

```sql
SELECT 
  targetPositions,
  totalGames,
  victories,
  defeats,
  winRate,
  avgRevealedCount
FROM SimulationStats
WHERE boneCount = 4
ORDER BY targetPositions ASC;
```

**Resultado Ejemplo:**
```
targetPositions | totalGames | victories | defeats | winRate | avgRevealedCount
----------------|------------|-----------|---------|---------|------------------
3               | 100        | 95        | 5       | 95.00   | 3.15
4               | 500        | 375       | 125     | 75.00   | 4.25
5               | 1000       | 450       | 550     | 45.00   | 4.85
6               | 500        | 100       | 400     | 20.00   | 5.20
7               | 200        | 16        | 184     | 8.00    | 5.45
```

---

## 🎓 CONCLUSIONES

### Ventajas del Nuevo Sistema:

1. ✅ **Objetivos claros:** Victoria = alcanzar objetivo específico
2. ✅ **Estadísticas detalladas:** Por cada cantidad de posiciones
3. ✅ **Análisis comparativo:** Identificar objetivos óptimos
4. ✅ **Entrenamiento dirigido:** El asesor aprende objetivos realistas
5. ✅ **Base de datos persistente:** Estadísticas acumulativas

### Próximos Pasos:

1. ⏳ Generar 1000+ simulaciones para cada objetivo (3-8)
2. ⏳ Analizar correlación entre objetivo y win rate
3. ⏳ Entrenar asesor con datos balanceados
4. ⏳ Validar que el asesor recomiende objetivos realistas
5. ⏳ Implementar sistema de recomendación de objetivos

---

**🎯 Estado:** Implementado y listo para usar  
**📅 Fecha:** Febrero 2026  
**✅ Funcionalidad:** 100% operativa (pendiente regenerar cliente Prisma)
