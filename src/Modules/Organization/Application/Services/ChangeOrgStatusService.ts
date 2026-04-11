import type { IOrganizationRepository } from '../../Domain/Repositories/IOrganizationRepository'
import { OrgStatus } from '../../Domain/ValueObjects/OrgStatus'
import { OrganizationPresenter, type OrganizationResponse } from '../DTOs/OrganizationDTO'

export class ChangeOrgStatusService {
  constructor(private orgRepository: IOrganizationRepository) {}

  async execute(orgId: string, status: string): Promise<OrganizationResponse> {
    try {
      try {
        OrgStatus.from(status)
      } catch {
        return {
          success: false,
          message: 'Invalid status value, only active or suspended are allowed',
          error: 'INVALID_STATUS',
        }
      }

      const org = await this.orgRepository.findById(orgId)
      if (!org) {
        return { success: false, message: 'Organization not found', error: 'ORG_NOT_FOUND' }
      }

      const updated = status === 'suspended' ? org.suspend() : org.activate()
      await this.orgRepository.update(updated)

      return {
        success: true,
        message: `Organization ${status === 'suspended' ? 'suspended' : 'activated'} successfully`,
        data: OrganizationPresenter.fromEntity(updated),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Operation failed'
      return { success: false, message, error: message }
    }
  }
}
