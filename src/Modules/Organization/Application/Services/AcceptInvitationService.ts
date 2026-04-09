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
import type { AcceptInvitationRequest, OrganizationResponse } from '../DTOs/OrganizationDTO'

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
				return { success: false, message: 'Token 不能為空', error: 'TOKEN_REQUIRED' }
			}

			const tokenHash = await sha256(request.token)
			const invitation = await this.invitationRepository.findByTokenHash(tokenHash)

			if (!invitation || !invitation.isPending()) {
				return { success: false, message: '無效或已過期的邀請', error: 'INVALID_INVITATION' }
			}

			const user = await this.authRepository.findById(userId)
			if (!user) {
				return { success: false, message: '找不到使用者', error: 'USER_NOT_FOUND' }
			}

			if (user.emailValue.toLowerCase() !== invitation.email.toLowerCase()) {
				return { success: false, message: '此邀請不是發給您的', error: 'EMAIL_MISMATCH' }
			}

			const existingMembership = await this.memberRepository.findByUserAndOrgId(userId, invitation.organizationId)
			if (existingMembership) {
				return { success: false, message: '您已屬於此組織', error: 'USER_ALREADY_IN_ORG' }
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
				message: '已成功加入組織',
				data: member.toDTO(),
			}
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : '加入失敗'
			return { success: false, message, error: message }
		}
	}
}
