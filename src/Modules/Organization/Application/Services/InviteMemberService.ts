import type { IOrganizationRepository } from '../../Domain/Repositories/IOrganizationRepository'
import type { IOrganizationInvitationRepository } from '../../Domain/Repositories/IOrganizationInvitationRepository'
import type { OrgAuthorizationHelper } from './OrgAuthorizationHelper'
import { OrganizationInvitation } from '../../Domain/Entities/OrganizationInvitation'
import { OrganizationInvitationPresenter, type InviteMemberRequest, type OrganizationResponse } from '../DTOs/OrganizationDTO'

export class InviteMemberService {
  constructor(
    private orgRepository: IOrganizationRepository,
    private invitationRepository: IOrganizationInvitationRepository,
    private orgAuth: OrgAuthorizationHelper,
  ) {}

  async execute(
    orgId: string,
    invitedByUserId: string,
    callerSystemRole: string,
    request: InviteMemberRequest,
  ): Promise<OrganizationResponse> {
    try {
      const authResult = await this.orgAuth.requireOrgManager(
        orgId,
        invitedByUserId,
        callerSystemRole,
      )
      if (!authResult.authorized) {
        return { success: false, message: 'Insufficient permissions', error: authResult.error }
      }

      if (!request.email || !request.email.trim()) {
        return { success: false, message: 'Missing email', error: 'EMAIL_REQUIRED' }
      }

      const org = await this.orgRepository.findById(orgId)
      if (!org) {
        return { success: false, message: 'Organization not found', error: 'ORG_NOT_FOUND' }
      }

      if (org.status === 'suspended') {
        return { success: false, message: 'Organization is suspended', error: 'ORG_SUSPENDED' }
      }

      const role = request.role || 'member'
      const invitation = await OrganizationInvitation.create(
        orgId,
        request.email,
        role,
        invitedByUserId,
      )
      await this.invitationRepository.save(invitation)

      return {
        success: true,
        message: 'Invitation sent',
        data: {
          ...OrganizationInvitationPresenter.fromEntity(invitation),
          token: invitation.token,
          expiresAt: invitation.expiresAt.toISOString(),
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invitation failed'
      return { success: false, message, error: message }
    }
  }
}
