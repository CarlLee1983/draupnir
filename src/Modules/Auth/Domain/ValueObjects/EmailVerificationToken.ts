/**
 * EmailVerificationToken value object.
 * Represents a one-time token for verifying a user's email address.
 */
export class EmailVerificationToken {
  private constructor(
    readonly token: string,
    readonly email: string,
    readonly expiresAt: Date,
    readonly used: boolean,
  ) {}

  static create(email: string): EmailVerificationToken {
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    return new EmailVerificationToken(token, email, expiresAt, false)
  }

  static reconstruct(
    token: string,
    email: string,
    expiresAt: Date,
    used: boolean,
  ): EmailVerificationToken {
    return new EmailVerificationToken(token, email, expiresAt, used)
  }

  isExpired(): boolean {
    return Date.now() > this.expiresAt.getTime()
  }

  isValid(): boolean {
    return !this.used && !this.isExpired()
  }

  markUsed(): EmailVerificationToken {
    return new EmailVerificationToken(this.token, this.email, this.expiresAt, true)
  }
}
