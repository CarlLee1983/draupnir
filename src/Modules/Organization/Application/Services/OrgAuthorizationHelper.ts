import type { IOrganizationMemberRepository } from '../../Domain/Repositories/IOrganizationMemberRepository'

export interface OrgAuthResult {
	authorized: boolean
	membership?: { role: string; userId: string }
	error?: string
}

export class OrgAuthorizationHelper {
	constructor(private memberRepository: IOrganizationMemberRepository) {}

	async requireOrgMembership(
		orgId: string,
		callerUserId: string,
		callerSystemRole: string,
	): Promise<OrgAuthResult> {
		if (callerSystemRole === 'admin') {
			return { authorized: true }
		}

		const membership = await this.memberRepository.findByUserId(callerUserId)
		if (!membership || membership.organizationId !== orgId) {
			return { authorized: false, error: 'NOT_ORG_MEMBER' }
		}

		return {
			authorized: true,
			membership: { role: membership.role, userId: membership.userId },
		}
	}

	async requireOrgManager(
		orgId: string,
		callerUserId: string,
		callerSystemRole: string,
	): Promise<OrgAuthResult> {
		if (callerSystemRole === 'admin') {
			return { authorized: true }
		}

		const membership = await this.memberRepository.findByUserId(callerUserId)
		if (!membership || membership.organizationId !== orgId) {
			return { authorized: false, error: 'NOT_ORG_MEMBER' }
		}

		if (!membership.isManager()) {
			return { authorized: false, error: 'NOT_ORG_MANAGER' }
		}

		return {
			authorized: true,
			membership: { role: membership.role, userId: membership.userId },
		}
	}
}
