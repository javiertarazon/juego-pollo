# 📊 NUEVOS ENDPOINTS DE ESTADÍSTICAS AVANZADAS

## 📋 Resumen

Se han implementado nuevos endpoints que proporcionan análisis detallado de patrones, frecuencias, transiciones y ventajas estadísticas capitalizables.

**Fecha**: 2026-02-04  
**Estado**: ✅ IMPLEMENTADO  
**Multiplicadores**: Corregidos para 4 huesos

---

## 🎯 Endpoints Implementados

### 1. Dashboard Completo
```
GET /api/chicken/dashboard?limit=100
```

**Descripción**: Proporciona análisis completo con todas las estadísticas necesarias.

**Parámetros**:
- `limit` (opcional): Número de partidas a analizar (default: 100)
- `sessionId` (opcional): ID de sesión (default: 'default')

**Respuesta**:
```json
{
  "success": true,
  "total_partidas_analizadas": 100,
  "configuracion": {
    "bone_count": 4,
    "apuesta_minima": 0.2,
    "apuesta_incremento": 0.2,
    "multiplicadores": {
      "1": 1.17,
      "2": 1.41,
      "3": 1.71,
      "4": 2.09,
      "5": 2.58,
      "6": 3.23,
      "7": 4.09,
      "8": 5.26,
      ...
    }
  },
  "ultimas_10_partidas": [...],
  "frecuencias": {...},
  "transiciones": {...},
  "patrones_capitalizables": [...],
  "recomendaciones": [...]
}
```

### 2. Estadísticas Avanzadas
```
GET /api/chicken/advanced-stats?limit=100&boneCount=4
```

**Descripción**: Análisis detallado de patrones y frecuencias.

**Respuesta incluye**:
- Resumen general
- Frecuencias de posiciones (huesos y pollos)
- Patrones consecutivos
- Transiciones hueso-pollo
- Análisis de últimas 10 partidas
- Zonas calientes y frías
- Ventajas estadísticas
- Recomendaciones

### 3. Gestión de Sesión
```
GET /api/chicken/session?sessionId=default&balanceInicial=100
POST /api/chicken/session
DELETE /api/chicken/session?sessionId=default
```

**GET - Obtener sesión**:
```json
{
  "success": true,
  "sessionId": "default",
  "balance": {
    "actual": 100,
    "inicial": 100,
    "ganado": 0,
    "perdido": 0,
    "partidas_jugadas": 0,
    "partidas_ganadas": 0,
    "partidas_perdidas": 0,
    "racha_actual": 0,
    "mejor_racha": 0,
    "peor_racha": 0
  },
  "estadisticas": {
    "roi": "0.00%",
    "tasa_victoria": "0.00%",
    "ganancia_promedio": "0.00",
    "perdida_promedio": "0.00",
    "ratio_ganancia_perdida": "N/A",
    "beneficio_neto": "0.00"
  },
  "grafica_equity": [...]
}
```

**POST - Registrar resultado**:
```json
{
  "sessionId": "default",
  "tipo": "GANANCIA",  // o "PERDIDA"
  "apuesta": 0.2,
  "posicionesDescubiertas": 5  // Solo para GANANCIA
}
```

**DELETE - Reiniciar sesión**:
Reinicia la sesión con un nuevo balance inicial.

---

## 💰 Multiplicadores Correctos para 4 Huesos

| Posiciones | Multiplicador |
|------------|---------------|
| 1          | 1.17x         |
| 2          | 1.41x         |
| 3          | 1.71x         |
| 4          | 2.09x         |
| 5          | 2.58x         |
| 6          | 3.23x         |
| 7          | 4.09x         |
| 8          | 5.26x         |
| 9          | 6.88x         |
| 10         | 9.17x         |
| 11         | 12.50x        |
| 12         | 17.50x        |
| 13         | 25.00x        |
| 14         | 37.50x        |
| 15         | 58.33x        |
| 16         | 100.00x       |
| 17         | 183.33x       |
| 18         | 366.67x       |
| 19         | 825.00x       |
| 20         | 2062.50x      |
| 21         | 6187.50x      |

---

## 📊 Análisis de Últimas 10 Partidas

El endpoint proporciona análisis detallado de las últimas 10 partidas:

