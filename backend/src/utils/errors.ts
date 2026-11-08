export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
    timestamp: string;
  };
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  public toResponse(): ApiErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad Request', details?: unknown, code = 'BAD_REQUEST') {
    super(400, code, message, details);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation Error', details?: unknown) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details?: unknown, code = 'UNAUTHORIZED') {
    super(401, code, message, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details?: unknown, code = 'FORBIDDEN') {
    super(403, code, message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details?: unknown, code = 'NOT_FOUND') {
    super(404, code, message, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', details?: unknown, code = 'CONFLICT') {
    super(409, code, message, details);
  }
}

export class GoneError extends AppError {
  constructor(message = 'Resource gone or expired', details?: unknown, code = 'GONE') {
    super(410, code, message, details);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal server error', details?: unknown) {
    super(500, 'INTERNAL_SERVER_ERROR', message, details);
  }
}

