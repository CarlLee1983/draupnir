import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'

interface CreateVirtualKeyResult {
  bifrostVirtualKeyId: string
  bifrostKeyValue: string
}

export class AppKeyBifrostSync {
  constructor(private readonly gatewayClient: ILLMGatewayClient) {}

  async createVirtualKey(label: string, orgId: string): Promise<CreateVirtualKeyResult> {
    const vk = await this.gatewayClient.createKey({
      name: `[App] ${label}`,
      customerId: orgId,
    })
    return {
      bifrostVirtualKeyId: vk.id,
      bifrostKeyValue: vk.value ?? '',
    }
  }

  async deactivateVirtualKey(bifrostVirtualKeyId: string): Promise<void> {
    await this.gatewayClient.updateKey(bifrostVirtualKeyId, { isActive: false })
  }

  async deleteVirtualKey(bifrostVirtualKeyId: string): Promise<void> {
    await this.gatewayClient.deleteKey(bifrostVirtualKeyId)
  }
}
