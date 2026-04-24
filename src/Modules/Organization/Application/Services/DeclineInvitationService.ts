import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import type { IOrganizationInvitationRepository } from '../../Domain/Repositories/IOrganizationInvitationRepository'
import { OrgInvitationRules } from '../../Domain/Services/OrgInvitationRules'
import type { OrganizationResponse } from '../DTOs/OrganizationDTO'

export class DeclineInvitationService {
  constructor(
    private invitationRepository: IOrganizationInvitationRepository,
    private authRepository: IAuthRepository,
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

      const cancelled = invitation.cancel()
      await this.invitationRepository.update(cancelled)

      return { success: true, message: 'Invitation declined' }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Decline failed'
      return { success: false, message, error: message }
    }
  }
}
