/**
 * LoginUserService
 * Application service: user sign-in use case.
 *
 * Responsibilities:
 * - Resolve user by email
 * - Verify password
 * - Issue auth tokens
 */

/**
 * LoginUserService
 * Application service: authenticates users and issues domain tokens.
 *
 * Responsibilities:
 * - Resolve user by email
 * - Verify password against stored hash
 * - Issue access and refresh tokens
 * - Persist token hashes for revocation tracking
 */

import type { IAuthRepository } from '../../Domain/Repositories/IAuthRepository'
import type { IAuthTokenRepository } from '../../Domain/Repositories/IAuthTokenRepository'
import { Email } from '../../Domain/ValueObjects/Email'
import type { IPasswordHasher } from '../Ports/IPasswordHasher'
import type { LoginRequest, LoginResponse } from '../DTOs/LoginDTO'
import type { IJwtTokenService } from '../Ports/IJwtTokenService'

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
 * Service responsible for authenticating users and issuing access/refresh tokens.
 */
export class LoginUserService {
  constructor(
    private authRepository: IAuthRepository,
    private authTokenRepository: IAuthTokenRepository,
    private jwtTokenService: IJwtTokenService,
    private passwordHasher: IPasswordHasher,
  ) {}

  /**
   * Executes the login workflow.
   */
  async execute(request: LoginRequest): Promise<LoginResponse> {
    try {
      // 1. Validate input
      const validation = this.validateInput(request)
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.error || 'Validation failed',
          error: validation.error,
        }
      }

      // 2. Find user by email
      const email = new Email(request.email)
      const user = await this.authRepository.findByEmail(email)

      if (!user) {
        return {
          success: false,
          message: 'Invalid email or password',
          error: 'INVALID_CREDENTIALS',
        }
      }

      // 3. Check if user is suspended
      if (user.isSuspended()) {
        return {
          success: false,
          message: 'This account has been suspended',
          error: 'ACCOUNT_SUSPENDED',
        }
      }

      // 4. Verify password
      const passwordMatches = await this.passwordHasher.verify(
        user.password.getHashed(),
        request.password,
      )
      if (!passwordMatches) {
        return {
          success: false,
          message: 'Invalid email or password',
          error: 'INVALID_CREDENTIALS',
        }
      }

      // 5. Generate authentication tokens
      const accessTokenObj = this.jwtTokenService.signAccessToken({
        userId: user.id,
        email: user.emailValue,
        role: user.role.getValue(),
        permissions: [],
      })

      const refreshTokenObj = this.jwtTokenService.signRefreshToken({
        userId: user.id,
        email: user.emailValue,
        role: user.role.getValue(),
        permissions: [],
      })

      // 6. Persist token hash (for revocation tracking)
      const accessTokenStr = accessTokenObj.getValue()
      const accessTokenHash = await sha256(accessTokenStr)
      await this.authTokenRepository.save({
        id: `${user.id}_access_${Date.now()}`,
        userId: user.id,
        tokenHash: accessTokenHash,
        type: 'access',
        expiresAt: accessTokenObj.getExpiresAt(),
        createdAt: new Date(),
      })

      const refreshTokenStr = refreshTokenObj.getValue()
      const refreshTokenHash = await sha256(refreshTokenStr)
      await this.authTokenRepository.save({
        id: `${user.id}_refresh_${Date.now()}`,
        userId: user.id,
        tokenHash: refreshTokenHash,
        type: 'refresh',
        expiresAt: refreshTokenObj.getExpiresAt(),
        createdAt: new Date(),
      })

      // 7. Return successful response
      return {
        success: true,
        message: 'Login successful',
        data: {
          accessToken: accessTokenStr,
          refreshToken: refreshTokenObj.getValue(),
          user: {
            id: user.id,
            email: user.emailValue,
            role: user.role.getValue(),
          },
        },
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Login failed',
        error: error.message,
      }
    }
  }

  /**
   * Performs basic validation on the login request.
   */
  private validateInput(request: LoginRequest): {
    isValid: boolean
    error?: string
  } {
    if (!request.email || !request.email.trim()) {
      return { isValid: false, error: 'Email is required' }
    }

    if (!request.password || !request.password.trim()) {
      return { isValid: false, error: 'Password is required' }
    }

    return { isValid: true }
  }
}

