# Implementation Plan: Análisis de 30 Partidas y Sistema de Rachas

## Overview

Este plan de implementación divide el desarrollo en tareas incrementales que construyen las dos funcionalidades principales: el analizador de historial completo de partidas reales y el sistema de gestión de rachas. Cada tarea es discreta, construye sobre las anteriores, y termina con integración completa.

**IMPORTANTE**: El análisis se basa en TODAS las partidas reales del historial completo (no solo las últimas 30) para obtener métricas, patrones y estadísticas robustas y estadísticamente significativas.

## Tasks

- [ ] 1. Configurar modelos de base de datos y migraciones
  - Crear modelo `StreakState` en schema.prisma
  - Crear modelo `AnalysisReport` en schema.prisma
  - Crear modelo `RealBonePositions` en schema.prisma
  - Modificar modelo `ChickenGame` para agregar campos de racha
  - Ejecutar migración de Prisma
  - _Requirements: 3.5, 7.1, 7.2, 2.7, 10.1_

- [ ] 2. Implementar Analizador de Historial Completo
  - [ ] 2.1 Crear archivo `src/lib/ml/complete-history-analyzer.ts` con interfaces TypeScript
    - Definir interfaces: `PartidaAnalizada`, `MetricasEfectividad`, `PatronIdentificado`, `ReporteAnalisis`
    - Agregar campo `significanciaEstadistica` a `PatronIdentificado`
    - _Requirements: 1.1, 1.2_
  
  - [ ] 2.2 Implementar función `recuperarTodasLasPartidas()`
    - Recuperar TODAS las partidas reales de la base de datos ordenadas por fecha descendente
    - Transformar datos de Prisma a formato `PartidaAnalizada`
    - Incluir logging del total de partidas recuperadas
    - _Requirements: 1.1_
  
  - [ ] 2.3 Escribir property test para recuperación completa de partidas
    - **Property 1: Recuperación completa de partidas**
    - **Validates: Requirements 1.1**
  
  - [ ] 2.4 Implementar función `calcularMetricasCompletas()`
    - Calcular tasa de acierto global del historial completo
    - Calcular tasa de éxito global del historial completo
    - Calcular promedio de retiro del historial completo
    - Identificar posiciones más seguras (basado en historial completo)
    - Identificar posiciones más peligrosas (basado en historial completo)
    - Calcular mejor racha del historial completo
    - Incluir intervalos de confianza estadísticos
    - _Requirements: 1.3_
  
  - [ ] 2.5 Escribir property test para métricas válidas
    - **Property 3: Métricas válidas**
    - **Validates: Requirements 1.3**
  
  - [ ] 2.6 Implementar función `identificarPatronesSignificativos()`
    - Detectar secuencias recurrentes en historial completo
    - Identificar rotaciones de huesos en historial completo
    - Detectar zonas calientes y frías en historial completo
    - Calcular significancia estadística de cada patrón (mínimo 5% frecuencia)
    - Filtrar solo patrones estadísticamente significativos
    - _Requirements: 1.4_
  
  - [ ] 2.7 Implementar función `calcularSignificanciaEstadistica()`
    - Calcular chi-cuadrado para patrones
    - Calcular p-value para significancia
    - Retornar nivel de confianza (95%, 99%, etc.)
    - _Requirements: 1.4_
  
  - [ ] 2.8 Escribir property test para identificación de patrones significativos
    - **Property 4: Identificación de patrones estadísticamente significativos**
    - **Validates: Requirements 1.4**
  
  - [ ] 2.9 Implementar función `compararPrediccionesHistoricas()`
    - Comparar predicciones del asesor con resultados reales del historial completo
    - Calcular tasa de coincidencia global
    - Calcular tasa de coincidencia por período temporal
    - Identificar tendencias de mejora/deterioro
    - _Requirements: 1.5_
  
  - [ ] 2.10 Implementar función `generarRecomendacionesBasadasEnHistorial()`
    - Generar recomendaciones basadas en métricas del historial completo
    - Generar recomendaciones basadas en patrones significativos
    - Priorizar recomendaciones por impacto potencial
    - _Requirements: 1.6_
  
  - [ ] 2.11 Implementar función principal `analizarHistorialCompleto()`
    - Orquestar todas las funciones anteriores
    - Generar reporte completo con estadísticas robustas
    - Incluir metadata: total de partidas analizadas, período temporal, etc.
    - _Requirements: 1.6_
  
  - [ ] 2.12 Escribir property test para completitud del reporte
    - **Property 6: Completitud del reporte**
    - **Validates: Requirements 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**
  
  - [ ] 2.13 Implementar función `guardarReporte()`
    - Guardar reporte en base de datos con timestamp
    - Incluir metadata del análisis (total partidas, período, etc.)
    - _Requirements: 2.7_
  
  - [ ] 2.14 Escribir property test para persistencia de reportes
    - **Property 7: Persistencia de reportes**
    - **Validates: Requirements 2.7**

