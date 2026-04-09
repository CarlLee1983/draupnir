import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'

interface CreateVirtualKeyResult {
	bifrostVirtualKeyId: string
	bifrostKeyValue: string
}

export class AppKeyBifrostSync {
	constructor(private readonly bifrostClient: BifrostClient) {}

	async createVirtualKey(label: string, orgId: string): Promise<CreateVirtualKeyResult> {
		const vk = await this.bifrostClient.createVirtualKey({
			name: `[App] ${label}`,
			customer_id: orgId,
		})
		return {
			bifrostVirtualKeyId: vk.id,
			bifrostKeyValue: vk.value ?? '',
		}
	}

	async deactivateVirtualKey(bifrostVirtualKeyId: string): Promise<void> {
		await this.bifrostClient.updateVirtualKey(bifrostVirtualKeyId, { is_active: false })
	}

	async deleteVirtualKey(bifrostVirtualKeyId: string): Promise<void> {
		await this.bifrostClient.deleteVirtualKey(bifrostVirtualKeyId)
	}
}
