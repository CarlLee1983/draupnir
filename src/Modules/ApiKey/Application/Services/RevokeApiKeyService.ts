import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { IApiKeyRepository } from '../../Domain/Repositories/IApiKeyRepository'
import { type ApiKeyResponse, fromEntity, type RevokeApiKeyRequest } from '../DTOs/ApiKeyDTO'
import type { IBifrostKeySync } from '../Ports/IBifrostKeySync'

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
        return { success: false, message: 'Key not found', error: 'KEY_NOT_FOUND' }
      }

      const authResult = await this.orgAuth.requireOrgMembership(
        apiKey.orgId,
        request.callerUserId,
        request.callerSystemRole,
      )
      if (!authResult.authorized) {
        return {
          success: false,
          message: 'No permission to operate this key',
          error: authResult.error ?? 'NOT_ORG_MEMBER',
        }
      }

      if (apiKey.status === 'revoked') {
        return {
          success: false,
          message: 'This key has already been revoked',
          error: 'ALREADY_REVOKED',
        }
      }

      if (apiKey.gatewayKeyId) {
        await this.bifrostSync.deactivateVirtualKey(apiKey.gatewayKeyId)
      }

      const revoked = apiKey.revoke()
      await this.apiKeyRepository.update(revoked)

      return {
        success: true,
        message: 'Key revoked successfully',
        data: fromEntity(revoked),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Revoke failed'
      return { success: false, message, error: message }
    }
  }
}
