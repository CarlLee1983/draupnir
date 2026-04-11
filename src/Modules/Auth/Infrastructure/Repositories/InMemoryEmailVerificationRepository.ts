import type { IEmailVerificationRepository } from '../../Domain/Repositories/IEmailVerificationRepository'
import { EmailVerificationToken } from '../../Domain/ValueObjects/EmailVerificationToken'

export class InMemoryEmailVerificationRepository implements IEmailVerificationRepository {
  private readonly store = new Map<string, EmailVerificationToken>()

  async create(email: string): Promise<EmailVerificationToken> {
    const token = EmailVerificationToken.create(email)
    this.store.set(token.token, token)
    return token
  }

  async findByToken(token: string): Promise<EmailVerificationToken | null> {
    return this.store.get(token) ?? null
  }

  async markUsed(token: string): Promise<void> {
    const existing = this.store.get(token)
    if (existing) {
      this.store.set(token, existing.markUsed())
    }
  }
}
