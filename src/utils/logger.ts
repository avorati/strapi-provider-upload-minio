/**
 * Logger interface for configurable logging
 */
export interface Logger {
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

/**
 * Default logger implementation using console
 */
class ConsoleLogger implements Logger {
  warn(message: string, ...args: unknown[]): void {
    console.warn(message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    console.info(message, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    console.debug(message, ...args);
  }
}

/**
 * No-op logger that silently ignores all log messages
 * Useful for testing or when logging should be disabled
 */
class NoOpLogger implements Logger {
  warn(_message: string, ..._args: unknown[]): void {
    // No-op
  }

  error(_message: string, ..._args: unknown[]): void {
    // No-op
  }

  info(_message: string, ..._args: unknown[]): void {
    // No-op
  }

  debug(_message: string, ..._args: unknown[]): void {
    // No-op
  }
}

/**
 * Default logger instance (uses console)
 */
let defaultLogger: Logger = new ConsoleLogger();

/**
 * Sets the default logger instance
 * @param logger The logger instance to use
 */
export function setLogger(logger: Logger): void {
  defaultLogger = logger;
}

/**
 * Gets the default logger instance
 * @returns The current logger instance
 */
export function getLogger(): Logger {
  return defaultLogger;
}

/**
 * Creates a no-op logger (useful for testing)
 * @returns A logger that silently ignores all messages
 */
export function createNoOpLogger(): Logger {
  return new NoOpLogger();
}

/**
 * Creates a console logger (default)
 * @returns A logger that uses console methods
 */
export function createConsoleLogger(): Logger {
  return new ConsoleLogger();
}

