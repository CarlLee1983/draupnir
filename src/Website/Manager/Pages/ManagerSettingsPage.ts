import type { ChangePasswordService } from '@/Modules/Auth/Application/Services/ChangePasswordService'
import type { ListSessionsService } from '@/Modules/Auth/Application/Services/ListSessionsService'
import type { RevokeAllSessionsService } from '@/Modules/Auth/Application/Services/RevokeAllSessionsService'
import { sha256 } from '@/Modules/Auth/Application/Utils/sha256'
import { PASSWORD_REQUIREMENTS } from '@/Modules/Auth/Presentation/passwordRequirements'
import type { ChangePasswordParams } from '@/Modules/Auth/Presentation/Requests/ChangePasswordRequest'
import type { GetProfileService } from '@/Modules/Profile/Application/Services/GetProfileService'
import type { UpdateProfileService } from '@/Modules/Profile/Application/Services/UpdateProfileService'
import {
  AuthMiddleware,
  extractRawAuthToken,
} from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { setFlash } from '@/Website/Http/Inertia/SharedPropsBuilder'
import { REFRESHED_AUTH_TOKEN_HASH_KEY } from '@/Website/Http/Middleware/TokenRefreshMiddleware'

/**
 * Paths:
 *  - GET `/manager/settings`
 *  - PUT `/manager/settings`
 *  - POST `/manager/settings/password`
 *  - POST `/manager/settings/sessions/revoke-all`
 *
 * 直接沿用 Profile 模組的 get/update services — 與 Member 版差別僅在 layout 與 path。
 */
export class ManagerSettingsPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly getProfileService: GetProfileService,
    private readonly updateProfileService: UpdateProfileService,
    private readonly changePasswordService: ChangePasswordService,
    private readonly listSessionsService: ListSessionsService,
    private readonly revokeAllSessionsService: RevokeAllSessionsService,
  ) {}

  private async renderSettings(
    ctx: IHttpContext,
    extras: Record<string, unknown> = {},
  ): Promise<Response> {
    // biome-ignore lint/style/noNonNullAssertion: guaranteed by control flow or DOM contract
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const profile = await this.getProfileService.execute(auth.userId)
    // Prefer the hash of the silently-refreshed access token so the current device
    // still highlights after TokenRefreshMiddleware minted a new token.
    const refreshedHash = ctx.get<string>(REFRESHED_AUTH_TOKEN_HASH_KEY) ?? null
    const raw = refreshedHash ? null : extractRawAuthToken(ctx)
    const currentHash = refreshedHash ?? (raw ? await sha256(raw) : null)
    const sessionsResult = await this.listSessionsService.execute(auth.userId, currentHash)
    const sessions = sessionsResult.success ? sessionsResult.sessions : []
    return this.inertia.render(ctx, 'Manager/Settings/Index', {
      profile: profile.success ? (profile.data ?? null) : null,
      error: profile.success ? null : { key: 'manager.settings.loadFailed' },
      passwordRequirements: PASSWORD_REQUIREMENTS,
      sessions,
      ...extras,
    })
  }

  async handle(ctx: IHttpContext): Promise<Response> {
    return this.renderSettings(ctx)
  }

  async update(ctx: IHttpContext): Promise<Response> {
    // biome-ignore lint/style/noNonNullAssertion: guaranteed by control flow or DOM contract
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const body = (ctx.get('validated') as { displayName?: string } | undefined) ?? {}
    await this.updateProfileService.execute(auth.userId, {
      displayName: typeof body.displayName === 'string' ? body.displayName : undefined,
    })
    return ctx.redirect('/manager/settings')
  }

  async changePassword(ctx: IHttpContext): Promise<Response> {
    // biome-ignore lint/style/noNonNullAssertion: guaranteed by control flow or DOM contract
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const validated = ctx.get('validated') as ChangePasswordParams | undefined
    if (!validated) {
      return this.renderSettings(ctx, { passwordChangeError: '請求資料無效' })
    }

    const result = await this.changePasswordService.execute(
      auth.userId,
      validated.currentPassword,
      validated.password,
    )

    if (!result.success) {
      return this.renderSettings(ctx, { passwordChangeError: result.message })
    }

    ctx.setCookie('auth_token', '', { path: '/', maxAge: 0, sameSite: 'Lax' })
    ctx.setCookie('refresh_token', '', { path: '/', maxAge: 0, sameSite: 'Lax' })
    setFlash(ctx, 'success', { key: 'ui.manager.settings.passwordChangedReauth' })
    return ctx.redirect('/login')
  }

  async revokeAllSessions(ctx: IHttpContext): Promise<Response> {
    // biome-ignore lint/style/noNonNullAssertion: guaranteed by control flow or DOM contract
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const result = await this.revokeAllSessionsService.execute(auth.userId)
    if (!result.success) {
      return this.renderSettings(ctx, { sessionsRevokeError: result.message })
    }
    ctx.setCookie('auth_token', '', { path: '/', maxAge: 0, sameSite: 'Lax' })
    ctx.setCookie('refresh_token', '', { path: '/', maxAge: 0, sameSite: 'Lax' })
    setFlash(ctx, 'success', { key: 'ui.manager.settings.allSessionsRevoked' })
    return ctx.redirect('/login')
  }
}
