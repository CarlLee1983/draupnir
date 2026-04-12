import type { PlanetCore } from '@gravito/core'
import { type IContainer, ModuleServiceProvider } from '../../../../Shared/Infrastructure/IServiceProvider'
import { DrizzleReportRepository } from '../Repositories/DrizzleReportRepository'
import { GeneratePdfService } from '../../Application/Services/GeneratePdfService'
import { SendReportEmailService } from '../../Application/Services/SendReportEmailService'
import { ScheduleReportService } from '../../Application/Services/ScheduleReportService'
import { ReportController } from '../../Presentation/Controllers/ReportController'
import { type IMailer } from '../../../../Foundation/Infrastructure/Ports/IMailer'
import { type IReportRepository } from '../../Domain/Repositories/IReportRepository'
import { type IDatabaseAccess } from '../../../../Shared/Infrastructure/IDatabaseAccess'

export class ReportsServiceProvider extends ModuleServiceProvider {
  override register(container: IContainer): void {
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
        c.make('sendReportEmailService') as SendReportEmailService
      )
    })

    container.bind('reportController', (c: IContainer) => {
      return new ReportController(
        c.make('reportRepository') as IReportRepository,
        c.make('scheduleReportService') as ScheduleReportService
      )
    })
  }

  override async boot(context: unknown): Promise<void> {
    const core = context as PlanetCore
    const scheduleService = core.container.make('scheduleReportService') as ScheduleReportService
    
    // Bootstrap existing schedules
    await scheduleService.bootstrap()
    
    console.log('[Reports] Module booted and schedules registered')
  }
}
