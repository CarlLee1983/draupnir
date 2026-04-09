export interface RegisterAppRequest {
	orgId: string
	createdByUserId: string
	callerSystemRole: string
	name: string
	description?: string
	redirectUris?: string[]
}

export interface RegisterAppResponse {
	success: boolean
	message: string
	error?: string
	data?: Record<string, unknown>
}

export interface UpdateAppRequest {
	appId: string
	callerUserId: string
	callerSystemRole: string
	name?: string
	description?: string
	redirectUris?: string[]
}

export interface ListAppsRequest {
	orgId: string
	callerUserId: string
	callerSystemRole: string
	page?: number
	limit?: number
}
