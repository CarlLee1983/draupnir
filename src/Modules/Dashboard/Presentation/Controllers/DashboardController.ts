import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { GetDashboardSummaryService } from '../../Application/Services/GetDashboardSummaryService'
import type { GetUsageChartService } from '../../Application/Services/GetUsageChartService'

export class DashboardController {
  constructor(
    private readonly summaryService: GetDashboardSummaryService,
    private readonly usageChartService: GetUsageChartService,
  ) {}

  async summary(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const orgId = ctx.getParam('orgId')
    if (!orgId) return ctx.json({ success: false, message: '缺少 orgId' }, 400)
    const result = await this.summaryService.execute(orgId, auth.userId, auth.role)
    return ctx.json(result)
  }

  async usage(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: '未經授權', error: 'UNAUTHORIZED' }, 401)
    const orgId = ctx.getParam('orgId')
    if (!orgId) return ctx.json({ success: false, message: '缺少 orgId' }, 400)
    const result = await this.usageChartService.execute({
      orgId,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
      startTime: ctx.getQuery('start_time') ?? undefined,
      endTime: ctx.getQuery('end_time') ?? undefined,
      providers: ctx.getQuery('providers') ?? undefined,
      models: ctx.getQuery('models') ?? undefined,
      limit: ctx.getQuery('limit') ? parseInt(ctx.getQuery('limit')!, 10) : undefined,
    })
    return ctx.json(result)
  }
}
