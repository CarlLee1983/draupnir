import type { ListContractsService } from '@/Modules/Contract/Application/Services/ListContractsService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { getInertiaShared } from '@/Website/Http/Inertia/SharedPropsBuilder'
import { requireMember } from '@/Website/Member/middleware/requireMember'

/**
 * Maps a list-contract DTO row to the Inertia table shape.
 *
 * @param dto - Contract data row containing status, terms, and ID.
 * @returns Standardized contract object for frontend rendering.
 */
function mapContractRow(dto: Record<string, unknown>) {
  const terms = dto.terms as {
    creditQuota: number
    validityPeriod: { startDate: string; endDate: string }
  }
  const id = dto.id as string
  return {
    id,
    name: `Contract ${id.slice(0, 8)}`,
    status: dto.status as 'draft' | 'active' | 'expired' | 'terminated',
    startDate: terms.validityPeriod.startDate,
    endDate: terms.validityPeriod.endDate,
    creditQuota: String(terms.creditQuota),
  }
}

/**
 * Member-facing contract list for the selected organization (`Member/Contracts/Index`).
 */
export class MemberContractsPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly listService: ListContractsService,
  ) {}

  /**
   * Renders the contract list for the organization.
   *
   * @param ctx - HTTP context to retrieve `orgId` from query or header.
   * @returns Inertia list, missing-org error, or login redirect.
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    const check = requireMember(ctx)
    if (!check.ok) return check.response!
    const auth = check.auth!

    const { messages } = getInertiaShared(ctx)

    const orgId = ctx.getQuery('orgId') ?? ctx.getHeader('X-Organization-Id')
    if (!orgId) {
      return this.inertia.render(ctx, 'Member/Contracts/Index', {
        orgId: null,
        contracts: [],
        error: messages['member.contracts.selectOrg'],
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
      error: result.success ? null : result.message,
    })
  }
}
