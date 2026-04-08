/**
 * RegisterUserService
 * 應用層服務：負責用戶註冊業務邏輯
 *
 * 責任：
 * - 驗證輸入
 * - 檢查電子郵件是否已存在
 * - 創建新用戶聚合根
 * - 持久化到資料庫
 */

import { v4 as uuidv4 } from 'uuid'
import type { RegisterUserRequest, RegisterUserResponse } from '../DTOs/RegisterUserDTO'
import type { IAuthRepository } from '../../Domain/Repositories/IAuthRepository'
import type { IUserProfileRepository } from '@/Modules/User/Domain/Repositories/IUserProfileRepository'
import { Email } from '../../Domain/ValueObjects/Email'
import { User } from '../../Domain/Aggregates/User'
import { UserProfile } from '@/Modules/User/Domain/Aggregates/UserProfile'

export class RegisterUserService {
  constructor(
    private authRepository: IAuthRepository,
    private userProfileRepository: IUserProfileRepository,
  ) {}

  /**
   * 執行用戶註冊
   */
  async execute(request: RegisterUserRequest): Promise<RegisterUserResponse> {
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

      // 2. 建立 Email 值物件（如果格式無效會拋出例外）
      const email = new Email(request.email)

      // 3. 檢查電子郵件是否已存在
      const emailExists = await this.authRepository.emailExists(email)
      if (emailExists) {
        return {
          success: false,
          message: '此電子郵件已被註冊',
          error: 'EMAIL_ALREADY_EXISTS',
        }
      }

      // 4. 創建新用戶（密碼會被加密）
      const userId = uuidv4()
      const user = await User.create(userId, email, request.password)

      // 5. 保存到資料庫
      await this.authRepository.save(user)

      // 6. 建立 User Profile（原子性保證）
      try {
        const profile = UserProfile.createDefault(user.id, request.email)
        await this.userProfileRepository.save(profile)
      } catch (profileError) {
        // Profile 建立失敗 → 回滾 auth user
        await this.authRepository.delete(user.id)
        throw profileError
      }

      // 7. 返回成功回應（不包含密碼）
      return {
        success: true,
        message: '用戶註冊成功',
        data: {
          id: user.id,
          email: user.emailValue,
          role: user.role,
        },
      }
    } catch (error: any) {
      // 捕捉密碼強度驗證或其他錯誤
      return {
        success: false,
        message: error.message || '註冊失敗',
        error: error.message,
      }
    }
  }

  /**
   * 驗證輸入資料
   */
  private validateInput(request: RegisterUserRequest): {
    isValid: boolean
    error?: string
  } {
    if (!request.email || !request.email.trim()) {
      return { isValid: false, error: '電子郵件不能為空' }
    }

    if (!request.password || !request.password.trim()) {
      return { isValid: false, error: '密碼不能為空' }
    }

    if (request.password.length < 8) {
      return { isValid: false, error: '密碼至少需要 8 個字符' }
    }

    if (request.confirmPassword && request.password !== request.confirmPassword) {
      return { isValid: false, error: '密碼不匹配' }
    }

    return { isValid: true }
  }
}
