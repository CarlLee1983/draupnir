import { Mailable, OrbitSignal } from '@gravito/signal'
import type { IMailer, MailMessage } from '../../Ports/IMailer'

/**
 * SignalMailer adapter that wraps OrbitSignal from @gravito/signal.
 * 
 * This adapter provides a unified interface for sending emails using either
 * structured MailMessage objects (with template support) or dedicated
 * Mailable classes.
 */
export class SignalMailer implements IMailer {
  constructor(private readonly orbit: OrbitSignal) {}

  /**
   * Sends an email message.
   * 
   * @param message - The mail message payload or a Mailable instance
   */
  async send(message: MailMessage | Mailable): Promise<void> {
    if (message instanceof Mailable) {
      await this.orbit.send(message)
      return
    }

    // Convert MailMessage to a generic Mailable
    const mailable = new GenericMailable(message)
    await this.orbit.send(mailable)
  }
}

/**
 * A generic Mailable implementation for ad-hoc MailMessage objects.
 */
class GenericMailable extends Mailable {
  constructor(private readonly message: MailMessage) {
    super()
  }

  build(): this {
    this.to(this.message.to as any)
      .subject(this.message.subject)

    if (this.message.from) {
      this.from(this.message.from)
    }

    if (this.message.template) {
      this.view(this.message.template, this.message.data ?? {})
    } else if (this.message.html) {
      this.html(this.message.html)
    }

    if (this.message.attachments) {
      for (const attachment of this.message.attachments) {
        this.attach({
          filename: attachment.filename,
          content: attachment.content,
        })
      }
    }

    return this
  }
}
