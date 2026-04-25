import { Mailable } from '@gravito/signal'
import type { IMailer, MailMessage } from '../../Ports/IMailer'

/**
 * Development stub that logs email payloads instead of delivering them.
 */
export class ConsoleMailer implements IMailer {
  /**
   * Logs the email message to the console.
   */
  async send(message: MailMessage | Mailable): Promise<void> {
    if (message instanceof Mailable) {
      const envelope = await message.buildEnvelope({} as any)
      const { html } = await message.renderContent()
      
      console.error(`[Mailer:Mailable] To: ${envelope.to}, Subject: ${envelope.subject}`)
      console.error(`[Mailer:Mailable] HTML: ${html.slice(0, 200)}...`)
      return
    }

    const recipients = Array.isArray(message.to) ? message.to.join(', ') : message.to
    const preview = (message.html ?? (message.template ? `[Template: ${message.template}]` : '')).slice(0, 200)

    console.error(`[Mailer] To: ${recipients}, Subject: ${message.subject}`)
    console.error(`[Mailer] Content: ${preview}`)

    if (message.attachments?.length) {
      console.error(
        `[Mailer] Attachments: ${message.attachments.map((a) => a.filename).join(', ')}`,
      )
    }
  }
}
