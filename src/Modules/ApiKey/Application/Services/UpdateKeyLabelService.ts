import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { IApiKeyRepository } from '../../Domain/Repositories/IApiKeyRepository'
import { type ApiKeyResponse, fromEntity, type UpdateKeyLabelRequest } from '../DTOs/ApiKeyDTO'

export class UpdateKeyLabelService {
  constructor(
    private readonly apiKeyRepository: IApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
  ) {}

  async execute(request: UpdateKeyLabelRequest): Promise<ApiKeyResponse> {
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

      const updated = apiKey.updateLabel(request.label)
      await this.apiKeyRepository.update(updated)

      return {
        success: true,
        message: 'Label updated successfully',
        data: fromEntity(updated),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Update failed'
      return { success: false, message, error: message }
    }
  }
}
