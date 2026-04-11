// src/Modules/Contract/Application/Services/ListAdminContractsService.ts
import type { IContractRepository } from '../../Domain/Repositories/IContractRepository'
import { ContractPresenter } from '../DTOs/ContractDTO'

/** Admin contract list query with optional status filter and pagination. */
export interface ListAdminContractsQuery {
  callerRole: string
  page?: number
  limit?: number
  status?: string
}

/** Admin contract list response with contracts and pagination meta. */
export interface ListAdminContractsResponse {
  success: boolean
  message: string
  data?: {
    contracts: Record<string, unknown>[]
    meta: { total: number; page: number; limit: number; totalPages: number }
  }
  error?: string
}

/**
 * Lists all contracts for admin callers with optional status filter and in-memory pagination.
 */
export class ListAdminContractsService {
  constructor(private readonly contractRepo: IContractRepository) {}

  /**
   * Returns a paginated contract list for `query` when the caller is an admin.
   */
  async execute(query: ListAdminContractsQuery): Promise<ListAdminContractsResponse> {
    try {
      if (query.callerRole !== 'admin') {
        return { success: false, message: 'Only admins can view the contract list', error: 'FORBIDDEN' }
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
        message: 'Query successful',
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
      const message = error instanceof Error ? error.message : 'Query failed'
      return { success: false, message, error: message }
    }
  }
}
