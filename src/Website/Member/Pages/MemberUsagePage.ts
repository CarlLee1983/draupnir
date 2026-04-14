import type { GetUsageChartService } from '@/Modules/Dashboard/Application/Services/GetUsageChartService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'

/**
 * Page handler for member usage charts.
 *
 * Path: `/member/usage`
 * React Page: `Member/Usage/Index`
 */
export class MemberUsagePage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly usageChartService: GetUsageChartService,
  ) {}

  /**
   * Renders usage charts for the selected organization.
   *
   * @param ctx - Context for retrieving time range and organization filter.
   * @returns Inertia render response with usage stats.
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!

    const orgId = ctx.getQuery('orgId') ?? ctx.getHeader('X-Organization-Id')
    if (!orgId) {
      return this.inertia.render(ctx, 'Member/Usage/Index', {
        orgId: null,
        usageLogs: [],
        usageStats: null,
        error: { key: 'member.usage.selectOrg' },
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
      usageLogs: result.success ? (result.data?.logs ?? []) : [],
      usageStats: result.success ? (result.data?.stats ?? null) : null,
      error: result.success ? null : { key: 'member.usage.loadFailed' },
    })
  }
}
