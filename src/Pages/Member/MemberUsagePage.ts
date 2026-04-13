import type { GetUsageChartService } from '@/Modules/Dashboard/Application/Services/GetUsageChartService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import { requireMember } from './helpers/requireMember'

/**
 * Member usage chart page (`Member/Usage/Index`).
 */
export class MemberUsagePage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly usageChartService: GetUsageChartService,
  ) {}

  /**
   * @param ctx - Query `orgId` or org header; optional chart range query params as defined by the service.
   * @returns Inertia chart props or login redirect.
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    const check = requireMember(ctx)
    if (!check.ok) return check.response!
    const auth = check.auth!

    const shared = ctx.get('inertia:shared') as
      | {
          locale: 'zh-TW' | 'en'
          messages: Record<string, string>
        }
      | undefined
    const messages = shared?.messages ?? {}

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
