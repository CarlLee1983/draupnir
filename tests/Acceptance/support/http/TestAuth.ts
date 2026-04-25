import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { sha256 } from '@/Modules/Auth/Application/Utils/sha256'
import type { IJwtTokenService } from '@/Modules/Auth/Application/Ports/IJwtTokenService'
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

  bearerHeaderFor(args: TokenForArgs): { Authorization: string } {
    return { Authorization: `Bearer ${this.tokenFor(args)}` }
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
