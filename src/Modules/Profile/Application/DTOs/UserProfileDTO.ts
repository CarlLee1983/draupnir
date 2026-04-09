export interface UpdateUserProfileRequest {
  displayName?: string
  avatarUrl?: string | null
  phone?: string | null
  bio?: string | null
  timezone?: string
  locale?: string
  notificationPreferences?: Record<string, unknown>
}

export interface UserProfileDTO {
  id: string
  displayName: string
  avatarUrl: string | null
  phone: string | null
  bio: string | null
  timezone: string
  locale: string
  notificationPreferences: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface UserProfileResponse {
  success: boolean
  message: string
  data?: UserProfileDTO
  error?: string
}

export interface ListUsersRequest {
  role?: string
  status?: string
  keyword?: string
  page?: number
  limit?: number
}

export interface ListUsersResponse {
  success: boolean
  message: string
  data?: {
    users: UserProfileDTO[]
    meta: {
      total: number
      page: number
      limit: number
      totalPages: number
    }
  }
  error?: string
}
