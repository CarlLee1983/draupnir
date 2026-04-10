import type { IOrganizationRepository } from '../../Domain/Repositories/IOrganizationRepository'
import type { OrgAuthorizationHelper } from './OrgAuthorizationHelper'
import { OrganizationPresenter, type OrganizationResponse } from '../DTOs/OrganizationDTO'

export class GetOrganizationService {
  constructor(
    private orgRepository: IOrganizationRepository,
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
        return { success: false, message: '權限不足', error: authResult.error }
      }

      const org = await this.orgRepository.findById(orgId)
      if (!org) {
        return { success: false, message: '找不到組織', error: 'ORG_NOT_FOUND' }
      }
      return { success: true, message: '取得成功', data: OrganizationPresenter.fromEntity(org) }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '取得失敗'
      return { success: false, message, error: message }
    }
  }
}
