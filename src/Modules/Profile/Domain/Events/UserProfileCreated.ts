import { DomainEvent } from '@/Shared/Domain/DomainEvent'

/**
 * Emitted when a new user profile is created.
 */
export class UserProfileCreated extends DomainEvent {
  constructor(profileId: string, userId: string, email: string) {
    super(profileId, 'profile.user_profile_created', { profileId, userId, email })
  }

  get profileId(): string { return this.data.profileId as string }
  get userId(): string { return this.data.userId as string }
  get email(): string { return this.data.email as string }

  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      aggregateId: this.aggregateId,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      data: this.data,
    }
  }
}
