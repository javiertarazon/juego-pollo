# Design Document: Análisis de 30 Partidas y Sistema de Rachas

## Overview

Este diseño especifica la implementación de dos funcionalidades principales para el sistema de predicción de juego de pollo:

1. **Analizador de Historial Completo de Partidas Reales**: Un sistema que analiza TODAS las partidas reales almacenadas en la base de datos (historial completo) para identificar patrones, calcular métricas de efectividad y generar reportes con recomendaciones de mejora para el modelo ML. El análisis se basa en el historial completo para obtener estadísticas robustas y confiables.

2. **Sistema Automático de Gestión de Rachas**: Un sistema que gestiona automáticamente las partidas del asesor rentable con dos modos de operación (conservador y liberado) basados en rachas de victorias consecutivas, optimizando la rentabilidad y minimizando riesgos.

El sistema se integra con la infraestructura existente:
- Base de datos SQLite con Prisma ORM (tablas `ChickenGame` y `ChickenPosition`)
- Asesor ML rentable existente (`reinforcement-learning-rentable.ts`)
- Analizador adaptativo de patrones (`adaptive-pattern-analyzer.ts`)
- API REST en Next.js (`src/app/api/chicken/`)
- Frontend en Next.js con React

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                      │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │ Interfaz Juego │  │ Panel Rachas   │  │ Panel Análisis│ │
│  │ (Sugerencias)  │  │ (Estado/Notif) │  │ (Reportes)    │ │
│  └────────┬───────┘  └────────┬───────┘  └───────┬───────┘ │
└───────────┼──────────────────┼──────────────────┼──────────┘
            │                  │                  │
            ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Layer (Next.js)                     │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │ /api/chicken/  │  │ /api/rachas/   │  │ /api/analisis/│ │
│  │ suggest        │  │ estado         │  │ generar       │ │
│  │ confirm        │  │ confirmar      │  │ obtener       │ │
│  │ cashout        │  │ retiro         │  │               │ │
│  └────────┬───────┘  └────────┬───────┘  └───────┬───────┘ │
└───────────┼──────────────────┼──────────────────┼──────────┘
            │                  │                  │
            ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                      │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │ Asesor ML      │  │ Gestor Rachas  │  │ Analizador    │ │
│  │ Rentable       │  │ (Nuevo)        │  │ 30 Partidas   │ │
│  │ (Existente)    │  │                │  │ (Nuevo)       │ │
│  └────────┬───────┘  └────────┬───────┘  └───────┬───────┘ │
└───────────┼──────────────────┼──────────────────┼──────────┘
            │                  │                  │
            └──────────────────┴──────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer (Prisma ORM)                   │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │ ChickenGame    │  │ StreakState    │  │ AnalysisReport│ │
│  │ ChickenPosition│  │ (Nuevo)        │  │ (Nuevo)       │ │
│  └────────────────┘  └────────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
                      ┌──────────────────┐
                      │  SQLite Database │
                      └──────────────────┘
```

### Component Interaction Flow

**Flujo de Análisis de Historial Completo:**
```
Usuario → Frontend → API /analisis/generar → AnalizadorHistorialCompleto
                                                      ↓
                                              Recuperar TODAS las partidas
                                              reales de DB (historial completo)
                                                      ↓
                                              Calcular métricas estadísticas
                                              robustas del historial completo
                                                      ↓
                                              Identificar patrones recurrentes
                                              con significancia estadística
                                                      ↓
                                              Generar reporte completo
                                                      ↓
                                              Guardar en DB
                                                      ↓
                                              ← Retornar reporte
```

**Flujo de Sistema de Rachas (Modo Conservador):**
```
Usuario inicia sesión → API /rachas/iniciar → GestorRachas
                                                    ↓
                                            Crear StreakState
                                            (racha=0, modo=conservador)
                                                    ↓
Usuario solicita sugerencia → API /chicken/suggest → AsesorMLRentable
                                                           ↓
                                                    Sugerir posición
                                                           ↓
