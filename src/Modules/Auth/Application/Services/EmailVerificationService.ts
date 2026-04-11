import type { IEmailVerificationRepository } from '../../Domain/Repositories/IEmailVerificationRepository'

export class EmailVerificationService {
  constructor(private readonly emailVerificationRepository: IEmailVerificationRepository) {}

  async execute(
    token: string,
  ): Promise<{ success: boolean; message: string; redirectUrl?: string }> {
    const record = await this.emailVerificationRepository.findByToken(token)

    if (!record || !record.isValid()) {
      return { success: false, message: '驗證連結無效或已過期' }
    }

    await this.emailVerificationRepository.markUsed(token)

    return {
      success: true,
      message: '電子郵件驗證成功',
      redirectUrl: '/member/dashboard',
    }
  }
}
