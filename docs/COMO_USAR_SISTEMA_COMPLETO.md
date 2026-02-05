# 🎮 CÓMO USAR EL SISTEMA COMPLETO

## 📋 Guía de Usuario

Esta guía te explica cómo usar el sistema completo de predicción y gestión de balance para el juego del pollo.

**Fecha**: 4 de febrero de 2026  
**Versión**: 2.0  
**Estado**: ✅ COMPLETAMENTE FUNCIONAL

---

## 🚀 Inicio Rápido

### 1. Acceder a la Aplicación

Abre tu navegador y ve a:
```
http://localhost:3000
```

### 2. Configurar Balance y Apuesta

Al hacer clic en **"Comenzar Asesoría"**, verás un diálogo con:

**Balance Inicial**:
- Tu capital disponible para jugar
- Ejemplo: 100 (puedes poner cualquier cantidad)

**Apuesta por Partida**:
- Cantidad que apostarás en cada partida
- Mínimo: 0.2
- Incremento: 0.2 (0.2, 0.4, 0.6, 0.8, 1.0, etc.)

**Información Mostrada**:
- Balance: Tu capital actual
- Apuesta: Cantidad por partida
- Partidas posibles: Cuántas partidas puedes jugar

**Ejemplo**:
```
Balance Inicial: 100
Apuesta: 0.2
Partidas posibles: 500
```

### 3. Comenzar a Jugar

1. Haz clic en **"Comenzar Partida"**
2. El sistema te sugerirá una posición (ejemplo: Posición 13)
3. Ve a Mystake y haz clic en esa posición
4. Regresa a la aplicación y confirma:
   - 🐔 **POLLO** si fue seguro
   - 💀 **HUESO** si perdiste

### 4. Durante el Juego

En la pantalla verás:
- **Multiplicador actual**: Ejemplo: 2.58x
- **Pollos descubiertos**: Ejemplo: 5 Pollos
- **Balance actual**: Ejemplo: 💰 100.32
- **Apuesta**: Ejemplo: 🎯 0.2

### 5. Retirar (Victoria)

Cuando quieras retirar:
1. Haz clic en **"RETIRAR"**
2. El sistema calculará tu ganancia automáticamente
3. Ejemplo:
   - Pollos: 5
   - Multiplicador: 2.58x
   - Ganancia: 0.2 × 2.58 = 0.516
   - Ganancia neta: 0.516 - 0.2 = 0.316
   - Nuevo balance: 100.316 ✅

4. Ingresa las posiciones de los huesos (separadas por comas)
5. El sistema guardará la partida y actualizará estadísticas

### 6. Continuar Jugando

Después de cada partida:
- El balance se actualiza automáticamente
- Puedes ver tu progreso en tiempo real
- Las estadísticas se actualizan con cada partida

---

## 📊 Entender las Estadísticas

### Posiciones Más Seguras

El sistema identifica las posiciones con menor probabilidad de ser huesos:

**Ejemplo**:
```
Posición 0: 0% huesos (nunca ha sido hueso)
Posición 5: 8% huesos, 92% pollos
Posición 6: 8% huesos, 92% pollos
```

**Interpretación**:
- Estas posiciones son las más seguras para empezar
- Tienen alta probabilidad de ser pollos

### Posiciones Peligrosas

Posiciones con alta probabilidad de ser huesos:

**Ejemplo**:
```
Posición 14: 17% huesos
Posición 24: 17% huesos
Posición 2: 15% huesos
```

**Interpretación**:
- Evita estas posiciones
- Tienen mayor riesgo

### Patrones Capitalizables

El sistema identifica 3 tipos de patrones:

#### 1. POSICIONES_MUY_SEGURAS (Confianza: ALTA)
```
Posiciones: 0, 5, 6, 18, 22
Descripción: Menos del 15% de huesos
```
**Uso**: Comienza siempre con estas posiciones

#### 2. POLLOS_CONSECUTIVOS (Confianza: MEDIA-ALTA)
```
Posiciones: 18, 22, 11, 5, 6
Descripción: Tienden a repetir como pollos
```
**Uso**: Continúa con estas después de las primeras

#### 3. CAMBIOS_PREDECIBLES (Confianza: MEDIA)
```
Descripción: Cambian con frecuencia regular
```
**Uso**: Úsalas con precaución

### Recomendaciones Automáticas

El sistema genera 3 tipos de recomendaciones:

#### INICIO_PARTIDA (Prioridad: ALTA)
```
Posiciones: 0, 5, 6, 18, 22
Apuesta sugerida: 0.2
Razón: 0% huesos históricamente
```

#### CONTINUACION (Prioridad: MEDIA)
```
Posiciones: 5, 6, 18, 22, 1
Apuesta sugerida: 0.4
Razón: 92% pollos históricamente
```

#### EVITAR (Prioridad: ALTA)
```
Posiciones: 14, 24, 2, 12, 21
Razón: 17% huesos (alto riesgo)
```

---

## 💰 Gestión de Balance

### Cálculo de Ganancias

**Fórmula**:
```
Ganancia = Apuesta × Multiplicador
Ganancia Neta = Ganancia - Apuesta
Balance Nuevo = Balance Actual + Ganancia Neta
```

**Ejemplo**:
```
Apuesta: 0.2
Pollos descubiertos: 5
Multiplicador: 2.58x

Ganancia = 0.2 × 2.58 = 0.516
Ganancia Neta = 0.516 - 0.2 = 0.316
Balance Nuevo = 100 + 0.316 = 100.316
```

### Cálculo de Pérdidas

**Fórmula**:
```
Balance Nuevo = Balance Actual - Apuesta
```

**Ejemplo**:
```
Apuesta: 0.2
Encontró hueso

Balance Nuevo = 100 - 0.2 = 99.8
```

