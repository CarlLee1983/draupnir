import type { IReportRepository } from '@/Modules/Reports/Domain/Repositories/IReportRepository'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
/**
 * Inertia page controller for managing reports in the Admin area.
 */
export class AdminReportsPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly reportRepository: IReportRepository,
  ) {}

  /**
   * Renders the reports list for a specific organization.
   *
   * @param ctx - HTTP context.
   * @returns Inertia response with report schedules.
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    // biome-ignore lint/style/noNonNullAssertion: guaranteed by control flow or DOM contract
    const orgId = ctx.getParam('orgId')!
    const schedules = await this.reportRepository.findByOrgId(orgId)

    return this.inertia.render(ctx, 'Admin/Reports/Index', {
      orgId,
      schedules: schedules.map((s) => ({
        id: s.id,
        type: s.type,
        day: s.day,
        time: s.time,
        timezone: s.timezone,
        recipients: s.recipients,
        enabled: s.enabled,
        cronString: s.cronString,
      })),
    })
  }
}
