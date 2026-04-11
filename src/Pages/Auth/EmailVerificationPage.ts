import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'

export class EmailVerificationPage {
  constructor(private readonly inertia: InertiaService) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    ctx.getParam('token') ?? ''
    return this.inertia.render(ctx, 'Auth/EmailVerification', {
      status: 'success',
      message: 'Email verified successfully',
      redirectUrl: '/member/dashboard',
      redirectSeconds: 5,
    })
  }
}
