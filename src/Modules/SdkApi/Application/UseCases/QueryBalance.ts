import type { ICreditAccountRepository } from '@/Modules/Credit/Domain/Repositories/ICreditAccountRepository'
import type { AppAuthContext, BalanceQueryResponse } from '../DTOs/SdkApiDTO'

export class QueryBalance {
  constructor(private readonly creditAccountRepo: ICreditAccountRepository) {}

  async execute(auth: AppAuthContext): Promise<BalanceQueryResponse> {
    try {
      const account = await this.creditAccountRepo.findByOrgId(auth.orgId)

      if (!account) {
        return {
          success: true,
          message: 'Query successful',
          data: { balance: '0', lowBalanceThreshold: '100', status: 'active' },
        }
      }

      return {
        success: true,
        message: 'Query successful',
        data: {
          balance: account.balance,
          lowBalanceThreshold: account.lowBalanceThreshold,
          status: account.status,
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to query balance'
      return { success: false, message, error: 'BALANCE_QUERY_ERROR' }
    }
  }
}
