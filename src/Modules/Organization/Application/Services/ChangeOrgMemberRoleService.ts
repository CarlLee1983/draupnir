import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IOrganizationMemberRepository } from '../../Domain/Repositories/IOrganizationMemberRepository'
import { OrgMemberRole } from '../../Domain/ValueObjects/OrgMemberRole'
import { OrgMembershipRules } from '../../Domain/Services/OrgMembershipRules'
import { OrganizationMemberPresenter, type OrganizationResponse } from '../DTOs/OrganizationDTO'

export class ChangeOrgMemberRoleService {
  constructor(
    private memberRepository: IOrganizationMemberRepository,
    private db: IDatabaseAccess,
  ) {}

  async execute(
    orgId: string,
    targetUserId: string,
    newRole: string,
  ): Promise<OrganizationResponse> {
    try {
      new OrgMemberRole(newRole)

      const member = await this.memberRepository.findByUserAndOrgId(targetUserId, orgId)
      if (!member) {
        return { success: false, message: '找不到成員', error: 'MEMBER_NOT_FOUND' }
      }

      const updated = member.changeRole(newRole)

      await this.db.transaction(async (tx) => {
        const txMemberRepo = this.memberRepository.withTransaction(tx)
        if (member.isManager() && newRole !== 'manager') {
          const managerCount = await txMemberRepo.countManagersByOrgId(orgId)
          OrgMembershipRules.assertNotLastManager(member, managerCount)
        }
        await txMemberRepo.update(updated)
      })

      return { success: true, message: '成員角色已變更', data: OrganizationMemberPresenter.fromEntity(updated) }
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('last manager')) {
        return {
          success: false,
          message: '不能降級最後一個 Manager',
          error: 'CANNOT_DEMOTE_LAST_MANAGER',
        }
      }
      const message = error instanceof Error ? error.message : '變更失敗'
      return { success: false, message, error: message }
    }
  }
}
