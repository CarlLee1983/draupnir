import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

/**
 * Legacy member dashboard page.
 * 
 * Path: `/member/dashboard`
 * Action: Redirect to consolidated API Keys landing page.
 */
export class MemberDashboardPage {
  async handle(ctx: IHttpContext): Promise<Response> {
    return ctx.redirect('/member/api-keys')
  }
}
