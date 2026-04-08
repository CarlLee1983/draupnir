import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import type { IAuthTokenRepository } from '@/Modules/Auth/Domain/Repositories/IAuthTokenRepository'
import type { ChangeUserStatusRequest, UserProfileResponse } from '../DTOs/UserProfileDTO'

export class ChangeUserStatusService {
  constructor(
    private authRepository: IAuthRepository,
    private authTokenRepository: IAuthTokenRepository,
  ) {}

  async execute(userId: string, request: ChangeUserStatusRequest): Promise<UserProfileResponse> {
    try {
      const user = await this.authRepository.findById(userId)
      if (!user) {
        return { success: false, message: '找不到使用者', error: 'USER_NOT_FOUND' }
      }

      if (request.status === 'suspended') {
        user.suspend()
        // 停用時撤銷所有 Token
        await this.authTokenRepository.revokeAllByUserId(userId)
      } else {
        user.activate()
      }

      await this.authRepository.save(user)

      return {
        success: true,
        message: `帳戶已${request.status === 'suspended' ? '停用' : '啟用'}`,
        data: user.toDTO(),
      }
    } catch (error: any) {
      return { success: false, message: error.message || '操作失敗', error: error.message }
    }
  }
}
