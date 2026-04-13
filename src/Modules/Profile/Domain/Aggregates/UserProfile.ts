/**
 * UserProfile
 * Domain Aggregate: represents a user's identity and preferences within the system.
 */

/**
 * Properties required to initialize a UserProfile.
 */
export interface UserProfileProps {
  id: string
  userId: string
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

/**
 * Fields that can be updated in a UserProfile.
 */
export interface UpdateProfileFields {
  displayName?: string
  avatarUrl?: string | null
  phone?: string | null
  bio?: string | null
  timezone?: string
  locale?: string
  notificationPreferences?: Record<string, unknown>
}

/**
 * UserProfile Aggregate Root
 * Represents a user's profile information and handles business logic for updates.
 */
export class UserProfile {
  private readonly props: UserProfileProps

  private constructor(props: UserProfileProps) {
    this.props = props
  }

  /**
   * Creates a new UserProfile with default settings.
   */
  static createDefault(userId: string, email: string): UserProfile {
    return new UserProfile({
      id: crypto.randomUUID(),
      userId: userId,
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

  /**
   * Reconstitutes a UserProfile from existing data.
   */
  static reconstitute(props: UserProfileProps): UserProfile {
    return new UserProfile(props)
  }

  /**
   * Updates the profile with new field values.
   * Returns a new UserProfile instance (immutability).
   */
  updateProfile(fields: UpdateProfileFields): UserProfile {
    return new UserProfile({
      ...this.props,
      ...(fields.displayName !== undefined && { displayName: fields.displayName }),
      ...(fields.avatarUrl !== undefined && { avatarUrl: fields.avatarUrl }),
      ...(fields.phone !== undefined && { phone: fields.phone }),
      ...(fields.bio !== undefined && { bio: fields.bio }),
      ...(fields.timezone !== undefined && { timezone: fields.timezone }),
      ...(fields.locale !== undefined && { locale: fields.locale }),
      ...(fields.notificationPreferences !== undefined && {
        notificationPreferences: fields.notificationPreferences,
      }),
      updatedAt: new Date(),
    })
  }

  /** Gets the user profile unique identifier. */
  get id(): string {
    return this.props.id
  }
  /** Gets the associated user unique identifier. */
  get userId(): string {
    return this.props.userId
  }
  /** Gets the display name. */
  get displayName(): string {
    return this.props.displayName
  }
  /** Gets the avatar URL. */
  get avatarUrl(): string | null {
    return this.props.avatarUrl
  }
  /** Gets the phone number. */
  get phone(): string | null {
    return this.props.phone
  }
  /** Gets the biography. */
  get bio(): string | null {
    return this.props.bio
  }
  /** Gets the timezone setting. */
  get timezone(): string {
    return this.props.timezone
  }
  /** Gets the locale/language setting. */
  get locale(): string {
    return this.props.locale
  }
  /** Gets the notification preferences. */
  get notificationPreferences(): Record<string, unknown> {
    return this.props.notificationPreferences
  }
  /** Gets the creation timestamp. */
  get createdAt(): Date {
    return this.props.createdAt
  }
  /** Gets the last update timestamp. */
  get updatedAt(): Date {
    return this.props.updatedAt
  }
}


