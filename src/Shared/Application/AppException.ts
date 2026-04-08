/**
 * 應用層異常體系 (Application Exceptions)
 *
 * 提供全域統一的異常基類 `AppException`，所有自訂業務異常應繼承自此。
 * 包含機器可讀的錯誤代碼 (code)、使用者訊息 (message) 以及 HTTP 狀態碼。
 */
export class AppException extends Error {
	constructor(
		public readonly code: string,
		public readonly message: string,
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
 * 404 - 資源不存在
 */
export class NotFoundException extends AppException {
	constructor(message: string = 'Resource not found') {
		super('NOT_FOUND', message, 404)
	}
}

/**
 * 422 - 驗證失敗
 */
export class ValidationException extends AppException {
	constructor(public errors: Record<string, string[]>) {
		super('VALIDATION_ERROR', 'Validation failed', 422, { errors })
	}
}

/**
 * 409 - 業務邏輯衝突
 */
export class ConflictException extends AppException {
	constructor(message: string) {
		super('CONFLICT', message, 409)
	}
}

/**
 * 500 - 伺服器錯誤
 */
export class InternalException extends AppException {
	constructor(message: string = 'Internal server error') {
		super('INTERNAL_ERROR', message, 500)
	}
}
