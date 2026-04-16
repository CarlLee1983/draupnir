// src/Modules/ApiKey/Application/Services/SumQuotaAllocatedForOrgService.ts
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { IApiKeyRepository } from '../../Domain/Repositories/IApiKeyRepository'

export interface SumQuotaAllocatedResponse {
  success: boolean
  message: string
  /** Sum of `quota_allocated` on **active** keys (see `AdjustContractQuotaService`). */
  data?: { totalAllocated: number }
  error?: string
}

export class SumQuotaAllocatedForOrgService {
  constructor(
    private readonly apiKeyRepository: IApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
  ) {}

  async execute(
    orgId: string,
    callerUserId: string,
    callerSystemRole: string,
  ): Promise<SumQuotaAllocatedResponse> {
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

      const totalAllocated = await this.apiKeyRepository.sumQuotaAllocatedActiveByOrgId(orgId)
      return {
        success: true,
        message: 'Query successful',
        data: { totalAllocated },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Query failed'
      return { success: false, message, error: message }
    }
  }
}
