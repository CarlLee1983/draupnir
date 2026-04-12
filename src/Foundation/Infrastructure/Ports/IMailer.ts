export interface MailMessage {
  readonly to: string | readonly string[]
  readonly subject: string
  readonly html: string
  readonly from?: string
  readonly attachments?: Array<{ filename: string; content: Buffer }>
}

export interface IMailer {
  send(message: MailMessage): Promise<void>
}
