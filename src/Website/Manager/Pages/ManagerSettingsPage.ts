import type { ChangePasswordService } from '@/Modules/Auth/Application/Services/ChangePasswordService'
import type { ChangePasswordParams } from '@/Modules/Auth/Presentation/Requests/ChangePasswordRequest'
import { PASSWORD_REQUIREMENTS } from '@/Modules/Auth/Presentation/passwordRequirements'
import type { GetProfileService } from '@/Modules/Profile/Application/Services/GetProfileService'
import type { UpdateProfileService } from '@/Modules/Profile/Application/Services/UpdateProfileService'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { setFlash } from '@/Website/Http/Inertia/SharedPropsBuilder'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'

/**
 * Paths:
 *  - GET `/manager/settings`
 *  - PUT `/manager/settings`
 *  - POST `/manager/settings/password`
 *
 * 直接沿用 Profile 模組的 get/update services — 與 Member 版差別僅在 layout 與 path。
 */
export class ManagerSettingsPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly getProfileService: GetProfileService,
    private readonly updateProfileService: UpdateProfileService,
    private readonly changePasswordService: ChangePasswordService,
  ) {}

  private async renderSettings(
    ctx: IHttpContext,
    extras: Record<string, unknown> = {},
  ): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const profile = await this.getProfileService.execute(auth.userId)
    return this.inertia.render(ctx, 'Manager/Settings/Index', {
      profile: profile.success ? (profile.data ?? null) : null,
      error: profile.success ? null : { key: 'manager.settings.loadFailed' },
      passwordRequirements: PASSWORD_REQUIREMENTS,
      ...extras,
    })
  }

  async handle(ctx: IHttpContext): Promise<Response> {
    return this.renderSettings(ctx)
  }

  async update(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const body = (ctx.get('validated') as { displayName?: string } | undefined) ?? {}
    await this.updateProfileService.execute(auth.userId, {
      displayName: typeof body.displayName === 'string' ? body.displayName : undefined,
    })
    return ctx.redirect('/manager/settings')
  }

  async changePassword(ctx: IHttpContext): Promise<Response> {
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
}
