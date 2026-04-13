import type { IMailer } from '../../../../Foundation/Infrastructure/Ports/IMailer'

export class SendReportEmailService {
  constructor(private readonly mailer: IMailer) {}

  async send(recipients: string[], pdfBuffer: Buffer, type: string): Promise<void> {
    const date = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    await this.mailer.send({
      to: recipients.join(', '),
      subject: `Draupnir Automated ${type.charAt(0).toUpperCase() + type.slice(1)} Report - ${date}`,
      html: `
        <p>Hello,</p>
        <p>Your scheduled ${type} cost and usage report from Draupnir is ready.</p>
        <p>Please find the attached PDF report for details.</p>
        <p>Best regards,<br>The Draupnir Team</p>
      `,
      attachments: [
        {
          filename: `Draupnir-Report-${type}-${new Date().toISOString().split('T')[0]}.pdf`,
          content: pdfBuffer,
        },
      ],
    })
  }
}
