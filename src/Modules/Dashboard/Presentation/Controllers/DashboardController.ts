import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { GetCostTrendsService } from '../../Application/Services/GetCostTrendsService'
import type { GetKpiSummaryService } from '../../Application/Services/GetKpiSummaryService'
import type { GetModelComparisonService } from '../../Application/Services/GetModelComparisonService'
import type { GetDashboardSummaryService } from '../../Application/Services/GetDashboardSummaryService'
import type { GetUsageChartService } from '../../Application/Services/GetUsageChartService'

export class DashboardController {
  constructor(
    private readonly summaryService: GetDashboardSummaryService,
    private readonly usageChartService: GetUsageChartService,
    private readonly kpiSummaryService: GetKpiSummaryService,
    private readonly costTrendsService: GetCostTrendsService,
    private readonly modelComparisonService: GetModelComparisonService,
  ) {}

  async summary(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    const orgId = ctx.getParam('orgId')
    if (!orgId) return ctx.json({ success: false, message: 'Missing orgId' }, 400)
    const result = await this.summaryService.execute(orgId, auth.userId, auth.role)
    return ctx.json(result)
  }

  async usage(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    const orgId = ctx.getParam('orgId')
    if (!orgId) return ctx.json({ success: false, message: 'Missing orgId' }, 400)
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

  async kpiSummary(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    const orgId = ctx.getParam('orgId')
    if (!orgId) return ctx.json({ success: false, message: 'Missing orgId' }, 400)
    const result = await this.kpiSummaryService.execute({
      orgId,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
      startTime: ctx.getQuery('start_time') ?? undefined,
      endTime: ctx.getQuery('end_time') ?? undefined,
    })
    return ctx.json(result)
  }

  async costTrends(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    const orgId = ctx.getParam('orgId')
    if (!orgId) return ctx.json({ success: false, message: 'Missing orgId' }, 400)
    const result = await this.costTrendsService.execute({
      orgId,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
      startTime: ctx.getQuery('start_time') ?? undefined,
      endTime: ctx.getQuery('end_time') ?? undefined,
    })
    return ctx.json(result)
  }

  async modelComparison(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    const orgId = ctx.getParam('orgId')
    if (!orgId) return ctx.json({ success: false, message: 'Missing orgId' }, 400)
    const result = await this.modelComparisonService.execute({
      orgId,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
      startTime: ctx.getQuery('start_time') ?? undefined,
      endTime: ctx.getQuery('end_time') ?? undefined,
    })
    return ctx.json(result)
  }
}
