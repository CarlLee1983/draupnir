export interface CreateOrganizationRequest {
	name: string
	description?: string
	slug?: string
	managerUserId: string
}

export interface UpdateOrganizationRequest {
	name?: string
	description?: string
}

export interface InviteMemberRequest {
	email: string
	role?: string
}

export interface AcceptInvitationRequest {
	token: string
}

export interface OrganizationResponse {
	success: boolean
	message: string
	data?: Record<string, unknown>
	error?: string
}

export interface ListOrganizationsResponse {
	success: boolean
	message: string
	data?: {
		organizations: Record<string, unknown>[]
		meta: { total: number; page: number; limit: number; totalPages: number }
	}
	error?: string
}
