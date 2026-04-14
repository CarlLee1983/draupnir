/**
 * PasswordResetRepository
 *
 * Infrastructure persistence for password-reset tokens (`IPasswordResetRepository`).
 * Uses `IDatabaseAccess` only—no ORM-specific types.
 *
 * Implementation note: table `password_reset_tokens` stores the raw secret in column `id`
 * (same value as `PasswordResetToken.token`) so in-memory and SQL backends can update or delete
 * rows by token string consistently.
 */

import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IPasswordResetRepository } from '../../Domain/Repositories/IPasswordResetRepository'
import { PasswordResetToken } from '../../Domain/ValueObjects/PasswordResetToken'

/**
 * Persists one-time tokens for the password reset flow: issue, lookup by secret from the reset
 * link, mark consumed after a successful password change.
 */
export class PasswordResetRepository implements IPasswordResetRepository {
  private static readonly table = 'password_reset_tokens'

  /**
   * @param db - Database access bound to the app connection (or in-memory store for tests).
   */
  constructor(private readonly db: IDatabaseAccess) {}

  /**
   * Creates a new reset token, inserts a row, and returns the value object (caller emails the
   * secret out-of-band).
   *
   * @param email - Account identifier requesting a reset (may or may not exist; caller policy).
   * @returns Fresh token with expiry; not yet marked used.
   */
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

  /**
   * Loads a token row by the raw secret string (`id` column).
   *
   * @param token - Plain token from the reset link.
   * @returns Rehydrated VO, or `null` if unknown or never issued.
   */
  async findByToken(token: string): Promise<PasswordResetToken | null> {
    const row = await this.db.table(PasswordResetRepository.table).where('id', '=', token).first()
    return row ? this.mapRow(row) : null
  }

  /**
   * Idempotent-friendly: sets `used` on the matching row; no-op if the token does not exist.
   *
   * @param token - Raw token string (`id` column).
   */
  async markUsed(token: string): Promise<void> {
    await this.db.table(PasswordResetRepository.table).where('id', '=', token).update({
      used: true,
    })
  }

  /** Maps a table row to `PasswordResetToken.reconstruct` (coerces driver-specific scalars). */
  private mapRow(row: Record<string, unknown>): PasswordResetToken {
    return PasswordResetToken.reconstruct(
      String(row.id),
      String(row.email),
      this.toDate(row.expires_at),
      this.mapUsed(row.used),
    )
  }

  /** Normalizes boolean columns that may arrive as `0`/`1` from SQL or boolean in memory. */
  private mapUsed(value: unknown): boolean {
    if (value === true || value === 1) return true
    if (value === false || value === 0) return false
    return Boolean(value)
  }

  /** Parses `expires_at` whether the driver returns `Date` or ISO string. */
  private toDate(value: unknown): Date {
    return value instanceof Date ? new Date(value) : new Date(String(value))
  }
}
