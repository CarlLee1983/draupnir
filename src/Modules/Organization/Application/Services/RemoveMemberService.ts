import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IOrganizationMemberRepository } from '../../Domain/Repositories/IOrganizationMemberRepository'
import type { OrgAuthorizationHelper } from './OrgAuthorizationHelper'
import type { OrganizationResponse } from '../DTOs/OrganizationDTO'

export class RemoveMemberService {
	constructor(
		private memberRepository: IOrganizationMemberRepository,
		private orgAuth: OrgAuthorizationHelper,
		private db: IDatabaseAccess,
	) {}

	async execute(
		orgId: string,
		targetUserId: string,
		requesterId: string,
		requesterSystemRole: string,
	): Promise<OrganizationResponse> {
		try {
			const authResult = await this.orgAuth.requireOrgManager(orgId, requesterId, requesterSystemRole)
			if (!authResult.authorized) {
				return { success: false, message: '權限不足', error: authResult.error }
			}

			if (targetUserId === requesterId) {
				return { success: false, message: '不能移除自己', error: 'CANNOT_REMOVE_SELF' }
			}

			const member = await this.memberRepository.findByUserId(targetUserId)
			if (!member || member.organizationId !== orgId) {
				return { success: false, message: '找不到成員', error: 'MEMBER_NOT_FOUND' }
			}

			await this.db.transaction(async (tx) => {
				const txMemberRepo = this.memberRepository.withTransaction(tx)
				if (member.isManager()) {
					const managerCount = await txMemberRepo.countManagersByOrgId(orgId)
					if (managerCount <= 1) {
						throw new LastManagerError()
					}
				}
				await txMemberRepo.remove(member.id)
			})

			return { success: true, message: '成員已移除' }
		} catch (error: unknown) {
			if (error instanceof LastManagerError) {
				return { success: false, message: '不能移除最後一個 Manager', error: 'CANNOT_REMOVE_LAST_MANAGER' }
			}
			const message = error instanceof Error ? error.message : '移除失敗'
			return { success: false, message, error: message }
		}
	}
}

class LastManagerError extends Error {
	constructor() {
		super('CANNOT_REMOVE_LAST_MANAGER')
	}
}
