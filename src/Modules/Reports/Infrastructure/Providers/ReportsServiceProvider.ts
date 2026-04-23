import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { type IContainer, ModuleServiceProvider } from '@/Shared/Infrastructure/IServiceProvider'
import type { IMailer } from '../../../../Foundation/Infrastructure/Ports/IMailer'
import type { IJobRegistrar } from '../../../../Foundation/Infrastructure/Ports/Scheduler/IJobRegistrar'
import type { IScheduler } from '../../../../Foundation/Infrastructure/Ports/Scheduler/IScheduler'
import type { IDatabaseAccess } from '../../../../Shared/Infrastructure/IDatabaseAccess'
import { GeneratePdfService } from '../../Application/Services/GeneratePdfService'
import { ScheduleReportService } from '../../Application/Services/ScheduleReportService'
import { SendReportEmailService } from '../../Application/Services/SendReportEmailService'
import type { IReportRepository } from '../../Domain/Repositories/IReportRepository'
import { ReportController } from '../../Presentation/Controllers/ReportController'
import { registerReportRoutes } from '../../Presentation/Routes/report.routes'
import { AtlasReportRepository } from '../Repositories/AtlasReportRepository'

export class ReportsServiceProvider extends ModuleServiceProvider implements IJobRegistrar, IRouteRegistrar {
  private container!: IContainer

  protected override registerRepositories(container: IContainer): void {
    this.container = container
    container.singleton('reportRepository', (c: IContainer) =>
      new AtlasReportRepository(c.make('database') as IDatabaseAccess)
    )
  }

  protected override registerInfraServices(container: IContainer): void {
    container.singleton('generatePdfService', () => new GeneratePdfService())
    container.singleton('sendReportEmailService', (c: IContainer) =>
      new SendReportEmailService(c.make('mailer') as IMailer)
    )
  }

  protected override registerApplicationServices(container: IContainer): void {
    container.singleton('scheduleReportService', (c: IContainer) => new ScheduleReportService(
      c.make('reportRepository') as IReportRepository,
      c.make('generatePdfService') as GeneratePdfService,
      c.make('sendReportEmailService') as SendReportEmailService,
      c.make('scheduler') as IScheduler,
    ))
  }

  protected override registerControllers(container: IContainer): void {
    container.bind('reportController', (c: IContainer) => new ReportController(
      c.make('reportRepository') as IReportRepository,
      c.make('scheduleReportService') as ScheduleReportService,
    ))
  }

  registerRoutes(context: IRouteContext): void {
    const controller = context.container.make('reportController') as ReportController
    registerReportRoutes(context.router, controller)
  }

  async registerJobs(_scheduler: IScheduler): Promise<void> {
    const scheduleService = this.container.make('scheduleReportService') as ScheduleReportService
    await scheduleService.bootstrap()
    console.log('[Reports] registered scheduled report jobs')
  }
}
