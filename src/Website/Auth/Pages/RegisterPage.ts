import type { LoginUserService } from '@/Modules/Auth/Application/Services/LoginUserService'
import type { RegisterUserService } from '@/Modules/Auth/Application/Services/RegisterUserService'
import { PASSWORD_REQUIREMENTS } from '@/Modules/Auth/Presentation/passwordRequirements'
import type { RegisterParams } from '@/Modules/Auth/Presentation/Requests/RegisterRequest'
import { isSecureRequest } from '@/Shared/Infrastructure/Http/isSecureRequest'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'

/**
 * Inertia page controller for the registration view.
 *
 * Handles rendering the registration form and processing registration submissions.
 */
export class RegisterPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly registerService: RegisterUserService,
    private readonly loginService: LoginUserService,
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

    // 自動登入：注冊成功後直接建立 session，避免用戶誤以為注冊失敗
    const loginResult = await this.loginService.execute({
      email: validated.email,
      password: validated.password,
    })

    if (loginResult.success && loginResult.data) {
      ctx.setCookie('auth_token', loginResult.data.accessToken, {
        httpOnly: true,
        sameSite: 'Lax',
        path: '/',
        maxAge: 3600,
        secure: isSecureRequest(ctx),
      })
      return ctx.redirect('/member/dashboard')
    }

    // 自動登入失敗（罕見情況）→ 退回登入頁，flash 訊息提示已注冊成功
    return ctx.redirect('/login')
  }
}