### Tabla de Multiplicadores (4 Huesos)

| Pollos | Multiplicador | Ganancia (0.2) | Ganancia (1.0) |
|--------|---------------|----------------|----------------|
| 1      | 1.17x         | 0.23           | 1.17           |
| 2      | 1.41x         | 0.28           | 1.41           |
| 3      | 1.71x         | 0.34           | 1.71           |
| 4      | 2.09x         | 0.42           | 2.09           |
| 5      | 2.58x         | 0.52           | 2.58           |
| 6      | 3.23x         | 0.65           | 3.23           |
| 7      | 4.09x         | 0.82           | 4.09           |
| 8      | 5.26x         | 1.05           | 5.26           |
| 9      | 6.88x         | 1.38           | 6.88           |
| 10     | 9.17x         | 1.83           | 9.17           |
| 15     | 58.33x        | 11.67          | 58.33          |
| 21     | 6187.50x      | 1237.50        | 6187.50        |

---

## 🎯 Estrategias Recomendadas

### Estrategia Conservadora (Recomendada para Principiantes)

**Objetivo**: Ganancias pequeñas pero consistentes

**Configuración**:
- Balance inicial: 100
- Apuesta: 0.2
- Objetivo: 5-7 pollos (2.58x - 4.09x)

**Pasos**:
1. Comienza con posiciones seguras (0, 5, 6, 18, 22)
2. Retírate al descubrir 5-7 pollos
3. No arriesgues más del 2% del balance por partida

**Ejemplo de Sesión**:
```
Partida 1: 5 pollos → +0.32 (Balance: 100.32)
Partida 2: 6 pollos → +0.45 (Balance: 100.77)
Partida 3: 5 pollos → +0.32 (Balance: 101.09)
Partida 4: Hueso → -0.20 (Balance: 100.89)
Partida 5: 7 pollos → +0.62 (Balance: 101.51)

Resultado: +1.51 en 5 partidas (ROI: 1.51%)
```

### Estrategia Moderada

**Objetivo**: Balance entre riesgo y ganancia

**Configuración**:
- Balance inicial: 100
- Apuesta: 0.4
- Objetivo: 8-10 pollos (5.26x - 9.17x)

**Pasos**:
1. Comienza con posiciones seguras
2. Continúa con posiciones de pollos consecutivos
3. Retírate al descubrir 8-10 pollos
4. No arriesgues más del 5% del balance por partida

### Estrategia Agresiva (Solo para Expertos)

**Objetivo**: Ganancias grandes con alto riesgo

**Configuración**:
- Balance inicial: 100
- Apuesta: 1.0
- Objetivo: 15+ pollos (58.33x+)

**Advertencia**: ⚠️ Alto riesgo de pérdida total

---

## 📈 Monitoreo de Progreso

### Estadísticas de Sesión

Puedes ver en tiempo real:
- **Balance actual**: Tu capital disponible
- **ROI**: Retorno de inversión (%)
- **Tasa de victoria**: Porcentaje de partidas ganadas
- **Racha actual**: Victorias/derrotas consecutivas
- **Mejor racha**: Máximo de victorias consecutivas
- **Peor racha**: Máximo de derrotas consecutivas

### Gráfica de Equity

El sistema genera una gráfica que muestra:
- Evolución del balance por partida
- Puntos de ganancia (verde)
- Puntos de pérdida (rojo)

---

## 🔧 Solución de Problemas

### El servidor no inicia

**Solución**:
```bash
npm run dev
```

### No aparece el diálogo de balance

**Solución**:
1. Refresca la página (F5)
2. Limpia caché del navegador
3. Reinicia el servidor

### El balance no se actualiza

**Solución**:
1. Verifica que ingresaste las posiciones de huesos correctamente
2. Refresca la página
3. Revisa la consola del navegador (F12)

### Las estadísticas no cambian

**Solución**:
1. Asegúrate de ingresar las posiciones de huesos al final de cada partida
2. Las estadísticas se actualizan después de guardar la partida completa
3. Refresca la página para ver cambios

---

## 💡 Consejos Importantes

### 1. Gestión de Riesgo
- ✅ Nunca apuestes más del 5% de tu balance
- ✅ Establece un límite de pérdidas diarias
- ✅ Retírate cuando alcances tu objetivo

### 2. Uso de Estadísticas
- ✅ Sigue las recomendaciones del sistema
- ✅ Evita posiciones peligrosas
- ✅ Comienza siempre con posiciones seguras

### 3. Disciplina
- ✅ No persigas pérdidas
- ✅ Mantén la calma después de derrotas
- ✅ Celebra victorias pequeñas

### 4. Registro de Partidas
- ✅ Siempre ingresa las posiciones de huesos correctamente
- ✅ Esto mejora las estadísticas y predicciones
- ✅ Separa las posiciones con comas (ejemplo: 6,9,12,14)

---

## 📞 Soporte

Si tienes problemas o preguntas:

1. **Revisa la documentación**:
   - `docs/SISTEMA_ESTADISTICAS_COMPLETO.md`
   - `docs/INTEGRACION_BALANCE_APUESTA.md`
   - `docs/NUEVOS_ENDPOINTS_ESTADISTICAS.md`

2. **Verifica el servidor**:
   ```bash
   npm run dev
   ```

3. **Revisa los logs**:
   - Abre la consola del navegador (F12)
   - Busca errores en rojo

---

## 🎉 ¡Buena Suerte!

Recuerda:
- 🎯 Sigue las recomendaciones del sistema
- 💰 Gestiona tu balance responsablemente
- 📊 Aprende de las estadísticas
- 🎮 ¡Diviértete jugando!

---

*Documento creado: 4 de febrero de 2026*  
*Versión: 2.0*  
*Sistema completamente funcional*
