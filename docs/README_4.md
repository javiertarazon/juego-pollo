# 🛠️ Directorio de Utilidades

Este directorio contiene herramientas auxiliares y scripts de utilidad.

## Estructura

### 📁 testing/
Scripts de prueba y validación:
- `test-ensemble-system.ts` - Prueba del sistema de ensemble
- `test-improved-simulator.ts` - Prueba del simulador mejorado
- `test-new-prediction-model.ts` - Prueba de nuevos modelos
- `test-realistic-simulator.ts` - Prueba del simulador realista
- `test-simulator-direct.ts` - Prueba directa del simulador
- `test-v3-quick.ts` - Prueba rápida v3
- `quick-test-ml.bat` - Script batch para pruebas rápidas

### 📁 scripts/
Scripts de utilidad general:
- `check-db.ts` - Verificación de base de datos
- `check-real-games.ts` - Verificación de partidas reales
- `count-games.ts` - Contador de partidas
- `actualizar-imports.ts` - Actualización de imports

### 📁 monitoreo/
Herramientas de monitoreo y alertas

### 📁 configuracion/
Configuraciones del sistema:
- `rutas-sistema.ts` - Configuración de rutas

## Uso

### Ejecutar Pruebas
```bash
# Prueba completa del ensemble
npx tsx utilidades/testing/test-ensemble-system.ts

# Verificar base de datos
npx tsx utilidades/scripts/check-db.ts

# Contar partidas
npx tsx utilidades/scripts/count-games.ts
```

### Scripts Batch (Windows)
```bash
# Prueba rápida de ML
utilidades\testing\quick-test-ml.bat
```

## Convenciones

- Todos los scripts deben estar en TypeScript
- Documentación en español
- Manejo de errores robusto
- Logs informativos
