import type { GetBalanceService } from '@/Modules/Credit/Application/Services/GetBalanceService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import { requireMember } from './helpers/requireMember'

/**
 * Member dashboard shell for the selected organization (`Member/Dashboard/Index`).
 */
export class MemberDashboardPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly balanceService: GetBalanceService,
  ) {}

  /**
   * @param ctx - Query `orgId` or header `X-Organization-Id` selects the active org.
   * @returns Inertia shell, missing-org message, or login redirect.
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    const check = requireMember(ctx)
    if (!check.ok) return check.response!
    const auth = check.auth!

    const shared = ctx.get('inertia:shared') as {
      locale: 'zh-TW' | 'en'
      messages: Record<string, string>
    } | undefined
    const messages = shared?.messages ?? {}

    const orgId = ctx.getQuery('orgId') ?? ctx.getHeader('X-Organization-Id')
    if (!orgId) {
      return this.inertia.render(ctx, 'Member/Dashboard/Index', {
        orgId: null,
        balance: null,
        error: messages['member.dashboard.selectOrg'],
      })
    }

    const balanceResult = await this.balanceService.execute(orgId, auth.userId, auth.role)

    return this.inertia.render(ctx, 'Member/Dashboard/Index', {
      orgId,
      balance: balanceResult.success ? (balanceResult.data ?? null) : null,
      error: balanceResult.success ? null : balanceResult.message,
    })
  }
}
