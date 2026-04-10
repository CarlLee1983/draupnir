// src/Modules/Credit/Domain/Events/CreditToppedUp.ts
import { DomainEvent } from '@/Shared/Domain/DomainEvent'

export class CreditToppedUp extends DomainEvent {
  constructor(accountId: string, orgId: string, amount: string) {
    super(accountId, 'credit.topped_up', { orgId, amount })
  }

  get orgId(): string {
    return this.data.orgId as string
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
