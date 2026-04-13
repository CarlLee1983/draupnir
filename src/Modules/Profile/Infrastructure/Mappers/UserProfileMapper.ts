import { UserProfile, type UserProfileProps } from '../../Domain/Aggregates/UserProfile'
import type { UserProfileDTO } from '../../Application/DTOs/UserProfileDTO'

/**
 * Parses notification preferences from unknown database format.
 * @param value - The raw value from the database.
 */
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

/**
 * Normalizes a string value with a fallback.
 */
function normalizeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

/**
 * Normalizes a string value to be nullable.
 */
function normalizeNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

/**
 * Mapper for converting UserProfile between different representations.
 */
export const UserProfileMapper = {
  /**
   * Maps a database row to a UserProfile aggregate.
   * @param row - Raw data from the database.
   */
  fromDatabase(row: Record<string, unknown>): UserProfile {
    const props: UserProfileProps = {
      id: row.id as string,
      userId: row.user_id as string,
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

  /**
   * Maps a UserProfile aggregate to a database-friendly object.
   * @param profile - The aggregate instance.
   */
  toDatabaseRow(profile: UserProfile): Record<string, unknown> {
    return {
      id: profile.id,
      user_id: profile.userId,
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

  /**
   * Maps a UserProfile aggregate to a Data Transfer Object.
   * @param profile - The aggregate instance.
   */
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

