import type { AlertConfig } from '../Aggregates/AlertConfig'

export interface IAlertConfigRepository {
  findByOrgId(orgId: string): Promise<AlertConfig | null>
  save(config: AlertConfig): Promise<void>
  update(config: AlertConfig): Promise<void>
}
