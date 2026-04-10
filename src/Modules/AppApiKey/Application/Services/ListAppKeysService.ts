import type { IAppApiKeyRepository } from '../../Domain/Repositories/IAppApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { AppApiKeyPresenter, type ListAppApiKeysResponse } from '../DTOs/AppApiKeyDTO'

export class ListAppKeysService {
  constructor(
    private readonly appApiKeyRepository: IAppApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
  ) {}

  async execute(
    orgId: string,
    callerUserId: string,
    callerSystemRole: string,
    page = 1,
    limit = 20,
  ): Promise<ListAppApiKeysResponse> {
    try {
      const authResult = await this.orgAuth.requireOrgMembership(
        orgId,
        callerUserId,
        callerSystemRole,
      )
      if (!authResult.authorized) {
        return {
          success: false,
          message: '你不是此組織的成員',
          error: authResult.error ?? 'NOT_ORG_MEMBER',
        }
      }

      const offset = (page - 1) * limit
      const [keys, total] = await Promise.all([
        this.appApiKeyRepository.findByOrgId(orgId, limit, offset),
        this.appApiKeyRepository.countByOrgId(orgId),
      ])

      return {
        success: true,
        message: '查詢成功',
        data: {
          keys: keys.map((k) => AppApiKeyPresenter.fromEntity(k)),
          meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '查詢失敗'
      return { success: false, message, error: message }
    }
  }
}
