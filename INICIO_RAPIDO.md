# 🚀 INICIO RÁPIDO - SISTEMA DE ENTRENAMIENTO

## 📋 PASOS PARA EMPEZAR

### 1️⃣ Verificar el Sistema

**Opción A - Usando el script batch (Windows)**:
```bash
comandos-sistema.bat
# Seleccionar opción [1] Verificar estado del sistema
```

**Opción B - Comando directo**:
```bash
npx tsx verificar-sistema.ts
```

**Resultado esperado**:
```
✅ Base de datos: Conectada
✅ Partidas reales: 988
✅ Archivos de análisis: Presentes
✅ Endpoints API: Presentes
⚠️  Simulador entrenado: NO (pendiente)
```

---

### 2️⃣ Entrenar el Simulador

**Opción A - Interfaz web (RECOMENDADO)**:
```bash
# 1. Iniciar servidor
npm run dev

# 2. Abrir navegador: http://localhost:3000
# 3. Ir a pestaña "Simulador"
# 4. Clic en "Entrenar Simulador"
# 5. Esperar 5-10 segundos
# 6. Ver resultados en el alert
```

**Resultado esperado**:
```
✅ Simulador entrenado exitosamente

📊 Partidas analizadas: 988
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

---

### 3️⃣ Verificar Métricas del Simulador

**Opción A - Usando el script batch**:
```bash
comandos-sistema.bat
# Seleccionar opción [3] Enfrentamiento 100 partidas
```

**Opción B - Comando directo**:
```bash
npx tsx analisis/enfrentamiento-asesor-vs-simulador.ts 100 5
```

**Resultado esperado**:
```
⚔️  ENFRENTAMIENTO: ASESOR ML vs SIMULADOR MYSTAKE

✅ Victorias: 52/100 (52.00%)
❌ Derrotas: 48/100 (48.00%)
🎯 Objetivo alcanzado: 52 veces
📊 Promedio posiciones reveladas: 3.91

🎲 Estrategias usadas:
   EXPLORE: 167 (33.5%)
   EXPLOIT: 332 (66.5%)

📊 Uso de posiciones seguras: 9/10 (90.0%)
```

**Análisis**:
- ✅ Si tasa ≥ 55%: **Entrenar asesor** (Paso 4)
- ⚠️ Si tasa 50-54%: **Jugar más partidas** y re-entrenar simulador
- ❌ Si tasa < 50%: **Revisar patrones** y jugar más partidas

---

### 4️⃣ Entrenar el Asesor (Solo si tasa > 55%)

**⚠️ IMPORTANTE**: Solo ejecutar si el simulador tiene tasa > 55%

**Opción A - Interfaz web (RECOMENDADO)**:
```bash
# 1. Asegurarse de que servidor esté corriendo
# 2. Ir a http://localhost:3000
# 3. Pestaña "Simulador"
# 4. Verificar que simulador esté entrenado
# 5. Clic en "Entrenar Asesor"
# 6. Esperar 30-60 segundos
# 7. Ver resultados en el alert
```

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

### 5️⃣ Validar en Producción

**Jugar 20-30 partidas reales**:
```bash
# 1. Ir a http://localhost:3000
# 2. Jugar partidas siguiendo las sugerencias del asesor
# 3. Registrar todas las partidas
# 4. Comparar tasa real vs simulada
```

**Análisis de resultados**:
- ✅ Tasa real ≈ tasa simulada: **Sistema funcionando bien**
- ✅ Tasa real > tasa simulada: **¡Excelente! Sistema optimizado**
- ⚠️ Tasa real < tasa simulada: **Re-entrenar simulador con nuevas partidas**

---

## 🔄 CICLO DE MEJORA CONTINUA

```
┌─────────────────────────────────────────────────────────┐
│  1. Jugar 50-100 partidas reales                        │
│     ↓                                                    │
│  2. Entrenar simulador con nuevas partidas              │
│     ↓                                                    │
│  3. Verificar métricas (enfrentamiento)                 │
│     ↓                                                    │
│  4. ¿Tasa > 55%?                                        │
│     ├─ NO → Volver al paso 1                           │
│     └─ SÍ → Continuar                                   │
│     ↓                                                    │
│  5. Entrenar asesor (MANUAL)                            │
│     ↓                                                    │
│  6. Validar en producción (20-30 partidas)             │
│     ↓                                                    │
│  7. ¿Mejora?                                            │
│     ├─ SÍ → Continuar usando                           │
│     └─ NO → Volver al paso 1                           │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 COMANDOS RÁPIDOS

