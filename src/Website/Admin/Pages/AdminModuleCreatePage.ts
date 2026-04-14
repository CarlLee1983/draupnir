import type { RegisterModuleService } from '@/Modules/AppModule/Application/Services/RegisterModuleService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { getInertiaShared } from '@/Website/Http/Inertia/SharedPropsBuilder'
import { requireAdmin } from '@/Website/Admin/middleware/requireAdmin'

/**
 * Admin module registration form and submit (`Admin/Modules/Create`).
 */
export class AdminModuleCreatePage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly registerModuleService: RegisterModuleService,
  ) {}

  /**
   * @returns Empty create form (Inertia).
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    const check = requireAdmin(ctx)
    if (!check.ok) return check.response!

    return this.inertia.render(ctx, 'Admin/Modules/Create', {
      formError: null,
    })
  }

  /**
   * POST `/admin/modules`: registers a new module from JSON body (`name`, `description`, `type`).
   *
   * @returns Redirect to `/admin/modules` on success or re-render with validation error.
   */
  async store(ctx: IHttpContext): Promise<Response> {
    const check = requireAdmin(ctx)
    if (!check.ok) return check.response!
    const auth = check.auth!

    const body = await ctx.getJsonBody<{
      name?: string
      description?: string
      type?: string
    }>()

    const { messages } = getInertiaShared(ctx)

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const typeRaw = body.type === 'paid' ? 'paid' : 'free'

    if (!name) {
      return this.inertia.render(ctx, 'Admin/Modules/Create', {
        formError: messages['admin.modules.nameRequired'],
      })
    }

    const result = await this.registerModuleService.execute({
      name,
      description,
      type: typeRaw,
      callerRole: auth.role,
    })

    if (result.success) {
      return ctx.redirect('/admin/modules')
    }

    return this.inertia.render(ctx, 'Admin/Modules/Create', {
      formError: result.message ?? 'Registration failed',
    })
  }
}
