import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'

/**
 * Inertia page: user registration form.
 */
export class RegisterPage {
  constructor(private readonly inertia: InertiaService) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    return this.inertia.render(ctx, 'Auth/Register', {
      csrfToken: 'TODO',
      passwordRequirements: {
        minLength: 8,
        requiresUppercase: true,
        requiresLowercase: true,
        requiresNumbers: true,
        requiresSpecialChars: true,
      },
    })
  }

  async store(ctx: IHttpContext): Promise<Response> {
    ctx.get('validated') as
      | {
          email?: string
          password?: string
          passwordConfirmation?: string
          agreedToTerms?: boolean
        }
      | undefined

    return this.inertia.render(ctx, 'Auth/Register', {
      error: 'Not implemented',
    })
  }
}
