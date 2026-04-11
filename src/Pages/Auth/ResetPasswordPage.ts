import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'

export class ResetPasswordPage {
  constructor(private readonly inertia: InertiaService) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const token = ctx.getParam('token') ?? ''
    return this.inertia.render(ctx, 'Auth/ResetPassword', {
      csrfToken: 'TODO',
      token,
      tokenValid: true,
    })
  }

  async store(ctx: IHttpContext): Promise<Response> {
    ctx.getParam('token') ?? ''
    ctx.get('validated') as { password?: string; passwordConfirmation?: string } | undefined
    return this.inertia.render(ctx, 'Auth/ResetPassword', {
      message: 'Password reset successfully',
    })
  }
}