```json
{
  "numero": 1,
  "id": 123,
  "fecha": "04/02/2026, 10:30:00",
  "huesos": {
    "posiciones": [6, 9, 15, 22],
    "cantidad": 4,
    "consecutivas_con_anterior": 2
  },
  "pollos": {
    "posiciones": [4, 7, 10, 13, 14, 17, 18, 19, 20, 21, 23, 24],
    "cantidad": 12,
    "consecutivas_con_anterior": 8
  },
  "cambios": {
    "hueso_a_pollo": 3,
    "pollo_a_hueso": 2,
    "posiciones_hueso_a_pollo": [4, 10, 14],
    "posiciones_pollo_a_hueso": [6, 9]
  },
  "resultado": "EXITOSA",
  "reveladas": 8
}
```

**Información proporcionada**:
- ✅ Posiciones exactas de huesos y pollos
- ✅ Cantidad de cada tipo
- ✅ Cuántas posiciones se mantuvieron consecutivas
- ✅ Qué posiciones cambiaron de hueso a pollo
- ✅ Qué posiciones cambiaron de pollo a hueso
- ✅ Resultado de la partida
- ✅ Número de posiciones reveladas

---

## 🔥 Frecuencias Detalladas

### Por Posición
Para cada posición (0-24) se proporciona:

```json
{
  "posicion": 13,
  "huesos": {
    "frecuencia": 15,
    "porcentaje": "15.00%",
    "consecutivas": 3,
    "ultima_vez": "Hace 2 partidas"
  },
  "pollos": {
    "frecuencia": 85,
    "porcentaje": "85.00%",
    "consecutivas": 45,
    "ultima_vez": "Hace 1 partidas"
  },
  "total_apariciones": 100
}
```

**Información clave**:
- ✅ Cuántas veces ha sido hueso
- ✅ Cuántas veces ha sido pollo
- ✅ Porcentajes exactos
- ✅ Cuántas veces fue consecutiva
- ✅ Última vez que apareció como hueso/pollo

### Top Posiciones
- **Top 10 huesos más frecuentes**: Posiciones a EVITAR
- **Top 10 pollos más frecuentes**: Posiciones SEGURAS
- **Top 10 posiciones más seguras**: Menos del 15% huesos

---

## ⚡ Análisis de Transiciones

### Por Posición
```json
{
  "posicion": 13,
  "hueso_a_pollo": 8,
  "pollo_a_hueso": 3,
  "total_cambios": 11,
  "frecuencia_cambio": "Cada 4.5 partidas",
  "ultimo_cambio": 2
}
```

**Información clave**:
- ✅ Cuántas veces cambió de hueso a pollo
- ✅ Cuántas veces cambió de pollo a hueso
- ✅ Cada cuántas partidas cambia (promedio)
- ✅ Hace cuántas partidas fue el último cambio

### Posiciones Volátiles vs Estables
- **Más volátiles**: Cambian frecuentemente (impredecibles)
- **Más estables**: Raramente cambian (predecibles)

---

## 🎯 Patrones Capitalizables

El sistema identifica automáticamente patrones que se pueden capitalizar:

### 1. Posiciones Muy Seguras
```json
{
  "tipo": "POSICIONES_MUY_SEGURAS",
  "confianza": "ALTA",
  "descripcion": "Posiciones que han sido huesos menos del 15% de las veces",
  "posiciones": [13, 14, 17, 18, 20],
  "detalle": [
    {
      "posicion": 13,
      "veces_hueso": 12,
      "porcentaje": "12.00%"
    }
  ]
}
```

### 2. Pollos Consecutivos
```json
{
  "tipo": "POLLOS_CONSECUTIVOS",
  "confianza": "MEDIA-ALTA",
  "descripcion": "Posiciones que tienden a repetir como pollos",
  "posiciones": [13, 14, 17],
  "detalle": [...]
}
```

### 3. Cambios Predecibles
```json
{
  "tipo": "CAMBIOS_PREDECIBLES",
  "confianza": "MEDIA",
  "descripcion": "Posiciones que cambian con frecuencia predecible",
  "posiciones": [6, 9],
  "detalle": [
    {
      "posicion": 6,
      "frecuencia": "Cada 3.2 partidas",
      "ultimo_cambio": 2
    }
  ]
}
```

---

## 💡 Recomendaciones Automáticas

