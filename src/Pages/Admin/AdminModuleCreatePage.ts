import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import type { RegisterModuleService } from '@/Modules/AppModule/Application/Services/RegisterModuleService'
import { requireAdmin } from './helpers/requireAdmin'

export class AdminModuleCreatePage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly registerModuleService: RegisterModuleService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const check = requireAdmin(ctx)
    if (!check.ok) return check.response!

    return this.inertia.render(ctx, 'Admin/Modules/Create', {
      formError: null,
    })
  }

  /** POST /admin/modules */
  async store(ctx: IHttpContext): Promise<Response> {
    const check = requireAdmin(ctx)
    if (!check.ok) return check.response!
    const auth = check.auth!

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
        formError: '模組識別名稱為必填',
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
      formError: result.message ?? '註冊失敗',
    })
  }
}
