import type { IAuthRepository } from '../../Domain/Repositories/IAuthRepository'
import type { IAuthTokenRepository } from '../../Domain/Repositories/IAuthTokenRepository'
import type { IPasswordResetRepository } from '../../Domain/Repositories/IPasswordResetRepository'
import { Email } from '../../Domain/ValueObjects/Email'
import type { IPasswordHasher } from '../Ports/IPasswordHasher'

export class ResetPasswordService {
  constructor(
    private readonly passwordResetRepository: IPasswordResetRepository,
    private readonly authRepository: IAuthRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenRepository: IAuthTokenRepository,
  ) {}

  async validateToken(token: string): Promise<{ valid: boolean }> {
    const record = await this.passwordResetRepository.findByToken(token)
    return { valid: record?.isValid() ?? false }
  }

  async execute(
    token: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string; error?: string }> {
    const record = await this.passwordResetRepository.findByToken(token)

    if (!record) {
      return { success: false, message: '重設連結無效', error: '重設連結無效或不存在' }
    }

    if (!record.isValid()) {
      const reason = record.used ? '已使用' : '過期'
      return { success: false, message: `重設連結已${reason}`, error: `重設連結已${reason}` }
    }

    const user = await this.authRepository.findByEmail(new Email(record.email))
    if (!user) {
      return { success: false, message: '使用者不存在', error: '使用者不存在' }
    }

    const hashedPassword = await this.passwordHasher.hash(newPassword)
    await this.authRepository.updatePassword(user.id, hashedPassword)
    await this.tokenRepository.revokeAllByUserId(user.id)
    await this.passwordResetRepository.markUsed(token)

    return { success: true, message: '密碼已成功重設' }
  }
}
