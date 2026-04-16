// NOTE (spec §7.1): Member 以 keyId 讀取單把 key 時，必須驗證
//   assigned_member_id = caller.userId AND orgId = caller.membership.orgId
// 未來若新增 GetApiKeyDetail service，務必加入上述檢查。

import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { IApiKeyRepository } from '../../Domain/Repositories/IApiKeyRepository'
import { ApiKeyPresenter, type ListApiKeysResponse } from '../DTOs/ApiKeyDTO'

export interface ListApiKeysFilter {
  /** 限縮到被指派給某 user 的 key（Member portal 使用）。 */
  assignedMemberId?: string
}

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
    filter?: ListApiKeysFilter,
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
          message: 'No permission to access keys for this organization',
          error: authResult.error ?? 'NOT_ORG_MEMBER',
        }
      }

      const offset = (page - 1) * limit
      const useAssignedFilter =
        typeof filter?.assignedMemberId === 'string' && filter.assignedMemberId.length > 0

      const [keys, total] = await Promise.all([
        useAssignedFilter
          ? this.apiKeyRepository.findByOrgAndAssignedMember(orgId, filter!.assignedMemberId!, limit, offset)
          : this.apiKeyRepository.findByOrgId(orgId, limit, offset),
        useAssignedFilter
          ? this.apiKeyRepository.countByOrgAndAssignedMember(orgId, filter!.assignedMemberId!)
          : this.apiKeyRepository.countByOrgId(orgId),
      ])

      return {
        success: true,
        message: 'Query successful',
        data: {
          keys: keys.map((k) => ApiKeyPresenter.fromEntity(k)),
          meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Query failed'
      return { success: false, message, error: message }
    }
  }
}
