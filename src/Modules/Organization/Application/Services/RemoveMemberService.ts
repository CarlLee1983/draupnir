import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import { RoleType } from '@/Modules/Auth/Domain/ValueObjects/Role'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IOrganizationMemberRepository } from '../../Domain/Repositories/IOrganizationMemberRepository'
import { OrgMembershipRules } from '../../Domain/Services/OrgMembershipRules'
import type { OrganizationResponse } from '../DTOs/OrganizationDTO'
import type { OrgAuthorizationHelper } from './OrgAuthorizationHelper'

export class RemoveMemberService {
  constructor(
    private memberRepository: IOrganizationMemberRepository,
    private orgAuth: OrgAuthorizationHelper,
    private db: IDatabaseAccess,
    private authRepository: IAuthRepository,
  ) {}

  async execute(
    orgId: string,
    targetUserId: string,
    requesterId: string,
    requesterSystemRole: string,
  ): Promise<OrganizationResponse> {
    try {
      const authResult = await this.orgAuth.requireOrgManager(
        orgId,
        requesterId,
        requesterSystemRole,
      )
      if (!authResult.authorized) {
        return { success: false, message: 'Insufficient permissions', error: authResult.error }
      }

      if (targetUserId === requesterId) {
        return { success: false, message: 'Cannot remove yourself', error: 'CANNOT_REMOVE_SELF' }
      }

      const member = await this.memberRepository.findByUserAndOrgId(targetUserId, orgId)
      if (!member) {
        return { success: false, message: 'Member not found', error: 'MEMBER_NOT_FOUND' }
      }

      await this.db.transaction(async (tx) => {
        const txMemberRepo = this.memberRepository.withTransaction(tx)
        if (member.isManager()) {
          const managerCount = await txMemberRepo.countManagersByOrgId(orgId)
          OrgMembershipRules.assertNotLastManager(member, managerCount)
        }
        await txMemberRepo.remove(member.id)
      })

      // 移除後的系統角色降級：只對非 admin 使用者執行。
      const targetUser = await this.authRepository.findById(targetUserId)
      if (targetUser && !targetUser.role.isAdmin()) {
        const stillManager = await this.memberRepository.isOrgManagerInAnyOrg(targetUserId)
        if (!stillManager) {
          await this.authRepository.updateRole(targetUserId, RoleType.MEMBER)
        }
      }

      return { success: true, message: 'Member removed successfully' }
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('last manager')) {
        return {
          success: false,
          message: 'Cannot remove the last manager',
          error: 'CANNOT_REMOVE_LAST_MANAGER',
        }
      }
      const message = error instanceof Error ? error.message : 'Remove failed'
      return { success: false, message, error: message }
    }
  }
}
