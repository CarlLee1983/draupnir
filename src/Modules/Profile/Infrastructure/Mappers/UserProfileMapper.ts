import { UserProfile, type UserProfileProps } from '../../Domain/Aggregates/UserProfile'
import type { UserProfileDTO } from '../../Application/DTOs/UserProfileDTO'

function parseNotificationPreferences(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>
    } catch {
      return {}
    }
  }

  if (typeof value === 'object' && value !== null) {
    return value as Record<string, unknown>
  }

  return {}
}

function normalizeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function normalizeNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

export const UserProfileMapper = {
  fromDatabase(row: Record<string, unknown>): UserProfile {
    const props: UserProfileProps = {
      id: row.id as string,
      displayName: normalizeString(row.display_name),
      avatarUrl: normalizeNullableString(row.avatar_url),
      phone: normalizeNullableString(row.phone),
      bio: normalizeNullableString(row.bio),
      timezone: normalizeString(row.timezone, 'Asia/Taipei'),
      locale: normalizeString(row.locale, 'zh-TW'),
      notificationPreferences: parseNotificationPreferences(row.notification_preferences),
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    }

    return UserProfile.reconstitute(props)
  },

  toDatabaseRow(profile: UserProfile): Record<string, unknown> {
    return {
      id: profile.id,
      display_name: profile.displayName,
      avatar_url: profile.avatarUrl,
      phone: profile.phone,
      bio: profile.bio,
      timezone: profile.timezone,
      locale: profile.locale,
      notification_preferences: JSON.stringify(profile.notificationPreferences),
      created_at: profile.createdAt.toISOString(),
      updated_at: profile.updatedAt.toISOString(),
    }
  },

  toDTO(profile: UserProfile): UserProfileDTO {
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
  },
}
