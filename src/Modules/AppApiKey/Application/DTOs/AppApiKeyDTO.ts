export interface IssueAppKeyRequest {
	orgId: string
	issuedByUserId: string
	callerSystemRole: string
	label: string
	scope?: string
	rotationPolicy?: {
		autoRotate: boolean
		rotationIntervalDays?: number
		gracePeriodHours?: number
	}
	boundModuleIds?: string[]
	expiresAt?: string
}

export interface RotateAppKeyRequest {
	keyId: string
	callerUserId: string
	callerSystemRole: string
}

export interface RevokeAppKeyRequest {
	keyId: string
	callerUserId: string
	callerSystemRole: string
}

export interface SetAppKeyScopeRequest {
	keyId: string
	callerUserId: string
	callerSystemRole: string
	scope?: string
	boundModuleIds?: string[]
}

export interface GetAppKeyUsageRequest {
	keyId: string
	callerUserId: string
	callerSystemRole: string
	startDate?: string
	endDate?: string
}

export interface AppApiKeyResponse {
	success: boolean
	message: string
	data?: Record<string, unknown>
	error?: string
}

export interface AppApiKeyCreatedResponse {
	success: boolean
	message: string
	data?: Record<string, unknown> & { rawKey?: string }
	error?: string
}

export interface ListAppApiKeysResponse {
	success: boolean
	message: string
	data?: {
		keys: Record<string, unknown>[]
		meta: { total: number; page: number; limit: number; totalPages: number }
	}
	error?: string
}
