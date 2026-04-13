import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'
import type {
  CreateVirtualKeyResult,
  IAppKeyBifrostSync,
} from '../../Application/Ports/IAppKeyBifrostSync'

export class AppKeyBifrostSync implements IAppKeyBifrostSync {
  constructor(private readonly gatewayClient: ILLMGatewayClient) {}

  async createVirtualKey(label: string, orgId: string): Promise<CreateVirtualKeyResult> {
    const vk = await this.gatewayClient.createKey({
      name: `[App] ${label}`,
      customerId: orgId,
    })
    return {
      gatewayKeyId: vk.id,
      gatewayKeyValue: vk.value ?? '',
    }
  }

  async deactivateVirtualKey(gatewayKeyId: string): Promise<void> {
    await this.gatewayClient.updateKey(gatewayKeyId, { isActive: false })
  }

  async deleteVirtualKey(gatewayKeyId: string): Promise<void> {
    await this.gatewayClient.deleteKey(gatewayKeyId)
  }
}
