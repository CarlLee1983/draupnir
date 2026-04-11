import type { PasswordResetToken } from '../ValueObjects/PasswordResetToken'

export interface IPasswordResetRepository {
  /** Creates and persists a new password reset token for the given email. */
  create(email: string): Promise<PasswordResetToken>
  /** Finds a token by its string value. Returns null if not found. */
  findByToken(token: string): Promise<PasswordResetToken | null>
  /** Marks a token as used (consumed). */
  markUsed(token: string): Promise<void>
}
