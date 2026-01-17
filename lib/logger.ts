// GCP Cloud Run compatible structured logging
// Cloud Run automatically captures stdout/stderr and sends to Cloud Logging

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  severity: string;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

/**
 * Format log entry for GCP Cloud Logging
 * Cloud Run expects JSON logs with specific fields for proper parsing
 */
function formatLogEntry(
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>
): LogEntry {
  const entry: LogEntry = {
    severity: level.toUpperCase(),
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };

  return entry;
}

/**
 * Write log to stdout/stderr (Cloud Run captures this)
 */
function writeLog(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const entry = formatLogEntry(level, message, meta);

  // In production, output structured JSON
  if (process.env.NODE_ENV === 'production') {
    // Error logs go to stderr, others to stdout
    if (level === 'error') {
      console.error(JSON.stringify(entry));
    } else {
      console.log(JSON.stringify(entry));
    }
  } else {
    // In development, use readable console output
    const prefix = `[${level.toUpperCase()}]`;
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    console.log(`${prefix} ${message}${metaStr}`);
  }
}

/**
 * Logger instance with convenience methods
 */
export const logger = {
  /**
   * Debug level - detailed information for diagnosing problems
   */
  debug(message: string, meta?: Record<string, unknown>): void {
    if (process.env.NODE_ENV !== 'production') {
      writeLog('debug', message, meta);
    }
  },

  /**
   * Info level - general informational messages
   */
  info(message: string, meta?: Record<string, unknown>): void {
    writeLog('info', message, meta);
  },

  /**
   * Warning level - potentially harmful situations
   */
  warn(message: string, meta?: Record<string, unknown>): void {
    writeLog('warn', message, meta);
  },

  /**
   * Error level - error events that might still allow the application to continue
   */
  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
    const errorMeta = error instanceof Error
      ? {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
          ...meta,
        }
      : { error, ...meta };

    writeLog('error', message, errorMeta);
  },

  /**
   * Log API request
   */
  apiRequest(
    method: string,
    path: string,
    meta?: Record<string, unknown>
  ): void {
    writeLog('info', `API Request: ${method} ${path}`, {
      httpRequest: {
        requestMethod: method,
        requestUrl: path,
      },
      ...meta,
    });
  },

  /**
   * Log API response
   */
  apiResponse(
    method: string,
    path: string,
    status: number,
    durationMs: number,
    meta?: Record<string, unknown>
  ): void {
    const level: LogLevel = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    writeLog(level, `API Response: ${method} ${path} ${status}`, {
      httpRequest: {
        requestMethod: method,
        requestUrl: path,
        status,
        latency: `${durationMs}ms`,
      },
      ...meta,
    });
  },

  /**
   * Log authentication event
   */
  auth(event: string, uid?: string, meta?: Record<string, unknown>): void {
    writeLog('info', `Auth: ${event}`, {
      authEvent: event,
      uid,
      ...meta,
    });
  },

  /**
   * Log database operation
   */
  db(operation: string, collection: string, meta?: Record<string, unknown>): void {
    writeLog('info', `DB: ${operation} ${collection}`, {
      dbOperation: operation,
      collection,
      ...meta,
    });
  },
};

/**
 * Create a request logger middleware helper
 * Usage in API routes:
 * const startTime = Date.now();
 * try {
 *   // ... handle request
 *   logApiRequest(request, response, startTime);
 * } catch (error) {
 *   logApiRequest(request, response, startTime, error);
 * }
 */
export function createRequestLogger(request: Request) {
  const startTime = Date.now();
  const method = request.method;
  const url = new URL(request.url);
  const path = url.pathname;

  logger.apiRequest(method, path);

  return {
    success: (status: number = 200, meta?: Record<string, unknown>) => {
      const duration = Date.now() - startTime;
      logger.apiResponse(method, path, status, duration, meta);
    },
    error: (status: number = 500, error?: Error | unknown, meta?: Record<string, unknown>) => {
      const duration = Date.now() - startTime;
      logger.error(`API Error: ${method} ${path}`, error, { status, duration, ...meta });
      logger.apiResponse(method, path, status, duration, meta);
    },
  };
}

export default logger;
