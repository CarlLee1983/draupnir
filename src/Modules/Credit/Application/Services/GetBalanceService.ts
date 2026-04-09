// src/Modules/Credit/Application/Services/GetBalanceService.ts
import type { ICreditAccountRepository } from '../../Domain/Repositories/ICreditAccountRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { BalanceResponse } from '../DTOs/CreditDTO'

export class GetBalanceService {
  constructor(
    private readonly accountRepo: ICreditAccountRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
  ) {}

  async execute(orgId: string, callerUserId: string, callerSystemRole: string): Promise<BalanceResponse> {
    try {
      const authResult = await this.orgAuth.requireOrgMembership(orgId, callerUserId, callerSystemRole)
      if (!authResult.authorized) {
        return { success: false, message: '無權存取此組織', error: 'NOT_ORG_MEMBER' }
      }

      const account = await this.accountRepo.findByOrgId(orgId)
      if (!account) {
        return {
          success: true,
          message: '查詢成功',
          data: { balance: '0', lowBalanceThreshold: '100', status: 'active' },
        }
      }

      return {
        success: true,
        message: '查詢成功',
        data: {
          balance: account.balance,
          lowBalanceThreshold: account.lowBalanceThreshold,
          status: account.status,
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '查詢失敗'
      return { success: false, message, error: message }
    }
  }
}