### Verificación
```bash
# Verificar sistema completo
npx tsx verificar-sistema.ts

# Contar partidas
npx tsx utilidades/scripts/count-games.ts
```

### Análisis
```bash
# Analizar 300 partidas
npx tsx analisis/analisis-profundo-300-partidas.ts

# Enfrentamiento 100 partidas
npx tsx analisis/enfrentamiento-asesor-vs-simulador.ts 100 5

# Enfrentamiento 500 partidas
npx tsx analisis/enfrentamiento-asesor-vs-simulador.ts 500 5
```

### Servidor
```bash
# Iniciar servidor
npm run dev

# Servidor en: http://localhost:3000
```

### Exportar Datos
```bash
# Exportar a CSV
npx tsx export-csv-data.ts
```

---

## 🎯 MÉTRICAS OBJETIVO

| Métrica | Objetivo | Actual | Estado |
|---------|----------|--------|--------|
| Tasa de éxito simulador | > 55% | ? | ⏳ Pendiente verificar |
| Tasa de éxito asesor | > 55% | ? | ⏳ Pendiente entrenar |
| Uso posiciones seguras | > 80% | ? | ⏳ Pendiente verificar |
| Partidas reales | > 100 | 988 | ✅ Excelente |

---

## ⚠️ PROBLEMAS COMUNES

### Error: "Cannot find module"
**Solución**:
```bash
npm install
```

### Error: "Database not found"
**Solución**:
```bash
npx prisma generate
npx prisma db push
```

### Error: "Port 3000 already in use"
**Solución**:
```bash
# Detener proceso en puerto 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Luego reiniciar servidor
npm run dev
```

### Simulador no entrena
**Solución**:
1. Verificar que haya al menos 50 partidas reales
2. Verificar que el servidor esté corriendo
3. Revisar logs del servidor para errores

---

## 📁 ARCHIVOS IMPORTANTES

### Configuración
- `ml-simulator-config.json` - Configuración del simulador (generado al entrenar)
- `db/custom.db` - Base de datos SQLite

### Scripts
- `verificar-sistema.ts` - Verificación completa del sistema
- `comandos-sistema.bat` - Menú interactivo (Windows)

### Documentación
- `docs/RESUMEN_SISTEMA_COMPLETO_FINAL.md` - Documentación completa
- `docs/SISTEMA_ENTRENAMIENTO_AUTOMATICO.md` - Guía de entrenamiento
- `INICIO_RAPIDO.md` - Este archivo

---

## 🆘 AYUDA

### Verificar estado actual
```bash
npx tsx verificar-sistema.ts
```

### Ver logs del servidor
```bash
# En la terminal donde corre npm run dev
# Buscar mensajes como:
# "🎓 Iniciando entrenamiento"
# "✅ Simulador entrenado"
# "🤖 Iniciando entrenamiento del asesor"
```

### Documentación completa
```bash
# Ver archivo:
docs/RESUMEN_SISTEMA_COMPLETO_FINAL.md
```

---

## ✅ CHECKLIST DE INICIO

- [ ] 1. Verificar sistema (`npx tsx verificar-sistema.ts`)
- [ ] 2. Iniciar servidor (`npm run dev`)
- [ ] 3. Entrenar simulador (interfaz web)
- [ ] 4. Verificar métricas (enfrentamiento 100 partidas)
- [ ] 5. Si tasa > 55%: Entrenar asesor
- [ ] 6. Validar con 20-30 partidas reales
- [ ] 7. Comparar resultados

---

**¡Listo para empezar!** 🚀

Ejecuta `comandos-sistema.bat` (Windows) o sigue los pasos anteriores para comenzar.

**Próximo paso**: Verificar el sistema con `npx tsx verificar-sistema.ts`
