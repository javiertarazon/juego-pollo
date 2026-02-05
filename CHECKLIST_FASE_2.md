# ✅ CHECKLIST - OPTIMIZACIÓN FASE 2

## 📋 ESTADO ACTUAL

### ✅ Completado
- [x] Análisis de últimas 30 partidas ejecutado
- [x] Problemas identificados (tasa 40%, 3 posiciones sobre-usadas)
- [x] Optimizaciones Fase 2 aplicadas en código
- [x] Verificación de compilación sin errores
- [x] Documentación completa generada
- [x] Scripts de análisis creados

### 🔄 Pendiente (ACCIÓN REQUERIDA)
- [ ] **PASO 1**: Reiniciar servidor (`npm run dev`)
- [ ] **PASO 2**: Jugar 30 partidas completas
- [ ] **PASO 3**: Ejecutar análisis post-Fase 2
- [ ] **PASO 4**: Comparar resultados
- [ ] **PASO 5**: Decidir siguiente acción

---

## 🚀 INSTRUCCIONES PASO A PASO

### PASO 1: Reiniciar Servidor
```bash
# En la terminal donde corre el servidor:
# 1. Presionar Ctrl+C para detener
# 2. Ejecutar:
npm run dev

# 3. Esperar mensaje: "Ready on http://localhost:3000"
```

**✅ Verificar**: Servidor corriendo sin errores

---

### PASO 2: Jugar 30 Partidas
1. Abrir navegador en `http://localhost:3000`
2. Configurar:
   - Balance inicial: 100 (o el que prefieras)
   - Apuesta: 0.2 (mínima recomendada)
   - Huesos: 4
3. Iniciar partida
4. **IMPORTANTE**: Seguir las sugerencias del sistema
5. Repetir hasta completar 30 partidas

**📝 Anotar**:
- Posiciones sugeridas repetidas
- Rachas largas de derrotas
- Comportamiento extraño del sistema

**✅ Verificar**: 30 partidas completadas

---

### PASO 3: Ejecutar Análisis
```bash
# Análisis de últimas 30 partidas
npx tsx analisis/analizar-ultimas-30-partidas.ts

# Si tienes 60+ partidas, ejecutar comparación
npx tsx analisis/comparar-fases-optimizacion.ts
```

**✅ Verificar**: Análisis ejecutado sin errores

---

### PASO 4: Revisar Resultados

#### ✅ ÉXITO (Continuar con sistema actual)
- [ ] Tasa de éxito > 55%
- [ ] Racha máxima derrotas < 5
- [ ] Ninguna posición con > 4 usos
- [ ] Distribución uniforme de posiciones

**Acción**: Mantener configuración, monitorear 100 partidas más

---

#### ⚠️ MEJORÍA PARCIAL (Ajustar parámetros)
- [ ] Tasa de éxito 48-55%
- [ ] Racha máxima derrotas 5-7
- [ ] Pocas posiciones con > 4 usos

**Acción**: Aplicar ajustes menores (ver documento)

---

#### ❌ FALLO (Cambio de estrategia)
- [ ] Tasa de éxito < 48%
- [ ] Racha máxima derrotas > 7
- [ ] Muchas posiciones con > 4 usos

**Acción**: Implementar FASE 3 (cambio completo de estrategia)

---

### PASO 5: Decidir Siguiente Acción

Según resultados del PASO 4, elegir:

**Si ÉXITO ✅**:
```bash
# Continuar monitoreando
# Jugar 100 partidas más
# Documentar patrones exitosos
```

**Si MEJORÍA PARCIAL ⚠️**:
```bash
# Aplicar ajustes menores
# Ver: INSTRUCCIONES_OPTIMIZACION_FASE_2.md
# Sección: "Si Tasa 48-55%"
```

**Si FALLO ❌**:
```bash
# Implementar FASE 3
# Opciones:
# 1. Sistema de zonas rotativas
# 2. Exploración pura (epsilon = 1.0)
# 3. Anti-patrón basado en historial
```

---

## 📊 MÉTRICAS OBJETIVO

| Métrica | Actual (Pre-Fase 2) | Objetivo Fase 2 | Estado |
|---------|---------------------|-----------------|--------|
| Tasa de éxito | 40.0% | > 55% | 🔄 Pendiente |
| Racha máx derrotas | 7 | < 5 | 🔄 Pendiente |
| Posiciones > 4 usos | 3 | 0 | 🔄 Pendiente |
| Diversidad | Media | Alta | 🔄 Pendiente |

---

## 📁 DOCUMENTOS DE REFERENCIA

1. **OPTIMIZACION_URGENTE_FASE_2.md** - Detalles técnicos
2. **INSTRUCCIONES_OPTIMIZACION_FASE_2.md** - Guía completa
3. **RESUMEN_OPTIMIZACION_COMPLETA.md** - Resumen ejecutivo
4. **ANALISIS_30_PARTIDAS_Y_CORRECCIONES.md** - Análisis previo

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### Servidor no inicia
```bash
# Verificar puerto 3000 libre
netstat -ano | findstr :3000

# Si está ocupado, matar proceso
taskkill /PID [número_pid] /F

# Reintentar
npm run dev
```

### Error en análisis
```bash
# Verificar base de datos
npx tsx utilidades/scripts/check-db.ts

# Verificar cantidad de partidas
npx tsx utilidades/scripts/count-games.ts
```

### Sugerencias no cambian
```bash
# Verificar logs del servidor
# Buscar: "ML: Pos X | EXPLORE/EXPLOIT"
# Si siempre es EXPLOIT, aumentar MIN_EPSILON
```

---

## 📞 CONTACTO

Si encuentras problemas o necesitas ayuda:
1. Revisar logs del servidor
2. Revisar consola del navegador (F12)
3. Verificar documentación generada
4. Ejecutar scripts de diagnóstico

---

**Fecha**: 2026-02-04
**Versión**: Fase 2 - Ultra Agresiva
**Estado**: ✅ Lista para pruebas
**Próximo paso**: Reiniciar servidor y jugar 30 partidas
