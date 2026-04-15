import type { IOrganizationMemberRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
/**
 * Member cost breakdown page shell (`Member/CostBreakdown/Index`).
 */
export class MemberCostBreakdownPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly memberRepository: IOrganizationMemberRepository,
  ) {}

  /**
   * Renders the cost breakdown page.
   *
   * @param ctx - HTTP context to retrieve `orgId` from query or header.
   * @returns Inertia render response with organization data.
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!

    let orgId = ctx.getQuery('orgId') ?? ctx.getHeader('X-Organization-Id') ?? null
    if (!orgId) {
      const membership = await this.memberRepository.findByUserId(auth.userId)
      orgId = membership?.organizationId ?? null
    }
    if (!orgId) {
      return this.inertia.render(ctx, 'Member/CostBreakdown/Index', {
        orgId: null,
        error: { key: 'member.costBreakdown.selectOrg' },
      })
    }

    return this.inertia.render(ctx, 'Member/CostBreakdown/Index', {
      orgId,
      error: null,
    })
  }
}
