import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { AlertConfig } from '../../Domain/Aggregates/AlertConfig'
import type { IAlertConfigRepository } from '../../Domain/Repositories/IAlertConfigRepository'

export class AlertConfigRepository implements IAlertConfigRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async findByOrgId(orgId: string): Promise<AlertConfig | null> {
    const row = await this.db.table('alert_configs').where('org_id', '=', orgId).first()
    return row ? AlertConfig.fromDatabase(row) : null
  }

  async save(config: AlertConfig): Promise<void> {
    await this.db.table('alert_configs').insert({
      id: config.id,
      org_id: config.orgId,
      budget_usd: config.budgetUsd,
      last_alerted_tier: config.lastAlertedTier,
      last_alerted_at: config.lastAlertedAt,
      last_alerted_month: config.lastAlertedMonth,
      created_at: config.createdAt,
      updated_at: config.updatedAt,
    })
  }

  async update(config: AlertConfig): Promise<void> {
    await this.db.table('alert_configs').where('id', '=', config.id).update({
      org_id: config.orgId,
      budget_usd: config.budgetUsd,
      last_alerted_tier: config.lastAlertedTier,
      last_alerted_at: config.lastAlertedAt,
      last_alerted_month: config.lastAlertedMonth,
      created_at: config.createdAt,
      updated_at: config.updatedAt,
    })
  }
}
