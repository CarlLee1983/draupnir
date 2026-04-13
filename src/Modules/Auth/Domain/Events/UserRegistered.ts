// src/Modules/Auth/Domain/Events/UserRegistered.ts
import { DomainEvent } from '@/Shared/Domain/DomainEvent'

/**
 * Domain event emitted when a new user successfully registers.
 * Payload: userId and email of the newly created user.
 */
export class UserRegistered extends DomainEvent {
  constructor(userId: string, email: string) {
    super(userId, 'auth.user_registered', { userId, email })
  }

  get userId(): string {
    return this.data.userId as string
  }

  get email(): string {
    return this.data.email as string
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
