import type { ChangeUserStatusService } from '@/Modules/Auth/Application/Services/ChangeUserStatusService'
import type { GetUserDetailService } from '@/Modules/Auth/Application/Services/GetUserDetailService'
import type { GetProfileService } from '@/Modules/Profile/Application/Services/GetProfileService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
/**
 * Admin user profile view and account status transitions (`Admin/Users/Show`).
 */
export class AdminUserDetailPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly getProfileService: GetProfileService,
    private readonly getUserDetailService: GetUserDetailService,
    private readonly changeUserStatusService: ChangeUserStatusService,
  ) {}

  /**
   * @param ctx - Route param `id` = user id.
   * @returns Inertia user detail or error state.
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    const userId = ctx.getParam('id')
    if (!userId) {
      return this.inertia.render(ctx, 'Admin/Users/Show', {
        user: null,
        error: { key: 'admin.users.missingId' },
      })
    }

    const [userResult, profileResult] = await Promise.all([
      this.getUserDetailService.execute(userId),
      this.getProfileService.execute(userId),
    ])

    if (!userResult.success || !userResult.data) {
      return this.inertia.render(ctx, 'Admin/Users/Show', {
        user: null,
        error: { key: 'admin.users.loadFailed' },
      })
    }

    const profile = profileResult.success ? profileResult.data : null
    const userDetail = userResult.data

    const accountStatus: 'active' | 'suspended' =
      userDetail.status === 'suspended' ? 'suspended' : 'active'

    return this.inertia.render(ctx, 'Admin/Users/Show', {
      user: {
        id: userDetail.id,
        email: userDetail.email,
        name: profile?.displayName ?? userDetail.email,
        role: userDetail.role,
        status: accountStatus,
        createdAt: userDetail.createdAt,
        updatedAt: userDetail.updatedAt,
      },
      error: profileResult.success ? null : { key: 'admin.users.loadFailed' },
    })
  }

  /**
   * POST `/admin/users/:id/status`: updates account status using `ChangeStatusRequest`.
   *
   * @param ctx - Route param `id`; `validated` body from context.
   * @returns Redirect back to the user detail path.
   */
  async postStatus(ctx: IHttpContext): Promise<Response> {
    const userId = ctx.getParam('id')
    if (!userId) {
      return ctx.redirect('/admin/users')
    }

    const body = ctx.get('validated') as { status: 'active' | 'suspended' | 'archived' } | undefined
    if (!body || (body.status !== 'active' && body.status !== 'suspended')) {
      return ctx.redirect(`/admin/users/${userId}`)
    }

    await this.changeUserStatusService.execute(userId, { status: body.status })
    return ctx.redirect(`/admin/users/${userId}`)
  }
}
