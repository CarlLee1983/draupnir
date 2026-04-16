import type { IOrganizationMemberRepository } from '../../Domain/Repositories/IOrganizationMemberRepository'

/**
 * Application Service: resolves the organization a user belongs to.
 *
 * Thin façade over `IOrganizationMemberRepository.findByUserId` so that
 * the Presentation layer never depends directly on the Domain repository port.
 */
export class GetUserMembershipService {
  constructor(private readonly memberRepo: IOrganizationMemberRepository) {}

  /**
   * Returns the user's organization ID, or `null` if they have no membership.
   */
  async execute(userId: string): Promise<{ orgId: string } | null> {
    const membership = await this.memberRepo.findByUserId(userId)
    return membership ? { orgId: membership.organizationId } : null
  }
}