Usuario confirma pollo → API /rachas/confirmar → GestorRachas
                                                       ↓
                                                Incrementar contador
                                                       ↓
                                            ¿Alcanzó objetivo (2 o 3)?
                                                       ↓
                                                      Sí
                                                       ↓
                                            Retiro automático
                                            Solicitar posiciones reales
                                                       ↓
                                            ¿Ganó la partida?
                                                       ↓
                                                      Sí
                                                       ↓
                                            Incrementar racha
                                            ¿Racha == 4?
                                                       ↓
                                                      Sí
                                                       ↓
                                            Activar modo liberado
                                            Mostrar notificación 🎉
```

**Flujo de Modo Liberado (5ta partida):**
```
Usuario en modo liberado → API /rachas/estado → GestorRachas
                                                      ↓
                                              Retornar modo=liberado
                                                      ↓
Usuario solicita sugerencias → API /chicken/suggest → AsesorMLRentable
                                                           ↓
                                                    Sugerir posiciones
                                                    (sin límite)
                                                           ↓
Usuario decide retirarse → API /rachas/retiro → GestorRachas
                                                      ↓
                                              Procesar resultado
                                                      ↓
                                              ¿Ganó?
                                                      ↓
                                          Sí                    No
                                          ↓                     ↓
                                  Mantener racha=4      Reiniciar racha=0
                                  Volver a conservador  Volver a conservador
                                  Notificación          Notificación ⚠️
```

## Components and Interfaces

### 1. Analizador de Historial Completo (`complete-history-analyzer.ts`)

**Responsabilidad**: Analizar TODAS las partidas reales del historial completo para identificar patrones estadísticamente significativos y generar reportes robustos.

```typescript
interface PartidaAnalizada {
  id: string;
  fecha: Date;
  posicionesHuesos: number[];
  posicionesPollos: number[];
  secuenciaJugadas: number[];
  objetivo: number;
  exitosa: boolean;
  cashOutPosition: number | null;
}

interface MetricasEfectividad {
  tasaAcierto: number; // % de predicciones correctas
  tasaExito: number; // % de partidas ganadas
  promedioRetiro: number; // Promedio de posiciones antes de retiro
  mejorRacha: number; // Mejor racha de victorias
  posicionesMasSeguras: { posicion: number; tasa: number }[];
  posicionesMasPeligrosas: { posicion: number; tasa: number }[];
}

interface PatronIdentificado {
  tipo: 'secuencia' | 'rotacion' | 'zona_caliente' | 'zona_fria';
  descripcion: string;
  frecuencia: number; // Número de veces que aparece
  confianza: number; // % de confianza (0-100)
  posicionesAfectadas: number[];
}

interface ReporteAnalisis {
  id: string;
  timestamp: Date;
  partidasAnalizadas: number;
  metricas: MetricasEfectividad;
  patrones: PatronIdentificado[];
  recomendaciones: string[];
  comparacionPredicciones: {
    predichas: number[];
    reales: number[];
    coincidencias: number;
    tasaCoincidencia: number;
  };
}

// Función principal de análisis
async function analizarHistorialCompleto(): Promise<ReporteAnalisis>

// Funciones auxiliares
async function recuperarTodasLasPartidas(): Promise<PartidaAnalizada[]>
async function calcularMetricasCompletas(partidas: PartidaAnalizada[]): Promise<MetricasEfectividad>
async function identificarPatronesSignificativos(partidas: PartidaAnalizada[]): Promise<PatronIdentificado[]>
async function compararPrediccionesHistoricas(partidas: PartidaAnalizada[]): Promise<ReporteAnalisis['comparacionPredicciones']>
async function generarRecomendacionesBasadasEnHistorial(metricas: MetricasEfectividad, patrones: PatronIdentificado[]): Promise<string[]>
async function guardarReporte(reporte: ReporteAnalisis): Promise<void>
async function calcularSignificanciaEstadistica(patron: PatronIdentificado, totalPartidas: number): number
```

### 2. Gestor de Rachas (`streak-manager.ts`)

**Responsabilidad**: Gestionar el estado de rachas, modos (conservador/liberado) y transiciones.

```typescript
type ModoJuego = 'conservador' | 'liberado';

