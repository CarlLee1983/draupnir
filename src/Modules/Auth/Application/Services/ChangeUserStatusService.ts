import type { IAuthRepository } from '../../Domain/Repositories/IAuthRepository'
import type { IAuthTokenRepository } from '../../Domain/Repositories/IAuthTokenRepository'
import type { ChangeUserStatusRequest, ChangeUserStatusResponse } from '../DTOs/UserStatusDTO'

/**
 * Service for modifying a user's account status (e.g., activating or suspending).
 */
export class ChangeUserStatusService {
  /**
   * Creates an instance of ChangeUserStatusService.
   */
  constructor(
    private authRepository: IAuthRepository,
    private authTokenRepository: IAuthTokenRepository,
  ) {}

  /**
   * Updates a user's status and revokes tokens if suspended.
   */
  async execute(
    userId: string,
    request: ChangeUserStatusRequest,
  ): Promise<ChangeUserStatusResponse> {
    try {
      const user = await this.authRepository.findById(userId)
      if (!user) {
        return { success: false, message: '找不到使用者', error: 'USER_NOT_FOUND' }
      }

      if (request.status === 'suspended') {
        user.suspend()
        await this.authTokenRepository.revokeAllByUserId(userId)
      } else {
        user.activate()
      }

      await this.authRepository.save(user)

      return {
        success: true,
        message: `帳戶已${request.status === 'suspended' ? '停用' : '啟用'}`,
        data: {
          id: user.id,
          email: user.emailValue,
          role: user.role.getValue(),
          status: user.status,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
      }
    } catch (error: any) {
      return { success: false, message: error.message || '操作失敗', error: error.message }
    }
  }
}
