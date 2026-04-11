import { Email } from '../../Domain/ValueObjects/Email'
import type { IAuthRepository } from '../../Domain/Repositories/IAuthRepository'
import type { IPasswordResetRepository } from '../../Domain/Repositories/IPasswordResetRepository'
import type { IEmailService } from '../Ports/IEmailService'

export class ForgotPasswordService {
  constructor(
    private readonly authRepository: IAuthRepository,
    private readonly passwordResetRepository: IPasswordResetRepository,
    private readonly emailService: IEmailService,
    private readonly baseUrl: string,
  ) {}

  async execute(emailStr: string): Promise<{ success: boolean; message: string }> {
    const message = '若此 email 存在，重設連結已寄出'

    try {
      const email = new Email(emailStr)
      const user = await this.authRepository.findByEmail(email)

      if (!user) {
        return { success: true, message }
      }

      const token = await this.passwordResetRepository.create(emailStr)
      const resetUrl = `${this.baseUrl}/reset-password/${token.token}`
      await this.emailService.sendPasswordReset(emailStr, resetUrl)

      return { success: true, message }
    } catch {
      return { success: true, message }
    }
  }
}
