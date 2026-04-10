// src/Modules/Credit/Application/Services/GetTransactionHistoryService.ts
import type { ICreditAccountRepository } from '../../Domain/Repositories/ICreditAccountRepository'
import type { ICreditTransactionRepository } from '../../Domain/Repositories/ICreditTransactionRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { CreditTransactionPresenter, type TransactionHistoryResponse } from '../DTOs/CreditDTO'

export class GetTransactionHistoryService {
  constructor(
    private readonly accountRepo: ICreditAccountRepository,
    private readonly txRepo: ICreditTransactionRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
  ) {}

  async execute(
    orgId: string,
    callerUserId: string,
    callerSystemRole: string,
    page = 1,
    limit = 20,
  ): Promise<TransactionHistoryResponse> {
    try {
      const authResult = await this.orgAuth.requireOrgMembership(
        orgId,
        callerUserId,
        callerSystemRole,
      )
      if (!authResult.authorized) {
        return { success: false, message: '無權存取', error: 'NOT_ORG_MEMBER' }
      }

      const account = await this.accountRepo.findByOrgId(orgId)
      if (!account) {
        return {
          success: true,
          message: '查詢成功',
          data: { transactions: [], total: 0, page, limit },
        }
      }

      const offset = (page - 1) * limit
      const [transactions, total] = await Promise.all([
        this.txRepo.findByAccountId(account.id, limit, offset),
        this.txRepo.countByAccountId(account.id),
      ])

      return {
        success: true,
        message: '查詢成功',
        data: {
          transactions: transactions.map((t) => CreditTransactionPresenter.fromEntity(t)),
          total,
          page,
          limit,
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '查詢失敗'
      return { success: false, message, error: message }
    }
  }
}
