import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IOrganizationMemberRepository } from '../../Domain/Repositories/IOrganizationMemberRepository'
import { OrgMembershipRules } from '../../Domain/Services/OrgMembershipRules'
import { OrgMemberRole } from '../../Domain/ValueObjects/OrgMemberRole'
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
      const newRoleVO = new OrgMemberRole(newRole)

      const member = await this.memberRepository.findByUserAndOrgId(targetUserId, orgId)
      if (!member) {
        return { success: false, message: 'Member not found', error: 'MEMBER_NOT_FOUND' }
      }

      const updated = member.changeRole(newRoleVO)

      await this.db.transaction(async (tx) => {
        const txMemberRepo = this.memberRepository.withTransaction(tx)
        if (member.isManager() && !newRoleVO.isManager()) {
          const managerCount = await txMemberRepo.countManagersByOrgId(orgId)
          OrgMembershipRules.assertNotLastManager(member, managerCount)
        }
        await txMemberRepo.update(updated)
      })

      return {
        success: true,
        message: 'Member role updated successfully',
        data: OrganizationMemberPresenter.fromEntity(updated),
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('last manager')) {
        return {
          success: false,
          message: 'Cannot demote the last manager',
          error: 'CANNOT_DEMOTE_LAST_MANAGER',
        }
      }
      const message = error instanceof Error ? error.message : 'Role change failed'
      return { success: false, message, error: message }
    }
  }
}
