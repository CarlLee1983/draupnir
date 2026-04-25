/**
 * AuthMiddleware - Token Authentication Middleware
 *
 * Responsibilities:
 * - Extract Token from Header (Bearer scheme)
 * - Verify Token
 * - Inject user context into HttpContext
 * - Allow unauthenticated requests to pass (401 response is decided by the Controller)
 */

import type { IJwtTokenService } from '@/Modules/Auth/Application/Ports/IJwtTokenService'
import type { IAuthTokenRepository } from '@/Modules/Auth/Domain/Repositories/IAuthTokenRepository'
import { JwtTokenService } from '@/Modules/Auth/Infrastructure/Services/JwtTokenService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

async function sha256(str: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export interface AuthContext {
  userId: string
  email: string
  role: string
  permissions: string[]
  tokenType: string
}

/**
 * Reads the raw JWT string from `Authorization: Bearer` or the `auth_token` cookie.
 * Shared by session listing and logout handlers so extraction matches middleware.
 */
export function extractRawAuthToken(ctx: IHttpContext): string | null {
  const header =
    ctx.getHeader('authorization') ??
    ctx.getHeader('Authorization') ??
    (ctx.headers as Record<string, string | undefined>)?.authorization ??
    (ctx.headers as Record<string, string | undefined>)?.Authorization
  if (header) {
    const parts = header.split(' ')
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      return parts[1]
    }
  }

  return ctx.getCookie('auth_token') ?? null
}

export class AuthMiddleware {
  private jwtService: IJwtTokenService

  constructor(
    private authTokenRepository?: IAuthTokenRepository,
    jwtService?: IJwtTokenService,
  ) {
    this.jwtService = jwtService ?? new JwtTokenService()
  }

  /**
   * Handles the request verification process.
   *
   * Idempotent: once JWT parsing has been attempted on this request context
   * (tracked via the `jwtParsed` marker), the entire flow — including the
   * `auth_tokens` DB look-up — is skipped on any subsequent invocation.
   * This covers both the success path (auth set) and failure paths
   * (expired, revoked, or malformed token) so the Atlas N+1 detector is
   * not triggered by either case.
   *
   * @param ctx - The HTTP context.
   * @returns A promise that resolves when verification is complete.
   */
  async handle(ctx: IHttpContext): Promise<void> {
    // Idempotency guard: skip if JWT parsing was already attempted this request.
    if (AuthMiddleware.hasParsed(ctx)) {
      return
    }
    // Mark before any DB work so re-entrant calls always exit early.
    AuthMiddleware.markParsed(ctx)

    try {
      // 1. Extract Token from Header
      const token = this.extractToken(ctx)
      if (!token) {
        // No Token, continue processing (could be a public endpoint)
        return
      }

      // 2. Verify Token
      const payload = this.jwtService.verify(token)
      if (!payload) {
        // Invalid Token, set error message but do not short-circuit
        ctx.set('authError', 'INVALID_TOKEN')
        return
      }

      // 3. Check if Token is revoked (if Repository is provided)
      if (this.authTokenRepository) {
        const tokenHash = await this.hashToken(token)
        const isRevoked = await this.authTokenRepository.isRevoked(tokenHash)
        if (isRevoked) {
          ctx.set('authError', 'TOKEN_REVOKED')
          return
        }
      }

      // 4. Inject User Context into HttpContext
      const authContext: AuthContext = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        permissions: payload.permissions,
        tokenType: payload.type,
      }

      ctx.set('auth', authContext)
      ctx.set('user', {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
      })
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    } catch (error: any) {
      // Middlewares should not throw exceptions; set status only
      ctx.set('authError', error.message)
    }
  }

  /**
   * Extracts Token from Header.
   * Expected format: Authorization: Bearer <token>
   *
   * @param ctx - The HTTP context.
   * @returns The raw token string or null.
   */
  private extractToken(ctx: IHttpContext): string | null {
    return extractRawAuthToken(ctx)
  }

  /**
   * Checks if the user is authenticated in the current request context.
   *
   * @param ctx - The HTTP context.
   * @returns True if 'auth' context is present.
   */
  static isAuthenticated(ctx: IHttpContext): boolean {
    return !!ctx.get<AuthContext>('auth')
  }

  /**
   * Retrieves the authentication context from the request.
   *
   * @param ctx - The HTTP context.
   * @returns The AuthContext or null.
   */
  static getAuthContext(ctx: IHttpContext): AuthContext | null {
    return ctx.get<AuthContext>('auth') || null
  }

  /**
   * Retrieves the authentication error message if verification failed.
   *
   * @param ctx - The HTTP context.
   * @returns The error code/message or null.
   */
  static getAuthError(ctx: IHttpContext): string | null {
    return ctx.get<string>('authError') || null
  }

  /**
   * Returns true if JWT parsing has already been attempted on this request,
   * regardless of whether authentication succeeded.
   *
   * @param ctx - The HTTP context.
   * @returns True if already parsed.
   */
  static hasParsed(ctx: IHttpContext): boolean {
    return ctx.get<boolean>('jwtParsed') === true
  }

  /**
   * Marks this request context as having undergone JWT parsing.
   * Called at the very start of handle() before any DB work.
   *
   * @param ctx - The HTTP context.
   */
  static markParsed(ctx: IHttpContext): void {
    ctx.set('jwtParsed', true)
  }

  /**
   * Calculates Token Hash for revocation checks.
   *
   * @param token - The raw JWT token.
   * @returns The SHA-256 hash of the token.
   */
  private async hashToken(token: string): Promise<string> {
    return sha256(token)
  }
}
