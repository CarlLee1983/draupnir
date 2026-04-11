import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'

export class ForgotPasswordPage {
  constructor(private readonly inertia: InertiaService) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    return this.inertia.render(ctx, 'Auth/ForgotPassword', {
      csrfToken: 'TODO',
    })
  }

  async store(ctx: IHttpContext): Promise<Response> {
    ctx.get('validated') as { email?: string } | undefined
    return this.inertia.render(ctx, 'Auth/ForgotPassword', {
      message: 'Reset link sent',
    })
  }
}
