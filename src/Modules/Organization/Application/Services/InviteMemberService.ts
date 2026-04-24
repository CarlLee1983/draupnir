import { OrganizationInvitation } from '../../Domain/Entities/OrganizationInvitation'
import type { IOrganizationInvitationRepository } from '../../Domain/Repositories/IOrganizationInvitationRepository'
import type { IOrganizationRepository } from '../../Domain/Repositories/IOrganizationRepository'
import { OrgMemberRole } from '../../Domain/ValueObjects/OrgMemberRole'
import {
  type InviteMemberRequest,
  OrganizationInvitationPresenter,
  type OrganizationResponse,
} from '../DTOs/OrganizationDTO'
import type { OrgAuthorizationHelper } from './OrgAuthorizationHelper'

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

      if (!request.email?.trim()) {
        return { success: false, message: 'Missing email', error: 'EMAIL_REQUIRED' }
      }

      const org = await this.orgRepository.findById(orgId)
      if (!org) {
        return { success: false, message: 'Organization not found', error: 'ORG_NOT_FOUND' }
      }

      if (org.status === 'suspended') {
        return { success: false, message: 'Organization is suspended', error: 'ORG_SUSPENDED' }
      }

      const emailNorm = request.email.trim().toLowerCase()
      const existingInvites = await this.invitationRepository.findByOrgId(orgId)
      for (const inv of existingInvites) {
        if (inv.email.trim().toLowerCase() !== emailNorm) continue
        if (!inv.status.isPending()) continue
        await this.invitationRepository.update(inv.cancel())
      }

      const role = new OrgMemberRole(request.role ?? 'member')
      const invitation = await OrganizationInvitation.create(
        orgId,
        emailNorm,
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
