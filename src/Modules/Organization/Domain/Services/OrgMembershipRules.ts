import type { OrganizationMember } from '../Entities/OrganizationMember'

/**
 * Domain rules for organization membership operations.
 */
export const OrgMembershipRules = {
  /**
   * Validates that removing a member or changing their role won't leave the org without managers.
   * @throws Error if the operation would violate the "at least one manager" invariant.
   */
  assertNotLastManager(member: OrganizationMember, totalManagerCount: number): void {
    if (member.isManager() && totalManagerCount <= 1) {
      throw new Error('Cannot remove or demote the last manager of an organization')
    }
  },
}
