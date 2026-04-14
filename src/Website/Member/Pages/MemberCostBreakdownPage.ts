import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { requireMember } from '@/Website/Member/middleware/requireMember'

/**
 * Member cost breakdown page shell (`Member/CostBreakdown/Index`).
 */
export class MemberCostBreakdownPage {
  constructor(private readonly inertia: InertiaService) {}

  /**
   * Renders the cost breakdown page.
   *
   * @param ctx - HTTP context to retrieve `orgId` from query or header.
   * @returns Inertia render response with organization data.
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    const check = requireMember(ctx)
    if (!check.ok) return check.response!

    const orgId = ctx.getQuery('orgId') ?? ctx.getHeader('X-Organization-Id')
    if (!orgId) {
      return this.inertia.render(ctx, 'Member/CostBreakdown/Index', {
        orgId: null,
        error: 'Select an organization to view cost breakdown.',
      })
    }

    return this.inertia.render(ctx, 'Member/CostBreakdown/Index', {
      orgId,
      error: null,
    })
  }
}
