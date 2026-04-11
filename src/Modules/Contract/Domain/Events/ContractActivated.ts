// src/Modules/Contract/Domain/Events/ContractActivated.ts
import { DomainEvent } from '@/Shared/Domain/DomainEvent'

/** Emitted after a contract becomes ACTIVE. */
export class ContractActivated extends DomainEvent {
  constructor(contractId: string, targetType: string, targetId: string) {
    super(contractId, 'contract.activated', { contractId, targetType, targetId })
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
