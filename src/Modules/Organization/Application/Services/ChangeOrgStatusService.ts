import type { IOrganizationRepository } from '../../Domain/Repositories/IOrganizationRepository'
import type { OrganizationResponse } from '../DTOs/OrganizationDTO'

export class ChangeOrgStatusService {
	constructor(private orgRepository: IOrganizationRepository) {}

	async execute(orgId: string, status: string): Promise<OrganizationResponse> {
		try {
			if (status !== 'active' && status !== 'suspended') {
				return { success: false, message: '無效的狀態值，僅允許 active 或 suspended', error: 'INVALID_STATUS' }
			}

			const org = await this.orgRepository.findById(orgId)
			if (!org) {
				return { success: false, message: '找不到組織', error: 'ORG_NOT_FOUND' }
			}

			const updated = status === 'suspended' ? org.suspend() : org.activate()
			await this.orgRepository.update(updated)

			return {
				success: true,
				message: `組織已${status === 'suspended' ? '停用' : '啟用'}`,
				data: updated.toDTO(),
			}
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : '操作失敗'
			return { success: false, message, error: message }
		}
	}
}
