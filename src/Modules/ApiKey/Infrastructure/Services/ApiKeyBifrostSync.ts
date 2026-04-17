import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'
import type { IOrganizationRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationRepository'
import type { KeyBudgetResetPeriod } from '../../Application/DTOs/ApiKeyDTO'
import type {
  CreateVirtualKeyOptions,
  CreateVirtualKeyResult,
  IBifrostKeySync,
} from '../../Application/Ports/IBifrostKeySync'
import type { KeyScope } from '../../Domain/ValueObjects/KeyScope'

export class ApiKeyBifrostSync implements IBifrostKeySync {
  constructor(
    private readonly gatewayClient: ILLMGatewayClient,
    private readonly orgRepo: IOrganizationRepository,
  ) {}

  async createVirtualKey(
    label: string,
    orgId: string,
    options?: CreateVirtualKeyOptions,
  ): Promise<CreateVirtualKeyResult> {
    // 解析該組織的 Bifrost Team ID：由 provisioning 寫入 org.gatewayTeamId。
    // 若尚未寫入（provisioning 失敗留下的空缺）則 log 警告並以無 team_id 方式建立，
    // 讓 key 仍可使用；spend 聚合會暫時落在無 team scope，待 ops 補 provision 後才會關聯。
    const org = await this.orgRepo.findById(orgId)
    const teamId = org?.gatewayTeamId ?? undefined
    if (!teamId) {
      console.warn('[ApiKeyBifrostSync] organization has no gatewayTeamId; key will be unscoped', {
        orgId,
      })
    }
    const vk = await this.gatewayClient.createKey({
      name: label,
      keyIds: ['*'],
      ...(teamId !== undefined && { teamId }),
      ...(options?.budget != null && {
        budget: {
          maxLimit: options.budget.maxLimit,
          resetDuration: options.budget.resetDuration,
        },
      }),
    })
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

  async updateVirtualKeyBudget(
    gatewayKeyId: string,
    budget: { maxLimit: number; resetDuration: KeyBudgetResetPeriod },
  ): Promise<void> {
    await this.gatewayClient.updateKey(gatewayKeyId, {
      budget: {
        maxLimit: budget.maxLimit,
        resetDuration: budget.resetDuration,
      },
    })
  }

  async deactivateVirtualKey(gatewayKeyId: string): Promise<void> {
    await this.gatewayClient.updateKey(gatewayKeyId, { isActive: false })
  }

  async deleteVirtualKey(gatewayKeyId: string): Promise<void> {
    await this.gatewayClient.deleteKey(gatewayKeyId)
  }
}
