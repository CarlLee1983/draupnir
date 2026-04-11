import type { IAppApiKeyRepository } from '../../Domain/Repositories/IAppApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { AppKeyScope } from '../../Domain/ValueObjects/AppKeyScope'
import { BoundModules } from '../../Domain/ValueObjects/BoundModules'
import { AppApiKeyPresenter, type SetAppKeyScopeRequest, type AppApiKeyResponse } from '../DTOs/AppApiKeyDTO'

export class SetAppKeyScopeService {
  constructor(
    private readonly appApiKeyRepository: IAppApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
  ) {}

  async execute(request: SetAppKeyScopeRequest): Promise<AppApiKeyResponse> {
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

      let updated = key
      if (request.scope) {
        updated = updated.updateScope(AppKeyScope.from(request.scope))
      }
      if (request.boundModuleIds) {
        updated = updated.updateBoundModules(BoundModules.from(request.boundModuleIds))
      }

      await this.appApiKeyRepository.update(updated)

      return { success: true, message: 'Scope updated successfully', data: AppApiKeyPresenter.fromEntity(updated) }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '更新失敗'
      return { success: false, message, error: message }
    }
  }
}
