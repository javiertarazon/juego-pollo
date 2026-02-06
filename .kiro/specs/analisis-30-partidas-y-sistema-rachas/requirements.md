# Requirements Document

## Introduction

Este documento especifica los requisitos para dos funcionalidades principales del sistema de predicción de juego de pollo:

1. **Análisis de Historial Completo de Partidas Reales**: Un sistema que analiza patrones en TODAS las partidas reales almacenadas en la base de datos (historial completo) para identificar oportunidades de mejora en las predicciones del modelo ML. El análisis se basa en el historial completo para obtener métricas, patrones y estadísticas más robustas y confiables.

2. **Sistema Automático de Gestión de Rachas (Asesor Rentable)**: Un sistema que gestiona automáticamente las partidas del asesor rentable con modos conservador y liberado basados en rachas de victorias, optimizando la rentabilidad y minimizando riesgos.

## Glossary

- **Sistema**: El sistema completo de predicción de juego de pollo
- **Analizador_de_Patrones**: Componente que analiza las últimas 30 partidas reales
- **Gestor_de_Rachas**: Componente que gestiona el modo conservador y liberado
- **Asesor_Rentable**: Modelo ML que predice 2-3 posiciones óptimas
- **Modo_Conservador**: Estado donde el sistema limita las predicciones a 2-3 posiciones
- **Modo_Liberado**: Estado donde el usuario puede elegir sin límite de posiciones (5ta partida)
- **Racha**: Contador de victorias consecutivas del usuario
- **Partida**: Una sesión de juego completa con predicciones y resultado
- **Posición**: Una de las 25 casillas del tablero de juego
- **Hueso**: Elemento oculto en el tablero que el usuario debe evitar
- **Pollo**: Confirmación de que una posición predicha no contiene hueso
- **Base_de_Datos**: Sistema de almacenamiento persistente (tablas chickenGame y chickenPosition)
- **API**: Interfaz de programación de aplicaciones (backend)
- **Interfaz_Web**: Aplicación frontend en Next.js
- **Reporte**: Documento generado con hallazgos y recomendaciones del análisis

## Requirements

### Requirement 1: Análisis de Partidas Históricas

**User Story:** Como administrador del sistema, quiero analizar TODAS las partidas reales almacenadas en la base de datos (historial completo), para identificar patrones y oportunidades de mejora en las predicciones del modelo ML basándome en datos estadísticamente significativos.

#### Acceptance Criteria

1. WHEN el análisis es solicitado, THE Analizador_de_Patrones SHALL recuperar TODAS las partidas reales de la Base_de_Datos ordenadas por fecha descendente
2. WHEN las partidas son recuperadas, THE Analizador_de_Patrones SHALL extraer las posiciones de huesos, secuencias de jugadas y rotaciones de cada partida
3. WHEN los datos son extraídos, THE Analizador_de_Patrones SHALL calcular las métricas de efectividad establecidas en el sistema ML basándose en el historial completo
4. WHEN las métricas son calculadas, THE Analizador_de_Patrones SHALL identificar patrones recurrentes en las posiciones de huesos usando el historial completo
5. WHEN los patrones son identificados, THE Analizador_de_Patrones SHALL comparar las predicciones del modelo con los resultados reales del historial completo
6. WHEN la comparación es completada, THE Analizador_de_Patrones SHALL generar un Reporte con hallazgos, métricas y recomendaciones de mejora basadas en el historial completo

### Requirement 2: Generación de Reporte de Análisis

**User Story:** Como administrador del sistema, quiero recibir un reporte detallado del análisis de partidas, para tomar decisiones informadas sobre mejoras al modelo ML.

#### Acceptance Criteria

1. THE Reporte SHALL incluir el número total de partidas analizadas
2. THE Reporte SHALL incluir la tasa de acierto promedio del Asesor_Rentable
3. THE Reporte SHALL incluir los patrones más frecuentes identificados en posiciones de huesos
4. THE Reporte SHALL incluir las secuencias de jugadas más comunes
5. THE Reporte SHALL incluir recomendaciones específicas para mejorar la efectividad de las predicciones
6. THE Reporte SHALL incluir métricas de comparación entre predicciones y resultados reales
7. WHEN el Reporte es generado, THE Sistema SHALL almacenarlo en la Base_de_Datos con marca temporal

