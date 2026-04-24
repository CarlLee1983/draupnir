import type { ListApiKeysService } from '@/Modules/ApiKey/Application/Services/ListApiKeysService'
import type { GetBalanceService } from '@/Modules/Credit/Application/Services/GetBalanceService'
import type { GetPendingInvitationsService } from '@/Modules/Organization/Application/Services/GetPendingInvitationsService'
import type { GetUserMembershipService } from '@/Modules/Organization/Application/Services/GetUserMembershipService'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'

/**
 * Page handler for listing API keys.
 *
 * Path: `/member/api-keys`
 * React Page: `Member/ApiKeys/Index`
 */
export class MemberApiKeysPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly listService: ListApiKeysService,
    private readonly membershipService: GetUserMembershipService,
    private readonly balanceService: GetBalanceService,
    private readonly pendingInvitationsService: GetPendingInvitationsService,
  ) {}

  /**
   * Lists API keys for the selected organization.
   *
   * @param ctx - Context for retrieving pagination and organization parameters.
   * @returns Inertia render response with paginated keys.
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    // biome-ignore lint/style/noNonNullAssertion: guaranteed by control flow or DOM contract
    const auth = AuthMiddleware.getAuthContext(ctx)!

    const membership = await this.membershipService.execute(auth.userId)

    if (!membership) {
      let pendingInvitations: Awaited<ReturnType<GetPendingInvitationsService['execute']>> = []
      try {
        pendingInvitations = await this.pendingInvitationsService.execute(auth.userId)
      } catch {
        // 查詢失敗不影響頁面渲染
      }

      return this.inertia.render(ctx, 'Member/ApiKeys/Index', {
        orgId: null,
        balance: null,
        hasOrganization: false,
        pendingInvitations,
        keys: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
        error: null,
      })
    }

    const orgId = membership.orgId
    const balanceResult = await this.balanceService.execute(orgId, auth.userId, auth.role)

    const page = parseInt(ctx.getQuery('page') ?? '1', 10)
    const limit = parseInt(ctx.getQuery('limit') ?? '20', 10)

    const result = await this.listService.execute(orgId, auth.userId, auth.role, page, limit, {
      assignedMemberId: auth.userId,
    })

    const keys =
      result.success && result.data?.keys
        ? result.data.keys.map((k) => {
            const row = k as Record<string, unknown>
            return {
              id: row.id as string,
              label: row.label as string,
              keyPreview: (row.keyPrefix as string) ?? '',
              gatewayKeyValue: (row.gatewayKeyValue as string | null | undefined) ?? null,
              status: row.status as 'active' | 'revoked' | 'suspended_no_credit',
              createdAt: row.createdAt as string,
              lastUsedAt: (row.lastUsedAt as string | null | undefined) ?? null,
            }
          })
        : []

    return this.inertia.render(ctx, 'Member/ApiKeys/Index', {
      orgId,
      balance: balanceResult.success ? (balanceResult.data ?? null) : null,
      hasOrganization: true,
      pendingInvitations: [],
      keys,
      meta: result.success
        ? (result.data?.meta ?? { total: 0, page: 1, limit: 20, totalPages: 0 })
        : { total: 0, page: 1, limit: 20, totalPages: 0 },
      error:
        balanceResult.success && result.success ? null : { key: 'member.dashboard.loadFailed' },
    })
  }
}
