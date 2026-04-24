/**
 * @file Application service for creating org-scoped API keys and registering them in Bifrost.
 *
 * @remarks
 * Flow (happy path):
 * 1. Validate non-empty label and org membership for the creator.
 * 2. Validate optional budget: `budgetMaxLimit` and `budgetResetPeriod` must both be set or both omitted.
 * 3. Build {@link KeyScope} from optional model allow-list and rate limits.
 * 4. Generate a local id, a `drp_sk_…` material for hashing only, and persist a **pending** aggregate (empty gateway id).
 * 5. Call Bifrost `createVirtualKey` with the aggregate id as the gateway key `name` (user label stays on the domain entity only); on success, activate, optionally set `quotaAllocated`, `update` the row.
 * 6. If the scope carries limits, sync permissions to the gateway key.
 *
 * On failure after step 5: best-effort delete the virtual key (if any id was stored), delete the DB row, then rethrow so the outer catch can surface the error.
 *
 * Successful responses expose `data.rawKey` as the **gateway** secret (`gatewayKeyValue`) suitable for Bearer use, not the local `drp_sk_` prefix string.
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

/**
 * Normalizes optional Bifrost budget options from a create request.
 *
 * @param request - Incoming create payload; reads `budgetMaxLimit` / `budgetResetPeriod`
 * @returns Either gateway-ready `CreateVirtualKeyOptions`, or structured validation errors (`BUDGET_*` codes)
 */
function parseBudgetForCreate(
  request: CreateApiKeyRequest,
): { ok: true; options?: CreateVirtualKeyOptions } | { ok: false; error: string; message: string } {
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
 * Creates a persisted {@link ApiKey} and a matching Bifrost virtual key, returning a one-time secret to the caller.
 *
 * @see {@link CreateApiKeyRequest} for input fields
 */
export class CreateApiKeyService {
  /**
   * @param apiKeyRepository - Persistence for API key aggregates
   * @param orgAuth - Ensures the creator belongs to `request.orgId` (or holds a privileged system role)
   * @param bifrostSync - Gateway: create virtual key, optional permission sync, rollback delete
   * @param keyHashingService - Produces the stored hash for the locally generated `drp_sk_…` material
   */
  constructor(
    private readonly apiKeyRepository: IApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
    private readonly bifrostSync: IBifrostKeySync,
    private readonly keyHashingService: IKeyHashingService,
  ) {}

  /**
   * Runs the full create workflow end-to-end.
   *
   * @param request - Org, acting user, label, optional scope, expiry, and optional paired budget fields
   * @returns On success, `data` merges {@link ApiKeyPresenter.fromEntity} with `rawKey` (Bifrost secret). On failure, `error` carries a machine-oriented code when validation failed, or the exception message for unexpected errors.
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
          keyId,
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
