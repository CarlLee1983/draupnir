import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import type { IOrganizationMemberRepository } from '../../Domain/Repositories/IOrganizationMemberRepository'
import { OrganizationMemberPresenter, type OrganizationResponse } from '../DTOs/OrganizationDTO'
import type { OrgAuthorizationHelper } from './OrgAuthorizationHelper'

export class ListMembersService {
  constructor(
    private memberRepository: IOrganizationMemberRepository,
    private orgAuth: OrgAuthorizationHelper,
    private authRepository: IAuthRepository,
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
      const uniqueUserIds = [...new Set(members.map((m) => m.userId))]
      const users = await Promise.all(uniqueUserIds.map((id) => this.authRepository.findById(id)))
      const emailByUserId = new Map<string, string>()
      for (let i = 0; i < uniqueUserIds.length; i++) {
        // biome-ignore lint/style/noNonNullAssertion: guaranteed by control flow or DOM contract
        const uid = uniqueUserIds[i]!
        const user = users[i]
        if (user) emailByUserId.set(uid, user.emailValue)
      }

      const rows = members.map((m) => {
        const base = OrganizationMemberPresenter.fromEntity(m) as Record<string, unknown>
        return {
          ...base,
          email: emailByUserId.get(m.userId) ?? '',
        }
      })

      return {
        success: true,
        message: 'Members retrieved successfully',
        data: { members: rows },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Fetch failed'
      return { success: false, message, error: message }
    }
  }
}
