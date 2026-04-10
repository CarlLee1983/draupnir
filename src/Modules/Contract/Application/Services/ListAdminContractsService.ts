// src/Modules/Contract/Application/Services/ListAdminContractsService.ts
import type { IContractRepository } from '../../Domain/Repositories/IContractRepository'
import { ContractPresenter } from '../DTOs/ContractDTO'

export interface ListAdminContractsQuery {
  callerRole: string
  page?: number
  limit?: number
  status?: string
}

export interface ListAdminContractsResponse {
  success: boolean
  message: string
  data?: {
    contracts: Record<string, unknown>[]
    meta: { total: number; page: number; limit: number; totalPages: number }
  }
  error?: string
}

export class ListAdminContractsService {
  constructor(private readonly contractRepo: IContractRepository) {}

  async execute(query: ListAdminContractsQuery): Promise<ListAdminContractsResponse> {
    try {
      if (query.callerRole !== 'admin') {
        return { success: false, message: '僅管理者可檢視合約列表', error: 'FORBIDDEN' }
      }

      const page = query.page ?? 1
      const limit = query.limit ?? 20
      const statusFilter = query.status?.trim()

      const all = await this.contractRepo.findAllOrdered()
      const filtered = statusFilter ? all.filter((c) => c.status === statusFilter) : all

      const total = filtered.length
      const offset = (page - 1) * limit
      const slice = filtered.slice(offset, offset + limit)
      const contracts = slice.map((c) => ContractPresenter.fromEntity(c))

      return {
        success: true,
        message: '查詢成功',
        data: {
          contracts,
          meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 0,
          },
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '查詢失敗'
      return { success: false, message, error: message }
    }
  }
}
