import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { OrganizationMember } from '../../Domain/Entities/OrganizationMember'
import type { IOrganizationInvitationRepository } from '../../Domain/Repositories/IOrganizationInvitationRepository'
import type { IOrganizationMemberRepository } from '../../Domain/Repositories/IOrganizationMemberRepository'
import { OrgInvitationRules } from '../../Domain/Services/OrgInvitationRules'
import { OrganizationMemberPresenter } from '../DTOs/OrganizationPresenterDTO'
import type { OrganizationResponse } from '../DTOs/OrganizationResponseDTO'

export class AcceptInvitationByIdService {
  constructor(
    private invitationRepository: IOrganizationInvitationRepository,
    private memberRepository: IOrganizationMemberRepository,
    private authRepository: IAuthRepository,
    private db: IDatabaseAccess,
  ) {}

  async execute(invitationId: string, userId: string): Promise<OrganizationResponse> {
    try {
      const user = await this.authRepository.findById(userId)
      if (!user) {
        return { success: false, message: 'User not found', error: 'USER_NOT_FOUND' }
      }

      const invitation = await this.invitationRepository.findById(invitationId)
      if (!invitation || !invitation.isPending()) {
        return {
          success: false,
          message: 'Invalid or expired invitation',
          error: 'INVALID_INVITATION',
        }
      }

      try {
        OrgInvitationRules.assertEmailMatches(invitation, user.emailValue)
      } catch {
        return {
          success: false,
          message: 'This invitation was not sent to you',
          error: 'EMAIL_MISMATCH',
        }
      }

      const existingMembership = await this.memberRepository.findByUserAndOrgId(
        userId,
        invitation.organizationId,
      )
      try {
        OrgInvitationRules.assertNotAlreadyMember(existingMembership)
      } catch {
        return {
          success: false,
          message: 'Already a member of this organization',
          error: 'USER_ALREADY_IN_ORG',
        }
      }

      const member = OrganizationMember.create(
        crypto.randomUUID(),
        invitation.organizationId,
        userId,
        invitation.role,
      )

      await this.db.transaction(async (tx) => {
        const txMemberRepo = this.memberRepository.withTransaction(tx)
        const txInvitationRepo = this.invitationRepository.withTransaction(tx)
        await txMemberRepo.save(member)
        const accepted = invitation.markAsAccepted()
        await txInvitationRepo.update(accepted)
      })

      return {
        success: true,
        message: 'Successfully joined organization',
        data: OrganizationMemberPresenter.fromEntity(member),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Join failed'
      return { success: false, message, error: message }
    }
  }
}