### Inicio de Partida
```json
{
  "momento": "INICIO_PARTIDA",
  "prioridad": "ALTA",
  "estrategia": "Comenzar con las posiciones más seguras",
  "posiciones": [13, 14, 17, 18, 20],
  "razon": "Estas posiciones han sido huesos solo 12.00% de las veces",
  "apuesta_sugerida": 0.2
}
```

### Continuación
```json
{
  "momento": "CONTINUACION",
  "prioridad": "MEDIA",
  "estrategia": "Continuar con posiciones frecuentemente pollos",
  "posiciones": [13, 14, 15, 17, 18],
  "razon": "Estas posiciones han sido pollos 85.00% de las veces",
  "apuesta_sugerida": 0.4
}
```

### Evitar
```json
{
  "momento": "SIEMPRE",
  "prioridad": "ALTA",
  "estrategia": "EVITAR estas posiciones peligrosas",
  "posiciones": [6, 9, 15, 22, 24],
  "razon": "Estas posiciones han sido huesos 65.00% de las veces",
  "apuesta_sugerida": null
}
```

---

## 📈 Gráfica de Equity

El sistema genera datos para gráfica de equity:

```json
{
  "grafica_equity": [
    { "partida": 0, "balance": 100, "tipo": "INICIAL" },
    { "partida": 1, "balance": 102.5, "tipo": "GANANCIA" },
    { "partida": 2, "balance": 102.3, "tipo": "PERDIDA" },
    { "partida": 3, "balance": 105.8, "tipo": "GANANCIA" },
    ...
  ]
}
```

**Uso**: Graficar la evolución del balance a lo largo de las partidas.

---

## 🎮 Flujo de Uso Recomendado

### 1. Iniciar Sesión
```javascript
// Obtener o crear sesión
const session = await fetch('/api/chicken/session?sessionId=user123&balanceInicial=100');
```

### 2. Obtener Dashboard
```javascript
// Cargar estadísticas y recomendaciones
const dashboard = await fetch('/api/chicken/dashboard?limit=100');
```

### 3. Jugar Partida
```javascript
// Usar recomendaciones del dashboard
const posiciones_recomendadas = dashboard.recomendaciones[0].posiciones;

// Jugar...
```

### 4. Registrar Resultado
```javascript
// Si ganó
await fetch('/api/chicken/session', {
  method: 'POST',
  body: JSON.stringify({
    sessionId: 'user123',
    tipo: 'GANANCIA',
    apuesta: 0.2,
    posicionesDescubiertas: 5
  })
});

// Si perdió
await fetch('/api/chicken/session', {
  method: 'POST',
  body: JSON.stringify({
    sessionId: 'user123',
    tipo: 'PERDIDA',
    apuesta: 0.2
  })
});
```

### 5. Ver Progreso
```javascript
// Obtener estadísticas actualizadas
const session = await fetch('/api/chicken/session?sessionId=user123');
console.log('Balance:', session.balance.actual);
console.log('ROI:', session.estadisticas.roi);
console.log('Tasa victoria:', session.estadisticas.tasa_victoria);
```

---

## 📝 Archivos Creados

1. `src/app/api/chicken/dashboard/route.ts` - Dashboard completo
2. `src/app/api/chicken/advanced-stats/route.ts` - Estadísticas avanzadas
3. `src/app/api/chicken/session/route.ts` - Gestión de sesión
4. `src/lib/multipliers.ts` - Multiplicadores y gestión de balance

---

## ✅ Características Implementadas

- ✅ Análisis de últimas 10 partidas con detalle completo
- ✅ Frecuencias por posición (huesos y pollos)
- ✅ Análisis de consecutivas
- ✅ Transiciones hueso-pollo detalladas
- ✅ Frecuencia de cambios por posición
- ✅ Identificación de patrones capitalizables
- ✅ Recomendaciones automáticas
- ✅ Multiplicadores correctos para 4 huesos
- ✅ Gestión de balance y sesión
- ✅ Gráfica de equity
- ✅ Estadísticas de ROI y tasa de victoria
- ✅ Validación de apuestas
- ✅ Historial de partidas

---

**Documento creado**: 2026-02-04  
**Estado**: ✅ COMPLETADO  
**Endpoints**: 3 nuevos  
**Funcionalidades**: 15+ características
