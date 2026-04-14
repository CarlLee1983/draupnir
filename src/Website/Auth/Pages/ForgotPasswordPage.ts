import type { ForgotPasswordService } from '@/Modules/Auth/Application/Services/ForgotPasswordService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'

/**
 * Inertia page controller for the forgot password view.
 *
 * Handles rendering the form and processing password reset requests.
 */
export class ForgotPasswordPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly forgotPasswordService: ForgotPasswordService,
  ) {}

  /**
   * Renders the forgot password page.
   * `GET /forgot-password`
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    return this.inertia.render(ctx, 'Auth/ForgotPassword', {})
  }

  /**
   * Processes the forgot password form submission.
   * `POST /forgot-password`
   */
  async store(ctx: IHttpContext): Promise<Response> {
    const validated = ctx.get('validated') as { email?: string } | undefined
    const email = validated?.email ?? ''

    await this.forgotPasswordService.execute(email)

    return this.inertia.render(ctx, 'Auth/ForgotPassword', {
      message: '若此 email 存在，重設連結已寄出',
    })
  }
}
