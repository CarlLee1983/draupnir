import type { AlertConfig } from '../../Domain/Aggregates/AlertConfig'
import type { IAlertConfigRepository } from '../../Domain/Repositories/IAlertConfigRepository'

export class InMemoryAlertConfigRepository implements IAlertConfigRepository {
  private readonly store = new Map<string, AlertConfig>()

  async findByOrgId(orgId: string): Promise<AlertConfig | null> {
    return this.store.get(orgId) ?? null
  }

  async save(config: AlertConfig): Promise<void> {
    this.store.set(config.orgId, config)
  }

  async update(config: AlertConfig): Promise<void> {
    this.store.set(config.orgId, config)
  }

  all(): AlertConfig[] {
    return [...this.store.values()]
  }
}
