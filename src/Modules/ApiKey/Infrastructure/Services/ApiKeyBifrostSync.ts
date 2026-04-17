import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'
import { GatewayError } from '@/Foundation/Infrastructure/Services/LLMGateway/errors'
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
    // Fail closed: without a Bifrost Team binding, any issued key would be
    // unscoped — spend/usage wouldn't aggregate to the org and later
    // reconciliation cannot reattach it. Upstream must re-run provisioning.
    const org = await this.orgRepo.findById(orgId)
    const teamId = org?.gatewayTeamId
    if (!teamId) {
      throw new GatewayError(
        `Organization ${orgId} has no Bifrost Team binding; re-run provisioning before issuing keys.`,
        'VALIDATION',
        0,
        false,
      )
    }
    const vk = await this.gatewayClient.createKey({
      name: label,
      keyIds: ['*'],
      teamId,
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
