import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { AuthenticateApp } from '../../Application/UseCases/AuthenticateApp'
import type { AppAuthContext } from '../../Application/DTOs/SdkApiDTO'

export class AppAuthMiddleware {
  constructor(private readonly authenticateApp: AuthenticateApp) {}

  async handle(ctx: IHttpContext, next: () => Promise<Response>): Promise<Response> {
    const header =
      ctx.getHeader('authorization') ??
      ctx.getHeader('Authorization') ??
      ctx.headers?.authorization ??
      ctx.headers?.Authorization

    if (!header) {
      return ctx.json(
        { success: false, message: 'Missing Authorization header', error: 'MISSING_AUTH' },
        401,
      )
    }

    const parts = header.split(' ')
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      return ctx.json(
        {
          success: false,
          message: 'Invalid Authorization format, Bearer token required',
          error: 'INVALID_AUTH_FORMAT',
        },
        401,
      )
    }

    const rawKey = parts[1]
    const result = await this.authenticateApp.execute(rawKey)

    if (!result.success || !result.context) {
      return ctx.json(
        {
          success: false,
          message: result.message ?? '認證失敗',
          error: result.error ?? 'AUTH_FAILED',
        },
        401,
      )
    }

    ctx.set('appAuth', result.context)
    return next()
  }

  static getAppAuthContext(ctx: IHttpContext): AppAuthContext | null {
    return ctx.get<AppAuthContext>('appAuth') ?? null
  }

  static isAuthenticated(ctx: IHttpContext): boolean {
    return !!ctx.get<AppAuthContext>('appAuth')
  }
}
