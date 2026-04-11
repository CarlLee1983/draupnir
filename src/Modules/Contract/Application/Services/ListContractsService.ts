// src/Modules/Contract/Application/Services/ListContractsService.ts
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { IContractRepository } from '../../Domain/Repositories/IContractRepository'
import { ContractPresenter, type ContractListResponse } from '../DTOs/ContractDTO'

export class ListContractsService {
  constructor(
    private readonly contractRepo: IContractRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
  ) {}

  async execute(
    targetId: string,
    callerUserId: string,
    callerSystemRole: string,
  ): Promise<ContractListResponse> {
    try {
      if (callerSystemRole !== 'admin') {
        const authResult = await this.orgAuth.requireOrgMembership(
          targetId,
          callerUserId,
          callerSystemRole,
        )
        if (!authResult.authorized) {
          return {
            success: false,
            message: 'Unauthorized to view contracts for this organization',
            error: authResult.error ?? 'NOT_ORG_MEMBER',
          }
        }
      }

      const contracts = await this.contractRepo.findByTargetId(targetId)
      return {
        success: true,
        message: 'Query successful',
        data: contracts.map((c) => ContractPresenter.fromEntity(c)),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Query failed'
      return { success: false, message, error: message }
    }
  }
}
