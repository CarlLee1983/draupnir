import type { ReportSchedule } from '../Aggregates/ReportSchedule'

export interface IReportRepository {
  save(schedule: ReportSchedule): Promise<void>
  findById(id: string): Promise<ReportSchedule | null>
  findByOrgId(orgId: string): Promise<ReportSchedule[]>
  findAllEnabled(): Promise<ReportSchedule[]>
  delete(id: string): Promise<void>
}
