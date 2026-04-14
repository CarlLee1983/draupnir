/**
 * Application Exception Hierarchy
 *
 * Provides a global unified exception base class `AppException`. All custom business
 * exceptions should inherit from this class. It includes a machine-readable error
 * code, user message, and HTTP status code.
 */
export class AppException extends Error {
  constructor(
    public readonly code: string,
    public override readonly message: string,
    public readonly statusCode: number = 400,
    public readonly details?: Record<string, any>,
  ) {
    super(message)
    this.name = this.constructor.name
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    }
  }
}

/**
 * 404 - Resource not found
 */
export class NotFoundException extends AppException {
  constructor(message: string = 'Resource not found') {
    super('NOT_FOUND', message, 404)
  }
}

/**
 * 422 - Validation failed
 */
export class ValidationException extends AppException {
  constructor(public errors: Record<string, string[]>) {
    super('VALIDATION_ERROR', 'Validation failed', 422, { errors })
  }
}

/**
 * 409 - Business logic conflict
 */
export class ConflictException extends AppException {
  constructor(message: string) {
    super('CONFLICT', message, 409)
  }
}

/**
 * 500 - Internal server error
 */
export class InternalException extends AppException {
  constructor(message: string = 'Internal server error') {
    super('INTERNAL_ERROR', message, 500)
  }
}
