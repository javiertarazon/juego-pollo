# ⚙️ Configuración del Proyecto

Este directorio contiene todos los archivos de configuración en formato JSON.

## 📋 Archivos de Configuración

Los archivos JSON de configuración del proyecto se encuentran aquí, excepto:
- `package.json` - Permanece en raíz (requerido por npm/node)
- `package-lock.json` - Permanece en raíz (requerido por npm)
- `tsconfig.json` - Permanece en raíz (requerido por TypeScript)
- `components.json` - Permanece en raíz (requerido por shadcn/ui)

## 📁 Estructura

```
config/
└── *.json          # Archivos de configuración adicionales
```

## 🔧 Uso

Los archivos de configuración en este directorio son utilizados por:
- Scripts de utilidades
- Herramientas de desarrollo
- Configuraciones personalizadas del proyecto

## 📝 Convenciones

- Todos los archivos JSON deben estar bien formateados
- Usar indentación de 2 espacios
- Incluir comentarios cuando sea necesario (en archivos .jsonc)
- Validar JSON antes de commit

---

**Última actualización**: 2026-02-04
