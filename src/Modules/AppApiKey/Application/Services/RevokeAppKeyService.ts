import type { IAppApiKeyRepository } from '../../Domain/Repositories/IAppApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { IAppKeyBifrostSync } from '../Ports/IAppKeyBifrostSync'
import {
  AppApiKeyPresenter,
  type RevokeAppKeyRequest,
  type AppApiKeyResponse,
} from '../DTOs/AppApiKeyDTO'

export class RevokeAppKeyService {
  constructor(
    private readonly appApiKeyRepository: IAppApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
    private readonly bifrostSync: IAppKeyBifrostSync,
  ) {}

  async execute(request: RevokeAppKeyRequest): Promise<AppApiKeyResponse> {
    try {
      const key = await this.appApiKeyRepository.findById(request.keyId)
      if (!key) {
        return { success: false, message: 'App Key not found', error: 'KEY_NOT_FOUND' }
      }

      const authResult = await this.orgAuth.requireOrgMembership(
        key.orgId,
        request.callerUserId,
        request.callerSystemRole,
      )
      if (!authResult.authorized) {
        return {
          success: false,
          message: 'You are not a member of this organization',
          error: authResult.error ?? 'NOT_ORG_MEMBER',
        }
      }

      await this.bifrostSync.deactivateVirtualKey(key.gatewayKeyId)
      if (key.previousGatewayKeyId) {
        await this.bifrostSync.deactivateVirtualKey(key.previousGatewayKeyId)
      }

      const revoked = key.revoke()
      await this.appApiKeyRepository.update(revoked)

      return {
        success: true,
        message: 'App Key revoked successfully',
        data: AppApiKeyPresenter.fromEntity(revoked),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Revoke failed'
      return { success: false, message, error: message }
    }
  }
}
