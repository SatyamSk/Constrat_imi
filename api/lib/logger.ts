/**
 * Centralized logging service
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  userId?: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown> & { requestId?: string; userId?: string },
  ) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      requestId: context?.requestId,
      userId: context?.userId,
      context: context ? Object.fromEntries(
        Object.entries(context).filter(([k]) => k !== 'requestId' && k !== 'userId')
      ) : undefined,
    };

    this.write(entry);
  }

  debug(message: string, context?: Record<string, unknown>) {
    if (this.isDevelopment) {
      this.log(LogLevel.DEBUG, message, context);
    }
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      level: LogLevel.ERROR,
      message,
      timestamp: new Date().toISOString(),
      requestId: context?.requestId as string | undefined,
      userId: context?.userId as string | undefined,
      context: context ? Object.fromEntries(
        Object.entries(context).filter(([k]) => k !== 'requestId' && k !== 'userId')
      ) : undefined,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    this.write(entry);
  }

  critical(message: string, error?: Error, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      level: LogLevel.CRITICAL,
      message,
      timestamp: new Date().toISOString(),
      requestId: context?.requestId as string | undefined,
      userId: context?.userId as string | undefined,
      context: context ? Object.fromEntries(
        Object.entries(context).filter(([k]) => k !== 'requestId' && k !== 'userId')
      ) : undefined,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    this.write(entry);
  }

  private write(entry: LogEntry) {
    const output = JSON.stringify(entry);
    
    if (entry.level === LogLevel.ERROR || entry.level === LogLevel.CRITICAL) {
      console.error(output);
    } else {
      console.log(output);
    }
  }
}

export const logger = new Logger();
