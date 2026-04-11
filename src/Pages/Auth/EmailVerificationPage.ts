import type { EmailVerificationService } from '@/Modules/Auth/Application/Services/EmailVerificationService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'

export class EmailVerificationPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const token = ctx.getParam('token') ?? ''
    const result = await this.emailVerificationService.execute(token)

    if (result.success) {
      return this.inertia.render(ctx, 'Auth/EmailVerification', {
        status: 'success',
        message: result.message,
        redirectUrl: result.redirectUrl ?? '/member/dashboard',
        redirectSeconds: 5,
      })
    }

    return this.inertia.render(ctx, 'Auth/EmailVerification', {
      status: 'error',
      message: result.message,
    })
  }
}
