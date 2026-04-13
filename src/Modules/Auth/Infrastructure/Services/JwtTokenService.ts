/**
 * JwtTokenService
 * Issues and verifies JWT access and refresh tokens.
 *
 * Responsibilities:
 * - Sign access tokens (15 minutes)
 * - Sign refresh tokens (7 days)
 * - Verify token signature and expiry
 * - Decode token payloads
 */

import jwt from 'jsonwebtoken'
import type { IJwtTokenService, TokenSignPayload } from '../../Application/Ports/IJwtTokenService'
import { AuthToken, type TokenPayload, TokenType } from '../../Domain/ValueObjects/AuthToken'

/** Secret key used for signing JWTs. */
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
/** Access token expiration time in seconds (15 minutes). */
const ACCESS_TOKEN_EXPIRES_IN = 15 * 60
/** Refresh token expiration time in seconds (7 days). */
const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60

/**
 * Service for managing JSON Web Tokens (JWT).
 */
export class JwtTokenService implements IJwtTokenService {
  /**
   * Signs a new access token.
   */
  signAccessToken(payload: TokenSignPayload): AuthToken {
    const expiresAt = new Date(Date.now() + ACCESS_TOKEN_EXPIRES_IN * 1000)
    const tokenPayload: TokenPayload = {
      ...payload,
      jti: crypto.randomUUID(),
      type: TokenType.ACCESS,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000),
    }

    const token = jwt.sign(tokenPayload, JWT_SECRET)

    return new AuthToken(token, expiresAt, TokenType.ACCESS, tokenPayload)
  }

  /**
   * Signs a new refresh token.
   */
  signRefreshToken(payload: TokenSignPayload): AuthToken {
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_IN * 1000)
    const tokenPayload: TokenPayload = {
      ...payload,
      jti: crypto.randomUUID(),
      type: TokenType.REFRESH,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000),
    }

    const token = jwt.sign(tokenPayload, JWT_SECRET)

    return new AuthToken(token, expiresAt, TokenType.REFRESH, tokenPayload)
  }

  /**
   * Verifies a token's signature and expiration.
   */
  verify(token: string): TokenPayload | null {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as TokenPayload
      return payload
    } catch {
      return null
    }
  }

  /**
   * Decodes a token without verifying the signature.
   * Use this only when the signature has been verified or verification is not required.
   */
  decode(token: string): TokenPayload | null {
    try {
      const payload = jwt.decode(token) as TokenPayload
      return payload
    } catch {
      return null
    }
  }

  /**
   * Checks if a token is valid (signature is correct and not expired).
   */
  isValid(token: string): boolean {
    const payload = this.verify(token)
    if (!payload) {
      return false
    }
    return payload.exp > Math.floor(Date.now() / 1000)
  }

  /**
   * Calculates the remaining time until the token expires.
   */
  getTimeToExpire(token: string): number {
    const payload = this.decode(token)
    if (!payload) {
      return -1
    }
    const now = Math.floor(Date.now() / 1000)
    return Math.max(0, (payload.exp - now) * 1000)
  }

  /**
   * Checks if the token is close to expiring (less than 60 seconds remaining).
   */
  isAboutToExpire(token: string): boolean {
    return this.getTimeToExpire(token) < 60 * 1000
  }
}
