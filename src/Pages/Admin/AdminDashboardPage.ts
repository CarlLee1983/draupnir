import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import type { GetDashboardSummaryService } from '@/Modules/Dashboard/Application/Services/GetDashboardSummaryService'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'

export interface AdminDashboardSummary {
  totalKeys: number
  activeKeys: number
  totalUsage: number
  creditBalance: number
}

export class AdminDashboardPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly summaryService: GetDashboardSummaryService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth || auth.role !== 'admin') {
      return ctx.redirect('/login')
    }

    const orgId = ctx.getQuery('orgId')
    let summary: AdminDashboardSummary | null = null
    if (orgId) {
      const result = await this.summaryService.execute(orgId, auth.userId, auth.role)
      if (result.success && result.data) {
        summary = {
          totalKeys: result.data.totalKeys,
          activeKeys: result.data.activeKeys,
          totalUsage: result.data.usage.totalRequests,
          creditBalance: 0,
        }
      }
    }

    return this.inertia.render(ctx, 'Admin/Dashboard/Index', {
      summary,
    })
  }
}
