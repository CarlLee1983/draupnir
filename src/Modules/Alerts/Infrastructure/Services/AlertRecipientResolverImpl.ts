import type { IOrganizationRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationRepository'
import type { IOrganizationMemberRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository'
import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import type { IAlertRecipientResolver, AlertRecipientContext } from '../../Domain/Services/IAlertRecipientResolver'

/**
 * AlertRecipientResolverImpl
 *
 * Infrastructure implementation of IAlertRecipientResolver (D-06).
 * Composes three cross-module Domain Repository ports internally:
 *   - IOrganizationRepository  → org name
 *   - IOrganizationMemberRepository → manager members
 *   - IAuthRepository → user email addresses
 *
 * This class is the single injection point for cross-module dependencies;
 * Application services only see the Alerts-owned IAlertRecipientResolver port.
 */
export class AlertRecipientResolverImpl implements IAlertRecipientResolver {
  constructor(
    private readonly deps: {
      readonly orgRepo: IOrganizationRepository
      readonly orgMemberRepo: IOrganizationMemberRepository
      readonly authRepo: IAuthRepository
    },
  ) {}

  async resolveByOrg(orgId: string): Promise<AlertRecipientContext> {
    const org = await this.deps.orgRepo.findById(orgId)
    const members = await this.deps.orgMemberRepo.findByOrgId(orgId)
    const managers = members.filter((m) => m.isManager())

    const emailSet = new Set<string>()
    for (const manager of managers) {
      const user = await this.deps.authRepo.findById(manager.userId)
      const email = user?.emailValue?.trim()
      if (email) {
        emailSet.add(email)
      }
    }

    return {
      orgId,
      orgName: org?.name ?? 'Unknown',
      emails: [...emailSet],
    }
  }
}
