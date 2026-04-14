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

    const shared = ctx.get('inertia:shared') as Record<string, unknown> | undefined
    const csrfToken = (shared?.csrfToken as string) ?? ''

    return this.inertia.render(ctx, 'Auth/Login', {
      csrfToken,
      lastEmail: undefined,
    })
  }

  async store(ctx: IHttpContext): Promise<Response> {
    const shared = ctx.get('inertia:shared') as Record<string, unknown> | undefined
    const csrfToken = (shared?.csrfToken as string) ?? ''
    const validated = ctx.get('validated') as { email?: string; password?: string } | undefined
    const email = validated?.email ?? ''
    const password = validated?.password ?? ''

    const result = await this.loginService.execute({ email, password })

    if (!result.success || !result.data) {
      return this.inertia.render(ctx, 'Auth/Login', {
        csrfToken,
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
