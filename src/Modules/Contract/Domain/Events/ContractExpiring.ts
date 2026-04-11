// src/Modules/Contract/Domain/Events/ContractExpiring.ts
import { DomainEvent } from '@/Shared/Domain/DomainEvent'

/** Emitted when an ACTIVE contract is within the configured days-before-end window. */
export class ContractExpiring extends DomainEvent {
  constructor(contractId: string, targetType: string, targetId: string, daysRemaining: number) {
    super(contractId, 'contract.expiring', { contractId, targetType, targetId, daysRemaining })
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
