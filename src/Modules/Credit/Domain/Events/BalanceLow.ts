// src/Modules/Credit/Domain/Events/BalanceLow.ts
import { DomainEvent } from '@/Shared/Domain/DomainEvent'

export class BalanceLow extends DomainEvent {
  constructor(accountId: string, orgId: string, currentBalance: string) {
    super(accountId, 'credit.balance_low', { orgId, currentBalance })
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
