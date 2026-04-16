import type { GetBalanceService } from '@/Modules/Credit/Application/Services/GetBalanceService'
import type { GetUserMembershipService } from '@/Modules/Organization/Application/Services/GetUserMembershipService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'

/**
 * Page handler for the member dashboard.
 *
 * Path: `/member/dashboard`
 * React Page: `Member/Dashboard/Index`
 */
export class MemberDashboardPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly balanceService: GetBalanceService,
    private readonly membershipService: GetUserMembershipService,
  ) {}

  /**
   * Renders the member dashboard with organization balance data.
   *
   * @param ctx - Context providing organization and user session info.
   * @returns Inertia render response or missing-org message.
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!

    const membership = await this.membershipService.execute(auth.userId)

    if (!membership) {
      return this.inertia.render(ctx, 'Member/Dashboard/Index', {
        orgId: null,
        balance: null,
        hasOrganization: false,
        error: null,
      })
    }

    const orgId = membership.orgId
    const balanceResult = await this.balanceService.execute(orgId, auth.userId, auth.role)

    return this.inertia.render(ctx, 'Member/Dashboard/Index', {
      orgId,
      balance: balanceResult.success ? (balanceResult.data ?? null) : null,
      hasOrganization: true,
      error: balanceResult.success ? null : { key: 'member.dashboard.loadFailed' },
    })
  }
}
