import type { LoginUserService } from '@/Modules/Auth/Application/Services/LoginUserService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'

export class LoginPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly loginService: LoginUserService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    if (ctx.getCookie('auth_token')) {
      return ctx.redirect('/member/dashboard')
    }

    return this.inertia.render(ctx, 'Auth/Login', {
      lastEmail: undefined,
    })
  }

  async store(ctx: IHttpContext): Promise<Response> {
    const validated = ctx.get('validated') as { email?: string; password?: string } | undefined
    const email = validated?.email ?? ''
    const password = validated?.password ?? ''

    const result = await this.loginService.execute({ email, password })

    if (!result.success || !result.data) {
      return this.inertia.render(ctx, 'Auth/Login', {
        error: result.error ?? result.message,
        lastEmail: email,
      })
    }

    ctx.setCookie('auth_token', result.data.accessToken, {
      httpOnly: true,
      sameSite: 'Lax',
      path: '/',
      maxAge: 3600,
    })

    return ctx.redirect('/member/dashboard')
  }
}