- [ ] 3. Checkpoint - Verificar analizador de historial completo
  - Ejecutar todos los tests del analizador
  - Verificar que se pueden generar reportes con el historial completo
  - Verificar que las métricas son estadísticamente robustas
  - Verificar que los patrones tienen significancia estadística
  - Preguntar al usuario si hay dudas o ajustes necesarios

- [ ] 4. Implementar Gestor de Rachas
  - [ ] 4.1 Crear archivo `src/lib/streak-manager.ts` con clase `GestorRachas`
    - Definir interfaces: `EstadoRacha`, `ResultadoConfirmacion`, `ResultadoRetiro`, `NotificacionRacha`
    - Definir tipo `ModoJuego`
    - _Requirements: 3.3, 3.4_
  
  - [ ] 4.2 Implementar método `inicializarSesion()`
    - Crear nuevo estado de racha con contador en 0
    - Establecer modo conservador
    - Guardar en base de datos
    - _Requirements: 3.3, 3.4, 3.5_
  
  - [ ] 4.3 Escribir property test para inicialización correcta
    - **Property 8: Inicialización correcta de racha**
    - **Validates: Requirements 3.3, 3.4**
  
  - [ ] 4.4 Escribir property test para persistencia de estado inicial
    - **Property 9: Persistencia de estado inicial**
    - **Validates: Requirements 3.5**
  
  - [ ] 4.5 Implementar método `cargarEstado()`
    - Recuperar estado de racha de la base de datos
    - _Requirements: 7.3, 7.4_
  
  - [ ] 4.6 Implementar método `iniciarPartida()`
    - Crear nueva partida en base de datos
    - Asociar con estado de racha
    - Retornar ID de partida
    - _Requirements: 4.1_
  
  - [ ] 4.7 Implementar método `confirmarPosicion()`
    - Validar posición (1-25)
    - Incrementar contador de posiciones confirmadas
    - Verificar si alcanzó objetivo
    - Retornar resultado con flag `debeRetirar`
    - _Requirements: 4.1, 9.2_
  
  - [ ] 4.8 Escribir property test para validación de posiciones
    - **Property 21: Validación de posiciones**
    - **Validates: Requirements 9.2, 9.3, 9.5, 9.6**
  
  - [ ] 4.9 Implementar método `ejecutarRetiroAutomatico()`
    - Verificar que se alcanzó objetivo (2 o 3 posiciones)
    - Procesar resultado de partida
    - Actualizar racha según resultado
    - Verificar transición a modo liberado si racha = 4
    - Retornar resultado con notificación
    - _Requirements: 4.3, 4.4, 4.7, 4.8, 5.1_
  
  - [ ] 4.10 Escribir property test para retiro automático
    - **Property 11: Retiro automático según objetivo**
    - **Validates: Requirements 4.3, 4.4**
  
  - [ ] 4.11 Escribir property test para actualización de racha
    - **Property 13: Actualización de racha según resultado**
    - **Validates: Requirements 4.7, 4.8, 5.6, 5.7**
  
  - [ ] 4.12 Escribir property test para transición a modo liberado
    - **Property 14: Transición a modo liberado**
    - **Validates: Requirements 5.1, 5.2**
  
  - [ ] 4.13 Implementar método `ejecutarRetiroManual()`
    - Procesar resultado de partida en modo liberado
    - Actualizar racha (mantener en 4 si gana, reiniciar si pierde)
    - Volver a modo conservador
    - Retornar resultado con notificación
    - _Requirements: 5.5, 5.6, 5.7_
  
  - [ ] 4.14 Escribir property test para retorno a modo conservador
    - **Property 16: Retorno a modo conservador**
    - **Validates: Requirements 5.5**
  
  - [ ] 4.15 Implementar métodos de gestión de posiciones reales
    - `solicitarPosicionesReales()`: Marcar partida como pendiente de verificación
    - `guardarPosicionesReales()`: Validar y guardar posiciones, marcar partida como verificada
    - _Requirements: 4.6, 10.1, 10.2, 10.5_
  
  - [ ] 4.16 Escribir property test para persistencia de posiciones reales
    - **Property 12: Persistencia de posiciones reales**
    - **Validates: Requirements 4.6, 10.1, 10.2**
  
  - [ ] 4.17 Escribir property test para validación de duplicados
    - **Property 22: Validación de duplicados**
    - **Validates: Requirements 9.4, 9.5, 9.6**
  
  - [ ] 4.18 Implementar métodos de consulta de estado
    - `obtenerEstado()`: Retornar estado actual completo
    - `verificarModoActivo()`: Retornar modo actual
    - `obtenerObjetivo()`: Retornar objetivo actual
    - _Requirements: 6.4, 6.5_
  
  - [ ] 4.19 Implementar métodos privados de transición
    - `activarModoLiberado()`: Cambiar modo y generar notificación
    - `volverModoConservador()`: Cambiar modo y generar notificación
    - `reiniciarRacha()`: Resetear contador y generar notificación
    - _Requirements: 5.1, 5.2, 5.5, 6.1, 6.2_
  
  - [ ] 4.20 Escribir property test para generación de notificaciones
    - **Property 17: Generación correcta de notificaciones**
    - **Validates: Requirements 6.1, 6.2, 6.3**
  
  - [ ] 4.21 Implementar métodos de validación
    - `validarObjetivo()`: Validar que sea 2 o 3
    - `validarPosicion()`: Validar rango 1-25
    - `validarPosicionesReales()`: Validar rango y duplicados
    - _Requirements: 9.1, 9.2, 9.3, 9.4_
  
  - [ ] 4.22 Escribir property test para validación de objetivo
    - **Property 20: Validación de objetivo**
    - **Validates: Requirements 9.1, 9.5, 9.6**
  
  - [ ] 4.23 Escribir property test para round-trip de persistencia
    - **Property 19: Round-trip de persistencia de estado**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

