/**
 * UserProfile
 * Domain Aggregate: represents a user's identity and preferences within the system.
 */

import type { DomainEvent } from '@/Shared/Domain/DomainEvent'
import { UserProfileCreated } from '../Events/UserProfileCreated'
import { UserProfileUpdated } from '../Events/UserProfileUpdated'
import { Locale } from '../ValueObjects/Locale'
import { Phone } from '../ValueObjects/Phone'
import { Timezone } from '../ValueObjects/Timezone'

/**
 * Properties required to initialize a UserProfile (internal, using VOs).
 */
export interface UserProfileProps {
  id: string
  userId: string
  displayName: string
  avatarUrl: string | null
  phone: Phone | null
  bio: string | null
  timezone: Timezone
  locale: Locale
  notificationPreferences: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
  domainEvents: DomainEvent[]
}

/**
 * Props accepted by reconstitute() — uses plain strings (from DB / Mapper).
 */
export type ReconstitutionProps = {
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
 * Represents a user's identity, preferences, and contact information.
 *
 * Responsibilities:
 * - Define user display information and language/time settings.
 * - Manage notification delivery preferences.
 * - Enforce data integrity through value objects (e.g., Phone, Timezone).
 * - Collect domain events for reactive downstream systems (e.g., profile completion tracking).
 */
export class UserProfile {
  /** Internal state of the user profile. */
  private readonly props: UserProfileProps

  /**
   * Internal constructor for the UserProfile aggregate.
   * Use static factory methods like `createDefault` or `reconstitute` instead.
   *
   * @param props The initial properties for the aggregate.
   */
  private constructor(props: UserProfileProps) {
    this.props = props
  }

  /**
   * Creates a new UserProfile with default settings for a new user.
   * Dispatches a UserProfileCreated event.
   *
   * @param userId The unique identifier of the user.
   * @param email The user's email, used as the initial display name.
   * @returns A new UserProfile instance.
   */
  static createDefault(userId: string, email: string): UserProfile {
    const id = crypto.randomUUID()
    const event = new UserProfileCreated(id, userId, email)
    return new UserProfile({
      id,
      userId,
      displayName: email,
      avatarUrl: null,
      phone: null,
      bio: null,
      timezone: Timezone.default(),
      locale: Locale.default(),
      notificationPreferences: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      domainEvents: [event],
    })
  }

  /**
   * Reconstitutes a UserProfile aggregate from existing data.
   * Wraps raw string values into their respective value objects.
   *
   * @param props The raw properties from a persistence layer.
   * @returns A reconstituted UserProfile instance.
   */
  static reconstitute(props: ReconstitutionProps): UserProfile {
    return new UserProfile({
      ...props,
      phone: Phone.fromNullable(props.phone),
      timezone: new Timezone(props.timezone),
      locale: new Locale(props.locale),
      domainEvents: [],
    })
  }

  /**
   * Updates the profile with new field values.
   * Returns a new UserProfile instance (immutability).
   * Sets a UserProfileUpdated domain event.
   */
  updateProfile(fields: UpdateProfileFields): UserProfile {
    const event = new UserProfileUpdated(
      this.props.id,
      this.props.userId,
      Object.keys(fields).filter((k) => fields[k as keyof UpdateProfileFields] !== undefined),
    )
    return new UserProfile({
      ...this.props,
      ...(fields.displayName !== undefined && { displayName: fields.displayName }),
      ...(fields.avatarUrl !== undefined && { avatarUrl: fields.avatarUrl }),
      ...(fields.phone !== undefined && {
        phone: fields.phone !== null ? Phone.fromNullable(fields.phone) : null,
      }),
      ...(fields.bio !== undefined && { bio: fields.bio }),
      ...(fields.timezone !== undefined && { timezone: new Timezone(fields.timezone) }),
      ...(fields.locale !== undefined && { locale: new Locale(fields.locale) }),
      ...(fields.notificationPreferences !== undefined && {
        notificationPreferences: fields.notificationPreferences,
      }),
      updatedAt: new Date(),
      domainEvents: [event],
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
  /** Gets the phone number as a string. */
  get phone(): string | null {
    return this.props.phone ? this.props.phone.getValue() : null
  }
  /** Gets the biography. */
  get bio(): string | null {
    return this.props.bio
  }
  /** Gets the timezone setting as a string. */
  get timezone(): string {
    return this.props.timezone.getValue()
  }
  /** Gets the locale/language setting as a string. */
  get locale(): string {
    return this.props.locale.getValue()
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
  /** Gets the pending domain events (defensive copy). */
  get domainEvents(): DomainEvent[] {
    return [...this.props.domainEvents]
  }
  /** Returns a new instance with the domain events cleared. */
  clearDomainEvents(): UserProfile {
    return new UserProfile({ ...this.props, domainEvents: [] })
  }
}
