import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'
import type {
  CreateVirtualKeyResult,
  IBifrostKeySync,
} from '../../Application/Ports/IBifrostKeySync'
import type { KeyScope } from '../../Domain/ValueObjects/KeyScope'

export class ApiKeyBifrostSync implements IBifrostKeySync {
  constructor(private readonly gatewayClient: ILLMGatewayClient) {}

  async createVirtualKey(label: string, orgId: string): Promise<CreateVirtualKeyResult> {
    const vk = await this.gatewayClient.createKey({ name: label, customerId: orgId })
    return {
      gatewayKeyId: vk.id,
      gatewayKeyValue: vk.value ?? '',
    }
  }

  async syncPermissions(gatewayKeyId: string, scope: KeyScope): Promise<void> {
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

    await this.gatewayClient.updateKey(gatewayKeyId, {
      providerConfigs,
      rateLimit,
    })
  }

  async deactivateVirtualKey(gatewayKeyId: string): Promise<void> {
    await this.gatewayClient.updateKey(gatewayKeyId, { isActive: false })
  }

  async deleteVirtualKey(gatewayKeyId: string): Promise<void> {
    await this.gatewayClient.deleteKey(gatewayKeyId)
  }
}
