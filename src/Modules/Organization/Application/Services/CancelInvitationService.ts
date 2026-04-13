import type { IOrganizationInvitationRepository } from '../../Domain/Repositories/IOrganizationInvitationRepository'
import type { OrganizationResponse } from '../DTOs/OrganizationDTO'
import type { OrgAuthorizationHelper } from './OrgAuthorizationHelper'

export class CancelInvitationService {
  constructor(
    private invitationRepository: IOrganizationInvitationRepository,
    private orgAuth: OrgAuthorizationHelper,
  ) {}

  async execute(
    orgId: string,
    invitationId: string,
    callerUserId: string,
    callerSystemRole: string,
  ): Promise<OrganizationResponse> {
    try {
      const authResult = await this.orgAuth.requireOrgManager(orgId, callerUserId, callerSystemRole)
      if (!authResult.authorized) {
        return { success: false, message: 'Insufficient permissions', error: authResult.error }
      }

      const invitation = await this.invitationRepository.findById(invitationId)
      if (!invitation || invitation.organizationId !== orgId) {
        return { success: false, message: 'Invitation not found', error: 'INVITATION_NOT_FOUND' }
      }

      // 呼叫 Domain 方法後再透過 repo.update() 持久化狀態變更
      const cancelled = invitation.cancel()
      await this.invitationRepository.update(cancelled)

      return { success: true, message: 'Invitation cancelled' }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Cancellation failed'
      return { success: false, message, error: message }
    }
  }
}
