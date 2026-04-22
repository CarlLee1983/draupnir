import type { IUsageRepository } from '@/Modules/Dashboard/Application/Ports/IUsageRepository'
import { buildReportSnapshot } from '@/Modules/Reports/Application/Services/ReportSnapshot'
import type { IReportRepository } from '@/Modules/Reports/Domain/Repositories/IReportRepository'
import { ReportToken } from '@/Modules/Reports/Domain/ValueObjects/ReportToken'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
export class AdminReportTemplatePage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly reportRepository: IReportRepository,
    private readonly usageRepository: IUsageRepository,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const tokenStr = ctx.query.token as string
    if (!tokenStr) {
      return this.inertia.render(ctx, 'Error', { message: 'Missing report token' })
    }

    const payload = await ReportToken.verify(tokenStr)
    if (!payload) {
      return this.inertia.render(ctx, 'Error', { message: 'Invalid or expired report token' })
    }

    const schedule = await this.reportRepository.findById(payload.scheduleId)
    if (!schedule || schedule.orgId !== payload.orgId || !schedule.enabled) {
      return this.inertia.render(ctx, 'Error', { message: 'Invalid or expired report token' })
    }

    const isAnimationActive = ctx.query.isAnimationActive === 'true'
    const generatedAt = new Date().toISOString()
    const report = await buildReportSnapshot(
      {
        orgId: payload.orgId,
        scheduleId: payload.scheduleId,
        reportType: schedule.type,
        timezone: schedule.timezone,
        generatedAt,
      },
      this.usageRepository,
    )

    return this.inertia.render(ctx, 'Admin/Reports/Template', {
      report,
      isAnimationActive,
      isPrinterFriendly: true,
    })
  }
}