- [ ] 5. Checkpoint - Verificar gestor de rachas
  - Ejecutar todos los tests del gestor
  - Verificar flujos completos: conservador → liberado → conservador
  - Preguntar al usuario si hay dudas o ajustes necesarios

- [ ] 6. Implementar API Endpoints de Análisis
  - [ ] 6.1 Crear endpoint POST `/api/analisis/generar`
    - Llamar a `analizarHistorialCompleto()`
    - Guardar reporte en base de datos
    - Retornar reporte generado con metadata del historial completo
    - Incluir logging del total de partidas analizadas
    - _Requirements: 8.4_
  
  - [ ] 6.2 Crear endpoint GET `/api/analisis/obtener`
    - Recibir `reporteId` como query parameter
    - Recuperar reporte de base de datos
    - Retornar reporte o error 404
    - _Requirements: 8.5_
  
  - [ ] 6.3 Crear endpoint GET `/api/analisis/ultimo`
    - Recuperar último reporte generado (ordenar por timestamp desc)
    - Retornar reporte o null si no hay reportes
    - _Requirements: 8.5_
  
  - [ ] 6.4 Escribir unit tests para endpoints de análisis
    - Test: Generar análisis con historial completo (100+ partidas)
    - Test: Generar análisis con pocas partidas (< 10)
    - Test: Verificar que se analizan TODAS las partidas reales
    - Test: Obtener reporte existente
    - Test: Obtener reporte inexistente (404)
    - Test: Obtener último reporte

