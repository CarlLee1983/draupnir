/**
 * PasswordResetRepository
 * ORM-agnostic implementation of `IPasswordResetRepository`.
 *
 * Table `password_reset_tokens`: `id` holds the raw token string (same as VO `.token`)
 * so MemoryDatabaseAccess update/delete can match rows by `id`.
 */

import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IPasswordResetRepository } from '../../Domain/Repositories/IPasswordResetRepository'
import { PasswordResetToken } from '../../Domain/ValueObjects/PasswordResetToken'

export class PasswordResetRepository implements IPasswordResetRepository {
  private static readonly table = 'password_reset_tokens'

  constructor(private readonly db: IDatabaseAccess) {}

  async create(email: string): Promise<PasswordResetToken> {
    const token = PasswordResetToken.create(email)
    await this.db.table(PasswordResetRepository.table).insert({
      id: token.token,
      email: token.email,
      expires_at: token.expiresAt.toISOString(),
      used: token.used,
    })
    return token
  }

  async findByToken(token: string): Promise<PasswordResetToken | null> {
    const row = await this.db.table(PasswordResetRepository.table).where('id', '=', token).first()
    return row ? this.mapRow(row) : null
  }

  async markUsed(token: string): Promise<void> {
    await this.db.table(PasswordResetRepository.table).where('id', '=', token).update({
      used: true,
    })
  }

  private mapRow(row: Record<string, unknown>): PasswordResetToken {
    return PasswordResetToken.reconstruct(
      String(row.id),
      String(row.email),
      this.toDate(row.expires_at),
      this.mapUsed(row.used),
    )
  }

  private mapUsed(value: unknown): boolean {
    if (value === true || value === 1) return true
    if (value === false || value === 0) return false
    return Boolean(value)
  }

  private toDate(value: unknown): Date {
    return value instanceof Date ? new Date(value) : new Date(String(value))
  }
}
