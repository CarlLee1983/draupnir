import type { AlertEvent } from '../Entities/AlertEvent'

export interface IAlertEventRepository {
  save(event: AlertEvent): Promise<void>
  findByOrgAndMonth(orgId: string, month: string): Promise<readonly AlertEvent[]>
  findById(id: string): Promise<AlertEvent | null>
  listByOrg(orgId: string, opts?: { limit?: number; offset?: number }): Promise<readonly AlertEvent[]>
}