- [ ] 7. Implementar API Endpoints de Rachas
  - [ ] 7.1 Crear endpoint POST `/api/rachas/iniciar`
    - Recibir objetivo (2 o 3)
    - Validar objetivo
    - Llamar a `gestor.inicializarSesion()`
    - Retornar estado creado
    - _Requirements: 8.1_
  
  - [ ] 7.2 Crear endpoint GET `/api/rachas/estado`
    - Recibir `estadoId` como query parameter
    - Llamar a `gestor.obtenerEstado()`
    - Retornar estado actual con notificaciones pendientes
    - _Requirements: 8.3_
  
  - [ ] 7.3 Crear endpoint POST `/api/rachas/confirmar`
    - Recibir `estadoId`, `posicion`, `esPollo`
    - Validar datos
    - Llamar a `gestor.confirmarPosicion()`
    - Retornar resultado con flag `debeRetirar`
    - _Requirements: 8.2_
  
  - [ ] 7.4 Crear endpoint POST `/api/rachas/retiro`
    - Recibir `estadoId`, `manual`, `gano`
    - Validar datos
    - Llamar a `gestor.ejecutarRetiroAutomatico()` o `gestor.ejecutarRetiroManual()`
    - Retornar resultado con notificación
    - _Requirements: 8.2_
  
  - [ ] 7.5 Crear endpoint POST `/api/rachas/posiciones-reales`
    - Recibir `partidaId`, `posiciones[]`
    - Validar posiciones (rango, duplicados)
    - Llamar a `gestor.guardarPosicionesReales()`
    - Retornar confirmación
    - _Requirements: 8.2_
  
  - [ ] 7.6 Escribir unit tests para endpoints de rachas
    - Test: Iniciar sesión con objetivo 2
    - Test: Iniciar sesión con objetivo 3
    - Test: Iniciar sesión con objetivo inválido (error)
    - Test: Obtener estado existente
    - Test: Obtener estado inexistente (404)
    - Test: Confirmar posición válida
    - Test: Confirmar posición inválida (error)
    - Test: Retiro automático al alcanzar objetivo
    - Test: Retiro manual en modo liberado
    - Test: Guardar posiciones reales válidas
    - Test: Guardar posiciones reales con duplicados (error)

- [ ] 8. Modificar endpoint existente `/api/chicken/suggest`
  - Agregar parámetro opcional `estadoRachaId`
  - Si está presente, obtener modo y objetivo del gestor de rachas
  - Incluir `modoActivo` y `objetivoActual` en respuesta
  - _Requirements: 4.1_

- [ ] 9. Checkpoint - Verificar API completa
  - Ejecutar todos los tests de API
  - Probar flujos end-to-end con Postman o similar
  - Preguntar al usuario si hay dudas o ajustes necesarios

- [ ] 10. Implementar componentes de Frontend
  - [ ] 10.1 Crear componente `PanelRachas.tsx`
    - Mostrar estado actual de racha (contador, modo, objetivo)
    - Mostrar notificaciones de cambio de modo
    - Botón para iniciar nueva sesión
    - _Requirements: 6.3, 6.4, 6.5, 8.6, 8.7_
  
  - [ ] 10.2 Crear componente `FormularioPosicionesReales.tsx`
    - Formulario para ingresar posiciones de huesos (1-25)
    - Validación de duplicados en cliente
    - Enviar a API `/api/rachas/posiciones-reales`
    - _Requirements: 8.8_
  
  - [ ] 10.3 Crear componente `PanelAnalisis.tsx`
    - Botón para generar nuevo análisis
    - Mostrar último reporte de análisis
    - Visualizar métricas (gráficos o tablas)
    - Mostrar patrones identificados
    - Mostrar recomendaciones
    - _Requirements: 8.9_
  
  - [ ] 10.4 Modificar componente de juego existente
    - Integrar con API de rachas
    - Mostrar sugerencias según modo (conservador/liberado)
    - Ejecutar retiro automático cuando se alcanza objetivo
    - Mostrar formulario de posiciones reales después de retiro
    - _Requirements: 4.1, 4.3, 4.4, 4.5_
  
  - [ ] 10.5 Escribir unit tests para componentes de React
    - Test: PanelRachas muestra estado correctamente
    - Test: PanelRachas muestra notificaciones
    - Test: FormularioPosicionesReales valida duplicados
    - Test: PanelAnalisis muestra reporte correctamente

