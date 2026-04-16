import type { ListContractsService } from '@/Modules/Contract/Application/Services/ListContractsService'
import type { IOrganizationMemberRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'

/**
 * Maps a list-contract DTO row to the member quota view (credit only; no period or lifecycle in the UI).
 */
function mapContractRow(dto: Record<string, unknown>) {
  const terms = dto.terms as { creditQuota: number }
  const id = dto.id as string
  return {
    id,
    creditQuota: String(terms.creditQuota),
  }
}

/**
 * Member-facing organization credit quota list (`Member/Contracts/Index`); route `/member/contracts` unchanged.
 */
export class MemberContractsPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly listService: ListContractsService,
    private readonly memberRepository: IOrganizationMemberRepository,
  ) {}

  /**
   * Renders the contract list for the organization.
   *
   * @param ctx - HTTP context to retrieve `orgId` from query or header.
   * @returns Inertia list, missing-org error, or login redirect.
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!

    let orgId = ctx.getQuery('orgId') ?? ctx.getHeader('X-Organization-Id') ?? null
    if (!orgId) {
      const membership = await this.memberRepository.findByUserId(auth.userId)
      orgId = membership?.organizationId ?? null
    }
    if (!orgId) {
      return this.inertia.render(ctx, 'Member/Contracts/Index', {
        orgId: null,
        contracts: [],
        error: { key: 'member.contracts.selectOrg' },
      })
    }

    const result = await this.listService.execute(orgId, auth.userId, auth.role)

    const contracts =
      result.success && result.data
        ? result.data.map((c) => mapContractRow(c as Record<string, unknown>))
        : []

    return this.inertia.render(ctx, 'Member/Contracts/Index', {
      orgId,
      contracts,
      error: result.success ? null : { key: 'member.contracts.loadFailed' },
    })
  }
}
