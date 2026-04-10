import type { ListApiKeysService } from '@/Modules/ApiKey/Application/Services/ListApiKeysService'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'

/**
 * Member API key list for the selected organization (`Member/ApiKeys/Index`).
 */
export class MemberApiKeysPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly listService: ListApiKeysService,
  ) {}

  /**
   * @param ctx - Query `page`, `limit`, `orgId` (or org header).
   * @returns Paginated keys, error state, or login redirect.
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.redirect('/login')

    const orgId = ctx.getQuery('orgId') ?? ctx.getHeader('X-Organization-Id')
    if (!orgId) {
      return this.inertia.render(ctx, 'Member/ApiKeys/Index', {
        orgId: null,
        keys: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
        error: '請先選擇組織',
      })
    }

    const page = parseInt(ctx.getQuery('page') ?? '1', 10)
    const limit = parseInt(ctx.getQuery('limit') ?? '20', 10)

    const result = await this.listService.execute(orgId, auth.userId, auth.role, page, limit)

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
      error: result.success ? null : result.message,
    })
  }
}
