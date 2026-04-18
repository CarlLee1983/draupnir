import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { GetCostTrendsService } from '../../Application/Services/GetCostTrendsService'
import type { GetDashboardSummaryService } from '../../Application/Services/GetDashboardSummaryService'
import type { GetKpiSummaryService } from '../../Application/Services/GetKpiSummaryService'
import type { GetModelComparisonService } from '../../Application/Services/GetModelComparisonService'
import type { GetPerKeyCostService } from '../../Application/Services/GetPerKeyCostService'
import type { GetUsageChartService } from '../../Application/Services/GetUsageChartService'
import type { BifrostSyncService } from '../../Infrastructure/Services/BifrostSyncService'
import type { BackfillBifrostSyncParams } from '../Requests'

export class DashboardController {
  constructor(
    private readonly summaryService: GetDashboardSummaryService,
    private readonly usageChartService: GetUsageChartService,
    private readonly kpiSummaryService: GetKpiSummaryService,
    private readonly costTrendsService: GetCostTrendsService,
    private readonly modelComparisonService: GetModelComparisonService,
    private readonly perKeyCostService: GetPerKeyCostService,
    private readonly bifrostSyncService: BifrostSyncService,
  ) {}

  async summary(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth)
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    const orgId = ctx.getParam('orgId')
    if (!orgId) return ctx.json({ success: false, message: 'Missing orgId' }, 400)
    const result = await this.summaryService.execute(orgId, auth.userId, auth.role)
    return ctx.json(result)
  }

  async usage(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth)
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    const orgId = ctx.getParam('orgId')
    if (!orgId) return ctx.json({ success: false, message: 'Missing orgId' }, 400)
    const limit = ctx.getQuery('limit')
    const result = await this.usageChartService.execute({
      orgId,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
      startTime: ctx.getQuery('start_time') ?? undefined,
      endTime: ctx.getQuery('end_time') ?? undefined,
      providers: ctx.getQuery('providers') ?? undefined,
      models: ctx.getQuery('models') ?? undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    })
    return ctx.json(result)
  }

  async kpiSummary(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth)
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
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
    if (!auth)
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
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
    if (!auth)
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    const orgId = ctx.getParam('orgId')
    if (!orgId) return ctx.json({ success: false, message: 'Missing orgId' }, 400)
    const result = await this.modelComparisonService.execute({
      orgId,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
      startTime: ctx.getQuery('start_time') ?? undefined,
      endTime: ctx.getQuery('end_time') ?? undefined,
      apiKeyIds: parseApiKeyIds(
        ctx.getQuery('api_key_ids') ?? ctx.getQuery('api_key_id') ?? undefined,
      ),
    })
    return ctx.json(result)
  }

  async perKeyCost(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth)
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    const orgId = ctx.getParam('orgId')
    if (!orgId) return ctx.json({ success: false, message: 'Missing orgId' }, 400)
    const result = await this.perKeyCostService.execute({
      orgId,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
      startTime: ctx.getQuery('start_time') ?? undefined,
      endTime: ctx.getQuery('end_time') ?? undefined,
    })
    return ctx.json(result)
  }

  async backfillSync(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) {
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    }
    if (auth.role !== 'admin') {
      return ctx.json(
        { success: false, message: 'Only admins can perform this action', error: 'FORBIDDEN' },
        403,
      )
    }

    const body = ctx.get('validated') as BackfillBifrostSyncParams
    if (!isValidTimeRange(body.startTime, body.endTime)) {
      return ctx.json(
        { success: false, message: 'Invalid time range', error: 'INVALID_TIME_RANGE' },
        400,
      )
    }

    const result = await this.bifrostSyncService.backfill({
      startTime: body.startTime,
      endTime: body.endTime,
    })

    return ctx.json({
      success: true,
      message: 'Bifrost backfill processed',
      data: result,
    })
  }
}

function parseApiKeyIds(raw: string | undefined): readonly string[] | undefined {
  if (!raw) {
    return undefined
  }

  const ids = raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0)

  return ids.length > 0 ? ids : undefined
}

function isValidTimeRange(startTime: string, endTime: string): boolean {
  const start = Date.parse(startTime)
  const end = Date.parse(endTime)
  return !Number.isNaN(start) && !Number.isNaN(end) && start <= end
}
