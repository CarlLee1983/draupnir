// src/Modules/Contract/Application/Services/GetActiveOrgContractQuotaService.ts
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { IContractRepository } from '../../Domain/Repositories/IContractRepository'

export interface ActiveOrgContractQuotaData {
  /** Current contract `creditQuota` (org-level pool cap). */
  contractQuota: number
  contractId: string | null
}

export interface ActiveOrgContractQuotaResponse {
  success: boolean
  message: string
  data?: ActiveOrgContractQuotaData
  error?: string
}

/**
 * Returns the active contract credit quota for an organization when the caller
 * is a member (or passes org membership checks used elsewhere for managers).
 */
export class GetActiveOrgContractQuotaService {
  constructor(
    private readonly contractRepo: IContractRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
  ) {}

  async execute(
    orgId: string,
    callerUserId: string,
    callerSystemRole: string,
  ): Promise<ActiveOrgContractQuotaResponse> {
    try {
      const authResult = await this.orgAuth.requireOrgMembership(
        orgId,
        callerUserId,
        callerSystemRole,
      )
      if (!authResult.authorized) {
        return {
          success: false,
          message: 'Unauthorized access to this organization',
          error: authResult.error ?? 'NOT_ORG_MEMBER',
        }
      }

      const contract = await this.contractRepo.findActiveByTargetId(orgId)
      if (!contract) {
        return {
          success: true,
          message: 'Success',
          data: { contractQuota: 0, contractId: null },
        }
      }

      return {
        success: true,
        message: 'Success',
        data: {
          contractQuota: contract.terms.creditQuota,
          contractId: contract.id,
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Query failed'
      return { success: false, message, error: message }
    }
  }
}
