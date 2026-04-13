import type { IOrganizationRepository } from '../../Domain/Repositories/IOrganizationRepository'
import {
  OrganizationPresenter,
  type OrganizationResponse,
  type UpdateOrganizationRequest,
} from '../DTOs/OrganizationDTO'
import type { OrgAuthorizationHelper } from './OrgAuthorizationHelper'

export class UpdateOrganizationService {
  constructor(
    private orgRepository: IOrganizationRepository,
    private orgAuth: OrgAuthorizationHelper,
  ) {}

  async execute(
    orgId: string,
    request: UpdateOrganizationRequest,
    callerUserId: string,
    callerSystemRole: string,
  ): Promise<OrganizationResponse> {
    try {
      // 授權檢查：需為組織 Manager 或系統 Admin
      const authResult = await this.orgAuth.requireOrgManager(orgId, callerUserId, callerSystemRole)
      if (!authResult.authorized) {
        return { success: false, message: 'Insufficient permissions', error: authResult.error }
      }

      const org = await this.orgRepository.findById(orgId)
      if (!org) {
        return { success: false, message: 'Organization not found', error: 'ORG_NOT_FOUND' }
      }

      const updated = org.update(request)
      await this.orgRepository.update(updated)

      return {
        success: true,
        message: 'Organization updated successfully',
        data: OrganizationPresenter.fromEntity(updated),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Update failed'
      return { success: false, message, error: message }
    }
  }
}
