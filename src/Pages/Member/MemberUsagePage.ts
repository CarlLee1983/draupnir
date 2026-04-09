import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import type { GetUsageChartService } from '@/Modules/Dashboard/Application/Services/GetUsageChartService'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'

export class MemberUsagePage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly usageChartService: GetUsageChartService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.redirect('/login')

    const orgId = ctx.getQuery('orgId') ?? ctx.getHeader('X-Organization-Id')
    if (!orgId) {
      return this.inertia.render(ctx, 'Member/Usage/Index', {
        orgId: null,
        usageLogs: [],
        usageStats: null,
        error: '請先選擇組織',
      })
    }

    const result = await this.usageChartService.execute({
      orgId,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
      startTime: ctx.getQuery('start_time') ?? undefined,
      endTime: ctx.getQuery('end_time') ?? undefined,
    })

    return this.inertia.render(ctx, 'Member/Usage/Index', {
      orgId,
      usageLogs: result.success ? result.data?.logs ?? [] : [],
      usageStats: result.success ? result.data?.stats ?? null : null,
      error: result.success ? null : result.message,
    })
  }
}
