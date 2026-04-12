import { type IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { type IReportRepository } from '../../Modules/Reports/Domain/Repositories/IReportRepository'
import { type InertiaService } from '../InertiaService'

export class AdminReportsPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly reportRepository: IReportRepository
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const orgId = ctx.getParam('orgId')!
    const schedules = await this.reportRepository.findByOrgId(orgId)

    return this.inertia.render(ctx, 'Admin/Reports/Index', {
      orgId,
      schedules: schedules.map(s => ({
        id: s.id,
        type: s.type,
        day: s.day,
        time: s.time,
        timezone: s.timezone,
        recipients: s.recipients,
        enabled: s.enabled,
        cronString: s.cronString
      }))
    })
  }
}
