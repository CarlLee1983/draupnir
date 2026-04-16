/**
 * AssignApiKeyService
 * Application Service: 指派或取消指派 API Key 給組織成員。
 *
 * Responsibilities:
 * - 驗證呼叫者是組織 Manager
 * - 確認 key 存在且屬於該組織
 * - 驗證指派目標是組織的 member（v1 僅接受 role=member）
 * - 執行 assignTo / unassign 並持久化
 */

import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { IOrganizationMemberRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository'
import type { IApiKeyRepository } from '../../Domain/Repositories/IApiKeyRepository'

export interface AssignApiKeyRequest {
  keyId: string
  orgId: string
  /** `null` = 取消指派 */
  assigneeUserId: string | null
  callerUserId: string
  callerSystemRole: string
}

export interface AssignApiKeyResponse {
  success: boolean
  message: string
  error?: string
}

export class AssignApiKeyService {
  constructor(
    private readonly apiKeyRepository: IApiKeyRepository,
    private readonly memberRepository: IOrganizationMemberRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
  ) {}

  async execute(req: AssignApiKeyRequest): Promise<AssignApiKeyResponse> {
    try {
      const authResult = await this.orgAuth.requireOrgManager(
        req.orgId,
        req.callerUserId,
        req.callerSystemRole,
      )
      if (!authResult.authorized) {
        return {
          success: false,
          message: 'Insufficient permissions',
          error: authResult.error ?? 'NOT_ORG_MANAGER',
        }
      }

      const key = await this.apiKeyRepository.findById(req.keyId)
      if (!key) {
        return { success: false, message: 'Key not found', error: 'KEY_NOT_FOUND' }
      }
      if (key.orgId !== req.orgId) {
        return {
          success: false,
          message: 'Key does not belong to this organization',
          error: 'CROSS_ORG_ASSIGNMENT',
        }
      }

      let updated = key
      if (req.assigneeUserId === null) {
        updated = key.unassign()
      } else {
        const member = await this.memberRepository.findByUserAndOrgId(req.assigneeUserId, req.orgId)
        if (!member) {
          return {
            success: false,
            message: 'Assignee is not a member of this organization',
            error: 'INVALID_ASSIGNEE',
          }
        }
        if (member.role.getValue() !== 'member') {
          return {
            success: false,
            message: 'v1 only allows assigning to org members with role=member',
            error: 'INVALID_ASSIGNEE_ROLE',
          }
        }
        updated = key.assignTo(req.assigneeUserId)
      }

      await this.apiKeyRepository.update(updated)
      return { success: true, message: 'Assignment updated' }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Assignment failed'
      return { success: false, message, error: message }
    }
  }
}
