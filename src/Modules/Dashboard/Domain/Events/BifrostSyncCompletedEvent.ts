import { DomainEvent } from '@/Shared/Domain/DomainEvent'

export class BifrostSyncCompletedEvent extends DomainEvent {
  constructor(affectedOrgIds: readonly string[]) {
    super('bifrost-sync', 'bifrost.sync.completed', { orgIds: [...affectedOrgIds] })
  }

  override toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      orgIds: this.data.orgIds,
      occurredAt: this.occurredAt.toISOString(),
    }
  }
}
