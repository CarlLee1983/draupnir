/**
 * EmailVerificationRepository
 *
 * Infrastructure persistence for email verification tokens (`IEmailVerificationRepository`).
 * Uses `IDatabaseAccess` only—no ORM-specific types.
 *
 * Implementation note: table `email_verification_tokens` stores the raw secret in column `id`
 * (same value as `EmailVerificationToken.token`) so in-memory and SQL backends can update or
 * delete rows by token string consistently.
 */

import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IEmailVerificationRepository } from '../../Domain/Repositories/IEmailVerificationRepository'
import { EmailVerificationToken } from '../../Domain/ValueObjects/EmailVerificationToken'

/**
 * Persists verification tokens for the “confirm email” flow: create, lookup by secret, mark consumed.
 */
export class EmailVerificationRepository implements IEmailVerificationRepository {
  private static readonly table = 'email_verification_tokens'

  /**
   * @param db - Database access bound to the app connection (or in-memory store for tests).
   */
  constructor(private readonly db: IDatabaseAccess) {}

  /**
   * Generates a new token, inserts a row, and returns the value object (caller sends the secret
   * out-of-band, e.g. email link).
   *
   * @param email - Address the user must verify.
   * @returns Fresh token with expiry; not yet marked used.
   */
  async create(email: string): Promise<EmailVerificationToken> {
    const token = EmailVerificationToken.create(email)
    await this.db.table(EmailVerificationRepository.table).insert({
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
   * @param token - Plain token from the verification link.
   * @returns Rehydrated VO, or `null` if unknown or never issued.
   */
  async findByToken(token: string): Promise<EmailVerificationToken | null> {
    const row = await this.db
      .table(EmailVerificationRepository.table)
      .where('id', '=', token)
      .first()
    return row ? this.mapRow(row) : null
  }

  /**
   * Idempotent-friendly: sets `used` on the matching row; no-op if the token does not exist.
   *
   * @param token - Raw token string (`id` column).
   */
  async markUsed(token: string): Promise<void> {
    await this.db.table(EmailVerificationRepository.table).where('id', '=', token).update({
      used: true,
    })
  }

  /** Maps a table row to `EmailVerificationToken.reconstruct` (coerces driver-specific scalars). */
  private mapRow(row: Record<string, unknown>): EmailVerificationToken {
    return EmailVerificationToken.reconstruct(
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
