// src/Modules/AppModule/Domain/Events/ModuleSubscribed.ts
import { DomainEvent } from '@/Shared/Domain/DomainEvent'

export class ModuleSubscribed extends DomainEvent {
  constructor(subscriptionId: string, orgId: string, moduleId: string) {
    super(subscriptionId, 'module.subscribed', { orgId, moduleId })
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
