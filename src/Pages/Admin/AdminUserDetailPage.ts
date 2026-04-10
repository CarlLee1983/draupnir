import type { ChangeUserStatusService } from '@/Modules/Auth/Application/Services/ChangeUserStatusService'
import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import type { GetProfileService } from '@/Modules/Profile/Application/Services/GetProfileService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import { requireAdmin } from './helpers/requireAdmin'

/**
 * Admin user profile view and account status transitions (`Admin/Users/Show`).
 */
export class AdminUserDetailPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly getProfileService: GetProfileService,
    private readonly authRepository: IAuthRepository,
    private readonly changeUserStatusService: ChangeUserStatusService,
  ) {}

  /**
   * @param ctx - Route param `id` = user id.
   * @returns Inertia user detail or error state.
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    const check = requireAdmin(ctx)
    if (!check.ok) return check.response!

    const userId = ctx.getParam('id')
    if (!userId) {
      return this.inertia.render(ctx, 'Admin/Users/Show', {
        user: null,
        error: '缺少 user id',
      })
    }

    const [userAuth, profileResult] = await Promise.all([
      this.authRepository.findById(userId),
      this.getProfileService.execute(userId),
    ])

    if (!userAuth) {
      return this.inertia.render(ctx, 'Admin/Users/Show', {
        user: null,
        error: '找不到使用者',
      })
    }

    const profile = profileResult.success ? profileResult.data : null

    const statusRaw = userAuth.status as unknown as string
    const accountStatus: 'active' | 'suspended' = statusRaw === 'suspended' ? 'suspended' : 'active'

    return this.inertia.render(ctx, 'Admin/Users/Show', {
      user: {
        id: userAuth.id,
        email: userAuth.emailValue,
        name: profile?.displayName ?? userAuth.emailValue,
        role: userAuth.role.getValue(),
        status: accountStatus,
        createdAt: userAuth.createdAt.toISOString(),
        updatedAt: userAuth.updatedAt.toISOString(),
      },
      error: profileResult.success ? null : profileResult.message,
    })
  }

  /**
   * POST `/admin/users/:id/status`: updates account status from JSON body (`active` | `suspended`).
   *
   * @param ctx - Route param `id`; body `{ status }` from `getJsonBody`.
   * @returns Redirect back to the user detail path.
   */
  async postStatus(ctx: IHttpContext): Promise<Response> {
    const check = requireAdmin(ctx)
    if (!check.ok) return check.response!

    const userId = ctx.getParam('id')
    if (!userId) {
      return ctx.redirect('/admin/users')
    }

    const body = await ctx.getJsonBody<{ status?: string }>()
    const raw = body.status
    if (raw !== 'active' && raw !== 'suspended') {
      return ctx.redirect(`/admin/users/${userId}`)
    }

    await this.changeUserStatusService.execute(userId, { status: raw })
    return ctx.redirect(`/admin/users/${userId}`)
  }
}
