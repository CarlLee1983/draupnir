import { Mailable } from '@gravito/signal'
import { createMessage } from '@upyo/core'
import { SmtpTransport } from '@upyo/smtp'
import type { IMailer, MailMessage } from '../../Ports/IMailer'

interface SmtpUrlConfig {
  readonly host: string
  readonly port: number
  readonly secure: boolean
  readonly auth?: {
    readonly user: string
    readonly pass: string
  }
}

/**
 * Production-ready mailer built on Upyo's SMTP transport.
 */
export class UpyoMailer implements IMailer {
  private readonly transport: SmtpTransport
  private readonly defaultFrom: string

  /**
   * Initializes the mailer with SMTP configuration.
   */
  constructor(smtpUrl: string) {
    this.transport = new SmtpTransport(this.parseSmtpUrl(smtpUrl))
    this.defaultFrom = process.env.EMAIL_FROM ?? 'noreply@draupnir.local'
  }

  /**
   * Sends an email message via SMTP.
   */
  async send(message: MailMessage | Mailable): Promise<void> {
    if (message instanceof Mailable) {
      const envelope = await message.buildEnvelope({} as any)
      const { html } = await message.renderContent()
      
      const addresses = (Array.isArray(envelope.to) ? envelope.to : [envelope.to]).filter(Boolean)
      const to = addresses.map(a => typeof a === 'string' ? a : (a as any).address)

      await this.transport.send(
        createMessage({
          from: envelope.from?.address ?? this.defaultFrom,
          to: to.length === 1 ? to[0] : to,
          subject: envelope.subject ?? '',
          content: { html },
        }),
      )
      return
    }

    if (message.template) {
      throw new Error('UpyoMailer does not support templates directly. Use SignalMailer instead.')
    }

    await this.transport.send(
      createMessage({
        from: message.from ?? this.defaultFrom,
        to: message.to as string | string[],
        subject: message.subject,
        content: { html: message.html ?? '' },
        attachments: message.attachments?.map(
          (a) => new File([a.content], a.filename, { type: 'application/pdf' }),
        ),
      }),
    )
  }

  /**
   * Parses the SMTP URL into a structured configuration object.
   *
   * @param smtpUrl - The raw SMTP connection string
   * @returns The parsed SMTP configuration
   * @throws Error if the URL is invalid or the port is missing
   */
  private parseSmtpUrl(smtpUrl: string): SmtpUrlConfig {
    const url = new URL(smtpUrl)
    const secure = url.protocol === 'smtps:' || url.port === '465'
    const port = url.port ? Number(url.port) : secure ? 465 : 587

    if (Number.isNaN(port) || port <= 0) {
      throw new Error(`Invalid SMTP URL: ${smtpUrl}`)
    }

    const username = url.username ? decodeURIComponent(url.username) : ''
    const password = url.password ? decodeURIComponent(url.password) : ''

    return {
      host: url.hostname,
      port,
      secure,
      ...(username || password
        ? {
            auth: {
              user: username,
              pass: password,
            },
          }
        : {}),
    }
  }
}
