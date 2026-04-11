/**
 * PasswordResetToken value object.
 * Represents a one-time token for resetting a user's password.
 */
export class PasswordResetToken {
  private constructor(
    readonly token: string,
    readonly email: string,
    readonly expiresAt: Date,
    readonly used: boolean,
  ) {}

  /**
   * Creates a new password reset token valid for 1 hour.
   */
  static create(email: string): PasswordResetToken {
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
    return new PasswordResetToken(token, email, expiresAt, false)
  }

  /**
   * Reconstructs a token from persisted data.
   */
  static reconstruct(
    token: string,
    email: string,
    expiresAt: Date,
    used: boolean,
  ): PasswordResetToken {
    return new PasswordResetToken(token, email, expiresAt, used)
  }

  isExpired(): boolean {
    return Date.now() > this.expiresAt.getTime()
  }

  isValid(): boolean {
    return !this.used && !this.isExpired()
  }

  markUsed(): PasswordResetToken {
    return new PasswordResetToken(this.token, this.email, this.expiresAt, true)
  }
}
