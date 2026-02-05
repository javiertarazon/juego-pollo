# 🎯 Cómo Usar el Selector de Asesor ML

## 🚀 INICIO RÁPIDO

### 1. Abrir la Aplicación

```
http://localhost:3000
```

El servidor ya está corriendo en el puerto 3000.

---

## 📋 PASOS PARA USAR EL SELECTOR

### Paso 1: Iniciar Sesión

1. En la página principal, click en **"Comenzar a Asesorar"**
2. Se abrirá el diálogo de configuración

### Paso 2: Configurar Balance y Apuesta

1. **Balance Inicial**: Ingresa tu capital (ej: 100)
2. **Apuesta por Partida**: Ingresa tu apuesta (ej: 0.2)
   - Mínimo: 0.2
   - Incremento: 0.2

### Paso 3: Seleccionar Tipo de Asesor

Ahora verás una nueva sección: **"🎯 Tipo de Asesor ML"**

#### Opción 1: Asesor Original (5 posiciones)

```
🎯 Asesor Original (5 posiciones)
Objetivo: 5 pos | Éxito: 50-55% | Exploración: 35%

Características:
• Objetivo: Llegar a 5 posiciones seguras
• Tasa de éxito: 50-55% de las partidas
• Exploración: 35% (más variedad)
• Usa todas las posiciones disponibles
• Rentabilidad: Moderada, mayor riesgo
```

**Cuándo usar**: 
- Quieres maximizar ganancias (multiplicador 2.58x)
- Estás dispuesto a asumir más riesgo
- Tienes un balance grande

#### Opción 2: Asesor Rentable (2-3 posiciones)

```
💰 Asesor Rentable (2-3 posiciones)
Objetivo: 2-3 pos | Éxito: 75-85% | Exploración: 25%

Características:
• Objetivo: 2-3 posiciones seguras (configurable)
• Tasa de éxito: 75-85% de las partidas
• Exploración: 25% (más conservador)
• Solo posiciones ultra seguras (93%+ pollos)
• Rentabilidad: 41-71% por partida ganada
```

**Cuándo usar**:
- Prefieres consistencia sobre grandes ganancias
- Quieres minimizar pérdidas
- Tienes un balance limitado
- Buscas rentabilidad constante

### Paso 4: Configurar Objetivo (Solo Asesor Rentable)

Si seleccionaste **Asesor Rentable**, verás un selector adicional:

```
Objetivo de Posiciones:

┌─────────────────────────────────────┐
│ 2 Posiciones                        │
│ Más seguro | Mult: 1.41x | +41%    │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 3 Posiciones                        │
│ Equilibrado | Mult: 1.71x | +71%   │
└─────────────────────────────────────┘
```

**Recomendaciones**:
- **2 Posiciones**: Máxima seguridad, menor ganancia
- **3 Posiciones**: Balance entre seguridad y ganancia

### Paso 5: Comenzar Partida

1. Revisa el resumen:
   - Balance: 100.00
   - Apuesta: 0.20
   - Partidas posibles: 500

2. Click en **"Comenzar Partida"**

---

## 🎮 DURANTE EL JUEGO

### Indicador Visual del Asesor Activo

En la pantalla principal verás una tarjeta destacada:

```
┌─────────────────────────────────────────────────────┐
│ 💰 Asesor Rentable Activo          [RENTABLE]      │
│ Objetivo: 2 posiciones | Éxito: 75-85% | Exp: 25%  │
├─────────────────────────────────────────────────────┤
│ Estrategia          Rentabilidad      Pos. Seguras │
│ Solo ultra seguras  +41% por partida  10 posiciones│
└─────────────────────────────────────────────────────┘
```

Esta tarjeta te recuerda:
- Qué asesor está activo
- Cuál es el objetivo
- Qué rentabilidad esperar

### Predicciones Adaptadas

El sistema generará predicciones según el asesor elegido:

**Asesor Original**:
- Sugiere posiciones de todas las 25 disponibles
- Mayor variedad en las sugerencias
- Objetivo: llegar a 5 posiciones

**Asesor Rentable**:
- Sugiere solo de las 10 posiciones más seguras
- Más conservador en las sugerencias
- Objetivo: llegar a 2-3 posiciones

---

## 🔄 CAMBIAR DE ASESOR

Para cambiar de asesor durante una sesión:

1. Click en **"Salir Completamente"**
2. Confirma que quieres salir
3. Click en **"Comenzar a Asesorar"** nuevamente
4. Selecciona el otro asesor
5. Configura y comienza nueva sesión

