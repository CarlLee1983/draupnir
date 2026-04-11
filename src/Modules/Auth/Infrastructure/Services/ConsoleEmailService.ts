import type { IEmailService } from '../../Application/Ports/IEmailService'

/**
 * Development stub: logs email content to console instead of sending.
 * Replace with a real email provider (Resend, SendGrid) in production.
 */
export class ConsoleEmailService implements IEmailService {
  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    console.log(`[Email] Password Reset → ${to}`)
    console.log(`[Email] Reset URL: ${resetUrl}`)
  }

  async sendEmailVerification(to: string, verifyUrl: string): Promise<void> {
    console.log(`[Email] Email Verification → ${to}`)
    console.log(`[Email] Verify URL: ${verifyUrl}`)
  }
}
