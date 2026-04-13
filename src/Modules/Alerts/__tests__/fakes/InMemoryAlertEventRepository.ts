import type { AlertEvent } from '../../Domain/Entities/AlertEvent'
import type { IAlertEventRepository } from '../../Domain/Repositories/IAlertEventRepository'

export class InMemoryAlertEventRepository implements IAlertEventRepository {
  private events: AlertEvent[] = []

  async save(event: AlertEvent): Promise<void> {
    const idx = this.events.findIndex((e) => e.id === event.id)
    if (idx >= 0) {
      this.events[idx] = event
    } else {
      this.events.push(event)
    }
  }

  async findByOrgAndMonth(orgId: string, month: string): Promise<readonly AlertEvent[]> {
    return this.events
      .filter((e) => e.orgId === orgId && e.month === month)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
  }

  async findById(id: string): Promise<AlertEvent | null> {
    return this.events.find((e) => e.id === id) ?? null
  }

  async listByOrg(
    orgId: string,
    opts?: { limit?: number; offset?: number },
  ): Promise<readonly AlertEvent[]> {
    const limit = opts?.limit ?? 50
    const offset = opts?.offset ?? 0
    return this.events
      .filter((e) => e.orgId === orgId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(offset, offset + limit)
  }

  all(): AlertEvent[] {
    return [...this.events]
  }
}
