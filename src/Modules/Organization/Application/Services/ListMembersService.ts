import type { IOrganizationMemberRepository } from '../../Domain/Repositories/IOrganizationMemberRepository'
import type { OrgAuthorizationHelper } from './OrgAuthorizationHelper'
import { OrganizationMemberPresenter, type OrganizationResponse } from '../DTOs/OrganizationDTO'

export class ListMembersService {
  constructor(
    private memberRepository: IOrganizationMemberRepository,
    private orgAuth: OrgAuthorizationHelper,
  ) {}

  async execute(
    orgId: string,
    callerUserId: string,
    callerSystemRole: string,
  ): Promise<OrganizationResponse> {
    try {
      const authResult = await this.orgAuth.requireOrgMembership(
        orgId,
        callerUserId,
        callerSystemRole,
      )
      if (!authResult.authorized) {
        return { success: false, message: 'Insufficient permissions', error: authResult.error }
      }

      const members = await this.memberRepository.findByOrgId(orgId)
      return {
        success: true,
        message: 'Members retrieved successfully',
        data: { members: members.map((m) => OrganizationMemberPresenter.fromEntity(m)) },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Fetch failed'
      return { success: false, message, error: message }
    }
  }
}