interface EstadoRacha {
  id: string;
  usuarioId: string; // Para futuro multi-usuario
  rachaActual: number; // Contador de victorias consecutivas
  modoActivo: ModoJuego;
  objetivoActual: 2 | 3; // Objetivo de posiciones
  partidaActualId: string | null;
  posicionesConfirmadas: number; // Contador de posiciones confirmadas en partida actual
  ultimaActualizacion: Date;
  createdAt: Date;
}

interface ResultadoConfirmacion {
  exito: boolean;
  posicionesConfirmadas: number;
  debeRetirar: boolean; // true si alcanzó objetivo
  mensaje: string;
}

interface ResultadoRetiro {
  exito: boolean;
  rachaActualizada: number;
  modoNuevo: ModoJuego;
  notificacion: string;
  cambioModo: boolean;
}

interface NotificacionRacha {
  tipo: 'victoria' | 'derrota' | 'modo_liberado' | 'modo_conservador';
  mensaje: string;
  emoji: string;
  rachaActual: number;
  modoActivo: ModoJuego;
}

class GestorRachas {
  // Inicialización
  async inicializarSesion(objetivo: 2 | 3): Promise<EstadoRacha>
  async cargarEstado(usuarioId: string): Promise<EstadoRacha | null>
  
  // Gestión de partidas
  async iniciarPartida(estadoId: string): Promise<string> // Retorna partidaId
  async confirmarPosicion(estadoId: string, posicion: number, esPollo: boolean): Promise<ResultadoConfirmacion>
  async ejecutarRetiroAutomatico(estadoId: string): Promise<ResultadoRetiro>
  async ejecutarRetiroManual(estadoId: string, gano: boolean): Promise<ResultadoRetiro>
  
  // Gestión de posiciones reales
  async solicitarPosicionesReales(partidaId: string): Promise<void>
  async guardarPosicionesReales(partidaId: string, posiciones: number[]): Promise<void>
  
  // Consultas de estado
  async obtenerEstado(estadoId: string): Promise<EstadoRacha>
  async verificarModoActivo(estadoId: string): Promise<ModoJuego>
  async obtenerObjetivo(estadoId: string): Promise<2 | 3>
  
  // Transiciones de modo
  private async activarModoLiberado(estadoId: string): Promise<NotificacionRacha>
  private async volverModoConservador(estadoId: string): Promise<NotificacionRacha>
  private async reiniciarRacha(estadoId: string): Promise<NotificacionRacha>
  
  // Validaciones
  private validarObjetivo(objetivo: number): boolean
  private validarPosicion(posicion: number): boolean
  private validarPosicionesReales(posiciones: number[]): boolean
}
```

### 3. API Endpoints

**Endpoints de Análisis:**

```typescript
// POST /api/analisis/generar
// Genera un nuevo análisis del historial completo de partidas reales
interface GenerarAnalisisRequest {
  // Sin parámetros (analiza historial completo por defecto)
}

interface GenerarAnalisisResponse {
  exito: boolean;
  reporte: ReporteAnalisis;
  mensaje: string;
}

// GET /api/analisis/obtener?reporteId=xxx
// Obtiene un reporte específico
interface ObtenerAnalisisResponse {
  exito: boolean;
  reporte: ReporteAnalisis | null;
  mensaje: string;
}

// GET /api/analisis/ultimo
// Obtiene el último reporte generado
interface UltimoAnalisisResponse {
  exito: boolean;
  reporte: ReporteAnalisis | null;
  mensaje: string;
}
```

**Endpoints de Rachas:**

```typescript
// POST /api/rachas/iniciar
// Inicia una nueva sesión con asesor rentable
interface IniciarRachaRequest {
  objetivo: 2 | 3;
}

interface IniciarRachaResponse {
  exito: boolean;
  estadoId: string;
  estado: EstadoRacha;
  mensaje: string;
}

