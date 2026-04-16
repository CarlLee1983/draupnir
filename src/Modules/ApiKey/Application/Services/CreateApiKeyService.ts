/**
 * CreateApiKeyService
 * Application service: handles the secure generation and registration of API keys.
 *
 * Responsibilities:
 * - Verify user's organization membership
 * - Generate the unique API key string and its secure hash
 * - Register the key in the gateway (Bifrost)
 * - Persist the API key aggregate
 * - Handle rollback of gateway registration if persistence fails
 */

import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { IKeyHashingService } from '@/Shared/Domain/Ports/IKeyHashingService'
import { ApiKey } from '../../Domain/Aggregates/ApiKey'
import type { IApiKeyRepository } from '../../Domain/Repositories/IApiKeyRepository'
import { KeyScope } from '../../Domain/ValueObjects/KeyScope'
import {
  type ApiKeyCreatedResponse,
  ApiKeyPresenter,
  type CreateApiKeyRequest,
  type KeyBudgetResetPeriod,
} from '../DTOs/ApiKeyDTO'
import type { CreateVirtualKeyOptions, IBifrostKeySync } from '../Ports/IBifrostKeySync'

function parseBudgetForCreate(request: CreateApiKeyRequest):
  | { ok: true; options?: CreateVirtualKeyOptions }
  | { ok: false; error: string; message: string } {
  const hasLimit = request.budgetMaxLimit != null
  const hasPeriod = request.budgetResetPeriod != null
  if (!hasLimit && !hasPeriod) {
    return { ok: true, options: undefined }
  }
  if (hasLimit !== hasPeriod) {
    return {
      ok: false,
      error: 'BUDGET_INCOMPLETE',
      message: 'Budget cap and reset period must both be set, or both omitted',
    }
  }
  const max = request.budgetMaxLimit!
  if (!Number.isFinite(max) || max <= 0) {
    return { ok: false, error: 'BUDGET_INVALID', message: 'Budget cap must be a positive number' }
  }
  const period = request.budgetResetPeriod as KeyBudgetResetPeriod
  if (period !== '7d' && period !== '30d') {
    return { ok: false, error: 'BUDGET_PERIOD_INVALID', message: 'Invalid budget reset period' }
  }
  return {
    ok: true,
    options: { budget: { maxLimit: max, resetDuration: period } },
  }
}

/**
 * Service responsible for creating new API keys and syncing them with the gateway.
 */
export class CreateApiKeyService {
  constructor(
    private readonly apiKeyRepository: IApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
    private readonly bifrostSync: IBifrostKeySync,
    private readonly keyHashingService: IKeyHashingService,
  ) {}

  /**
   * Executes the API key creation workflow.
   */
  async execute(request: CreateApiKeyRequest): Promise<ApiKeyCreatedResponse> {
    try {
      if (!request.label || !request.label.trim()) {
        return { success: false, message: 'Key label is required', error: 'LABEL_REQUIRED' }
      }

      const authResult = await this.orgAuth.requireOrgMembership(
        request.orgId,
        request.createdByUserId,
        request.callerSystemRole,
      )
      if (!authResult.authorized) {
        return {
          success: false,
          message: 'You are not a member of this organization',
          error: authResult.error ?? 'NOT_ORG_MEMBER',
        }
      }

      const budgetParsed = parseBudgetForCreate(request)
      if (!budgetParsed.ok) {
        return {
          success: false,
          message: budgetParsed.message,
          error: budgetParsed.error,
        }
      }

      const scope = KeyScope.create({
        allowedModels: request.allowedModels,
        rateLimitRpm: request.rateLimitRpm,
        rateLimitTpm: request.rateLimitTpm,
      })

      const keyId = crypto.randomUUID()
      const rawKey = `drp_sk_${crypto.randomUUID().replace(/-/g, '')}`
      const hashedKey = await this.keyHashingService.hash(rawKey)

      const pendingKey = ApiKey.create({
        id: keyId,
        orgId: request.orgId,
        createdByUserId: request.createdByUserId,
        label: request.label,
        gatewayKeyId: '',
        keyHash: hashedKey,
        scope,
        expiresAt: request.expiresAt ? new Date(request.expiresAt) : null,
      })
      await this.apiKeyRepository.save(pendingKey)

      try {
        const { gatewayKeyId, gatewayKeyValue } = await this.bifrostSync.createVirtualKey(
          request.label,
          request.orgId,
          budgetParsed.options,
        )

        const activatedKey = ApiKey.create({
          id: keyId,
          orgId: request.orgId,
          createdByUserId: request.createdByUserId,
          label: request.label,
          gatewayKeyId,
          gatewayKeyValue,
          keyHash: hashedKey,
          scope,
          expiresAt: request.expiresAt ? new Date(request.expiresAt) : null,
        })
        let finalKey = activatedKey.activate()
        const budgetCap = request.budgetMaxLimit
        if (typeof budgetCap === 'number' && Number.isFinite(budgetCap) && budgetCap > 0) {
          finalKey = finalKey.adjustQuotaAllocated(Math.floor(budgetCap))
        }
        await this.apiKeyRepository.update(finalKey)

        if (
          scope.getAllowedModels() != null ||
          scope.getRateLimitRpm() != null ||
          scope.getRateLimitTpm() != null
        ) {
          await this.bifrostSync.syncPermissions(gatewayKeyId, scope)
        }

        return {
          success: true,
          message:
            'API Key established successfully (Please record the key now, it cannot be retrieved again)',
          data: { ...ApiKeyPresenter.fromEntity(finalKey), rawKey: gatewayKeyValue },
        }
      } catch (bifrostError: unknown) {
        const activatedEntry = await this.apiKeyRepository.findById(keyId)
        const virtualKeyId = activatedEntry?.gatewayKeyId
        if (virtualKeyId) {
          await this.bifrostSync.deleteVirtualKey(virtualKeyId).catch(() => {})
        }
        await this.apiKeyRepository.delete(keyId)
        throw bifrostError
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Establishment failed'
      return { success: false, message, error: message }
    }
  }
}
