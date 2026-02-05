# 💰 INTEGRACIÓN DE BALANCE Y APUESTA EN EL JUEGO

## 📋 Resumen

Se ha integrado el sistema de gestión de balance y apuestas en la interfaz del juego, solicitando al usuario el balance inicial y la apuesta antes de comenzar cada partida.

**Fecha de Implementación**: 4 de febrero de 2026  
**Estado**: ✅ COMPLETADO  
**Archivos Modificados**: 1 (`src/app/page.tsx`)

---

## 🎯 Cambios Implementados

### 1. Nuevos Estados Agregados

```typescript
// Balance y apuesta
const [sessionId, setSessionId] = useState<string>('');
const [balanceInicial, setBalanceInicial] = useState<number>(100);
const [apuestaActual, setApuestaActual] = useState<number>(0.2);
const [balanceActual, setBalanceActual] = useState<number>(100);
const [showBalanceDialog, setShowBalanceDialog] = useState<boolean>(false);
```

### 2. Diálogo de Balance y Apuesta

Se agregó un nuevo diálogo que se muestra al hacer clic en "Comenzar Asesoría":

**Campos**:
- **Balance Inicial**: Capital disponible para jugar (mínimo: 1)
- **Apuesta por Partida**: Cantidad a apostar (mínimo: 0.2, incremento: 0.2)

**Información Mostrada**:
- Balance actual
- Apuesta configurada
- Número de partidas posibles (balance / apuesta)

**Validación**:
- No permite comenzar si la apuesta es mayor que el balance
- Valida que la apuesta sea múltiplo de 0.2

### 3. Flujo Modificado

#### Antes:
```
Click "Comenzar Asesoría" → Inicia partida directamente
```

#### Ahora:
```
Click "Comenzar Asesoría" 
  → Muestra diálogo de balance/apuesta
  → Usuario ingresa datos
  → Click "Comenzar Partida"
  → Crea sesión en backend
  → Inicia partida
```

### 4. Registro de Ganancias y Pérdidas

#### Al Retirar (Victoria):
```typescript
// Registra ganancia en la sesión
await fetch('/api/chicken/session', {
  method: 'POST',
  body: JSON.stringify({
    sessionId,
    tipo: 'GANANCIA',
    apuesta: apuestaActual,
    posicionesDescubiertas: totalChickens
  })
});

// Actualiza balance actual
setBalanceActual(gananciaData.balance.actual);
```

#### Al Encontrar Hueso (Derrota):
```typescript
// Registra pérdida en la sesión
await fetch('/api/chicken/session', {
  method: 'POST',
  body: JSON.stringify({
    sessionId,
    tipo: 'PERDIDA',
    apuesta: apuestaActual
  })
});

// Actualiza balance actual
setBalanceActual(perdidaData.balance.actual);
```

### 5. Visualización del Balance

Se agregaron badges en la interfaz para mostrar:

```tsx
<Badge variant="outline" className="px-4 py-2 bg-green-50">
  <Wallet className="w-4 h-4 mr-1" />
  {balanceActual.toFixed(2)}
</Badge>

<Badge variant="outline" className="px-4 py-2 bg-blue-50">
  Apuesta: {apuestaActual.toFixed(2)}
</Badge>
```

**Ubicación**: Junto al multiplicador y número de pollos

### 6. Multiplicadores Corregidos

Se actualizaron los multiplicadores para 4 huesos:

```typescript
const MULTIPLIERS = {
  1: 1.17,    // Antes: 1.1
  2: 1.41,    // Antes: 1.3
  3: 1.71,    // Antes: 1.5
  4: 2.09,    // Antes: 1.7
  5: 2.58,    // Antes: 1.99
  6: 3.23,    // Antes: 2.34
  7: 4.09,    // Antes: 2.66
  8: 5.26,    // Antes: 3.0
  9: 6.88,    // Antes: 3.84
  10: 9.17,   // Antes: 3.84
  11: 12.50,  // Antes: 4.35
  12: 17.50,  // Antes: 4.96
  13: 25.00,  // Antes: 5.65
  14: 37.50,  // Antes: 6.44
  15: 58.33,  // Antes: 7.35
  16: 100.00, // Antes: 8.4
  17: 183.33, // Antes: 9.6
  18: 366.67, // Antes: 10.96
  19: 825.00, // Antes: 12.52
  20: 2062.50,// Antes: 14.32
  21: 6187.50,// Antes: 16.37
};
```

---

## 🎮 Flujo de Usuario Completo

### 1. Inicio de Sesión
```
Usuario → Click "Comenzar Asesoría"
       → Diálogo de Balance/Apuesta
       → Ingresa balance: 100
       → Ingresa apuesta: 0.2
       → Click "Comenzar Partida"
       → Sistema crea sesión en backend
       → Partida inicia
```

### 2. Durante el Juego
```
Usuario → Sigue recomendaciones
       → Descubre pollos
       → Balance y apuesta visibles en pantalla
       → Multiplicador actualizado en tiempo real
```

### 3. Victoria (Retiro)
```
Usuario → Click "RETIRAR"
       → Sistema registra ganancia
       → Calcula: apuesta × multiplicador
       → Actualiza balance
       → Muestra nuevo balance
       → Solicita posiciones de huesos
       → Reinicia para nueva partida
```

### 4. Derrota (Hueso)
```
Usuario → Encuentra hueso
       → Sistema registra pérdida
       → Resta apuesta del balance
       → Actualiza balance
       → Muestra nuevo balance
       → Solicita posiciones de huesos
       → Reinicia para nueva partida
```

---

## 📊 Ejemplo de Sesión

