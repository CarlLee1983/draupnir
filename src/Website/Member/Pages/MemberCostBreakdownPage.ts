import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

/**
 * Cost breakdown is not exposed to the generic member web role; keep the route
 * stable for bookmarks and redirect to the member dashboard.
 */
export class MemberCostBreakdownPage {
  handle(ctx: IHttpContext): Promise<Response> {
    return Promise.resolve(ctx.redirect('/member/dashboard'))
  }
}
