import type { IMailer, MailMessage } from '../../Ports/IMailer'

/**
 * Development stub that logs email payloads instead of delivering them.
 *
 * @remarks
 * Use this in development or testing environments where real email delivery
 * is not required or desired.
 */
export class ConsoleMailer implements IMailer {
  /**
   * Logs the email message to the console.
   *
   * @param message - The mail message payload
   * @returns A promise that resolves immediately
   */
  async send(message: MailMessage): Promise<void> {
    const recipients = Array.isArray(message.to) ? message.to.join(', ') : message.to
    const preview = message.html.slice(0, 200)

    console.error(`[Mailer] To: ${recipients}, Subject: ${message.subject}`)
    console.error(`[Mailer] HTML: ${preview}`)

    if (message.attachments?.length) {
      console.error(
        `[Mailer] Attachments: ${message.attachments.map((a) => a.filename).join(', ')}`,
      )
    }
  }
}
