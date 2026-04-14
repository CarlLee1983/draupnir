import type { RegisterParams } from '@/Modules/Auth/Presentation/Requests/RegisterRequest'
import type { RegisterUserService } from '@/Modules/Auth/Application/Services/RegisterUserService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { setFlash } from '@/Website/Http/Inertia/SharedPropsBuilder'

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
        error: { key: 'auth.login.failed' },
      })
    }

    // Execute service with mapped parameters from RegisterParams (confirmPassword)
    const result = await this.registerService.execute(validated)

    if (!result.success) {
      return this.inertia.render(ctx, 'Auth/Register', {
        passwordRequirements: PASSWORD_REQUIREMENTS,
        error: { key: 'auth.login.failed' },
        lastEmail: validated.email,
      })
    }

    setFlash(ctx, 'success', { key: 'auth.register.success' })
    return ctx.redirect('/login')
  }
}
