# 🚀 Inicio Rápido - ML Predictor V5

## ⚡ Empezar en 3 Pasos

### 1️⃣ Obtener Predicción
```bash
npx tsx ml-predictor-standalone.ts predict
```
**Resultado**: Te dará una posición (ej: 19) y zona (ej: ZONE_B)

### 2️⃣ Jugar en Mystake
- Usa la posición sugerida
- Juega normalmente

### 3️⃣ Actualizar ML
```bash
# Si ganaste
npx tsx ml-predictor-standalone.ts update 19 true

# Si perdiste
npx tsx ml-predictor-standalone.ts update 19 false
```

**¡Eso es todo!** Repite estos 3 pasos.

---

## 📊 Ver Progreso

```bash
# Ver estadísticas completas
npx tsx ml-predictor-standalone.ts stats

# Probar variedad
npx tsx ml-predictor-standalone.ts test 20
```

---

## 🎯 Qué Esperar

### Primeras 10 Partidas
- Epsilon: ~25% (explora bastante)
- Q-values: 0.5-0.7 (aprendiendo)
- Variedad: 7-10 posiciones únicas

### Después de 50 Partidas
- Epsilon: ~10% (explora poco)
- Q-values: 0.7-0.9 (aprendido)
- Variedad: 15+ posiciones únicas
- Win rate: >60%

---

## ✅ Características Clave

1. **Alterna Zonas** - A → B → A → B (confunde a Mystake)
2. **No Repite** - Memoria de 7 posiciones
3. **Aprende** - Mejora con cada partida
4. **Variedad** - 46.7% posiciones únicas

---

## 🔧 Comandos Útiles

```bash
# Ayuda
npx tsx ml-predictor-standalone.ts help

# Resetear (si quieres empezar de cero)
npx tsx ml-predictor-standalone.ts reset

# Prueba rápida (Windows)
quick-test-ml.bat
```

---

## 💡 Consejos

1. **Usa SIEMPRE el script** - No mezcles con otros métodos
2. **Actualiza DESPUÉS de cada partida** - El ML necesita feedback
3. **Sé paciente** - Necesita 20-30 partidas para aprender bien
4. **Verifica variedad** - Ejecuta `test 20` cada 10 partidas

---

## 📈 Ejemplo de Sesión

```bash
# Partida 1
$ npx tsx ml-predictor-standalone.ts predict
→ Posición 19, Zona B
[Jugar en Mystake] → ✅ Victoria
$ npx tsx ml-predictor-standalone.ts update 19 true

# Partida 2
$ npx tsx ml-predictor-standalone.ts predict
→ Posición 15, Zona A
[Jugar en Mystake] → ✅ Victoria
$ npx tsx ml-predictor-standalone.ts update 15 true

# Partida 3
$ npx tsx ml-predictor-standalone.ts predict
→ Posición 23, Zona B
[Jugar en Mystake] → ❌ Derrota
$ npx tsx ml-predictor-standalone.ts update 23 false

# ... continuar ...

# Después de 10 partidas
$ npx tsx ml-predictor-standalone.ts stats
→ Ver progreso y Q-values
```

---

## 🎉 ¡Listo!

Ya puedes empezar a usar el ML Predictor V5. 

**Primer comando**:
```bash
npx tsx ml-predictor-standalone.ts predict
```

---

**Documentación completa**: `ML_PREDICTOR_STANDALONE_GUIDE.md`
**Resumen técnico**: `RESUMEN_FINAL_ML_V5.md`
