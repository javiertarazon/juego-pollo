# 🎮 RESUMEN DEL ESTADO ACTUAL DEL SISTEMA — 6 de Febrero 2026

> Documento generado tras auditoría completa de 86 archivos de documentación.
> Se conservaron 20 documentos vigentes y se eliminaron 66 obsoletos/redundantes.

---

## 📐 ARQUITECTURA GENERAL

| Componente | Tecnología |
|------------|------------|
| **Frontend** | Next.js 15 + React + TailwindCSS + shadcn/ui |
| **Backend/API** | Next.js API Routes (App Router) |
| **Base de Datos** | SQLite vía Prisma ORM |
| **ML Engine** | Q-Learning (Reinforcement Learning) custom en TypeScript |
| **Persistencia ML** | JSON en disco (`ml-data/ml-state-v5.json`) + Prisma |

---

## 🧠 SISTEMA DE MACHINE LEARNING (ML V5) — VIGENTE

### Algoritmo: Q-Learning con Epsilon-Greedy
- **Learning Rate (α):** 0.15
- **Discount Factor (γ):** 0.85
- **Epsilon inicial:** 30% exploración → decae hasta 15% mínimo
- **Decay:** 0.998 por partida
- **Memoria anti-repetición:** Últimas 15 posiciones seguras

### Estrategia de Zonas
- **Zona A** (posiciones 1-15): Mitad superior del tablero
- **Zona B** (posiciones 16-25): Mitad inferior del tablero
- El sistema **alterna zonas** automáticamente para anti-detección

### Sistema Adaptativo (cada 60 segundos)
- Analiza últimas 10 partidas reales
- Detecta **rotación de huesos** por Mystake
- Identifica **zonas calientes** (posiciones con >30% frecuencia de hueso)
- Peso adaptativo: 40% del score final

### Persistencia (NUEVA — Feb 2026)
- **Al iniciar:** Carga `ml-state-v5.json` desde disco (Q-values, epsilon, tasas de éxito)
- **Tras cada partida:** Guarda estado completo en disco automáticamente
- **Si no existe archivo:** Reconstruye desde BD (últimas 200 partidas reales)
- **Reset de seguridad:** Al cargar, resetea Stop-Loss para no arrancar bloqueado

### Stop-Loss
- Se activa tras **3 derrotas consecutivas**
- Recomienda pausar y analizar patrones
- Se resetea automáticamente al reiniciar el servidor

---

## 👥 DOS ASESORES DISPONIBLES

### 1. Asesor Original (5 posiciones)
- Sugiere **5 posiciones** por partida
- Tasa de éxito esperada: **50-55%**
- Usa Q-Learning estándar con diversidad forzada

### 2. Asesor Rentable (2-3 posiciones)
- Sugiere solo **2-3 posiciones ultra-seguras**
- Tasa de éxito esperada: **75-85%**
- Se enfoca en las 10 posiciones con mayor tasa histórica de éxito

### 10 Posiciones Ultra-Seguras (93%+ éxito histórico)
| Posición | Tasa éxito |
|----------|------------|
| 19 | 97.7% |
| 13 | 97.0% |
| 7  | 96.3% |
| 18 | 96.0% |
| 11 | 95.7% |
| 10 | 95.3% |
| 6  | 94.7% |
| 25 | 94.3% |
| 22 | 93.7% |
| 1  | 93.3% |

---

