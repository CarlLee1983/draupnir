import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

/**
 * Organization quota / contract list is not exposed to the generic member web role;
 * redirect to the member dashboard while preserving the URL for compatibility.
 */
export class MemberContractsPage {
  handle(ctx: IHttpContext): Promise<Response> {
    return Promise.resolve(ctx.redirect('/member/dashboard'))
  }
}
