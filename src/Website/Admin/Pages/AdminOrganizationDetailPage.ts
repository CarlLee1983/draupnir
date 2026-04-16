import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { IContractRepository } from '@/Modules/Contract/Domain/Repositories/IContractRepository'
import type { GetOrganizationService } from '@/Modules/Organization/Application/Services/GetOrganizationService'
import type { ListMembersService } from '@/Modules/Organization/Application/Services/ListMembersService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'

/**
 * Admin organization detail with member list (`Admin/Organizations/Show`).
 */
export class AdminOrganizationDetailPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly getOrgService: GetOrganizationService,
    private readonly listMembersService: ListMembersService,
    private readonly contractRepo: IContractRepository,
    private readonly keyRepo: IApiKeyRepository,
  ) {}

  /**
   * @param ctx - Route param `id` = organization id.
   * @returns Inertia detail payload or auth failure response.
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!

    const orgId = ctx.getParam('id')
    if (!orgId) {
      return this.inertia.render(ctx, 'Admin/Organizations/Show', {
        organization: null,
        members: [],
        error: { key: 'admin.organizations.missingId' },
      })
    }

    const [orgResult, membersResult, activeContract, activeKeys] = await Promise.all([
      this.getOrgService.execute(orgId, auth.userId, auth.role),
      this.listMembersService.execute(orgId, auth.userId, auth.role),
      this.contractRepo.findActiveByTargetId(orgId),
      this.keyRepo.findActiveByOrgId(orgId),
    ])

    const orgData = orgResult.success
      ? (orgResult.data as Record<string, unknown> | undefined)
      : undefined
    const organization = orgData
      ? {
          id: orgData.id as string,
          name: orgData.name as string,
          slug: orgData.slug as string,
          status: String(orgData.status ?? ''),
          createdAt: orgData.createdAt as string,
        }
      : null

    const rawMembers =
      membersResult.success && membersResult.data && typeof membersResult.data === 'object'
        ? ((membersResult.data as { members?: Record<string, unknown>[] }).members ?? [])
        : []

    const members = rawMembers.map((m) => ({
      userId: m.userId as string,
      role: String(m.role ?? ''),
      joinedAt: m.joinedAt as string,
    }))

    const contractCap = activeContract?.terms.creditQuota ?? null
    const sumAllocated = activeKeys.reduce((sum, k) => sum + k.quotaAllocated, 0)
    const unallocated = contractCap !== null ? contractCap - sumAllocated : null

    return this.inertia.render(ctx, 'Admin/Organizations/Show', {
      organization,
      members,
      error: orgResult.success ? null : { key: 'admin.organizations.loadFailed' },
      contractSummary: contractCap !== null
        ? {
            contractId: activeContract!.id,
            contractCap,
            sumAllocated,
            unallocated,
          }
        : null,
    })
  }
}
