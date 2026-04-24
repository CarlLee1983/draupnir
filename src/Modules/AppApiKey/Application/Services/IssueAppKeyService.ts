/**
 * IssueAppKeyService
 * Application service: handles system-to-system API key issuance.
 *
 * Responsibilities:
 * - Validate key configuration (label, scope, rotation policy)
 * - Verify issuer's authority and organization membership
 * - Generate secure application-specific keys and hashes
 * - Map to gateway (Bifrost) virtual keys
 * - Manage persistence and activation lifecycle
 */

import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { IKeyHashingService } from '@/Shared/Domain/Ports/IKeyHashingService'
import { AppApiKey } from '../../Domain/Aggregates/AppApiKey'
import type { IAppApiKeyRepository } from '../../Domain/Repositories/IAppApiKeyRepository'
import { AppKeyScope } from '../../Domain/ValueObjects/AppKeyScope'
import { BoundModules } from '../../Domain/ValueObjects/BoundModules'
import { KeyRotationPolicy } from '../../Domain/ValueObjects/KeyRotationPolicy'
import {
  type AppApiKeyCreatedResponse,
  fromEntity,
  type IssueAppKeyRequest,
} from '../DTOs/AppApiKeyDTO'
import type { IAppKeyBifrostSync } from '../Ports/IAppKeyBifrostSync'

/**
 * Service for issuing application-specific long-lived API keys.
 */
export class IssueAppKeyService {
  constructor(
    private readonly appApiKeyRepository: IAppApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
    private readonly bifrostSync: IAppKeyBifrostSync,
    private readonly keyHashingService: IKeyHashingService,
  ) {}

  /**
   * Executes the application API key issuance workflow.
   */
  async execute(request: IssueAppKeyRequest): Promise<AppApiKeyCreatedResponse> {
    try {
      if (!request.label?.trim()) {
        return { success: false, message: 'Key label is required', error: 'LABEL_REQUIRED' }
      }

      const authResult = await this.orgAuth.requireOrgManager(
        request.orgId,
        request.issuedByUserId,
        request.callerSystemRole,
      )
      if (!authResult.authorized) {
        return {
          success: false,
          message: 'You are not authorized to issue App Keys for this organization',
          error: authResult.error ?? 'NOT_ORG_MANAGER',
        }
      }

      const scope = request.scope ? AppKeyScope.from(request.scope) : AppKeyScope.read()

      const rotationPolicy = request.rotationPolicy?.autoRotate
        ? KeyRotationPolicy.auto(
            request.rotationPolicy.rotationIntervalDays ?? 90,
            request.rotationPolicy.gracePeriodHours ?? 24,
          )
        : KeyRotationPolicy.manual(request.rotationPolicy?.gracePeriodHours)

      const boundModules = request.boundModuleIds
        ? BoundModules.from(request.boundModuleIds)
        : BoundModules.empty()

      const keyId = crypto.randomUUID()
      const rawKey = `drp_app_${crypto.randomUUID().replace(/-/g, '')}`
      const hashedKey = await this.keyHashingService.hash(rawKey)

      const pendingKey = AppApiKey.create({
        id: keyId,
        orgId: request.orgId,
        issuedByUserId: request.issuedByUserId,
        label: request.label,
        gatewayKeyId: '',
        keyHash: hashedKey,
        scope,
        rotationPolicy,
        boundModules,
        expiresAt: request.expiresAt ? new Date(request.expiresAt) : null,
      })
      await this.appApiKeyRepository.save(pendingKey)

      try {
        const { gatewayKeyId } = await this.bifrostSync.createVirtualKey(
          request.label,
          request.orgId,
        )

        const activatedKey = AppApiKey.create({
          id: keyId,
          orgId: request.orgId,
          issuedByUserId: request.issuedByUserId,
          label: request.label,
          gatewayKeyId,
          keyHash: hashedKey,
          scope,
          rotationPolicy,
          boundModules,
          expiresAt: request.expiresAt ? new Date(request.expiresAt) : null,
        })
        const finalKey = activatedKey.activate()
        await this.appApiKeyRepository.update(finalKey)

        return {
          success: true,
          message:
            'App API Key issued successfully (Please record the rawKey now, it cannot be retrieved again)',
          data: { ...fromEntity(finalKey), rawKey },
        }
      } catch (bifrostError: unknown) {
        await this.appApiKeyRepository.delete(keyId)
        throw bifrostError
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Issuance failed'
      return { success: false, message, error: message }
    }
  }
}
