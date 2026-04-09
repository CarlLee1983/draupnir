// src/Modules/Credit/Application/DTOs/CreditDTO.ts
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