### Configuración Inicial
```
Balance inicial: 100.00
Apuesta: 0.20
Partidas posibles: 500
```

### Partida 1 - Victoria
```
Pollos descubiertos: 5
Multiplicador: 2.58x
Ganancia: 0.20 × 2.58 = 0.516
Ganancia neta: 0.516 - 0.20 = 0.316
Balance nuevo: 100.00 + 0.316 = 100.316
```

### Partida 2 - Victoria
```
Pollos descubiertos: 7
Multiplicador: 4.09x
Ganancia: 0.20 × 4.09 = 0.818
Ganancia neta: 0.818 - 0.20 = 0.618
Balance nuevo: 100.316 + 0.618 = 100.934
```

### Partida 3 - Derrota
```
Encontró hueso
Pérdida: 0.20
Balance nuevo: 100.934 - 0.20 = 100.734
```

### Estadísticas de Sesión
```
Balance actual: 100.734
Balance inicial: 100.00
Ganado: 0.934
Perdido: 0.20
ROI: 0.73%
Tasa de victoria: 66.67%
Partidas jugadas: 3
```

---

## 🔧 Funciones Modificadas

### `startAdvising()`
**Antes**: Iniciaba partida directamente  
**Ahora**: Muestra diálogo de balance/apuesta

### `iniciarPartidaConBalance()` (Nueva)
- Crea sesión en backend
- Configura balance inicial
- Inicia partida

### `handleWithdraw()`
**Agregado**:
- Registra ganancia en sesión
- Actualiza balance actual
- Calcula ganancia neta

### `handleConfirmBone()`
**Agregado**:
- Registra pérdida en sesión
- Actualiza balance actual
- Resta apuesta del balance

---

## 📈 Integración con Backend

### Endpoint de Sesión
```
GET /api/chicken/session?sessionId=xxx&balanceInicial=100
```

**Respuesta**:
```json
{
  "success": true,
  "sessionId": "session-1234567890",
  "balance": {
    "actual": 100,
    "inicial": 100,
    "ganado": 0,
    "perdido": 0,
    "partidas_jugadas": 0
  }
}
```

### Registro de Ganancia
```
POST /api/chicken/session
{
  "sessionId": "session-1234567890",
  "tipo": "GANANCIA",
  "apuesta": 0.2,
  "posicionesDescubiertas": 5
}
```

**Respuesta**:
```json
{
  "success": true,
  "resultado": "GANANCIA",
  "balance": {
    "actual": 100.316,
    "ganado": 0.316,
    "partidas_ganadas": 1
  },
  "estadisticas": {
    "roi": "0.32%",
    "tasa_victoria": "100.00%"
  }
}
```

### Registro de Pérdida
```
POST /api/chicken/session
{
  "sessionId": "session-1234567890",
  "tipo": "PERDIDA",
  "apuesta": 0.2
}
```

**Respuesta**:
```json
{
  "success": true,
  "resultado": "PERDIDA",
  "balance": {
    "actual": 99.8,
    "perdido": 0.2,
    "partidas_perdidas": 1
  },
  "estadisticas": {
    "roi": "-0.20%",
    "tasa_victoria": "0.00%"
  }
}
```

---

## ✅ Características Implementadas

- ✅ Diálogo de balance y apuesta al inicio
- ✅ Validación de apuesta (mínimo 0.2, incremento 0.2)
- ✅ Validación de balance suficiente
- ✅ Creación de sesión en backend
- ✅ Registro de ganancias con multiplicador correcto
- ✅ Registro de pérdidas
- ✅ Actualización de balance en tiempo real
- ✅ Visualización de balance y apuesta en pantalla
- ✅ Multiplicadores correctos para 4 huesos
- ✅ Cálculo de partidas posibles
- ✅ Integración con sistema de sesión existente

---

## 🎯 Próximos Pasos Sugeridos

### Mejoras de UI
1. **Gráfica de Balance**: Mostrar evolución del balance en tiempo real
2. **Historial de Partidas**: Lista de últimas partidas con ganancia/pérdida
3. **Estadísticas de Sesión**: ROI, tasa de victoria, mejor racha
4. **Alertas**: Notificar cuando el balance esté bajo

### Funcionalidades Adicionales
1. **Stop Loss**: Detener automáticamente si se pierde X% del balance
2. **Take Profit**: Retirarse automáticamente al alcanzar objetivo
3. **Gestión de Riesgo**: Sugerir apuesta según balance y racha
4. **Múltiples Sesiones**: Comparar rendimiento entre sesiones

### Optimizaciones
1. **Persistencia**: Guardar sesión en localStorage
2. **Recuperación**: Continuar sesión después de cerrar navegador
3. **Exportación**: Descargar historial de sesión en CSV
4. **Análisis**: Generar reporte de rendimiento

---

## 📝 Notas Técnicas

### SessionId
- Se genera automáticamente: `session-${Date.now()}`
- Se mantiene durante toda la sesión
- Se puede reutilizar para continuar sesión

### Cálculo de Ganancia
```typescript
const ganancia = apuesta * multiplicador;
const ganancia_neta = ganancia - apuesta;
balance_nuevo = balance_actual + ganancia_neta;
```

### Cálculo de Pérdida
```typescript
balance_nuevo = balance_actual - apuesta;
```

### Validaciones
- Apuesta mínima: 0.2
- Apuesta máxima: balance actual
- Apuesta debe ser múltiplo de 0.2
- Balance debe ser mayor que apuesta

---

*Documento creado: 4 de febrero de 2026*  
*Versión: 1.0*  
*Estado: Completado*
