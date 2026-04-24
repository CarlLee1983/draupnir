/**
 * Application Exception Hierarchy
 *
 * Provides a global unified exception base class `AppException`. All custom business
 * exceptions should inherit from this class. It includes a machine-readable error
 * code, user message, and HTTP status code.
 */
export class AppException extends Error {
  /**
   * Initializes a new application exception.
   *
   * @param code - Machine-readable error code.
   * @param message - User-friendly error message.
   * @param statusCode - HTTP status code (defaults to 400).
   * @param details - Optional additional error details.
   */
  constructor(
    public readonly code: string,
    public override readonly message: string,
    public readonly statusCode: number = 400,
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    public readonly details?: Record<string, any>,
  ) {
    super(message)
    this.name = this.constructor.name
  }

  /**
   * Returns a plain object for JSON serialization.
   *
   * @returns A plain object containing error code, message and details.
   */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    }
  }
}

/**
 * 404 - Resource not found.
 */
export class NotFoundException extends AppException {
  /**
   * @param message - Custom error message (defaults to 'Resource not found').
   */
  constructor(message: string = 'Resource not found') {
    super('NOT_FOUND', message, 404)
  }
}

/**
 * 422 - Validation failed.
 */
export class ValidationException extends AppException {
  /**
   * @param errors - Map of field names to error messages.
   */
  constructor(public errors: Record<string, string[]>) {
    super('VALIDATION_ERROR', 'Validation failed', 422, { errors })
  }
}

/**
 * 409 - Business logic conflict.
 */
export class ConflictException extends AppException {
  /**
   * @param message - Conflict description.
   */
  constructor(message: string) {
    super('CONFLICT', message, 409)
  }
}

/**
 * 500 - Internal server error.
 */
export class InternalException extends AppException {
  /**
   * @param message - Custom error message (defaults to 'Internal server error').
   */
  constructor(message: string = 'Internal server error') {
    super('INTERNAL_ERROR', message, 500)
  }
}