## 🔌 ENDPOINTS API PRINCIPALES

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/chicken/predict` | POST | Obtener predicción ML de posiciones seguras |
| `/api/chicken/game` | POST | Crear nueva partida |
| `/api/chicken/result` | POST | Registrar resultado de partida |
| `/api/chicken/simulate` | POST | Ejecutar simulación de entrenamiento |
| `/api/chicken/advanced-stats` | GET | Estadísticas avanzadas + análisis condicional |
| `/api/chicken/export-csv` | GET | Exportar datos a CSV |
| `/api/chicken/train-simulator` | GET | Entrenamiento automático con simulador |
| `/api/chicken/train-advisor` | POST | Entrenamiento del asesor |
| `/api/ml/train-advisor` | POST | Entrenamiento ML del asesor rentable |

---

## 📊 ANÁLISIS CONDICIONAL DE POSICIONES (NUEVO — Feb 2026)

### Basado en Último Pollo Revelado
- Calcula **distancia Manhattan** entre posiciones del pollo
- Genera **probabilidades condicionales**: "Si el último pollo estaba en X, ¿dónde estará el siguiente?"
- Analiza patrones con **1 y 2 posiciones previas** de contexto
- Integrado en `/api/chicken/advanced-stats`

---

## 🗃️ BASE DE DATOS (Prisma + SQLite)

### Modelo `ChickenGame`
- `id`, `createdAt`, `betAmount`, `boneCount`, `multiplier`
- `hitBone` (boolean), `profit`, `selectedPosition`
- `isSimulated` (separa reales de simuladas)
- **Todos los campos con defaults** (sin valores null)

### Modelo `ChickenPosition`
- `position` (1-25), `isChicken`, `isBone`, `revealed`
- `revealOrder` (default 0), `isSelected`

### Datos Actuales
- **~5,335+ partidas** normalizadas en BD
- Solo partidas con `isSimulated: false` se usan para entrenar el ML

---

## 🛡️ SISTEMA ANTI-DETECCIÓN

1. **Alternancia de zonas:** Cambia entre Zona A y B cada partida
2. **Ruido aleatorio:** Epsilon mantiene mínimo 15% de exploración
3. **Posiciones quemadas:** Memoria de 15 posiciones previas para no repetir
4. **Contra-estrategia:** Detecta cuando Mystake adapta patrones y aumenta exploración
5. **Detección de adaptación:** Si 3+ derrotas en últimas 5 partidas, modifica epsilon ×1.2

---

## 📁 ESTRUCTURA DE DOCUMENTACIÓN ACTUAL (docs/)

### 📗 Guías de Uso
- `INICIO_RAPIDO.md` — Cómo empezar desde cero
- `COMO_USAR_SISTEMA_COMPLETO.md` — Manual completo de usuario
- `COMO_USAR_SIMULADOR_INTERFAZ.md` — Guía del simulador
- `INSTRUCCIONES_USUARIO.md` — Instrucciones generales
- `INSTRUCCIONES_SELECTOR_ASESOR.md` — Selector Original/Rentable

### 📘 Documentación Técnica
- `PREDICTOR_V5_MACHINE_LEARNING.md` — Spec del ML V5
- `README_ML_V5.md` — README técnico del ML
- `ENSEMBLE_SYSTEM_GUIDE.md` — Sistema Ensemble
- `SISTEMA_ADAPTATIVO_IMPLEMENTADO.md` — Analizador adaptativo
- `SISTEMA_ESTADISTICAS_COMPLETO.md` — Sistema de estadísticas
- `NUEVOS_ENDPOINTS_ESTADISTICAS.md` — Endpoints de stats

### 📙 Análisis y Datos
- `ANALISIS_EXHAUSTIVO_SISTEMA_ML.md` — Análisis profundo de ambos asesores
- `ANALISIS_SIMULADOR_MYSTAKE_COMPLETO.md` — Patrones del simulador
- `ASESOR_RENTABLE_2-3_POSICIONES.md` — Config del asesor rentable

### 📕 Referencia Interna
- `INSTRUCCIONES_GITHUB_COPILOT.md` — Contexto para IA
- `INSTRUCCIONES_PRIORITARIAS.md` — Reglas del proyecto
- `worklog.md` — Log histórico de desarrollo

---

## ✅ CORRECCIONES APLICADAS (Sesión Feb 2026)

1. **Eliminación de nulls en BD** — Schema Prisma con defaults, script de normalización ejecutado
2. **Modelo `RealBonePositions` eliminado** — Era redundante
3. **Persistencia ML en disco** — `ml-data/ml-state-v5.json` se guarda/carga automáticamente
4. **Análisis condicional** — Probabilidades basadas en último pollo con distancia Manhattan
5. **Export CSV corregido** — Filtro `revealOrder > 0` en vez de `!= null`
6. **Stop-Loss con reset automático** — No bloquea al reiniciar servidor

---

## 🚀 CÓMO INICIAR

```bash
# Instalar dependencias
npm install

# Generar cliente Prisma
npx prisma generate

# Iniciar servidor de desarrollo
npm run dev

# Abrir navegador
# http://localhost:3000
```

---

*Última actualización: 6 de febrero de 2026*
