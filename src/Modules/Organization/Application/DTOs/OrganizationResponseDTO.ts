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
