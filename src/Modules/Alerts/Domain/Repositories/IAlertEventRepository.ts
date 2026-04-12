import type { AlertEvent } from '../Entities/AlertEvent'

export interface IAlertEventRepository {
  save(event: AlertEvent): Promise<void>
  findByOrgAndMonth(orgId: string, month: string): Promise<readonly AlertEvent[]>
}
