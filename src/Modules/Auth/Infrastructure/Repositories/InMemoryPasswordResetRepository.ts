import type { IPasswordResetRepository } from '../../Domain/Repositories/IPasswordResetRepository'
import { PasswordResetToken } from '../../Domain/ValueObjects/PasswordResetToken'

export class InMemoryPasswordResetRepository implements IPasswordResetRepository {
  private readonly store = new Map<string, PasswordResetToken>()

  async create(email: string): Promise<PasswordResetToken> {
    const token = PasswordResetToken.create(email)
    this.store.set(token.token, token)
    return token
  }

  async findByToken(token: string): Promise<PasswordResetToken | null> {
    return this.store.get(token) ?? null
  }

  async markUsed(token: string): Promise<void> {
    const existing = this.store.get(token)
    if (existing) {
      this.store.set(token, existing.markUsed())
    }
  }
}
