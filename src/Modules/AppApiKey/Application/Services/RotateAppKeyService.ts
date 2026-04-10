import type { IAppApiKeyRepository } from '../../Domain/Repositories/IAppApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { IAppKeyBifrostSync } from '../Ports/IAppKeyBifrostSync'
import type { IKeyHashingService } from '@/Shared/Domain/Ports/IKeyHashingService'
import { AppApiKeyPresenter, type RotateAppKeyRequest, type AppApiKeyCreatedResponse } from '../DTOs/AppApiKeyDTO'

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
        return { success: false, message: 'App Key 不存在', error: 'KEY_NOT_FOUND' }
      }

      const authResult = await this.orgAuth.requireOrgMembership(
        key.orgId,
        request.callerUserId,
        request.callerSystemRole,
      )
      if (!authResult.authorized) {
        return {
          success: false,
          message: '你不是此組織的成員',
          error: authResult.error ?? 'NOT_ORG_MEMBER',
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
        message: 'Key 輪換成功，舊 Key 在寬限期內仍可使用',
        data: { ...AppApiKeyPresenter.fromEntity(rotated), rawKey: newRawKey },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '輪換失敗'
      return { success: false, message, error: message }
    }
  }
}
