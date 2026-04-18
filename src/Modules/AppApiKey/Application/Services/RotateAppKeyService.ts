import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { IKeyHashingService } from '@/Shared/Domain/Ports/IKeyHashingService'
import type { IAppApiKeyRepository } from '../../Domain/Repositories/IAppApiKeyRepository'
import {
  type AppApiKeyCreatedResponse,
  AppApiKeyPresenter,
  type RotateAppKeyRequest,
} from '../DTOs/AppApiKeyDTO'
import type { IAppKeyBifrostSync } from '../Ports/IAppKeyBifrostSync'

export class RotateAppKeyService {
  constructor(
    private readonly appApiKeyRepository: IAppApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
    private readonly bifrostSync: IAppKeyBifrostSync,
    private readonly keyHashingService: IKeyHashingService,
  ) {}

  async execute(request: RotateAppKeyRequest): Promise<AppApiKeyCreatedResponse> {
    try {
      const key = await this.appApiKeyRepository.findById(request.keyId)
      if (!key) {
        return { success: false, message: 'App Key not found', error: 'KEY_NOT_FOUND' }
      }

      const authResult = await this.orgAuth.requireOrgManager(
        key.orgId,
        request.callerUserId,
        request.callerSystemRole,
      )
      if (!authResult.authorized) {
        return {
          success: false,
          message: 'You are not authorized to rotate App Keys for this organization',
          error: authResult.error ?? 'NOT_ORG_MANAGER',
        }
      }

      const newRawKey = `drp_app_${crypto.randomUUID().replace(/-/g, '')}`
      const newHashedKey = await this.keyHashingService.hash(newRawKey)

      const { gatewayKeyId: newGatewayKeyId } = await this.bifrostSync.createVirtualKey(
        key.label,
        key.orgId,
      )

      const rotated = key.rotate(newHashedKey, newGatewayKeyId)
      await this.appApiKeyRepository.update(rotated)

      return {
        success: true,
        message: 'Key rotated successfully, old key remains valid during grace period',
        data: { ...AppApiKeyPresenter.fromEntity(rotated), rawKey: newRawKey },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Rotation failed'
      return { success: false, message, error: message }
    }
  }
}
