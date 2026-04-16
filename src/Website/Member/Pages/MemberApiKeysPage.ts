import type { ListApiKeysService } from '@/Modules/ApiKey/Application/Services/ListApiKeysService'
import type { IOrganizationMemberRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'

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
    private readonly memberRepository: IOrganizationMemberRepository,
  ) {}

  /**
   * Lists API keys for the selected organization.
   *
   * @param ctx - Context for retrieving pagination and organization parameters.
   * @returns Inertia render response with paginated keys.
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!

    let orgId = ctx.getQuery('orgId') ?? ctx.getHeader('X-Organization-Id') ?? null
    if (!orgId) {
      const membership = await this.memberRepository.findByUserId(auth.userId)
      orgId = membership?.organizationId ?? null
    }
    if (!orgId) {
      return this.inertia.render(ctx, 'Member/ApiKeys/Index', {
        orgId: null,
        keys: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
        error: { key: 'member.apiKeys.selectOrg' },
      })
    }

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
              status: row.status as 'active' | 'revoked' | 'suspended_no_credit',
              createdAt: row.createdAt as string,
              lastUsedAt: (row.lastUsedAt as string | null | undefined) ?? null,
            }
          })
        : []

    return this.inertia.render(ctx, 'Member/ApiKeys/Index', {
      orgId,
      keys,
      meta: result.success
        ? (result.data?.meta ?? { total: 0, page: 1, limit: 20, totalPages: 0 })
        : { total: 0, page: 1, limit: 20, totalPages: 0 },
      error: result.success ? null : { key: 'member.apiKeys.loadFailed' },
    })
  }
}