### Requirement 3: Inicialización del Sistema de Rachas

**User Story:** Como usuario, quiero iniciar una sesión con el asesor rentable eligiendo mi objetivo de posiciones, para que el sistema gestione automáticamente mis partidas según las reglas de racha.

#### Acceptance Criteria

1. WHEN el usuario inicia una sesión, THE Gestor_de_Rachas SHALL solicitar la selección del Asesor_Rentable
2. WHEN el Asesor_Rentable es seleccionado, THE Gestor_de_Rachas SHALL solicitar el objetivo de posiciones (2 o 3)
3. WHEN el objetivo es seleccionado, THE Gestor_de_Rachas SHALL inicializar el contador de Racha en 0
4. WHEN la Racha es inicializada, THE Gestor_de_Rachas SHALL establecer el Modo_Conservador como modo activo
5. WHEN el modo es establecido, THE Gestor_de_Rachas SHALL almacenar el estado de Racha en la Base_de_Datos

### Requirement 4: Gestión de Modo Conservador

**User Story:** Como usuario en modo conservador, quiero que el sistema me sugiera posiciones y gestione automáticamente el retiro según mi objetivo, para minimizar riesgos mientras construyo mi racha.

#### Acceptance Criteria

1. WHILE Modo_Conservador está activo AND Racha es menor que 4, THE Gestor_de_Rachas SHALL sugerir la primera posición usando el Asesor_Rentable
2. WHEN una posición es sugerida, THE Gestor_de_Rachas SHALL solicitar confirmación del usuario si es Pollo
3. WHEN el usuario confirma Pollo AND objetivo es 2 AND 2 posiciones han sido confirmadas, THE Gestor_de_Rachas SHALL ejecutar retiro automático
4. WHEN el usuario confirma Pollo AND objetivo es 3 AND 3 posiciones han sido confirmadas, THE Gestor_de_Rachas SHALL ejecutar retiro automático
5. WHEN el retiro automático es ejecutado, THE Gestor_de_Rachas SHALL solicitar las posiciones reales de los huesos al usuario
6. WHEN las posiciones reales son recibidas, THE Sistema SHALL almacenarlas en la Base_de_Datos para mejorar el modelo ML
7. WHEN una Partida es ganada en Modo_Conservador, THE Gestor_de_Rachas SHALL incrementar el contador de Racha en 1
8. WHEN una Partida es perdida, THE Gestor_de_Rachas SHALL reiniciar el contador de Racha a 0

### Requirement 5: Transición a Modo Liberado

**User Story:** Como usuario que ha logrado 4 victorias seguidas, quiero tener libertad para decidir cuántas posiciones jugar en la siguiente partida, para maximizar ganancias con el respaldo de mi racha.

#### Acceptance Criteria

1. WHEN Racha alcanza 4 victorias consecutivas, THE Gestor_de_Rachas SHALL activar el Modo_Liberado para la siguiente Partida
2. WHEN Modo_Liberado es activado, THE Gestor_de_Rachas SHALL mostrar notificación "🎉 4 victorias seguidas! Próxima partida: modo liberado"
3. WHILE Modo_Liberado está activo, THE Gestor_de_Rachas SHALL permitir al usuario seleccionar cualquier número de posiciones sin límite máximo
4. WHILE Modo_Liberado está activo, THE Gestor_de_Rachas SHALL permitir al usuario decidir cuándo retirarse
5. WHEN la Partida en Modo_Liberado termina, THE Gestor_de_Rachas SHALL retornar al Modo_Conservador para la siguiente Partida
6. WHEN una Partida en Modo_Liberado es perdida, THE Gestor_de_Rachas SHALL reiniciar el contador de Racha a 0
7. WHEN una Partida en Modo_Liberado es ganada, THE Gestor_de_Rachas SHALL mantener el contador de Racha en 4

### Requirement 6: Notificaciones de Estado

**User Story:** Como usuario, quiero recibir notificaciones claras sobre mi estado de racha y modo activo, para entender en qué situación me encuentro en cada momento.

#### Acceptance Criteria

