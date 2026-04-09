import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import type { GetDashboardSummaryService } from '@/Modules/Dashboard/Application/Services/GetDashboardSummaryService'
import type { GetBalanceService } from '@/Modules/Credit/Application/Services/GetBalanceService'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'

export class MemberDashboardPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly summaryService: GetDashboardSummaryService,
    private readonly balanceService: GetBalanceService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.redirect('/login')

    const orgId = ctx.getQuery('orgId') ?? ctx.getHeader('X-Organization-Id')
    if (!orgId) {
      return this.inertia.render(ctx, 'Member/Dashboard/Index', {
        orgId: null,
        summary: null,
        balance: null,
        error: '請先選擇組織',
      })
    }

    const [summaryResult, balanceResult] = await Promise.all([
      this.summaryService.execute(orgId, auth.userId, auth.role),
      this.balanceService.execute(orgId, auth.userId, auth.role),
    ])

    const summary =
      summaryResult.success && summaryResult.data
        ? {
            totalKeys: summaryResult.data.totalKeys,
            activeKeys: summaryResult.data.activeKeys,
            totalUsage: summaryResult.data.usage.totalRequests,
          }
        : null

    return this.inertia.render(ctx, 'Member/Dashboard/Index', {
      orgId,
      summary,
      balance: balanceResult.success ? balanceResult.data ?? null : null,
      error: summaryResult.success ? null : summaryResult.message,
    })
  }
}
