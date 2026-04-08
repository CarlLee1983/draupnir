import type { IOrganizationRepository } from '../../Domain/Repositories/IOrganizationRepository'
import type { UpdateOrganizationRequest, OrganizationResponse } from '../DTOs/OrganizationDTO'

export class UpdateOrganizationService {
	constructor(private orgRepository: IOrganizationRepository) {}

	async execute(orgId: string, request: UpdateOrganizationRequest): Promise<OrganizationResponse> {
		try {
			const org = await this.orgRepository.findById(orgId)
			if (!org) {
				return { success: false, message: '找不到組織', error: 'ORG_NOT_FOUND' }
			}

			const updated = org.update(request)
			await this.orgRepository.update(updated)

			return { success: true, message: '組織已更新', data: updated.toDTO() }
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : '更新失敗'
			return { success: false, message, error: message }
		}
	}
}
