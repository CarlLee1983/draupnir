// src/Modules/AppModule/Domain/Events/ModuleAccessRevoked.ts
import { DomainEvent } from '@/Shared/Domain/DomainEvent'

export class ModuleAccessRevoked extends DomainEvent {
  constructor(subscriptionId: string, orgId: string, moduleId: string, reason: string) {
    super(subscriptionId, 'module.access_revoked', { orgId, moduleId, reason })
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
