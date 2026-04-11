export interface IEmailService {
  /** Sends a password reset link to the given email address. */
  sendPasswordReset(to: string, resetUrl: string): Promise<void>
  /** Sends an email verification link to the given email address. */
  sendEmailVerification(to: string, verifyUrl: string): Promise<void>
}
