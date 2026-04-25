import type { Mailable } from '@gravito/signal'

/**
 * Represents an email message to be sent.
 */
export interface MailMessage {
  /** Recipient email address(es). */
  readonly to: string | readonly string[]
  /** Email subject line. */
  readonly subject: string
  /** HTML content of the email (optional if template is used). */
  readonly html?: string
  /** Template name to render. */
  readonly template?: string
  /** Data to pass to the template. */
  readonly data?: Record<string, unknown>
  /** Optional sender email address. Defaults to system configured sender. */
  readonly from?: string
  /** Optional file attachments. */
  readonly attachments?: Array<{
    /** Display filename. */
    filename: string
    /** Binary content of the attachment. */
    content: Buffer
  }>
}

/**
 * Port for sending email notifications.
 */
export interface IMailer {
  /**
   * Sends an email message.
   * @param message - The mail message payload or a Mailable instance
   * @returns A promise that resolves when the mail is sent
   */
  send(message: MailMessage | Mailable): Promise<void>
}
