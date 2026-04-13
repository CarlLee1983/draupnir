import type { IOrganizationRepository } from '../../Domain/Repositories/IOrganizationRepository'
import { OrganizationPresenter, type OrganizationResponse } from '../DTOs/OrganizationDTO'
import type { OrgAuthorizationHelper } from './OrgAuthorizationHelper'

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
        return { success: false, message: 'Insufficient permissions', error: authResult.error }
      }

      const org = await this.orgRepository.findById(orgId)
      if (!org) {
        return { success: false, message: 'Organization not found', error: 'ORG_NOT_FOUND' }
      }
      return {
        success: true,
        message: 'Query successful',
        data: OrganizationPresenter.fromEntity(org),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Fetch failed'
      return { success: false, message, error: message }
    }
  }
}
