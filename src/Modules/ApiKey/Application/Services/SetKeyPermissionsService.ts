import type { IApiKeyRepository } from '../../Domain/Repositories/IApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { ApiKeyBifrostSync } from '../../Infrastructure/Services/ApiKeyBifrostSync'
import { KeyScope } from '../../Domain/ValueObjects/KeyScope'
import type { SetKeyPermissionsRequest, ApiKeyResponse } from '../DTOs/ApiKeyDTO'

export class SetKeyPermissionsService {
  constructor(
    private readonly apiKeyRepository: IApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
    private readonly bifrostSync: ApiKeyBifrostSync,
  ) {}

  async execute(request: SetKeyPermissionsRequest): Promise<ApiKeyResponse> {
    try {
      const apiKey = await this.apiKeyRepository.findById(request.keyId)
      if (!apiKey) {
        return { success: false, message: 'Key 不存在', error: 'KEY_NOT_FOUND' }
      }

      const authResult = await this.orgAuth.requireOrgMembership(
        apiKey.orgId,
        request.callerUserId,
        request.callerSystemRole,
      )
      if (!authResult.authorized) {
        return {
          success: false,
          message: '無權操作此 Key',
          error: authResult.error ?? 'NOT_ORG_MEMBER',
        }
      }

      const newScope = KeyScope.create({
        allowedModels: request.allowedModels,
        rateLimitRpm: request.rateLimitRpm,
        rateLimitTpm: request.rateLimitTpm,
      })

      const updated = apiKey.updateScope(newScope)
      await this.apiKeyRepository.update(updated)
      await this.bifrostSync.syncPermissions(apiKey.gatewayKeyId, newScope)

      return { success: true, message: '權限已更新', data: updated.toDTO() }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '更新失敗'
      return { success: false, message, error: message }
    }
  }
}