// GET /api/rachas/estado?estadoId=xxx
// Obtiene el estado actual de la racha
interface EstadoRachaResponse {
  exito: boolean;
  estado: EstadoRacha;
  notificaciones: NotificacionRacha[];
}

// POST /api/rachas/confirmar
// Confirma una posición como pollo
interface ConfirmarPosicionRequest {
  estadoId: string;
  posicion: number;
  esPollo: boolean;
}

interface ConfirmarPosicionResponse {
  exito: boolean;
  resultado: ResultadoConfirmacion;
  notificacion: NotificacionRacha | null;
}

// POST /api/rachas/retiro
// Ejecuta retiro (automático o manual)
interface RetiroRequest {
  estadoId: string;
  manual: boolean; // true si es modo liberado
  gano: boolean; // resultado de la partida
}

interface RetiroResponse {
  exito: boolean;
  resultado: ResultadoRetiro;
  notificacion: NotificacionRacha;
  solicitarPosicionesReales: boolean;
}

// POST /api/rachas/posiciones-reales
// Guarda las posiciones reales de huesos
interface PosicionesRealesRequest {
  partidaId: string;
  posiciones: number[];
}

interface PosicionesRealesResponse {
  exito: boolean;
  mensaje: string;
}
```

**Modificaciones a Endpoints Existentes:**

```typescript
// POST /api/chicken/suggest
// Modificar para integrar con gestor de rachas
interface SuggestRequest {
  boneCount: number;
  revealedPositions: number[];
  estadoRachaId?: string; // Nuevo: opcional para integración con rachas
}

interface SuggestResponse {
  position: number;
  confidence: number;
  strategy: 'EXPLORE' | 'EXPLOIT';
  reason: string;
  modoActivo?: ModoJuego; // Nuevo: si está integrado con rachas
  objetivoActual?: 2 | 3; // Nuevo: si está integrado con rachas
}
```

## Data Models

### Nuevos Modelos de Prisma

```prisma
// Estado de racha del usuario
model StreakState {
  id                    String      @id @default(cuid())
  usuarioId             String      @default("default") // Para futuro multi-usuario
  rachaActual           Int         @default(0)
  modoActivo            String      @default("conservador") // "conservador" | "liberado"
  objetivoActual        Int         // 2 o 3
  partidaActualId       String?
  posicionesConfirmadas Int         @default(0)
  ultimaActualizacion   DateTime    @updatedAt
  createdAt             DateTime    @default(now())
  
  @@index([usuarioId])
}

// Reporte de análisis de 30 partidas
model AnalysisReport {
  id                  String   @id @default(cuid())
  timestamp           DateTime @default(now())
  partidasAnalizadas  Int
  tasaAcierto         Float
  tasaExito           Float
  promedioRetiro      Float
  mejorRacha          Int
  patrones            String   // JSON serializado de PatronIdentificado[]
  recomendaciones     String   // JSON serializado de string[]
  comparacionData     String   // JSON serializado de comparacionPredicciones
  createdAt           DateTime @default(now())
  
  @@index([timestamp])
}

