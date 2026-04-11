/**
 * LogoutUserService
 * Signs the user out by revoking tokens.
 *
 * Responsibilities:
 * - Revoke tokens (blacklist)
 * - End the user session for the given token
 */

import type { IAuthTokenRepository } from '../../Domain/Repositories/IAuthTokenRepository'

/**
 * Computes a SHA-256 hash of a string.
 */
async function sha256(str: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Request payload for the logout operation.
 */
export interface LogoutRequest {
  /** The raw JWT token to be revoked. */
  token: string
}

/**
 * Response payload returned after a logout attempt.
 */
export interface LogoutResponse {
  /** Indicates if the logout was successful. */
  success: boolean
  /** Descriptive message about the result. */
  message: string
  /** Error code or message if the operation failed. */
  error?: string
}

/**
 * Service responsible for revoking user authentication tokens.
 */
export class LogoutUserService {
  constructor(private authTokenRepository: IAuthTokenRepository) {}

  /**
   * Revokes a single authentication token.
   */
  async execute(request: LogoutRequest): Promise<LogoutResponse> {
    try {
      if (!request.token || request.token.trim() === '') {
        return {
          success: false,
          message: 'Token is required',
          error: 'INVALID_TOKEN',
        }
      }

      const tokenHash = await this.hashToken(request.token)

      const tokenRecord = await this.authTokenRepository.findByHash(tokenHash)
      if (!tokenRecord) {
        return {
          success: true,
          message: 'Logged out successfully',
        }
      }

      await this.authTokenRepository.revoke(tokenHash)

      return {
        success: true,
        message: 'Logged out successfully',
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Logout failed',
        error: error.message,
      }
    }
  }

  /**
   * Signs out all devices by revoking every token associated with a user.
   */
  async logoutAllDevices(userId: string): Promise<LogoutResponse> {
    try {
      await this.authTokenRepository.revokeAllByUserId(userId)

      return {
        success: true,
        message: 'Logged out from all devices',
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Logout failed',
        error: error.message,
      }
    }
  }

  /**
   * Computes SHA-256 hash of the raw token for secure storage/lookup.
   */
  private async hashToken(token: string): Promise<string> {
    return sha256(token)
  }
}
