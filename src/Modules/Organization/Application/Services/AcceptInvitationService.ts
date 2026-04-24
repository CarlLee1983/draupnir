import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

async function sha256(str: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(str)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import { OrganizationMember } from '../../Domain/Entities/OrganizationMember'
import type { IOrganizationInvitationRepository } from '../../Domain/Repositories/IOrganizationInvitationRepository'
import type { IOrganizationMemberRepository } from '../../Domain/Repositories/IOrganizationMemberRepository'
import { OrgInvitationRules } from '../../Domain/Services/OrgInvitationRules'
import {
  type AcceptInvitationRequest,
  OrganizationMemberPresenter,
  type OrganizationResponse,
} from '../DTOs/OrganizationDTO'

export class AcceptInvitationService {
  constructor(
    private invitationRepository: IOrganizationInvitationRepository,
    private memberRepository: IOrganizationMemberRepository,
    private authRepository: IAuthRepository,
    private db: IDatabaseAccess,
  ) {}

  async execute(userId: string, request: AcceptInvitationRequest): Promise<OrganizationResponse> {
    try {
      if (!request.token?.trim()) {
        return { success: false, message: 'Missing token', error: 'TOKEN_REQUIRED' }
      }

      const tokenHash = await sha256(request.token)
      const invitation = await this.invitationRepository.findByTokenHash(tokenHash)

      if (!invitation?.isPending()) {
        return {
          success: false,
          message: 'Invalid or expired invitation',
          error: 'INVALID_INVITATION',
        }
      }

      const user = await this.authRepository.findById(userId)
      if (!user) {
        return { success: false, message: 'User not found', error: 'USER_NOT_FOUND' }
      }

      // 業務規則委由 Domain Service 驗證
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

      // invitation.role 已是 OrgMemberRole VO
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
        // 呼叫 Domain 方法後再透過 repo.update() 持久化狀態變更
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
