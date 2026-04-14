import type { RegisterModuleService } from '@/Modules/AppModule/Application/Services/RegisterModuleService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'

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
    const auth = AuthMiddleware.getAuthContext(ctx)!

    const body = await ctx.getJsonBody<{
      name?: string
      description?: string
      type?: string
    }>()

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const typeRaw = body.type === 'paid' ? 'paid' : 'free'

    if (!name) {
      return this.inertia.render(ctx, 'Admin/Modules/Create', {
        formError: { key: 'admin.modules.nameRequired' },
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
      formError: result.success ? null : { key: 'admin.modules.createFailed' },
    })
  }
}
