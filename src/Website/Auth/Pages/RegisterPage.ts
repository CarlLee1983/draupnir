import type { RegisterParams } from '@/Modules/Auth/Presentation/Requests/RegisterRequest'
import type { RegisterUserService } from '@/Modules/Auth/Application/Services/RegisterUserService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'

// Central password policy — shared across all render paths
const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requiresUppercase: true,
  requiresLowercase: true,
  requiresNumbers: true,
} as const

/**
 * Inertia page controller for the registration view.
 *
 * Handles rendering the registration form and processing registration submissions.
 */
export class RegisterPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly registerService: RegisterUserService,
  ) {}

  /**
   * Renders the registration page.
   * `GET /register`
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    return this.inertia.render(ctx, 'Auth/Register', {
      passwordRequirements: PASSWORD_REQUIREMENTS,
    })
  }

  /**
   * Processes the registration form submission.
   * `POST /register`
   */
  async store(ctx: IHttpContext): Promise<Response> {
    // Access validated data from RegisterRequest
    const validated = ctx.get('validated') as RegisterParams | undefined

    if (!validated) {
      return this.inertia.render(ctx, 'Auth/Register', {
        passwordRequirements: PASSWORD_REQUIREMENTS,
        error: 'Validation failed. Please check your input.',
      })
    }

    // Execute service with mapped parameters from RegisterParams (confirmPassword)
    const result = await this.registerService.execute(validated)

    if (!result.success) {
      return this.inertia.render(ctx, 'Auth/Register', {
        passwordRequirements: PASSWORD_REQUIREMENTS,
        error: result.error ?? result.message,
        lastEmail: validated.email,
      })
    }

    ctx.setCookie('flash:success', encodeURIComponent('帳號建立成功，請登入'), {
      httpOnly: true,
      sameSite: 'Lax',
      path: '/',
      maxAge: 60,
    })
    return ctx.redirect('/login')
  }
}
