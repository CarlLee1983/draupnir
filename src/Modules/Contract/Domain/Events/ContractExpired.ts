// src/Modules/Contract/Domain/Events/ContractExpired.ts
import { DomainEvent } from '@/Shared/Domain/DomainEvent'

export class ContractExpired extends DomainEvent {
  constructor(contractId: string, targetType: string, targetId: string) {
    super(contractId, 'contract.expired', { contractId, targetType, targetId })
  }

  toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      aggregateId: this.aggregateId,
      occurredAt: this.occurredAt.toISOString(),
      data: this.data,
    }
  }
}
