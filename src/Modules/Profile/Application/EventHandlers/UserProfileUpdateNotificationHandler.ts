import type { UserProfileUpdated } from '../../Domain/Events/UserProfileUpdated'
import type { IMailer } from '@/Foundation/Infrastructure/Ports/IMailer'

/**
 * UserProfileUpdateNotificationHandler
 * Responsible for notifying the user when sensitive profile information changes.
 */
export class UserProfileUpdateNotificationHandler {
  constructor(private readonly mailer: IMailer) {}

  async execute(event: UserProfileUpdated): Promise<void> {
    const { fields, payload } = event

    // Only send email if sensitive fields like 'displayName' or 'email' (if it existed) changed
    const sensitiveFields = ['displayName', 'phone']
    const hasSensitiveChange = fields.some((f) => sensitiveFields.includes(f))

    if (hasSensitiveChange) {
      // REAL-WORLD: Fetch user email from database or identity service
      // For now, we simulate sending to a placeholder
      await this.mailer.send({
        to: 'user@example.com',
        subject: 'Your Profile was Updated',
        html: `<p>The following fields were updated: ${fields.join(', ')}.</p><p>New values: ${JSON.stringify(payload)}</p>`,
      })
    }
  }
}
