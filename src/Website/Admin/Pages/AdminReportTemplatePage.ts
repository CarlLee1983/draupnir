import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { ReportToken } from '../../Modules/Reports/Domain/ValueObjects/ReportToken'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'

export class AdminReportTemplatePage {
  constructor(private readonly inertia: InertiaService) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const tokenStr = ctx.query.token as string
    if (!tokenStr) {
      return this.inertia.render(ctx, 'Error', { message: 'Missing report token' })
    }

    const payload = await ReportToken.verify(tokenStr)
    if (!payload) {
      return this.inertia.render(ctx, 'Error', { message: 'Invalid or expired report token' })
    }

    const isAnimationActive = ctx.query.isAnimationActive === 'true'

    return this.inertia.render(ctx, 'Admin/Reports/Template', {
      orgId: payload.orgId,
      isAnimationActive,
      isPrinterFriendly: true,
      generatedAt: new Date().toISOString(),
    })
  }
}
