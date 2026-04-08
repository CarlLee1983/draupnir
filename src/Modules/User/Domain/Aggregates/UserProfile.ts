interface UserProfileProps {
  id: string
  displayName: string
  avatarUrl: string | null
  phone: string | null
  bio: string | null
  timezone: string
  locale: string
  notificationPreferences: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}

export interface UpdateProfileFields {
  displayName?: string
  avatarUrl?: string | null
  phone?: string | null
  bio?: string | null
  timezone?: string
  locale?: string
  notificationPreferences?: Record<string, unknown>
}

export class UserProfile {
  private readonly props: UserProfileProps

  private constructor(props: UserProfileProps) {
    this.props = props
  }

  static createDefault(userId: string, email: string): UserProfile {
    return new UserProfile({
      id: userId,
      displayName: email,
      avatarUrl: null,
      phone: null,
      bio: null,
      timezone: 'Asia/Taipei',
      locale: 'zh-TW',
      notificationPreferences: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  static fromDatabase(row: Record<string, unknown>): UserProfile {
    const prefs = row.notification_preferences
    let parsedPrefs: Record<string, unknown> = {}
    if (typeof prefs === 'string') {
      try {
        parsedPrefs = JSON.parse(prefs)
      } catch {
        parsedPrefs = {}
      }
    } else if (typeof prefs === 'object' && prefs !== null) {
      parsedPrefs = prefs as Record<string, unknown>
    }

    return new UserProfile({
      id: row.id as string,
      displayName: (row.display_name as string) || '',
      avatarUrl: (row.avatar_url as string) || null,
      phone: (row.phone as string) || null,
      bio: (row.bio as string) || null,
      timezone: (row.timezone as string) || 'Asia/Taipei',
      locale: (row.locale as string) || 'zh-TW',
      notificationPreferences: parsedPrefs,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    })
  }

  updateProfile(fields: UpdateProfileFields): UserProfile {
    return new UserProfile({
      ...this.props,
      ...(fields.displayName !== undefined && { displayName: fields.displayName }),
      ...(fields.avatarUrl !== undefined && { avatarUrl: fields.avatarUrl }),
      ...(fields.phone !== undefined && { phone: fields.phone }),
      ...(fields.bio !== undefined && { bio: fields.bio }),
      ...(fields.timezone !== undefined && { timezone: fields.timezone }),
      ...(fields.locale !== undefined && { locale: fields.locale }),
      ...(fields.notificationPreferences !== undefined && { notificationPreferences: fields.notificationPreferences }),
      updatedAt: new Date(),
    })
  }

  get id(): string { return this.props.id }
  get displayName(): string { return this.props.displayName }
  get avatarUrl(): string | null { return this.props.avatarUrl }
  get phone(): string | null { return this.props.phone }
  get bio(): string | null { return this.props.bio }
  get timezone(): string { return this.props.timezone }
  get locale(): string { return this.props.locale }
  get notificationPreferences(): Record<string, unknown> { return this.props.notificationPreferences }
  get createdAt(): Date { return this.props.createdAt }
  get updatedAt(): Date { return this.props.updatedAt }

  toDatabaseRow(): Record<string, unknown> {
    return {
      id: this.props.id,
      display_name: this.props.displayName,
      avatar_url: this.props.avatarUrl,
      phone: this.props.phone,
      bio: this.props.bio,
      timezone: this.props.timezone,
      locale: this.props.locale,
      notification_preferences: JSON.stringify(this.props.notificationPreferences),
      created_at: this.props.createdAt.toISOString(),
      updated_at: this.props.updatedAt.toISOString(),
    }
  }

  toDTO(): Record<string, unknown> {
    return {
      id: this.props.id,
      displayName: this.props.displayName,
      avatarUrl: this.props.avatarUrl,
      phone: this.props.phone,
      bio: this.props.bio,
      timezone: this.props.timezone,
      locale: this.props.locale,
      notificationPreferences: this.props.notificationPreferences,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    }
  }
}
