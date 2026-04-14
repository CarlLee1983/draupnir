import type { ResetPasswordService } from '@/Modules/Auth/Application/Services/ResetPasswordService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'

/**
 * Inertia page controller for the reset password view.
 *
 * Handles validating reset tokens and processing password update submissions.
 */
export class ResetPasswordPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly resetPasswordService: ResetPasswordService,
  ) {}

  /**
   * Renders the reset password page.
   * `GET /reset-password/:token`
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    const token = ctx.getParam('token') ?? ''

    const { valid } = await this.resetPasswordService.validateToken(token)

    return this.inertia.render(ctx, 'Auth/ResetPassword', {
      token,
      tokenValid: valid,
    })
  }

  /**
   * Processes the reset password form submission.
   * `POST /reset-password/:token`
   */
  async store(ctx: IHttpContext): Promise<Response> {
    const token = ctx.getParam('token') ?? ''
    const validated = ctx.get('validated') as
      | {
          password?: string
          passwordConfirmation?: string
        }
      | undefined
    const password = validated?.password ?? ''

    const result = await this.resetPasswordService.execute(token, password)

    if (!result.success) {
      return this.inertia.render(ctx, 'Auth/ResetPassword', {
        token,
        tokenValid: true,
        error: result.error,
      })
    }

    ctx.set('flash:success', '密碼已重設，請使用新密碼登入')
    return ctx.redirect('/login')
  }
}
