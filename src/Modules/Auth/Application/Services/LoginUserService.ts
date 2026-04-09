/**
 * LoginUserService
 * 應用層服務：負責用戶登入業務邏輯
 *
 * 責任：
 * - 查找用戶
 * - 驗證密碼
 * - 生成認證令牌
 */

import type { LoginRequest, LoginResponse } from '../DTOs/LoginDTO'
import type { IAuthRepository } from '../../Domain/Repositories/IAuthRepository'
import type { IAuthTokenRepository } from '../../Domain/Repositories/IAuthTokenRepository'
import { Email } from '../../Domain/ValueObjects/Email'
import { JwtTokenService } from './JwtTokenService'
import { createHash } from 'crypto'
import { ScryptPasswordHasher } from '../../Infrastructure/Services/PasswordHasher'

export class LoginUserService {
  constructor(
    private authRepository: IAuthRepository,
    private authTokenRepository: IAuthTokenRepository,
    private jwtTokenService: JwtTokenService = new JwtTokenService(),
    private passwordHasher: ScryptPasswordHasher = new ScryptPasswordHasher(),
  ) {}

  /**
   * 執行用戶登入
   */
  async execute(request: LoginRequest): Promise<LoginResponse> {
    try {
      // 1. 驗證輸入
      const validation = this.validateInput(request)
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.error || '驗證失敗',
          error: validation.error,
        }
      }

      // 2. 根據電子郵件查找用戶
      const email = new Email(request.email)
      const user = await this.authRepository.findByEmail(email)

      if (!user) {
        return {
          success: false,
          message: '電子郵件或密碼錯誤',
          error: 'INVALID_CREDENTIALS',
        }
      }

      // 3. 檢查用戶是否被暫停
      if (user.isSuspended()) {
        return {
          success: false,
          message: '此帳戶已被暫停',
          error: 'ACCOUNT_SUSPENDED',
        }
      }

      // 4. 驗證密碼
      const passwordMatches = await this.passwordHasher.verify(
        user.password.getHashed(),
        request.password,
      )
      if (!passwordMatches) {
        return {
          success: false,
          message: '電子郵件或密碼錯誤',
          error: 'INVALID_CREDENTIALS',
        }
      }

      // 5. 生成認證令牌
      const accessTokenObj = this.jwtTokenService.signAccessToken({
        userId: user.id,
        email: user.emailValue,
        role: user.role.getValue(),
        permissions: [], // 暫時空權限，可在應用中擴充
      })

      const refreshTokenObj = this.jwtTokenService.signRefreshToken({
        userId: user.id,
        email: user.emailValue,
        role: user.role.getValue(),
        permissions: [],
      })

      // 6. 保存 Token 到倉庫（用於撤銷追蹤）
      const accessTokenStr = accessTokenObj.getValue()
      const accessTokenHash = createHash('sha256').update(accessTokenStr).digest('hex')
      await this.authTokenRepository.save({
        id: `${user.id}_access_${Date.now()}`,
        userId: user.id,
        tokenHash: accessTokenHash,
        type: 'access',
        expiresAt: accessTokenObj.getExpiresAt(),
        createdAt: new Date(),
      })

      const refreshTokenStr = refreshTokenObj.getValue()
      const refreshTokenHash = createHash('sha256').update(refreshTokenStr).digest('hex')
      await this.authTokenRepository.save({
        id: `${user.id}_refresh_${Date.now()}`,
        userId: user.id,
        tokenHash: refreshTokenHash,
        type: 'refresh',
        expiresAt: refreshTokenObj.getExpiresAt(),
        createdAt: new Date(),
      })

      // 7. 返回成功回應
      return {
        success: true,
        message: '登入成功',
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
        message: error.message || '登入失敗',
        error: error.message,
      }
    }
  }

  /**
   * 驗證輸入資料
   */
  private validateInput(request: LoginRequest): {
    isValid: boolean
    error?: string
  } {
    if (!request.email || !request.email.trim()) {
      return { isValid: false, error: '電子郵件不能為空' }
    }

    if (!request.password || !request.password.trim()) {
      return { isValid: false, error: '密碼不能為空' }
    }

    return { isValid: true }
  }
}
