import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { sha256 } from '@/Modules/Auth/Application/Utils/sha256'
import type { IJwtTokenService } from '@/Modules/Auth/Application/Ports/IJwtTokenService'
import type { IAuthTokenRepository } from '@/Modules/Auth/Domain/Repositories/IAuthTokenRepository'
import { sha256 } from '@/Modules/Auth/Application/Utils/sha256'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'

export interface TokenForArgs {
  readonly userId: string
  readonly email: string
  readonly role: string
  readonly permissions?: readonly string[]
}

/**
 * Test helper for issuing JWTs against the booted container's JwtTokenService.
 * Bypasses the login endpoint to avoid coupling auth setup to user-table seeding.
 */
export class TestAuth {
  constructor(private readonly container: IContainer) {}

  tokenFor(args: TokenForArgs): string {
    const jwt = this.container.make('jwtTokenService') as IJwtTokenService
    const token = jwt.signAccessToken({
      userId: args.userId,
      email: args.email,
      role: args.role,
      permissions: [...(args.permissions ?? [])],
    })
    return token.getValue()
  }

  /**
   * Issues a JWT and persists it into `auth_tokens` so the real revocation
   * middleware can find (and accept) it. Returns the Authorization header.
   */
  async bearerHeaderFor(args: TokenForArgs): Promise<{ Authorization: string }> {
    const jwt = this.container.make('jwtTokenService') as IJwtTokenService
    const authToken = jwt.signAccessToken({
      userId: args.userId,
      email: args.email,
      role: args.role,
      permissions: [...(args.permissions ?? [])],
    })
    const raw = authToken.getValue()
    const tokenHash = await sha256(raw)
    const repo = this.container.make('authTokenRepository') as IAuthTokenRepository
    await repo.save({
      id: crypto.randomUUID(),
      userId: args.userId,
      tokenHash,
      type: 'access',
      expiresAt: authToken.getExpiresAt(),
      createdAt: new Date(),
    })
    return { Authorization: `Bearer ${raw}` }
  }

  async persistedBearerHeaderFor(args: TokenForArgs): Promise<{ Authorization: string }> {
    const token = this.tokenFor(args)
    const db = this.container.make('database') as IDatabaseAccess
    await db.table('auth_tokens').insert({
      id: crypto.randomUUID(),
      user_id: args.userId,
      token_hash: await sha256(token),
      type: 'access',
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      revoked_at: null,
      created_at: new Date().toISOString(),
    })
    return { Authorization: `Bearer ${token}` }
  }
}