// Posiciones reales reportadas por usuarios
model RealBonePositions {
  id                String       @id @default(cuid())
  gameId            String       @unique
  posiciones        String       // JSON array de números
  reportadoPor      String       @default("usuario")
  verificado        Boolean      @default(false)
  createdAt         DateTime     @default(now())
  
  game              ChickenGame  @relation(fields: [gameId], references: [id], onDelete: Cascade)
  
  @@index([gameId])
}
```

### Modificaciones a Modelos Existentes

```prisma
// Agregar relación a ChickenGame
model ChickenGame {
  id                String              @id @default(cuid())
  boneCount         Int
  revealedCount     Int                 @default(0)
  hitBone           Boolean             @default(false)
  cashOutPosition   Int?
  multiplier        Float?
  isSimulated       Boolean             @default(false)
  createdAt         DateTime            @default(now())
  
  // Nuevos campos
  streakStateId     String?             // Relación con estado de racha
  objetivo          Int?                // 2 o 3 (si es partida de asesor rentable)
  modoJuego         String?             // "conservador" | "liberado"
  
  positions         ChickenPosition[]
  realPositions     RealBonePositions?  // Nueva relación
}
```

## Correctness Properties

*Una propiedad es una característica o comportamiento que debe mantenerse verdadero en todas las ejecuciones válidas de un sistema - esencialmente, una declaración formal sobre lo que el sistema debe hacer. Las propiedades sirven como puente entre las especificaciones legibles por humanos y las garantías de corrección verificables por máquinas.*


### Análisis de 30 Partidas

**Property 1: Recuperación completa de partidas**
*For any* solicitud de análisis, el sistema debe recuperar TODAS las partidas reales del historial completo ordenadas por fecha descendente.
**Validates: Requirements 1.1**

**Property 2: Extracción completa de datos**
*For any* conjunto de partidas recuperadas, el sistema debe extraer correctamente todas las posiciones de huesos, secuencias de jugadas y rotaciones sin pérdida de información.
**Validates: Requirements 1.2**

**Property 3: Métricas válidas**
*For any* conjunto de datos extraídos, las métricas calculadas (tasa de acierto, tasa de éxito, promedio de retiro) deben estar en rangos válidos (0-100% para tasas, >= 0 para promedios).
**Validates: Requirements 1.3**

**Property 4: Identificación de patrones estadísticamente significativos**
*For any* conjunto de partidas del historial completo con patrones recurrentes (frecuencia >= 5% del total), el sistema debe identificar correctamente esos patrones con su nivel de significancia estadística.
**Validates: Requirements 1.4**

**Property 5: Comparación de predicciones**
*For any* conjunto de partidas con predicciones y resultados reales, la tasa de coincidencia calculada debe ser igual al número de coincidencias dividido por el total de predicciones.
**Validates: Requirements 1.5**

**Property 6: Completitud del reporte**
*For any* reporte generado, debe contener todos los campos requeridos: número de partidas analizadas, tasa de acierto, tasa de éxito, promedio de retiro, mejor racha, patrones identificados, recomendaciones y comparación de predicciones.
**Validates: Requirements 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**

**Property 7: Persistencia de reportes**
*For any* reporte generado, después de guardarlo en la base de datos, debe ser recuperable con el mismo contenido y debe tener una marca temporal válida.
**Validates: Requirements 2.7**

### Sistema de Rachas

**Property 8: Inicialización correcta de racha**
*For any* objetivo seleccionado (2 o 3), al inicializar una sesión, el contador de racha debe ser 0 y el modo activo debe ser conservador.
**Validates: Requirements 3.3, 3.4**

**Property 9: Persistencia de estado inicial**
*For any* estado de racha inicializado, debe ser almacenado en la base de datos y recuperable con los mismos valores.
**Validates: Requirements 3.5**

**Property 10: Sugerencia en modo conservador**
*For any* estado con modo conservador activo y racha < 4, el sistema debe sugerir una posición válida (1-25) usando el asesor rentable.
**Validates: Requirements 4.1**

**Property 11: Retiro automático según objetivo**
*For any* estado en modo conservador, cuando el número de posiciones confirmadas como pollo alcanza el objetivo (2 o 3), el sistema debe ejecutar retiro automático.
**Validates: Requirements 4.3, 4.4**

**Property 12: Persistencia de posiciones reales**
*For any* conjunto de posiciones reales ingresadas, deben almacenarse en la base de datos asociadas con la partida correspondiente y la partida debe marcarse como verificada.
**Validates: Requirements 4.6, 10.1, 10.2**

**Property 13: Actualización de racha según resultado**
*For any* partida completada:
- Si es ganada en modo conservador: racha debe incrementarse en 1
- Si es perdida (cualquier modo): racha debe reiniciarse a 0
- Si es ganada en modo liberado: racha debe mantenerse en 4
**Validates: Requirements 4.7, 4.8, 5.6, 5.7**

**Property 14: Transición a modo liberado**
*For any* estado donde la racha alcanza exactamente 4 victorias consecutivas, el modo debe cambiar a liberado para la siguiente partida y debe generarse una notificación de celebración.
**Validates: Requirements 5.1, 5.2**

**Property 15: Sin límite en modo liberado**
*For any* estado en modo liberado, el sistema debe aceptar cualquier número de posiciones seleccionadas (no debe rechazar por exceder un límite).
**Validates: Requirements 5.3**

**Property 16: Retorno a modo conservador**
*For any* partida completada en modo liberado, el modo debe volver a conservador para la siguiente partida.
**Validates: Requirements 5.5**

**Property 17: Generación correcta de notificaciones**
*For any* cambio de estado de racha:
- Racha alcanza 4: notificación "🎉 4 victorias seguidas! Próxima partida: modo liberado"
- Racha se reinicia a 0: notificación "⚠️ Racha perdida. Volviendo a modo conservador"
- Partida ganada en conservador: notificación con contador actual de racha
**Validates: Requirements 6.1, 6.2, 6.3**

**Property 18: Indicadores de estado**
*For any* estado de racha, el sistema debe generar indicadores correctos:
- En modo conservador: mostrar objetivo (2 o 3)
- En modo liberado: mostrar indicador de modo liberado
**Validates: Requirements 6.4, 6.5**

**Property 19: Round-trip de persistencia de estado**
*For any* estado de racha (contador, modo, objetivo), después de guardarlo en la base de datos y recuperarlo en una nueva sesión, debe obtenerse un estado equivalente.
**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

**Property 20: Validación de objetivo**
*For any* valor ingresado como objetivo, el sistema debe aceptar solo 2 o 3, y rechazar cualquier otro valor con un mensaje de error descriptivo sin cambiar el estado.
**Validates: Requirements 9.1, 9.5, 9.6**

**Property 21: Validación de posiciones**
*For any* posición ingresada (confirmación o posiciones reales), el sistema debe validar que esté en el rango 1-25, y rechazar valores fuera de rango con un mensaje de error descriptivo sin cambiar el estado.
**Validates: Requirements 9.2, 9.3, 9.5, 9.6**

**Property 22: Validación de duplicados**
*For any* conjunto de posiciones reales ingresadas, el sistema debe rechazar conjuntos con duplicados con un mensaje de error descriptivo sin cambiar el estado.
**Validates: Requirements 9.4, 9.5, 9.6**

**Property 23: Timestamp de posiciones reales**
*For any* conjunto de posiciones reales almacenadas, debe guardarse una marca temporal válida (no nula, no futura).
**Validates: Requirements 10.5**

## Error Handling

### Categorías de Errores

**1. Errores de Validación de Entrada**
- Objetivo inválido (no es 2 o 3)
- Posición fuera de rango (< 1 o > 25)
- Posiciones duplicadas
- Formato de datos inválido

**Manejo:**
```typescript
class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Ejemplo de uso
function validarObjetivo(objetivo: number): void {
  if (objetivo !== 2 && objetivo !== 3) {
    throw new ValidationError(
      'El objetivo debe ser 2 o 3 posiciones',
      'objetivo',
      objetivo
    );
  }
}
```

**2. Errores de Estado Inconsistente**
- Intentar confirmar posición sin partida activa
- Intentar retiro sin alcanzar objetivo
- Estado de racha corrupto en base de datos

**Manejo:**
```typescript
class StateError extends Error {
  constructor(
    message: string,
    public currentState: any,
    public expectedState: any
  ) {
    super(message);
    this.name = 'StateError';
  }
}

