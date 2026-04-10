import type { IApiKeyRepository } from '../../Domain/Repositories/IApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { IBifrostKeySync } from '../Ports/IBifrostKeySync'
import { ApiKeyPresenter, type RevokeApiKeyRequest, type ApiKeyResponse } from '../DTOs/ApiKeyDTO'

export class RevokeApiKeyService {
  constructor(
    private readonly apiKeyRepository: IApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
    private readonly bifrostSync: IBifrostKeySync,
  ) {}

  async execute(request: RevokeApiKeyRequest): Promise<ApiKeyResponse> {
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

      if (apiKey.status === 'revoked') {
        return { success: false, message: '此 Key 已撤銷', error: 'ALREADY_REVOKED' }
      }

      if (apiKey.gatewayKeyId) {
        await this.bifrostSync.deactivateVirtualKey(apiKey.gatewayKeyId)
      }

      const revoked = apiKey.revoke()
      await this.apiKeyRepository.update(revoked)

      return { success: true, message: 'Key 已撤銷', data: ApiKeyPresenter.fromEntity(revoked) }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '撤銷失敗'
      return { success: false, message, error: message }
    }
  }
}
