import type { AuthToken, TokenPayload } from '../../Domain/ValueObjects/AuthToken'

/**
 * Payload data used to sign a new token.
 */
export interface TokenSignPayload {
  /** Unique identifier of the user. */
  userId: string
  /** User's email address. */
  email: string
  /** User's assigned role. */
  role: string
  /** List of permissions assigned to the user. */
  permissions: string[]
}

/**
 * Port interface for JWT token management.
 * Application layer depends on this abstraction; Infrastructure provides the concrete implementation.
 */
export interface IJwtTokenService {
  signAccessToken(payload: TokenSignPayload): AuthToken
  signRefreshToken(payload: TokenSignPayload): AuthToken
  verify(token: string): TokenPayload | null
  decode(token: string): TokenPayload | null
  isValid(token: string): boolean
  getTimeToExpire(token: string): number
  isAboutToExpire(token: string): boolean
}
