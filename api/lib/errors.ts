/**
 * Error handling and custom exceptions
 */

import type { ApiError } from './types';

export class AppError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AppError';
  }

  toApiError(): ApiError {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Forbidden') {
    super('FORBIDDEN', message, 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super('RATE_LIMIT_EXCEEDED', message, 429);
    this.name = 'RateLimitError';
  }
}

export class ProcessingError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('PROCESSING_ERROR', message, 500, details);
    this.name = 'ProcessingError';
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super('EXTERNAL_SERVICE_ERROR', `${service}: ${message}`, 502, {
      service,
    });
    this.name = 'ExternalServiceError';
  }
}

export class StorageError extends AppError {
  constructor(message: string) {
    super('STORAGE_ERROR', message, 500);
    this.name = 'StorageError';
  }
}

export class QuotaExceededError extends AppError {
  constructor(resource: string) {
    super('QUOTA_EXCEEDED', `${resource} quota exceeded`, 429);
    this.name = 'QuotaExceededError';
  }
}

/**
 * Error response formatter
 */
export function formatErrorResponse(error: unknown) {
  if (error instanceof AppError) {
    return {
      success: false,
      error: error.toApiError(),
    };
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
        statusCode: 500,
      },
    };
  }

  return {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      statusCode: 500,
    },
  };
}
