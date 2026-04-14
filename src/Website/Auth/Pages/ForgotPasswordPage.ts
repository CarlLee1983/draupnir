import type { ForgotPasswordService } from '@/Modules/Auth/Application/Services/ForgotPasswordService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'

export class ForgotPasswordPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly forgotPasswordService: ForgotPasswordService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const shared = ctx.get('inertia:shared') as Record<string, unknown> | undefined
    const csrfToken = (shared?.csrfToken as string) ?? ''
    return this.inertia.render(ctx, 'Auth/ForgotPassword', { csrfToken })
  }

  async store(ctx: IHttpContext): Promise<Response> {
    const shared = ctx.get('inertia:shared') as Record<string, unknown> | undefined
    const csrfToken = (shared?.csrfToken as string) ?? ''
    const validated = ctx.get('validated') as { email?: string } | undefined
    const email = validated?.email ?? ''

    await this.forgotPasswordService.execute(email)

    return this.inertia.render(ctx, 'Auth/ForgotPassword', {
      csrfToken,
      message: '若此 email 存在，重設連結已寄出',
    })
  }
}
