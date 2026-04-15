import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { IApiKeyRepository } from '../../Domain/Repositories/IApiKeyRepository'
import type { ApiKeyResponse, UpdateApiKeyBudgetRequest } from '../DTOs/ApiKeyDTO'
import type { IBifrostKeySync } from '../Ports/IBifrostKeySync'

/**
 * Updates the gateway spend cap (Bifrost budget) for an existing member API key.
 */
export class UpdateApiKeyBudgetService {
  constructor(
    private readonly apiKeyRepository: IApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
    private readonly bifrostSync: IBifrostKeySync,
  ) {}

  async execute(request: UpdateApiKeyBudgetRequest): Promise<ApiKeyResponse> {
    try {
      if (!Number.isFinite(request.budgetMaxLimit) || request.budgetMaxLimit <= 0) {
        return {
          success: false,
          message: 'Budget cap must be a positive number',
          error: 'BUDGET_INVALID',
        }
      }
      const period = request.budgetResetPeriod
      if (period !== '7d' && period !== '30d') {
        return {
          success: false,
          message: 'Invalid budget reset period',
          error: 'BUDGET_PERIOD_INVALID',
        }
      }

      const apiKey = await this.apiKeyRepository.findById(request.keyId)
      if (!apiKey) {
        return { success: false, message: 'API key not found', error: 'NOT_FOUND' }
      }
      if (apiKey.orgId !== request.orgId) {
        return { success: false, message: 'Organization mismatch', error: 'ORG_MISMATCH' }
      }

      const authResult = await this.orgAuth.requireOrgMembership(
        request.orgId,
        request.callerUserId,
        request.callerSystemRole,
      )
      if (!authResult.authorized) {
        return {
          success: false,
          message: 'You are not a member of this organization',
          error: authResult.error ?? 'NOT_ORG_MEMBER',
        }
      }

      if (apiKey.status === 'revoked' || apiKey.status === 'pending') {
        return {
          success: false,
          message: 'This key cannot be updated',
          error: 'KEY_NOT_UPDATABLE',
        }
      }
      if (!apiKey.gatewayKeyId) {
        return { success: false, message: 'Gateway key is not linked', error: 'NO_GATEWAY_KEY' }
      }

      await this.bifrostSync.updateVirtualKeyBudget(apiKey.gatewayKeyId, {
        maxLimit: request.budgetMaxLimit,
        resetDuration: period,
      })

      return { success: true, message: 'Budget updated' }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Update failed'
      return { success: false, message, error: message }
    }
  }
}
