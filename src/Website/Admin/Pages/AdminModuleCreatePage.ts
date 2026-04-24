import type { RegisterModuleService } from '@/Modules/AppModule/Application/Services/RegisterModuleService'
import type { RegisterModuleParams } from '@/Modules/AppModule/Presentation/Requests/RegisterModuleRequest'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'

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
   * POST `/admin/modules`: registers a new module using `RegisterModuleRequest`.
   *
   * @returns Redirect to `/admin/modules` on success or re-render with validation error.
   */
  async store(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const body = ctx.get('validated') as RegisterModuleParams | undefined

    if (!body) {
      return this.inertia.render(ctx, 'Admin/Modules/Create', {
        formError: { key: 'admin.modules.nameRequired' },
      })
    }

    const result = await this.registerModuleService.execute({
      name: body.name,
      description: body.description,
      type: body.type,
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
