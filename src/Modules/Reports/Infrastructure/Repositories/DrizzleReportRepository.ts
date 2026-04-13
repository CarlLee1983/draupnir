import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { ReportSchedule, type ReportType } from '../../Domain/Aggregates/ReportSchedule'
import type { IReportRepository } from '../../Domain/Repositories/IReportRepository'

export class DrizzleReportRepository implements IReportRepository {
  constructor(private readonly db: IDatabaseAccess) {}

  async save(schedule: ReportSchedule): Promise<void> {
    const data = {
      id: schedule.id,
      org_id: schedule.orgId,
      type: schedule.type,
      day: schedule.day,
      time: schedule.time,
      timezone: schedule.timezone,
      recipients: JSON.stringify(schedule.recipients),
      enabled: schedule.enabled ? 1 : 0,
      updated_at: new Date().toISOString(),
    }

    const existing = await this.findById(schedule.id)
    if (existing) {
      await this.db.table('report_schedules').where('id', '=', schedule.id).update(data)
    } else {
      await this.db.table('report_schedules').insert({
        ...data,
        created_at: new Date().toISOString(),
      })
    }
  }

  async findById(id: string): Promise<ReportSchedule | null> {
    const row = await this.db.table('report_schedules').where('id', '=', id).first()

    if (!row) {
      return null
    }

    return this.mapToAggregate(row)
  }

  async findByOrgId(orgId: string): Promise<ReportSchedule[]> {
    const rows = await this.db.table('report_schedules').where('org_id', '=', orgId).select()

    return rows.map(this.mapToAggregate)
  }

  async findAllEnabled(): Promise<ReportSchedule[]> {
    const rows = await this.db.table('report_schedules').where('enabled', '=', 1).select()

    return rows.map(this.mapToAggregate)
  }

  async delete(id: string): Promise<void> {
    await this.db.table('report_schedules').where('id', '=', id).delete()
  }

  private mapToAggregate(row: any): ReportSchedule {
    return ReportSchedule.create({
      id: row.id,
      orgId: row.org_id,
      type: row.type as ReportType,
      day: row.day,
      time: row.time,
      timezone: row.timezone,
      recipients: typeof row.recipients === 'string' ? JSON.parse(row.recipients) : row.recipients,
      enabled: Boolean(row.enabled),
    })
  }
}
