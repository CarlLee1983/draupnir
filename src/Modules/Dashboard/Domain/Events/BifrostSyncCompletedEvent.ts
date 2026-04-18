import { DomainEvent } from '@/Shared/Domain/DomainEvent'

export class BifrostSyncCompletedEvent extends DomainEvent {
  constructor(
    affectedOrgIds: readonly string[],
    range?: { readonly startTime?: string; readonly endTime?: string },
  ) {
    super('bifrost-sync', 'bifrost.sync.completed', {
      orgIds: [...affectedOrgIds],
      ...(range?.startTime ? { startTime: range.startTime } : {}),
      ...(range?.endTime ? { endTime: range.endTime } : {}),
    })
  }

  override toJSON(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      orgIds: this.data.orgIds,
      ...(this.data.startTime ? { startTime: this.data.startTime } : {}),
      ...(this.data.endTime ? { endTime: this.data.endTime } : {}),
      occurredAt: this.occurredAt.toISOString(),
    }
  }
}