1. WHEN Racha alcanza 4 victorias consecutivas, THE Sistema SHALL mostrar notificación "🎉 4 victorias seguidas! Próxima partida: modo liberado"
2. WHEN Racha es reiniciada a 0, THE Sistema SHALL mostrar notificación "⚠️ Racha perdida. Volviendo a modo conservador"
3. WHEN una Partida es ganada en Modo_Conservador, THE Sistema SHALL mostrar el contador actual de Racha
4. WHEN Modo_Conservador está activo, THE Sistema SHALL mostrar el objetivo de posiciones seleccionado (2 o 3)
5. WHEN Modo_Liberado está activo, THE Sistema SHALL mostrar indicador visual de modo liberado

### Requirement 7: Persistencia de Estado de Racha

**User Story:** Como usuario, quiero que mi progreso de racha se mantenga entre sesiones, para no perder mi avance si cierro el navegador o la aplicación.

#### Acceptance Criteria

1. WHEN el estado de Racha cambia, THE Gestor_de_Rachas SHALL actualizar el contador en la Base_de_Datos
2. WHEN el modo activo cambia, THE Gestor_de_Rachas SHALL actualizar el modo en la Base_de_Datos
3. WHEN el usuario inicia una nueva sesión, THE Gestor_de_Rachas SHALL recuperar el estado de Racha de la Base_de_Datos
4. WHEN el usuario inicia una nueva sesión, THE Gestor_de_Rachas SHALL recuperar el modo activo de la Base_de_Datos
5. WHEN el objetivo de posiciones es seleccionado, THE Gestor_de_Rachas SHALL almacenarlo en la Base_de_Datos

### Requirement 8: Integración con API y Frontend

**User Story:** Como desarrollador, quiero que el sistema de rachas esté disponible tanto en la API como en la interfaz web, para proporcionar una experiencia completa al usuario.

#### Acceptance Criteria

1. THE API SHALL exponer endpoints para iniciar sesión con asesor rentable
2. THE API SHALL exponer endpoints para confirmar posiciones como Pollo
3. THE API SHALL exponer endpoints para solicitar el estado actual de Racha
4. THE API SHALL exponer endpoints para ejecutar el análisis de 30 partidas
5. THE API SHALL exponer endpoints para recuperar el Reporte de análisis
6. THE Interfaz_Web SHALL mostrar el estado de Racha en tiempo real
7. THE Interfaz_Web SHALL mostrar notificaciones de cambio de modo
8. THE Interfaz_Web SHALL permitir al usuario ingresar las posiciones reales de huesos
9. THE Interfaz_Web SHALL mostrar el Reporte de análisis de forma legible

### Requirement 9: Validación de Datos de Entrada

**User Story:** Como sistema, quiero validar todos los datos de entrada del usuario, para prevenir errores y garantizar la integridad de los datos.

#### Acceptance Criteria

1. WHEN el usuario selecciona un objetivo de posiciones, THE Sistema SHALL validar que sea 2 o 3
2. WHEN el usuario confirma una posición como Pollo, THE Sistema SHALL validar que la posición esté en el rango válido (1-25)
3. WHEN el usuario ingresa posiciones reales de huesos, THE Sistema SHALL validar que sean posiciones válidas (1-25)
4. WHEN el usuario ingresa posiciones reales de huesos, THE Sistema SHALL validar que no haya duplicados
5. IF una validación falla, THEN THE Sistema SHALL retornar un mensaje de error descriptivo
6. IF una validación falla, THEN THE Sistema SHALL mantener el estado actual sin cambios

### Requirement 10: Almacenamiento de Posiciones Reales

**User Story:** Como sistema de ML, quiero almacenar las posiciones reales de huesos reportadas por los usuarios, para mejorar la precisión de las predicciones futuras.

#### Acceptance Criteria

1. WHEN el usuario ingresa posiciones reales de huesos, THE Sistema SHALL asociarlas con la Partida correspondiente
2. WHEN las posiciones reales son almacenadas, THE Sistema SHALL marcar la Partida como verificada
3. WHEN las posiciones reales son almacenadas, THE Sistema SHALL actualizar las métricas de efectividad del modelo ML
4. WHEN las posiciones reales son almacenadas, THE Sistema SHALL incluirlas en futuros análisis de patrones
5. THE Sistema SHALL almacenar la marca temporal de cuándo fueron ingresadas las posiciones reales
