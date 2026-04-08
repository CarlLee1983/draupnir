export interface CreateApiKeyRequest {
	orgId: string
	createdByUserId: string
	callerSystemRole: string
	label: string
	allowedModels?: string[]
	rateLimitRpm?: number
	rateLimitTpm?: number
	expiresAt?: string
}

export interface UpdateKeyLabelRequest {
	keyId: string
	callerUserId: string
	callerSystemRole: string
	label: string
}

export interface SetKeyPermissionsRequest {
	keyId: string
	callerUserId: string
	callerSystemRole: string
	allowedModels?: string[]
	rateLimitRpm?: number | null
	rateLimitTpm?: number | null
}

export interface RevokeApiKeyRequest {
	keyId: string
	callerUserId: string
	callerSystemRole: string
}

export interface ApiKeyResponse {
	success: boolean
	message: string
	data?: Record<string, unknown>
	error?: string
}

export interface ApiKeyCreatedResponse {
	success: boolean
	message: string
	data?: Record<string, unknown> & { rawKey?: string }
	error?: string
}

export interface ListApiKeysResponse {
	success: boolean
	message: string
	data?: {
		keys: Record<string, unknown>[]
		meta: { total: number; page: number; limit: number; totalPages: number }
	}
	error?: string
}
