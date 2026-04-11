import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

async function sha256(str: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}
import type { IOrganizationInvitationRepository } from '../../Domain/Repositories/IOrganizationInvitationRepository'
import type { IOrganizationMemberRepository } from '../../Domain/Repositories/IOrganizationMemberRepository'
import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import { OrganizationMember } from '../../Domain/Entities/OrganizationMember'
import { OrganizationMemberPresenter, type AcceptInvitationRequest, type OrganizationResponse } from '../DTOs/OrganizationDTO'

export class AcceptInvitationService {
  constructor(
    private invitationRepository: IOrganizationInvitationRepository,
    private memberRepository: IOrganizationMemberRepository,
    private authRepository: IAuthRepository,
    private db: IDatabaseAccess,
  ) {}

  async execute(userId: string, request: AcceptInvitationRequest): Promise<OrganizationResponse> {
    try {
      if (!request.token || !request.token.trim()) {
        return { success: false, message: 'Missing token', error: 'TOKEN_REQUIRED' }
      }

      const tokenHash = await sha256(request.token)
      const invitation = await this.invitationRepository.findByTokenHash(tokenHash)

      if (!invitation || !invitation.isPending()) {
        return { success: false, message: 'Invalid or expired invitation', error: 'INVALID_INVITATION' }
      }

      const user = await this.authRepository.findById(userId)
      if (!user) {
        return { success: false, message: 'User not found', error: 'USER_NOT_FOUND' }
      }

      if (user.emailValue.toLowerCase() !== invitation.email.toLowerCase()) {
        return { success: false, message: 'This invitation was not sent to you', error: 'EMAIL_MISMATCH' }
      }

      const existingMembership = await this.memberRepository.findByUserAndOrgId(
        userId,
        invitation.organizationId,
      )
      if (existingMembership) {
        return { success: false, message: 'Already a member of this organization', error: 'USER_ALREADY_IN_ORG' }
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
        await txInvitationRepo.markAsAccepted(invitation.id)
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