// Ejemplo de uso
async function confirmarPosicion(estadoId: string): Promise<void> {
  const estado = await cargarEstado(estadoId);
  if (!estado.partidaActualId) {
    throw new StateError(
      'No hay partida activa para confirmar posición',
      { partidaActualId: null },
      { partidaActualId: 'string' }
    );
  }
}
```

**3. Errores de Base de Datos**
- Fallo de conexión
- Registro no encontrado
- Violación de constraints
- Timeout de operación

**Manejo:**
```typescript
class DatabaseError extends Error {
  constructor(
    message: string,
    public operation: string,
    public originalError: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// Ejemplo de uso con retry
async function guardarConRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }
  
  throw new DatabaseError(
    'Operación de base de datos falló después de reintentos',
    'guardar',
    lastError!
  );
}
```

**4. Errores de Análisis**
- Insuficientes partidas para análisis (< 10)
- Datos corruptos en partidas
- Fallo en cálculo de métricas

**Manejo:**
```typescript
class AnalysisError extends Error {
  constructor(
    message: string,
    public partidasDisponibles: number,
    public partidasRequeridas: number
  ) {
    super(message);
    this.name = 'AnalysisError';
  }
}

// Ejemplo de uso
async function analizarPartidas(): Promise<ReporteAnalisis> {
  const partidas = await recuperarPartidas(30);
  
  if (partidas.length < 10) {
    throw new AnalysisError(
      'Insuficientes partidas para análisis confiable',
      partidas.length,
      10
    );
  }
  
  // Continuar con análisis...
}
```

### Estrategias de Recuperación

**1. Recuperación Automática**
- Reintentos con backoff exponencial para operaciones de base de datos
- Fallback a valores por defecto para datos opcionales
- Limpieza automática de estados inconsistentes

**2. Recuperación Manual**
- Notificar al usuario de errores críticos
- Proporcionar opciones de recuperación (reiniciar sesión, contactar soporte)
- Logging detallado para debugging

**3. Prevención**
- Validación exhaustiva de entradas
- Transacciones de base de datos para operaciones críticas
- Verificación de estado antes de operaciones

### Logging y Monitoreo

```typescript
interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  component: string;
  message: string;
  data?: any;
  error?: Error;
}

