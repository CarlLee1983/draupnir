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
        return { success: false, message: 'User not found', error: 'USER_NOT_FOUND' }
      }

      const updated = request.status === 'suspended' ? user.suspend() : user.activate()

      if (request.status === 'suspended') {
        await this.authTokenRepository.revokeAllByUserId(userId)
      }

      await this.authRepository.save(updated)

      return {
        success: true,
        message: `Account ${request.status === 'suspended' ? 'suspended' : 'activated'} successfully`,
        data: {
          id: updated.id,
          email: updated.emailValue,
          role: updated.role.getValue(),
          status: updated.status,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
      }
    } catch (error: any) {
      return { success: false, message: error.message || 'Operation failed', error: error.message }
    }
  }
}
