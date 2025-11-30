/**
 * Application Logger
 *
 * Centralized logging utility that:
 * - Only logs in development mode
 * - Provides structured logging methods
 * - Safely handles circular references
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  prefix?: string;
  enabled?: boolean;
}

const isDev = process.env.NODE_ENV === 'development';

function safeStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'function') return '[Function]';
      if (typeof value === 'bigint') return value.toString();
      if (value instanceof Window) return '[Window]';
      if (value instanceof Error) {
        return {
          name: value.name,
          message: value.message,
          stack: value.stack,
        };
      }
      return value;
    }, 2);
  } catch {
    return '[Unable to serialize]';
  }
}

function formatMessage(level: LogLevel, prefix: string, message: string): string {
  const timestamp = new Date().toISOString();
  const levelEmoji = {
    debug: '🔍',
    info: '📘',
    warn: '⚠️',
    error: '❌',
  };
  return `${levelEmoji[level]} [${timestamp}] ${prefix ? `[${prefix}] ` : ''}${message}`;
}

class Logger {
  private prefix: string;
  private enabled: boolean;

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix || '';
    this.enabled = options.enabled ?? isDev;
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    if (!this.enabled) return;

    const formattedMessage = formatMessage(level, this.prefix, message);
    const consoleMethod = level === 'debug' ? 'log' : level;

    if (data !== undefined) {
      console[consoleMethod](formattedMessage, safeStringify(data));
    } else {
      console[consoleMethod](formattedMessage);
    }
  }

  debug(message: string, data?: unknown): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: unknown): void {
    // Always log errors, even in production
    const formattedMessage = formatMessage('error', this.prefix, message);
    if (data !== undefined) {
      console.error(formattedMessage, safeStringify(data));
    } else {
      console.error(formattedMessage);
    }
  }

  child(prefix: string): Logger {
    return new Logger({
      prefix: this.prefix ? `${this.prefix}:${prefix}` : prefix,
      enabled: this.enabled,
    });
  }
}

// Pre-configured loggers for different modules
export const logger = new Logger();
export const apiLogger = new Logger({ prefix: 'API' });
export const pendleLogger = new Logger({ prefix: 'Pendle' });
export const swapLogger = new Logger({ prefix: 'Swap' });
export const walletLogger = new Logger({ prefix: 'Wallet' });

// Factory function for creating module-specific loggers
export function createLogger(prefix: string): Logger {
  return new Logger({ prefix });
}

export default logger;