**Nota**: Cambiar de asesor resetea:
- Balance y apuesta
- Rachas de victorias/derrotas
- Sesión actual
- Tablero y partida

Las estadísticas históricas se mantienen en la base de datos.

---

## 📊 EJEMPLOS DE USO

### Ejemplo 1: Jugador Conservador

```
Balance: 50
Apuesta: 0.2
Asesor: Rentable
Objetivo: 2 posiciones

Resultado esperado:
- 75-85% de éxito
- Ganancia por partida: +0.082 (41%)
- 10 partidas ganadas = +0.82
```

### Ejemplo 2: Jugador Agresivo

```
Balance: 100
Apuesta: 0.5
Asesor: Original
Objetivo: 5 posiciones

Resultado esperado:
- 50-55% de éxito
- Ganancia por partida: +0.79 (158%)
- 10 partidas ganadas = +7.90
```

### Ejemplo 3: Balance Limitado

```
Balance: 20
Apuesta: 0.2
Asesor: Rentable
Objetivo: 2 posiciones

Estrategia:
- Minimizar pérdidas
- Acumular ganancias pequeñas
- Aumentar balance gradualmente
```

---

## ⚠️ RECOMENDACIONES

### Stop-Loss Automático

El sistema tiene un **stop-loss automático** después de 3 derrotas consecutivas:

```
⚠️ ALERTA DE STOP-LOSS

Has perdido 3 partidas consecutivas.
Balance actual: 95.40
Pérdidas acumuladas: 4.60

Recomendaciones:
• Tomar un descanso
• Revisar estrategia
• Reducir apuesta

¿Deseas continuar jugando?
```

### Gestión de Balance

**Con Asesor Original**:
- Mantén al menos 50 partidas de reserva
- Ejemplo: Balance 100, Apuesta máxima 2.0

**Con Asesor Rentable**:
- Puedes usar apuestas más altas
- Ejemplo: Balance 100, Apuesta máxima 5.0

### Cambio de Estrategia

**Cuándo cambiar a Asesor Rentable**:
- Después de 3+ derrotas consecutivas
- Cuando el balance baja 20%+
- Para recuperar pérdidas gradualmente

**Cuándo cambiar a Asesor Original**:
- Después de 5+ victorias consecutivas
- Cuando el balance sube 50%+
- Para maximizar ganancias

---

## 🎯 COMPARACIÓN RÁPIDA

| Característica | Original | Rentable |
|----------------|----------|----------|
| **Objetivo** | 5 posiciones | 2-3 posiciones |
| **Éxito** | 50-55% | 75-85% |
| **Exploración** | 35% | 25% |
| **Posiciones** | 25 (todas) | 10 (seguras) |
| **Multiplicador** | 2.58x | 1.41x - 1.71x |
| **Ganancia** | +158% | +41% - +71% |
| **Riesgo** | Alto | Bajo |
| **Consistencia** | Media | Alta |

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### No veo el selector de asesor

**Solución**: 
1. Asegúrate de estar en la última versión
2. Refresca la página (F5)
3. Limpia caché del navegador

### El asesor no cambia

**Solución**:
1. Sal completamente de la sesión
2. Vuelve a iniciar
3. Selecciona el asesor deseado

### Las predicciones no se adaptan

**Solución**:
1. Verifica el indicador visual del asesor
2. Revisa la consola del navegador (F12)
3. Reinicia el servidor si es necesario

---

## 📞 SOPORTE

Si tienes problemas:

1. Revisa este documento
2. Consulta `RESUMEN_SELECTOR_ASESOR.md`
3. Revisa la consola del navegador (F12)
4. Verifica que el servidor esté corriendo

---

## ✅ CHECKLIST DE USO

- [ ] Servidor corriendo en http://localhost:3000
- [ ] Click en "Comenzar a Asesorar"
- [ ] Configurar balance y apuesta
- [ ] Seleccionar tipo de asesor
- [ ] (Si Rentable) Seleccionar objetivo
- [ ] Verificar resumen
- [ ] Click "Comenzar Partida"
- [ ] Verificar indicador visual del asesor
- [ ] Jugar y confirmar predicciones

---

**¡Listo para jugar con el asesor de tu elección!** 🎉

---

**Fecha**: 5 de febrero de 2026  
**Versión**: 1.0  
**Servidor**: http://localhost:3000