- [ ] 11. Implementar manejo de errores global
  - [ ] 11.1 Crear clases de error personalizadas
    - `ValidationError`: Errores de validación de entrada
    - `StateError`: Errores de estado inconsistente
    - `DatabaseError`: Errores de base de datos
    - `AnalysisError`: Errores de análisis
    - _Requirements: 9.5_
  
  - [ ] 11.2 Crear middleware de manejo de errores para API
    - Capturar errores y retornar respuestas apropiadas
    - Logging de errores
    - _Requirements: 9.5_
  
  - [ ] 11.3 Implementar sistema de logging
    - Crear clase `Logger` con métodos `info()`, `warn()`, `error()`
    - Integrar en todos los componentes
    - _Requirements: 9.5_
  
  - [ ] 11.4 Implementar retry logic para operaciones de base de datos
    - Función `guardarConRetry()` con backoff exponencial
    - Aplicar a operaciones críticas
    - _Requirements: 7.1, 7.2_

- [ ] 12. Escribir tests de integración end-to-end
  - [ ] 12.1 Test: Flujo completo de análisis de historial completo
    - Generar análisis del historial completo → Guardar en DB → Recuperar reporte → Verificar contenido
    - Verificar que se analizaron TODAS las partidas reales
    - Verificar que las métricas son estadísticamente robustas
    - Verificar que los patrones tienen significancia estadística
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.7_
  
  - [ ] 12.2 Test: Flujo completo de racha conservadora
    - Iniciar sesión → Sugerir posición → Confirmar pollo (x2) → Retiro automático → Guardar posiciones reales → Verificar racha incrementada
    - _Requirements: 3.3, 3.4, 3.5, 4.1, 4.3, 4.7, 10.1, 10.2_
  
  - [ ] 12.3 Test: Flujo completo de transición a modo liberado
    - Iniciar con racha=3 → Ganar partida → Verificar racha=4 → Verificar modo=liberado → Jugar partida liberada → Verificar vuelve a conservador
    - _Requirements: 4.7, 5.1, 5.2, 5.5_
  
  - [ ] 12.4 Test: Flujo de pérdida de racha
    - Iniciar con racha=2 → Perder partida → Verificar racha=0 → Verificar notificación
    - _Requirements: 4.8, 6.2_

- [ ] 13. Checkpoint final - Verificar sistema completo
  - Ejecutar todos los tests (unit, property, integration)
  - Verificar cobertura de código (mínimo 80%)
  - Probar flujos completos en ambiente de desarrollo
  - Preguntar al usuario si hay ajustes finales necesarios

- [ ] 14. Documentación y deployment
  - [ ] 14.1 Crear documentación de API
    - Documentar todos los endpoints con ejemplos
    - Incluir esquemas de request/response
  
  - [ ] 14.2 Crear guía de usuario
    - Explicar cómo usar el sistema de rachas
    - Explicar cómo interpretar reportes de análisis
  
  - [ ] 14.3 Preparar scripts de deployment
    - Script para ejecutar migraciones de base de datos
    - Script para verificar integridad de datos

## Notes

- Todas las tareas son obligatorias, incluyendo tests comprehensivos
- Cada tarea referencia los requisitos específicos que implementa
- Los checkpoints permiten validación incremental con el usuario
- Los property tests usan fast-check con mínimo 100 iteraciones
- Todas las tareas de código construyen sobre las anteriores sin dejar código huérfano
