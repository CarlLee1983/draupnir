import { type IRouteRegistrar } from '@/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import type { IRouteContext } from '@/Shared/Infrastructure/IRouteContext'
import { registerReportRoutes } from '../../Presentation/Routes/report.routes'
import type { IMailer } from '../../../../Foundation/Infrastructure/Ports/IMailer'
import type { IJobRegistrar } from '../../../../Foundation/Infrastructure/Ports/Scheduler/IJobRegistrar'
import type { IScheduler } from '../../../../Foundation/Infrastructure/Ports/Scheduler/IScheduler'
import type { IDatabaseAccess } from '../../../../Shared/Infrastructure/IDatabaseAccess'
import {
  type IContainer,
  ModuleServiceProvider,
} from '../../../../Shared/Infrastructure/IServiceProvider'
import { GeneratePdfService } from '../../Application/Services/GeneratePdfService'
import { ScheduleReportService } from '../../Application/Services/ScheduleReportService'
import { SendReportEmailService } from '../../Application/Services/SendReportEmailService'
import type { IReportRepository } from '../../Domain/Repositories/IReportRepository'
import { ReportController } from '../../Presentation/Controllers/ReportController'
import { DrizzleReportRepository } from '../Repositories/DrizzleReportRepository'

export class ReportsServiceProvider extends ModuleServiceProvider implements IJobRegistrar, IRouteRegistrar {
  private container!: IContainer

  override register(container: IContainer): void {
    this.container = container
    container.singleton('reportRepository', (c: IContainer) => {
      return new DrizzleReportRepository(c.make('database') as IDatabaseAccess)
    })

    container.singleton('generatePdfService', () => {
      return new GeneratePdfService()
    })

    container.singleton('sendReportEmailService', (c: IContainer) => {
      return new SendReportEmailService(c.make('mailer') as IMailer)
    })

    container.singleton('scheduleReportService', (c: IContainer) => {
      return new ScheduleReportService(
        c.make('reportRepository') as IReportRepository,
        c.make('generatePdfService') as GeneratePdfService,
        c.make('sendReportEmailService') as SendReportEmailService,
        c.make('scheduler') as IScheduler,
      )
    })

    container.bind('reportController', (c: IContainer) => {
      return new ReportController(
        c.make('reportRepository') as IReportRepository,
        c.make('scheduleReportService') as ScheduleReportService,
      )
    })
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
