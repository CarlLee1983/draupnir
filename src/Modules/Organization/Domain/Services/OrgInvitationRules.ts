import type { OrganizationInvitation } from '../Entities/OrganizationInvitation'
import type { OrganizationMember } from '../Entities/OrganizationMember'

/**
 * Domain Service：組織邀請的業務規則驗證。
 */
export class OrgInvitationRules {
  /**
   * 驗證邀請的 email 與使用者 email 一致。
   * @throws Error 'EMAIL_MISMATCH' 如不一致
   */
  static assertEmailMatches(invitation: OrganizationInvitation, userEmail: string): void {
    if (userEmail.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new Error('EMAIL_MISMATCH')
    }
  }

  /**
   * 驗證使用者尚未是組織成員。
   * @throws Error 'USER_ALREADY_IN_ORG' 如已是成員
   */
  static assertNotAlreadyMember(existingMembership: OrganizationMember | null): void {
    if (existingMembership !== null) {
      throw new Error('USER_ALREADY_IN_ORG')
    }
  }
}
