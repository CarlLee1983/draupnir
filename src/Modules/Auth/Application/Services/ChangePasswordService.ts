import type { IAuthRepository } from '../../Domain/Repositories/IAuthRepository'
import type { IAuthTokenRepository } from '../../Domain/Repositories/IAuthTokenRepository'
import type { IPasswordHasher } from '../Ports/IPasswordHasher'

export type ChangePasswordResult =
  | { success: true; message: string }
  | { success: false; message: string; error: string }

/**
 * Changes password for a logged-in user after verifying the current password.
 * Revokes all tokens so the user must sign in again (same posture as reset-password flow).
 */
export class ChangePasswordService {
  constructor(
    private readonly authRepository: IAuthRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly authTokenRepository: IAuthTokenRepository,
  ) {}

  async execute(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<ChangePasswordResult> {
    const user = await this.authRepository.findById(userId)
    if (!user) {
      return { success: false, message: '使用者不存在', error: 'USER_NOT_FOUND' }
    }

    const ok = await this.passwordHasher.verify(user.password.getHashed(), currentPassword)
    if (!ok) {
      return { success: false, message: '目前密碼不正確', error: 'INVALID_CURRENT_PASSWORD' }
    }

    const hashed = await this.passwordHasher.hash(newPassword)
    const updated = user.withPassword(hashed)
    await this.authRepository.save(updated)
    await this.authTokenRepository.revokeAllByUserId(user.id)

    return { success: true, message: '密碼已更新' }
  }
}
