export interface UserProfileProps {
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

  static reconstitute(props: UserProfileProps): UserProfile {
    return new UserProfile(props)
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
}
