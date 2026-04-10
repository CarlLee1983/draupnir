import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'
import type { KeyScope } from '../../Domain/ValueObjects/KeyScope'

interface CreateVirtualKeyResult {
  bifrostVirtualKeyId: string
  bifrostKeyValue: string
}

export class ApiKeyBifrostSync {
  constructor(private readonly gatewayClient: ILLMGatewayClient) {}

  async createVirtualKey(label: string, orgId: string): Promise<CreateVirtualKeyResult> {
    const vk = await this.gatewayClient.createKey({ name: label, customerId: orgId })
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
      ? [{ provider: '*', allowedModels: [...allowedModels] }]
      : undefined

    const rateLimit =
      rpm != null || tpm != null
        ? {
            tokenMaxLimit: tpm ?? 0,
            tokenResetDuration: '1m',
            ...(rpm != null && { requestMaxLimit: rpm, requestResetDuration: '1m' }),
          }
        : undefined

    await this.gatewayClient.updateKey(bifrostVirtualKeyId, {
      providerConfigs,
      rateLimit,
    })
  }

  async deactivateVirtualKey(bifrostVirtualKeyId: string): Promise<void> {
    await this.gatewayClient.updateKey(bifrostVirtualKeyId, { isActive: false })
  }

  async deleteVirtualKey(bifrostVirtualKeyId: string): Promise<void> {
    await this.gatewayClient.deleteKey(bifrostVirtualKeyId)
  }
}
