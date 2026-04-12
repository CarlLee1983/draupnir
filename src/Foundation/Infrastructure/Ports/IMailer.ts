export interface MailMessage {
  readonly to: string | readonly string[]
  readonly subject: string
  readonly html: string
  readonly from?: string
}

export interface IMailer {
  send(message: MailMessage): Promise<void>
}
