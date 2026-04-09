import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import type { GetProfileService } from '@/Modules/Profile/Application/Services/GetProfileService'
import type { UpdateProfileService } from '@/Modules/Profile/Application/Services/UpdateProfileService'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'

export class MemberSettingsPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly getProfileService: GetProfileService,
    private readonly updateProfileService: UpdateProfileService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.redirect('/login')

    const result = await this.getProfileService.execute(auth.userId)

    return this.inertia.render(ctx, 'Member/Settings/Index', {
      profile: result.success ? result.data : null,
      error: result.success ? null : result.message,
      formError: null,
    })
  }

  /** PUT /member/settings — Inertia 更新顯示名稱 */
  async update(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.redirect('/login')

    const body = await ctx.getJsonBody<{ displayName?: string }>()
    const displayName = typeof body.displayName === 'string' ? body.displayName : ''

    const updateResult = await this.updateProfileService.execute(auth.userId, {
      displayName,
    })

    const profileResult = await this.getProfileService.execute(auth.userId)

    return this.inertia.render(ctx, 'Member/Settings/Index', {
      profile: profileResult.success ? profileResult.data : null,
      error: profileResult.success ? null : profileResult.message,
      formError: updateResult.success ? null : updateResult.message,
    })
  }
}
