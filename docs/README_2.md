# 📊 Directorio de Análisis

Este directorio contiene todos los análisis de patrones y estadísticas del sistema.

## Estructura

### 📁 patrones-mystake/
Análisis específicos de patrones detectados en Mystake:
- `analyze-deep-patterns.ts` - Análisis profundo de patrones
- `analyze-mystake-adaptation.ts` - Adaptación a patrones de Mystake
- `analyze-mystake-patterns.ts` - Detección de patrones específicos

### 📁 estadisticas/
Análisis estadísticos y frecuencias:
- `analyze-chicken-frequency.ts` - Análisis de frecuencias de pollos
- `analyze-position-changes.ts` - Análisis de cambios de posición
- `analyze-recent-pattern-detection.ts` - Detección de patrones recientes

### 📁 validacion-cientifica/
Validaciones estadísticas rigurosas:
- `pruebas-chi-cuadrado.ts` - Pruebas Chi-cuadrado
- `validacion-estadistica.ts` - Validaciones estadísticas completas

### 📁 reportes/
Reportes generados automáticamente por los análisis

## Uso

Todos los scripts de análisis deben ejecutarse con:
```bash
npx tsx analisis/[categoria]/[script].ts
```

## Criterios de Calidad

- ✅ Validación estadística con p < 0.05
- ✅ Intervalos de confianza del 95%
- ✅ Documentación en español
- ✅ Reproducibilidad garantizada
