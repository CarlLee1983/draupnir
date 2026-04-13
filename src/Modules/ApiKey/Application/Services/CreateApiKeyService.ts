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
} from '../DTOs/ApiKeyDTO'
import type { IBifrostKeySync } from '../Ports/IBifrostKeySync'

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
        const { gatewayKeyId } = await this.bifrostSync.createVirtualKey(
          request.label,
          request.orgId,
        )

        const activatedKey = ApiKey.create({
          id: keyId,
          orgId: request.orgId,
          createdByUserId: request.createdByUserId,
          label: request.label,
          gatewayKeyId,
          keyHash: hashedKey,
          scope,
          expiresAt: request.expiresAt ? new Date(request.expiresAt) : null,
        })
        const finalKey = activatedKey.activate()
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
            'API Key established successfully (Please record the rawKey now, it cannot be retrieved again)',
          data: { ...ApiKeyPresenter.fromEntity(finalKey), rawKey },
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
