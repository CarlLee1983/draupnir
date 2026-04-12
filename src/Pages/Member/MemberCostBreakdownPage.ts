import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import { requireMember } from './helpers/requireMember'

/**
 * Member cost breakdown page shell (`Member/CostBreakdown/Index`).
 */
export class MemberCostBreakdownPage {
  constructor(private readonly inertia: InertiaService) {}

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
