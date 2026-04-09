export interface ConfigureWebhookRequest {
	applicationId: string
	callerUserId: string
	callerSystemRole: string
	webhookUrl: string
	eventTypes: string[]
}

export interface ConfigureWebhookResponse {
	success: boolean
	message: string
	error?: string
	data?: {
		webhookUrl: string
		webhookSecret: string
		subscribedEvents: string[]
	}
}

export interface ManageAppKeysRequest {
	applicationId: string
	callerUserId: string
	callerSystemRole: string
	action: 'issue' | 'revoke' | 'list'
	keyId?: string
	label?: string
	scope?: string
	boundModules?: string[]
}

export interface ManageAppKeysResponse {
	success: boolean
	message: string
	error?: string
	data?: Record<string, unknown> | Record<string, unknown>[]
}
