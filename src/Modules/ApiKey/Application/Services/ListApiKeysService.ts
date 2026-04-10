import type { IApiKeyRepository } from '../../Domain/Repositories/IApiKeyRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { ApiKeyPresenter, type ListApiKeysResponse } from '../DTOs/ApiKeyDTO'

export class ListApiKeysService {
  constructor(
    private readonly apiKeyRepository: IApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
  ) {}

  async execute(
    orgId: string,
    callerUserId: string,
    callerSystemRole: string,
    page = 1,
    limit = 20,
  ): Promise<ListApiKeysResponse> {
    try {
      const authResult = await this.orgAuth.requireOrgMembership(
        orgId,
        callerUserId,
        callerSystemRole,
      )
      if (!authResult.authorized) {
        return {
          success: false,
          message: '無權存取此組織的 Keys',
          error: authResult.error ?? 'NOT_ORG_MEMBER',
        }
      }

      const offset = (page - 1) * limit
      const [keys, total] = await Promise.all([
        this.apiKeyRepository.findByOrgId(orgId, limit, offset),
        this.apiKeyRepository.countByOrgId(orgId),
      ])

      return {
        success: true,
        message: '查詢成功',
        data: {
          keys: keys.map((k) => ApiKeyPresenter.fromEntity(k)),
          meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '查詢失敗'
      return { success: false, message, error: message }
    }
  }
}
