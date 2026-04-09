// src/Modules/Contract/Application/Services/ListContractsService.ts
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { IContractRepository } from '../../Domain/Repositories/IContractRepository'
import type { ContractListResponse } from '../DTOs/ContractDTO'

export class ListContractsService {
  constructor(
    private readonly contractRepo: IContractRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
  ) {}

  async execute(targetId: string, callerUserId: string, callerSystemRole: string): Promise<ContractListResponse> {
    try {
      if (callerSystemRole !== 'admin') {
        const authResult = await this.orgAuth.requireOrgMembership(targetId, callerUserId, callerSystemRole)
        if (!authResult.authorized) {
          return {
            success: false,
            message: '無權檢視此組織的合約',
            error: authResult.error ?? 'NOT_ORG_MEMBER',
          }
        }
      }

      const contracts = await this.contractRepo.findByTargetId(targetId)
      return {
        success: true,
        message: '查詢成功',
        data: contracts.map((c) => c.toDTO()),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '查詢失敗'
      return { success: false, message, error: message }
    }
  }
}
