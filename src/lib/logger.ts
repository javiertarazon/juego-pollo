/**
 * Sistema de Logging Centralizado
 * 
 * Proporciona niveles de log configurables (DEBUG, INFO, WARN, ERROR)
 * Usa variable de entorno LOG_LEVEL para controlar verbosidad
 * 
 * Uso:
 * - Desarrollo: LOG_LEVEL=DEBUG (todos los logs)
 * - Producción: LOG_LEVEL=INFO (sin debug)
 * - Crítico: LOG_LEVEL=ERROR (solo errores)
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private level: LogLevel;

  constructor() {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
    this.level = LogLevel[envLevel as keyof typeof LogLevel] ?? LogLevel.INFO;
  }

  /**
   * Cambiar nivel de logging dinámicamente
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Obtener nivel actual
   */
  getLevel(): LogLevel {
    return this.level;
  }

  /**
   * Log DEBUG: Información detallada para debugging
   * Solo visible cuando LOG_LEVEL=DEBUG
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.log(`🔍 [DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Log INFO: Información general del sistema
   * Visible cuando LOG_LEVEL=INFO o DEBUG
   */
  info(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log(`ℹ️ [INFO] ${message}`, ...args);
    }
  }

  /**
   * Log WARN: Advertencias no críticas
   * Visible cuando LOG_LEVEL=WARN, INFO o DEBUG
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`⚠️ [WARN] ${message}`, ...args);
    }
  }

  /**
   * Log ERROR: Errores críticos
   * Siempre visible (todos los niveles)
   */
  error(message: string, error?: unknown, ...args: unknown[]): void {
    if (this.level <= LogLevel.ERROR) {
      if (error instanceof Error) {
        console.error(`❌ [ERROR] ${message}`, error.message, error.stack, ...args);
      } else {
        console.error(`❌ [ERROR] ${message}`, error, ...args);
      }
    }
  }

  /**
   * Log ML: Específico para Machine Learning (siempre INFO)
   */
  ml(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log(`🤖 [ML] ${message}`, ...args);
    }
  }

  /**
   * Log STOP-LOSS: Crítico para protección de capital
   */
  stopLoss(message: string, ...args: unknown[]): void {
    console.error(`⛔ [STOP-LOSS] ${message}`, ...args);
  }

  /**
   * Log PATTERN: Detección de patrones
   */
  pattern(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log(`🔥 [PATTERN] ${message}`, ...args);
    }
  }

  /**
   * Log ADAPTATION: Adaptación de Mystake
   */
  adaptation(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(`🔄 [ADAPTATION] ${message}`, ...args);
    }
  }

  /**
   * Log EXPLORATION: Exploración forzada
   */
  exploration(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log(`🔄 [EXPLORE] ${message}`, ...args);
    }
  }

  /**
   * Log SUCCESS: Éxitos importantes
   */
  success(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      console.log(`✅ [SUCCESS] ${message}`, ...args);
    }
  }

  /**
   * Log GROUP: Agrupar logs relacionados
   */
  group(title: string): void {
    if (this.level <= LogLevel.INFO) {
      console.group(`📦 ${title}`);
    }
  }

  groupEnd(): void {
    if (this.level <= LogLevel.INFO) {
      console.groupEnd();
    }
  }

  /**
   * Log con timestamp
   */
  timestamp(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      const now = new Date().toISOString();
      console.log(`🕒 [${now}] ${message}`, ...args);
    }
  }
}

// Instancia singleton
export const logger = new Logger();

// Configuración inicial desde variables de entorno
if (process.env.NODE_ENV === 'development') {
  logger.setLevel(LogLevel.DEBUG);
} else if (process.env.NODE_ENV === 'production') {
  logger.setLevel(LogLevel.INFO);
}

// Export por defecto
export default logger;
