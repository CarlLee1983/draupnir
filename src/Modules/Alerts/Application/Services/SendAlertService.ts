import type { IMailer } from '@/Foundation/Infrastructure/Ports/IMailer'
import type { IOrganizationMemberRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository'
import type { IOrganizationRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationRepository'
import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import type { IAlertEventRepository } from '../../Domain/Repositories/IAlertEventRepository'
import { AlertEvent } from '../../Domain/Entities/AlertEvent'
import {
  criticalAlertTemplate,
  warningAlertTemplate,
  type AlertEmailTemplateParams,
  type AlertKeyBreakdownItem,
} from '../../Infrastructure/Services/AlertEmailTemplates'

export interface SendAlertParams extends AlertEmailTemplateParams {
  readonly orgId: string
  readonly tier: 'warning' | 'critical'
}

/**
 * Dispatches alert emails to organization managers and records the alert event.
 */
export class SendAlertService {
  constructor(
    private readonly mailer: IMailer,
    private readonly orgMemberRepo: IOrganizationMemberRepository,
    private readonly orgRepo: IOrganizationRepository,
    private readonly authRepo: IAuthRepository,
    private readonly alertEventRepo: IAlertEventRepository,
  ) {}

  async send(params: SendAlertParams): Promise<void> {
    const org = await this.orgRepo.findById(params.orgId)
    const orgName = org?.name ?? 'Unknown'
    const members = await this.orgMemberRepo.findByOrgId(params.orgId)
    const managers = members.filter((member) => member.isManager())

    const emailSet = new Set<string>()
    for (const manager of managers) {
      const user = await this.authRepo.findById(manager.userId)
      const email = user?.emailValue?.trim()
      if (email) {
        emailSet.add(email)
      }
    }

    const recipients = [...emailSet]
    if (recipients.length === 0) {
      return
    }

    const html =
      params.tier === 'critical'
        ? criticalAlertTemplate({ ...params, orgName })
        : warningAlertTemplate({ ...params, orgName })

    await this.mailer.send({
      to: recipients,
      subject: `[Draupnir] ${params.tier === 'critical' ? 'CRITICAL' : 'Warning'}: Budget alert for ${orgName}`,
      html,
    })

    await this.alertEventRepo.save(
      AlertEvent.create({
        orgId: params.orgId,
        tier: params.tier,
        budgetUsd: params.budgetUsd,
        actualCostUsd: params.actualCostUsd,
        percentage: params.percentage,
        month: params.month,
        recipients,
      }),
    )
  }
}

export type { AlertKeyBreakdownItem }
