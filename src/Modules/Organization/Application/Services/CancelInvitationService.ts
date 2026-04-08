import type { IOrganizationInvitationRepository } from '../../Domain/Repositories/IOrganizationInvitationRepository'
import type { OrgAuthorizationHelper } from './OrgAuthorizationHelper'
import type { OrganizationResponse } from '../DTOs/OrganizationDTO'

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
				return { success: false, message: '權限不足', error: authResult.error }
			}

			const invitation = await this.invitationRepository.findById(invitationId)
			if (!invitation || invitation.organizationId !== orgId) {
				return { success: false, message: '找不到邀請', error: 'INVITATION_NOT_FOUND' }
			}

			await this.invitationRepository.cancel(invitationId)
			return { success: true, message: '邀請已取消' }
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : '取消失敗'
			return { success: false, message, error: message }
		}
	}
}
