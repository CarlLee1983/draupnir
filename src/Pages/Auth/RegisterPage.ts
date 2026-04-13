import type { RegisterUserService } from '@/Modules/Auth/Application/Services/RegisterUserService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'

const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requiresUppercase: true,
  requiresLowercase: true,
  requiresNumbers: true,
  requiresSpecialChars: true,
}

export class RegisterPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly registerService: RegisterUserService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const shared = ctx.get('inertia:shared') as Record<string, unknown> | undefined
    const csrfToken = (shared?.csrfToken as string) ?? ''

    return this.inertia.render(ctx, 'Auth/Register', {
      csrfToken,
      passwordRequirements: PASSWORD_REQUIREMENTS,
    })
  }

  async store(ctx: IHttpContext): Promise<Response> {
    const shared = ctx.get('inertia:shared') as Record<string, unknown> | undefined
    const csrfToken = (shared?.csrfToken as string) ?? ''
    const validated = ctx.get('validated') as
      | {
          email?: string
          password?: string
          passwordConfirmation?: string
          agreedToTerms?: boolean
        }
      | undefined

    const email = validated?.email ?? ''
    const password = validated?.password ?? ''
    const confirmPassword = validated?.passwordConfirmation ?? ''

    const result = await this.registerService.execute({ email, password, confirmPassword })

    if (!result.success) {
      return this.inertia.render(ctx, 'Auth/Register', {
        csrfToken,
        error: result.error ?? result.message,
        passwordRequirements: PASSWORD_REQUIREMENTS,
      })
    }

    ctx.set('flash:success', '帳號建立成功，請登入')
    return ctx.redirect('/login')
  }
}
