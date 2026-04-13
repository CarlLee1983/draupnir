import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { IApiKeyRepository } from '../../Domain/Repositories/IApiKeyRepository'
import { KeyScope } from '../../Domain/ValueObjects/KeyScope'
import {
  ApiKeyPresenter,
  type ApiKeyResponse,
  type SetKeyPermissionsRequest,
} from '../DTOs/ApiKeyDTO'
import type { IBifrostKeySync } from '../Ports/IBifrostKeySync'

export class SetKeyPermissionsService {
  constructor(
    private readonly apiKeyRepository: IApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
    private readonly bifrostSync: IBifrostKeySync,
  ) {}

  async execute(request: SetKeyPermissionsRequest): Promise<ApiKeyResponse> {
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

      const newScope = KeyScope.create({
        allowedModels: request.allowedModels,
        rateLimitRpm: request.rateLimitRpm,
        rateLimitTpm: request.rateLimitTpm,
      })

      const updated = apiKey.updateScope(newScope)
      await this.apiKeyRepository.update(updated)
      await this.bifrostSync.syncPermissions(apiKey.gatewayKeyId, newScope)

      return {
        success: true,
        message: 'Permissions updated successfully',
        data: ApiKeyPresenter.fromEntity(updated),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Update failed'
      return { success: false, message, error: message }
    }
  }
}
