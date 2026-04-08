import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'
import type { KeyScope } from '../../Domain/ValueObjects/KeyScope'

interface CreateVirtualKeyResult {
	bifrostVirtualKeyId: string
	bifrostKeyValue: string
}

export class ApiKeyBifrostSync {
	constructor(private readonly bifrostClient: BifrostClient) {}

	async createVirtualKey(label: string, orgId: string): Promise<CreateVirtualKeyResult> {
		const vk = await this.bifrostClient.createVirtualKey({
			name: label,
			customer_id: orgId,
		})
		return {
			bifrostVirtualKeyId: vk.id,
			bifrostKeyValue: vk.value ?? '',
		}
	}

	async syncPermissions(bifrostVirtualKeyId: string, scope: KeyScope): Promise<void> {
		const allowedModels = scope.getAllowedModels()
		const rpm = scope.getRateLimitRpm()
		const tpm = scope.getRateLimitTpm()

		const providerConfigs = allowedModels
			? [{ provider: '*', allowed_models: [...allowedModels] }]
			: undefined

		const rateLimit =
			rpm != null || tpm != null
				? {
						token_max_limit: tpm ?? 0,
						token_reset_duration: '1m',
						...(rpm != null && { request_max_limit: rpm, request_reset_duration: '1m' }),
					}
				: undefined

		await this.bifrostClient.updateVirtualKey(bifrostVirtualKeyId, {
			provider_configs: providerConfigs,
			rate_limit: rateLimit,
		})
	}

	async deactivateVirtualKey(bifrostVirtualKeyId: string): Promise<void> {
		await this.bifrostClient.updateVirtualKey(bifrostVirtualKeyId, { is_active: false })
	}

	async deleteVirtualKey(bifrostVirtualKeyId: string): Promise<void> {
		await this.bifrostClient.deleteVirtualKey(bifrostVirtualKeyId)
	}
}
