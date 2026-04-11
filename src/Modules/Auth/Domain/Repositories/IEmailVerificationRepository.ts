import type { EmailVerificationToken } from '../ValueObjects/EmailVerificationToken'

export interface IEmailVerificationRepository {
  create(email: string): Promise<EmailVerificationToken>
  findByToken(token: string): Promise<EmailVerificationToken | null>
  markUsed(token: string): Promise<void>
}
