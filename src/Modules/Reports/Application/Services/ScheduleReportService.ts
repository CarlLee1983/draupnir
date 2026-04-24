import type { IScheduler } from '../../../../Foundation/Infrastructure/Ports/Scheduler/IScheduler'
import type { IReportRepository } from '../../Domain/Repositories/IReportRepository'
import type { GeneratePdfService } from './GeneratePdfService'
import type { SendReportEmailService } from './SendReportEmailService'

/**
 * Service responsible for managing the lifecycle of scheduled reports.
 *
 * Responsibilities:
 * - Bootstrap all active report schedules into the system scheduler on startup.
 * - Dynamically register or update individual report jobs.
 * - Stop/unschedule report jobs when disabled or deleted.
 * - Orchestrate the report generation (PDF) and delivery (Email) workflow when triggered.
 */
export class ScheduleReportService {
  /**
   * Initializes the service with required repositories and dependent services.
   *
   * @param reportRepository Repository for accessing report schedule configurations.
   * @param pdfService Service for generating PDF report files.
   * @param emailService Service for delivering reports via email.
   * @param scheduler The underlying system scheduler (e.g., cron-based).
   */
  constructor(
    private readonly reportRepository: IReportRepository,
    private readonly pdfService: GeneratePdfService,
    private readonly emailService: SendReportEmailService,
    private readonly scheduler: IScheduler,
  ) {}

  /**
   * Bootstraps the reporting system by loading and scheduling all enabled report configurations.
   * Typically called during application initialization.
   *
   * @returns A promise that resolves when all enabled schedules have been registered.
   */
  async bootstrap(): Promise<void> {
    const schedules = await this.reportRepository.findAllEnabled()
    for (const schedule of schedules) {
      await this.schedule(schedule.id)
    }
  }

  /**
   * Registers or updates a specific report schedule in the scheduler.
   * If a job with the same ID already exists, it is replaced.
   *
   * @param scheduleId Unique identifier of the report schedule to register.
   * @returns A promise that resolves when the schedule is updated.
   */
  async schedule(scheduleId: string): Promise<void> {
    const jobName = this.jobName(scheduleId)
    if (this.scheduler.has(jobName)) {
      this.scheduler.unschedule(jobName)
    }

    const schedule = await this.reportRepository.findById(scheduleId)
    if (!schedule?.enabled) {
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
          // 1. Generate the PDF asset
          const pdfBuffer = await this.pdfService.generate(schedule.orgId, schedule.id)
          // 2. Deliver the report to all recipients
          await this.emailService.send(schedule.recipients, pdfBuffer, schedule.type)
          console.log(`[Reports] Successfully sent scheduled report for schedule ${scheduleId}`)
        } catch (error) {
          console.error(
            `[Reports] Error executing scheduled report for schedule ${scheduleId}:`,
            error,
          )
        }
      },
    )
  }

  /**
   * Stops and removes a report job from the scheduler.
   *
   * @param scheduleId Unique identifier of the report schedule to stop.
   */
  stop(scheduleId: string): void {
    const jobName = this.jobName(scheduleId)
    if (this.scheduler.has(jobName)) {
      this.scheduler.unschedule(jobName)
    }
  }

  /**
   * Checks if a report schedule is currently active in the scheduler.
   *
   * @param scheduleId Unique identifier of the report schedule.
   * @returns True if the schedule is currently registered.
   */
  isScheduled(scheduleId: string): boolean {
    return this.scheduler.has(this.jobName(scheduleId))
  }

  /**
   * Generates a unique job name for the scheduler to prevent collisions.
   *
   * @param scheduleId Unique identifier of the report schedule.
   * @returns A string identifier for the scheduler job.
   */
  private jobName(scheduleId: string): string {
    return `report:${scheduleId}`
  }
}
