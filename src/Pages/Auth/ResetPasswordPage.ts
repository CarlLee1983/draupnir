import type { ResetPasswordService } from '@/Modules/Auth/Application/Services/ResetPasswordService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'

export class ResetPasswordPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly resetPasswordService: ResetPasswordService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const shared = ctx.get('inertia:shared') as Record<string, unknown> | undefined
    const csrfToken = (shared?.csrfToken as string) ?? ''
    const token = ctx.getParam('token') ?? ''

    const { valid } = await this.resetPasswordService.validateToken(token)

    return this.inertia.render(ctx, 'Auth/ResetPassword', {
      csrfToken,
      token,
      tokenValid: valid,
    })
  }

  async store(ctx: IHttpContext): Promise<Response> {
    const shared = ctx.get('inertia:shared') as Record<string, unknown> | undefined
    const csrfToken = (shared?.csrfToken as string) ?? ''
    const token = ctx.getParam('token') ?? ''
    const validated = ctx.get('validated') as {
      password?: string
      passwordConfirmation?: string
    } | undefined
    const password = validated?.password ?? ''

    const result = await this.resetPasswordService.execute(token, password)

    if (!result.success) {
      return this.inertia.render(ctx, 'Auth/ResetPassword', {
        csrfToken,
        token,
        tokenValid: true,
        error: result.error,
      })
    }

    ctx.set('flash:success', '密碼已重設，請使用新密碼登入')
    return ctx.redirect('/login')
  }
}
