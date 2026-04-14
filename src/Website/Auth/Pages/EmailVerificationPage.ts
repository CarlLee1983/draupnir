import type { EmailVerificationService } from '@/Modules/Auth/Application/Services/EmailVerificationService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'

/**
 * Inertia page controller for email verification.
 *
 * Handles the verification of email tokens and renders the result page.
 */
export class EmailVerificationPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  /**
   * Processes the email verification request.
   * `GET /verify-email/:token`
   *
   * @param ctx - The request context.
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    const token = ctx.getParam('token') ?? ''
    const result = await this.emailVerificationService.execute(token)

    if (result.success) {
      return this.inertia.render(ctx, 'Auth/EmailVerification', {
        status: 'success',
        message: { key: 'auth.emailVerification.success' },
        redirectUrl: result.redirectUrl ?? '/member/dashboard',
        redirectSeconds: 5,
      })
    }

    return this.inertia.render(ctx, 'Auth/EmailVerification', {
      status: 'error',
      message: { key: 'auth.emailVerification.failed' },
    })
  }
}
