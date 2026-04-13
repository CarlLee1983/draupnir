/**
 * OrgAuthorizationHelper
 * Application service: helper for checking organization-specific access rights.
 *
 * Responsibilities:
 * - Verify organization membership for a user
 * - Check if a user holds the 'manager' role within an organization
 * - Bypass checks for global system 'admin' role
 */

import type { IOrganizationMemberRepository } from '../../Domain/Repositories/IOrganizationMemberRepository'

/** Result of an organization authorization check. */
export interface OrgAuthResult {
  authorized: boolean
  membership?: { role: string; userId: string }
  error?: string
}

/**
 * Helper class for organization authorization logic.
 */
export class OrgAuthorizationHelper {
  constructor(private memberRepository: IOrganizationMemberRepository) {}

  /**
   * Requires the caller to be a member of the organization.
   * Admins are automatically authorized.
   */
  async requireOrgMembership(
    orgId: string,
    callerUserId: string,
    callerSystemRole: string,
  ): Promise<OrgAuthResult> {
    if (callerSystemRole === 'admin') {
      return { authorized: true }
    }

    const membership = await this.memberRepository.findByUserAndOrgId(callerUserId, orgId)
    if (!membership) {
      return { authorized: false, error: 'NOT_ORG_MEMBER' }
    }

    return {
      authorized: true,
      membership: { role: membership.role.getValue(), userId: membership.userId },
    }
  }

  /**
   * Requires the caller to be a manager of the organization.
   * Admins are automatically authorized.
   */
  async requireOrgManager(
    orgId: string,
    callerUserId: string,
    callerSystemRole: string,
  ): Promise<OrgAuthResult> {
    if (callerSystemRole === 'admin') {
      return { authorized: true }
    }

    const membership = await this.memberRepository.findByUserAndOrgId(callerUserId, orgId)
    if (!membership) {
      return { authorized: false, error: 'NOT_ORG_MEMBER' }
    }

    if (!membership.isManager()) {
      return { authorized: false, error: 'NOT_ORG_MANAGER' }
    }

    return {
      authorized: true,
      membership: { role: membership.role.getValue(), userId: membership.userId },
    }
  }
}