class Logger {
  static log(entry: LogEntry): void {
    const formatted = `[${entry.timestamp.toISOString()}] ${entry.level.toUpperCase()} [${entry.component}] ${entry.message}`;
    
    if (entry.level === 'error') {
      console.error(formatted, entry.data, entry.error);
    } else if (entry.level === 'warn') {
      console.warn(formatted, entry.data);
    } else {
      console.log(formatted, entry.data);
    }
  }
  
  static info(component: string, message: string, data?: any): void {
    this.log({ timestamp: new Date(), level: 'info', component, message, data });
  }
  
  static warn(component: string, message: string, data?: any): void {
    this.log({ timestamp: new Date(), level: 'warn', component, message, data });
  }
  
  static error(component: string, message: string, error: Error, data?: any): void {
    this.log({ timestamp: new Date(), level: 'error', component, message, data, error });
  }
}
```

## Testing Strategy

### Dual Testing Approach

Este proyecto requiere tanto **unit tests** como **property-based tests** para garantizar corrección comprehensiva:

- **Unit tests**: Verifican ejemplos específicos, casos edge y condiciones de error
- **Property tests**: Verifican propiedades universales a través de muchas entradas generadas aleatoriamente

Ambos tipos de tests son complementarios y necesarios:
- Los unit tests capturan bugs concretos y casos específicos
- Los property tests verifican corrección general y descubren casos edge inesperados

### Property-Based Testing Configuration

**Librería**: Utilizaremos **fast-check** para TypeScript, que es la librería estándar para property-based testing en el ecosistema JavaScript/TypeScript.

**Configuración**:
- Mínimo 100 iteraciones por property test (debido a la naturaleza aleatoria)
- Cada property test debe referenciar su propiedad del documento de diseño
- Formato de tag: `// Feature: analisis-30-partidas-y-sistema-rachas, Property X: [texto de la propiedad]`

**Ejemplo de Property Test:**

