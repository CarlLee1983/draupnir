/**
 * AuthController
 * HTTP adapter for the Auth module.
 *
 * Responsibilities:
 * - Read validated HTTP input
 * - Invoke application services
 * - Map results to HTTP responses
 */

import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { LoginUserService } from '../../Application/Services/LoginUserService'
import type { LogoutUserService } from '../../Application/Services/LogoutUserService'
import type { RefreshTokenService } from '../../Application/Services/RefreshTokenService'
import type { RegisterUserService } from '../../Application/Services/RegisterUserService'
import type { LoginParams, RefreshTokenParams, RegisterParams } from '../Requests'

/**
 * Controller handling authentication-related HTTP requests.
 */
export class AuthController {
  /**
   * Creates an instance of AuthController.
   */
  constructor(
    private registerUserService: RegisterUserService,
    private loginUserService: LoginUserService,
    private refreshTokenService: RefreshTokenService,
    private logoutUserService: LogoutUserService,
  ) {}

  /**
   * Handles user registration requests.
   * `POST /api/auth/register`
   */
  async register(ctx: IHttpContext): Promise<Response> {
    const body = ctx.get('validated') as RegisterParams
    const result = await this.registerUserService.execute(body)
    return ctx.json(result, result.success ? 201 : 400)
  }

  /**
   * Handles user sign-in requests.
   * `POST /api/auth/login`
   */
  async login(ctx: IHttpContext): Promise<Response> {
    const body = ctx.get('validated') as LoginParams
    const result = await this.loginUserService.execute(body)
    if (!result.success) return ctx.json(result, 401)
    return ctx.json(result)
  }

  /**
   * Handles access token refresh requests using a refresh token.
   * `POST /api/auth/refresh`
   */
  async refresh(ctx: IHttpContext): Promise<Response> {
    const body = ctx.get('validated') as RefreshTokenParams
    const result = await this.refreshTokenService.execute(body)
    if (!result.success) return ctx.json(result, 401)
    return ctx.json(result)
  }

  /**
   * Handles sign-out requests by revoking the current access token.
   * `POST /api/auth/logout`
   * Requires `Authorization: Bearer <token>`.
   */
  async logout(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.isAuthenticated(ctx)
    if (!auth) {
      return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
    }

    const authHeader = ctx.getHeader('authorization') ?? ctx.getHeader('Authorization')
    if (!authHeader) {
      return ctx.json({ success: false, message: 'Missing token', error: 'MISSING_TOKEN' }, 400)
    }

    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      return ctx.json(
        { success: false, message: 'Invalid Authorization header', error: 'INVALID_AUTH_HEADER' },
        400,
      )
    }
    const token = parts[1]

    const result = await this.logoutUserService.execute({ token })
    return ctx.json(result, result.success ? 200 : 400)
  }
}
