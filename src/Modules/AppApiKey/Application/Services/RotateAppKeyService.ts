import type { IAppApiKeyRepository } from '../../Domain/Repositories/IAppApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { AppKeyBifrostSync } from '../../Infrastructure/Services/AppKeyBifrostSync'
import type { RotateAppKeyRequest, AppApiKeyCreatedResponse } from '../DTOs/AppApiKeyDTO'

export class RotateAppKeyService {
  constructor(
    private readonly appApiKeyRepository: IAppApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
    private readonly bifrostSync: AppKeyBifrostSync,
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

      const { gatewayKeyId: newGatewayKeyId } = await this.bifrostSync.createVirtualKey(
        key.label,
        key.orgId,
      )

      const rotated = await key.rotate(newRawKey, newGatewayKeyId)
      await this.appApiKeyRepository.update(rotated)

      return {
        success: true,
        message: 'Key 輪換成功，舊 Key 在寬限期內仍可使用',
        data: { ...rotated.toDTO(), rawKey: newRawKey },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '輪換失敗'
      return { success: false, message, error: message }
    }
  }
}
