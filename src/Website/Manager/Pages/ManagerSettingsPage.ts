import type { GetProfileService } from '@/Modules/Profile/Application/Services/GetProfileService'
import type { UpdateProfileService } from '@/Modules/Profile/Application/Services/UpdateProfileService'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'

/**
 * Paths:
 *  - GET `/manager/settings`
 *  - PUT `/manager/settings`
 *
 * 直接沿用 Profile 模組的 get/update services — 與 Member 版差別僅在 layout 與 path。
 */
export class ManagerSettingsPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly getProfileService: GetProfileService,
    private readonly updateProfileService: UpdateProfileService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const profile = await this.getProfileService.execute(auth.userId)
    return this.inertia.render(ctx, 'Manager/Settings/Index', {
      profile: profile.success ? (profile.data ?? null) : null,
      error: profile.success ? null : { key: 'manager.settings.loadFailed' },
    })
  }

  async update(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const body = (ctx.get('validated') as Record<string, unknown> | undefined) ?? {}
    await this.updateProfileService.execute(auth.userId, body as any)
    return ctx.redirect('/manager/settings')
  }
}
