import type { GetUsageChartService } from '@/Modules/Dashboard/Application/Services/GetUsageChartService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { getInertiaShared } from '@/Website/Http/Inertia/SharedPropsBuilder'
import { requireMember } from '@/Website/Member/middleware/requireMember'

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
    const check = requireMember(ctx)
    if (!check.ok) return check.response!
    const auth = check.auth!

    const { messages } = getInertiaShared(ctx)

    const orgId = ctx.getQuery('orgId') ?? ctx.getHeader('X-Organization-Id')
    if (!orgId) {
      return this.inertia.render(ctx, 'Member/Usage/Index', {
        orgId: null,
        usageLogs: [],
        usageStats: null,
        error: messages['member.usage.selectOrg'],
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
      error: result.success ? null : result.message,
    })
  }
}
