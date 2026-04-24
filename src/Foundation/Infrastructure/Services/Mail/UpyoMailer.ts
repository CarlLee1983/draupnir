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
 *
 * @remarks
 * This implementation connects to an SMTP server using the provided URL
 * and uses the @upyo/smtp library for delivery.
 */
export class UpyoMailer implements IMailer {
  private readonly transport: SmtpTransport
  private readonly defaultFrom: string

  /**
   * Initializes the mailer with SMTP configuration.
   *
   * @param smtpUrl - The SMTP connection string (e.g., 'smtp://user:pass@host:port')
   */
  constructor(smtpUrl: string) {
    this.transport = new SmtpTransport(this.parseSmtpUrl(smtpUrl))
    this.defaultFrom = process.env.EMAIL_FROM ?? 'noreply@draupnir.local'
  }

  /**
   * Sends an email message via SMTP.
   *
   * @param message - The mail message payload
   * @returns A promise that resolves when the mail is delivered
   */
  async send(message: MailMessage): Promise<void> {
    await this.transport.send(
      createMessage({
        from: message.from ?? this.defaultFrom,
        to: message.to as string | string[],
        subject: message.subject,
        content: { html: message.html },
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
