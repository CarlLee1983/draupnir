import type { IOrganizationRepository } from '../../Domain/Repositories/IOrganizationRepository'
import { OrganizationPresenter, type UpdateOrganizationRequest, type OrganizationResponse } from '../DTOs/OrganizationDTO'

export class UpdateOrganizationService {
  constructor(private orgRepository: IOrganizationRepository) {}

  async execute(orgId: string, request: UpdateOrganizationRequest): Promise<OrganizationResponse> {
    try {
      const org = await this.orgRepository.findById(orgId)
      if (!org) {
        return { success: false, message: 'Organization not found', error: 'ORG_NOT_FOUND' }
      }

      const updated = org.update(request)
      await this.orgRepository.update(updated)

      return { success: true, message: 'Organization updated successfully', data: OrganizationPresenter.fromEntity(updated) }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Update failed'
      return { success: false, message, error: message }
    }
  }
}
