/**
 * Request payload for updating a user profile.
 */
export interface UpdateUserProfileRequest {
  displayName?: string
  avatarUrl?: string | null
  phone?: string | null
  bio?: string | null
  timezone?: string
  locale?: string
  notificationPreferences?: Record<string, unknown>
}

/**
 * Data Transfer Object representing a user profile.
 */
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

/**
 * Standard response structure for profile operations.
 */
export interface UserProfileResponse {
  success: boolean
  message: string
  data?: UserProfileDTO
  error?: string
}

/**
 * Request payload for listing users with filters and pagination.
 */
export interface ListUsersRequest {
  role?: string
  status?: string
  keyword?: string
  page?: number
  limit?: number
}

/**
 * Standard response structure for listing users.
 */
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

import type { UserProfile } from '../../Domain/Aggregates/UserProfile'

/**
 * Maps a UserProfile aggregate to a UserProfileDTO.
 * Defined here to avoid Application Services importing from Infrastructure.
 */
export function profileToDTO(profile: UserProfile): UserProfileDTO {
  return {
    id: profile.id,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    phone: profile.phone,
    bio: profile.bio,
    timezone: profile.timezone,
    locale: profile.locale,
    notificationPreferences: profile.notificationPreferences,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  }
}
