/**
 * RefreshTokenService
 * Exchanges a valid refresh token for a new access token.
 *
 * Responsibilities:
 * - Verify the refresh token
 * - Issue a new access token
 */

import type { IAuthRepository } from '../../Domain/Repositories/IAuthRepository'
import type { IAuthTokenRepository } from '../../Domain/Repositories/IAuthTokenRepository'
import { Email } from '../../Domain/ValueObjects/Email'
import type { IJwtTokenService, TokenSignPayload } from '../Ports/IJwtTokenService'
import { sha256 } from '../Utils/sha256'

/**
 * Request payload for refreshing an access token.
 */
export interface RefreshTokenRequest {
  /** The current valid refresh token. */
  refreshToken: string
}

/**
 * Response payload returned after a refresh-token attempt.
 */
export interface RefreshTokenResponse {
  /** Indicates if the operation was successful. */
  success: boolean
  /** Descriptive message about the result. */
  message: string
  /** Error code or message if the operation failed. */
  error?: string
  /** The new token data on success. */
  data?: {
    /** The newly issued JWT access token. */
    accessToken: string
    /** An optional new refresh token if rotation is enabled. */
    refreshToken?: string
    /** Time in seconds until the access token expires. */
    expiresIn: number
  }
}

/**
 * Service for handling token refresh logic.
 */
export class RefreshTokenService {
  /**
   * Creates an instance of RefreshTokenService.
   */
  constructor(
    private authRepository: IAuthRepository,
    private authTokenRepository: IAuthTokenRepository,
    private jwtService: IJwtTokenService,
  ) {}

  /**
   * Runs the refresh-token flow to exchange a refresh token for a new access token.
   */
  async execute(request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    try {
      const payload = this.jwtService.verify(request.refreshToken)
      if (!payload || payload.type !== 'refresh') {
        return {
          success: false,
          message: 'Invalid refresh token',
          error: 'INVALID_REFRESH_TOKEN',
        }
      }

      const tokenHash = await this.hashToken(request.refreshToken)
      const isRevoked = await this.authTokenRepository.isRevoked(tokenHash)
      if (isRevoked) {
        return {
          success: false,
          message: 'Refresh token has been revoked',
          error: 'TOKEN_REVOKED',
        }
      }

      const email = new Email(payload.email)
      const user = await this.authRepository.findByEmail(email)
      if (!user) {
        return {
          success: false,
          message: 'User not found',
          error: 'USER_NOT_FOUND',
        }
      }

      const tokenPayload: TokenSignPayload = {
        userId: user.id,
        email: user.emailValue,
        role: user.role.getValue(),
        permissions: [],
      }

      const newAccessToken = this.jwtService.signAccessToken(tokenPayload)
      const timeToExpire = newAccessToken.getExpiresAt().getTime() - Date.now()

      const newAccessTokenStr = newAccessToken.getValue()
      const newAccessTokenHash = await this.hashToken(newAccessTokenStr)
      await this.authTokenRepository.save({
        id: crypto.randomUUID(),
        userId: user.id,
        tokenHash: newAccessTokenHash,
        type: 'access',
        expiresAt: newAccessToken.getExpiresAt(),
        createdAt: new Date(),
      })

      // Close the race with a concurrent bulk revoke (e.g. RevokeAllSessionsService):
      // if the refresh token was revoked between the initial check and our save,
      // compensate by revoking the freshly-issued access token so the revoke-all promise holds.
      const revokedAfterSave = await this.authTokenRepository.isRevoked(tokenHash)
      if (revokedAfterSave) {
        await this.authTokenRepository.revoke(newAccessTokenHash)
        return {
          success: false,
          message: 'Refresh token has been revoked',
          error: 'TOKEN_REVOKED',
        }
      }

      return {
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: newAccessTokenStr,
          expiresIn: Math.floor(timeToExpire / 1000),
        },
      }
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Refresh token failed',
        error: error.message,
      }
    }
  }

  /**
   * Computes SHA-256 hash of the raw token.
   */
  private async hashToken(token: string): Promise<string> {
    return sha256(token)
  }
}
