import type { GetUsageChartService } from '@/Modules/Dashboard/Application/Services/GetUsageChartService'
import type { GetUserMembershipService } from '@/Modules/Organization/Application/Services/GetUserMembershipService'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'

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
    private readonly membershipService: GetUserMembershipService,
  ) {}

  /**
   * Renders usage charts for the selected organization.
   *
   * @param ctx - Context for retrieving time range and organization filter.
   * @returns Inertia render response with usage stats.
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!

    let orgId = ctx.getQuery('orgId') ?? ctx.getHeader('X-Organization-Id') ?? null
    if (!orgId) {
      const membership = await this.membershipService.execute(auth.userId)
      orgId = membership?.orgId ?? null
    }
    if (!orgId) {
      return this.inertia.render(ctx, 'Member/Usage/Index', {
        orgId: null,
        totals: { requests: 0, tokens: 0 },
        chartData: [],
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

    const stats = result.success ? result.data?.stats : null
    return this.inertia.render(ctx, 'Member/Usage/Index', {
      orgId,
      totals: {
        requests: stats?.totalRequests ?? 0,
        tokens: stats?.totalTokens ?? 0,
      },
      chartData: result.success ? (result.data?.logs ?? []) : [],
      error: result.success ? null : { key: 'member.usage.loadFailed' },
    })
  }
}
