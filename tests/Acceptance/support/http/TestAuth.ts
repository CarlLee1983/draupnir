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
}
