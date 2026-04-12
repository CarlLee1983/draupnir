import { Cron } from 'croner'
import { type IReportRepository } from '../../Domain/Repositories/IReportRepository'
import { type GeneratePdfService } from './GeneratePdfService'
import { type SendReportEmailService } from './SendReportEmailService'

export class ScheduleReportService {
  private jobs: Map<string, Cron> = new Map()

  constructor(
    private readonly reportRepository: IReportRepository,
    private readonly pdfService: GeneratePdfService,
    private readonly emailService: SendReportEmailService
  ) {}

  async bootstrap(): Promise<void> {
    const schedules = await this.reportRepository.findAllEnabled()
    for (const schedule of schedules) {
      this.schedule(schedule.id)
    }
  }

  async schedule(scheduleId: string): Promise<void> {
    // Stop existing job if any
    this.stop(scheduleId)

    const schedule = await this.reportRepository.findById(scheduleId)
    if (!schedule || !schedule.enabled) {
      return
    }

    const job = new Cron(
      schedule.cronString,
      { timezone: schedule.timezone },
      async () => {
        try {
          console.log(`[Reports] Generating scheduled report for schedule ${scheduleId}`)
          const pdfBuffer = await this.pdfService.generate(schedule.orgId)
          await this.emailService.send(schedule.recipients, pdfBuffer, schedule.type)
          console.log(`[Reports] Successfully sent scheduled report for schedule ${scheduleId}`)
        } catch (error) {
          console.error(`[Reports] Error executing scheduled report for schedule ${scheduleId}:`, error)
        }
      }
    )

    this.jobs.set(scheduleId, job)
  }

  stop(scheduleId: string): void {
    const job = this.jobs.get(scheduleId)
    if (job) {
      job.stop()
      this.jobs.delete(scheduleId)
    }
  }

  isScheduled(scheduleId: string): boolean {
    return this.jobs.has(scheduleId)
  }
}
