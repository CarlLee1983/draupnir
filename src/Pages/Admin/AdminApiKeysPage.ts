import type { ListApiKeysService } from '@/Modules/ApiKey/Application/Services/ListApiKeysService'
import type { ListOrganizationsService } from '@/Modules/Organization/Application/Services/ListOrganizationsService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import { requireAdmin } from './helpers/requireAdmin'

/**
 * Admin view of API keys scoped by organization (`Admin/ApiKeys/Index`).
 */
export class AdminApiKeysPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly listKeysService: ListApiKeysService,
    private readonly listOrgsService: ListOrganizationsService,
  ) {}

  /**
   * @param ctx - Query `orgId` selects which org’s keys to list (required for listing).
   * @returns Inertia payload with org picker and keys or auth failure response.
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    const check = requireAdmin(ctx)
    if (!check.ok) return check.response!
    const auth = check.auth!

    const orgId = ctx.getQuery('orgId')
    const orgsResult = await this.listOrgsService.execute(1, 100)
    const organizations =
      orgsResult.success && orgsResult.data?.organizations
        ? orgsResult.data.organizations.map((o) => {
            const row = o as Record<string, unknown>
            return { id: row.id as string, name: row.name as string }
          })
        : []

    if (!orgId) {
      return this.inertia.render(ctx, 'Admin/ApiKeys/Index', {
        organizations,
        selectedOrgId: null,
        keys: [],
        error: null,
      })
    }

    const result = await this.listKeysService.execute(orgId, auth.userId, auth.role, 1, 100)

    const keys =
      result.success && result.data?.keys
        ? result.data.keys.map((k) => {
            const row = k as Record<string, unknown>
            return {
              id: row.id as string,
              label: row.label as string,
              keyPreview: (row.keyPrefix as string) ?? '',
              status: row.status as 'active' | 'revoked' | 'suspended_no_credit',
              orgId: row.orgId as string,
              userId: (row.createdByUserId as string) ?? '',
              createdAt: row.createdAt as string,
              lastUsedAt: (row.updatedAt as string | null | undefined) ?? null,
            }
          })
        : []

    return this.inertia.render(ctx, 'Admin/ApiKeys/Index', {
      organizations,
      selectedOrgId: orgId,
      keys,
      error: result.success ? null : result.message,
    })
  }
}
