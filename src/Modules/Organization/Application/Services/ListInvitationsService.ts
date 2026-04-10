import type { IOrganizationInvitationRepository } from '../../Domain/Repositories/IOrganizationInvitationRepository'
import type { OrgAuthorizationHelper } from './OrgAuthorizationHelper'
import { OrganizationInvitationPresenter, type OrganizationResponse } from '../DTOs/OrganizationDTO'

export class ListInvitationsService {
  constructor(
    private invitationRepository: IOrganizationInvitationRepository,
    private orgAuth: OrgAuthorizationHelper,
  ) {}

  async execute(
    orgId: string,
    callerUserId: string,
    callerSystemRole: string,
  ): Promise<OrganizationResponse> {
    try {
      const authResult = await this.orgAuth.requireOrgManager(orgId, callerUserId, callerSystemRole)
      if (!authResult.authorized) {
        return { success: false, message: '權限不足', error: authResult.error }
      }

      const invitations = await this.invitationRepository.findByOrgId(orgId)
      return {
        success: true,
        message: '取得邀請列表成功',
        data: { invitations: invitations.map((i) => OrganizationInvitationPresenter.fromEntity(i)) },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '取得失敗'
      return { success: false, message, error: message }
    }
  }
}
