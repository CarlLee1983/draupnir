// src/Modules/Credit/Domain/Events/BalanceDepleted.ts
import { DomainEvent } from '@/Shared/Domain/DomainEvent'

export class BalanceDepleted extends DomainEvent {
  constructor(accountId: string, orgId: string) {
    super(accountId, 'credit.balance_depleted', { orgId })
  }

  get orgId(): string { return this.data.orgId as string }

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
