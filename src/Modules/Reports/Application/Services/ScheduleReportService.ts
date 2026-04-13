import type { IScheduler } from '../../../../Foundation/Infrastructure/Ports/Scheduler/IScheduler'
import { type IReportRepository } from '../../Domain/Repositories/IReportRepository'
import { type GeneratePdfService } from './GeneratePdfService'
import { type SendReportEmailService } from './SendReportEmailService'

export class ScheduleReportService {
  constructor(
    private readonly reportRepository: IReportRepository,
    private readonly pdfService: GeneratePdfService,
    private readonly emailService: SendReportEmailService,
    private readonly scheduler: IScheduler,
  ) {}

  async bootstrap(): Promise<void> {
    const schedules = await this.reportRepository.findAllEnabled()
    for (const schedule of schedules) {
      await this.schedule(schedule.id)
    }
  }

  async schedule(scheduleId: string): Promise<void> {
    const jobName = this.jobName(scheduleId)
    if (this.scheduler.has(jobName)) {
      this.scheduler.unschedule(jobName)
    }

    const schedule = await this.reportRepository.findById(scheduleId)
    if (!schedule || !schedule.enabled) {
      return
    }

    this.scheduler.schedule(
      {
        name: jobName,
        cron: schedule.cronString,
        timezone: schedule.timezone,
      },
      async () => {
        try {
          console.log(`[Reports] Generating scheduled report for schedule ${scheduleId}`)
          const pdfBuffer = await this.pdfService.generate(schedule.orgId)
          await this.emailService.send(schedule.recipients, pdfBuffer, schedule.type)
          console.log(`[Reports] Successfully sent scheduled report for schedule ${scheduleId}`)
        } catch (error) {
          console.error(`[Reports] Error executing scheduled report for schedule ${scheduleId}:`, error)
        }
      },
    )
  }

  stop(scheduleId: string): void {
    const jobName = this.jobName(scheduleId)
    if (this.scheduler.has(jobName)) {
      this.scheduler.unschedule(jobName)
    }
  }

  isScheduled(scheduleId: string): boolean {
    return this.scheduler.has(this.jobName(scheduleId))
  }

  private jobName(scheduleId: string): string {
    return `report:${scheduleId}`
  }
}
