// src/Modules/Credit/Application/DTOs/CreditDTO.ts
import type { CreditTransaction } from '../../Domain/Entities/CreditTransaction'

export class CreditTransactionPresenter {
  static fromEntity(entity: CreditTransaction): Record<string, unknown> {
    return {
      id: entity.id,
      creditAccountId: entity.creditAccountId,
      type: entity.type,
      amount: entity.amount,
      balanceAfter: entity.balanceAfter,
      referenceType: entity.referenceType,
      referenceId: entity.referenceId,
      description: entity.description,
      createdAt: entity.createdAt.toISOString(),
    }
  }
}

export interface TopUpRequest {
  orgId: string
  amount: string
  description?: string
  callerUserId: string
  callerSystemRole: string
}

export interface CreditResponse {
  success: boolean
  message: string
  data?: Record<string, unknown>
  error?: string
}

export interface BalanceResponse {
  success: boolean
  message: string
  data?: {
    balance: string
    lowBalanceThreshold: string
    status: string
  }
  error?: string
}

export interface TransactionHistoryResponse {
  success: boolean
  message: string
  data?: {
    transactions: Record<string, unknown>[]
    total: number
    page: number
    limit: number
  }
  error?: string
}