```typescript
import fc from 'fast-check';

describe('Property 8: Inicialización correcta de racha', () => {
  // Feature: analisis-30-partidas-y-sistema-rachas, Property 8: For any objetivo seleccionado (2 o 3), al inicializar una sesión, el contador de racha debe ser 0 y el modo activo debe ser conservador
  
  it('should initialize streak with counter 0 and conservative mode for any valid objective', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(2, 3), // Generar objetivos válidos
        async (objetivo) => {
          const gestor = new GestorRachas();
          const estado = await gestor.inicializarSesion(objetivo);
          
          expect(estado.rachaActual).toBe(0);
          expect(estado.modoActivo).toBe('conservador');
          expect(estado.objetivoActual).toBe(objetivo);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Testing Strategy

**Casos Específicos a Testear:**

1. **Analizador de 30 Partidas**
   - Análisis con exactamente 30 partidas
   - Análisis con menos de 30 partidas (10, 15, 20)
   - Análisis con 0 partidas (debe fallar gracefully)
   - Partidas con datos corruptos
   - Cálculo de métricas con valores extremos (100% acierto, 0% acierto)

2. **Gestor de Rachas**
   - Inicialización con objetivo 2
   - Inicialización con objetivo 3
   - Secuencia completa: 4 victorias → modo liberado → victoria → volver a conservador
   - Secuencia completa: 3 victorias → derrota → reinicio
   - Retiro automático en posición exacta (2 o 3)
   - Validación de entradas inválidas

3. **API Endpoints**
   - Respuestas exitosas con datos válidos
   - Respuestas de error con datos inválidos
   - Manejo de estados no encontrados
   - Concurrencia (múltiples requests simultáneos)

4. **Persistencia**
   - Guardar y recuperar estado de racha
   - Guardar y recuperar reporte de análisis
   - Guardar posiciones reales
   - Transacciones (rollback en caso de error)

### Integration Testing

**Flujos End-to-End:**

1. **Flujo completo de análisis:**
   ```
   Generar análisis → Guardar en DB → Recuperar reporte → Verificar contenido
   ```

2. **Flujo completo de racha conservadora:**
   ```
   Iniciar sesión → Sugerir posición → Confirmar pollo (x2 o x3) → 
   Retiro automático → Solicitar posiciones reales → Guardar → 
   Verificar racha incrementada
   ```

3. **Flujo completo de transición a modo liberado:**
   ```
   Iniciar con racha=3 → Ganar partida → Verificar racha=4 → 
   Verificar modo=liberado → Jugar partida liberada → 
   Verificar vuelve a conservador
   ```

### Test Data Generators

**Generadores para Property Tests:**

```typescript
// Generador de partidas aleatorias
const arbitraryPartida = fc.record({
  id: fc.uuid(),
  fecha: fc.date(),
  posicionesHuesos: fc.array(fc.integer({ min: 1, max: 25 }), { minLength: 1, maxLength: 5 }).map(arr => [...new Set(arr)]),
  posicionesPollos: fc.array(fc.integer({ min: 1, max: 25 }), { minLength: 1, maxLength: 10 }).map(arr => [...new Set(arr)]),
  objetivo: fc.constantFrom(2, 3),
  exitosa: fc.boolean(),
  cashOutPosition: fc.option(fc.integer({ min: 1, max: 10 })),
});

// Generador de estados de racha
const arbitraryEstadoRacha = fc.record({
  rachaActual: fc.integer({ min: 0, max: 10 }),
  modoActivo: fc.constantFrom('conservador', 'liberado'),
  objetivoActual: fc.constantFrom(2, 3),
  posicionesConfirmadas: fc.integer({ min: 0, max: 10 }),
});

// Generador de posiciones válidas
const arbitraryPosicion = fc.integer({ min: 1, max: 25 });

// Generador de conjuntos de posiciones sin duplicados
const arbitraryPosiciones = fc.array(arbitraryPosicion, { minLength: 1, maxLength: 10 })
  .map(arr => [...new Set(arr)]);
```

### Coverage Goals

- **Line Coverage**: Mínimo 80%
- **Branch Coverage**: Mínimo 75%
- **Property Coverage**: 100% de las propiedades de corrección deben tener al menos un property test
- **Critical Paths**: 100% de cobertura en flujos críticos (actualización de racha, persistencia, validaciones)

### Continuous Testing

- Ejecutar todos los tests en cada commit
- Property tests con seed fijo para reproducibilidad
- Tests de integración en ambiente de staging antes de producción
- Monitoreo de performance de tests (alertar si exceden 5 minutos)
