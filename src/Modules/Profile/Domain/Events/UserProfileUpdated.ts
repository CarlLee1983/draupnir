import { DomainEvent } from '@/Shared/Domain/DomainEvent'

/**
 * Emitted when a user profile is updated.
 */
export class UserProfileUpdated extends DomainEvent {
  constructor(
    profileId: string,
    userId: string,
    fields: string[],
    payload: Record<string, unknown>,
  ) {
    super(profileId, 'profile.user_profile_updated', { profileId, userId, fields, payload })
  }

  get profileId(): string {
    return this.data.profileId as string
  }
  get userId(): string {
    return this.data.userId as string
  }
  get fields(): string[] {
    return this.data.fields as string[]
  }
  get payload(): Record<string, unknown> {
    return this.data.payload as Record<string, unknown>
  }

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
