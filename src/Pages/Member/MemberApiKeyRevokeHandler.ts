import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { RevokeApiKeyService } from '@/Modules/ApiKey/Application/Services/RevokeApiKeyService'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'

export class MemberApiKeyRevokeHandler {
  constructor(private readonly revokeService: RevokeApiKeyService) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.redirect('/login')

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
