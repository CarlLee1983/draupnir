import type { RevokeApiKeyService } from '@/Modules/ApiKey/Application/Services/RevokeApiKeyService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'

/**
 * POST handler for revoking a member API key (`/member/api-keys/:keyId/revoke`).
 */
export class MemberApiKeyRevokeHandler {
  constructor(private readonly revokeService: RevokeApiKeyService) {}

  /**
   * @param ctx - Route `keyId`; optional query `orgId` preserved on redirect.
   * @returns Redirect to `/member/api-keys` or login when unauthenticated.
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!

    const keyId = ctx.getParam('keyId')
    if (!keyId) {
      return ctx.redirect('/member/api-keys')
    }

    const orgId = ctx.getQuery('orgId')
    await this.revokeService.execute({
      keyId,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
    })

    const q = orgId ? `?orgId=${encodeURIComponent(orgId)}` : ''
    return ctx.redirect(`/member/api-keys${q}`)
  }
}
