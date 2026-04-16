// src/Modules/Contract/Application/Services/AdjustContractQuotaService.ts

import type { IContractRepository } from '../../Domain/Repositories/IContractRepository'
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'

export interface QuotaChangeEntry {
  keyId: string
  oldAllocated: number
  newAllocated: number
}

export interface AdjustQuotaResult {
  success: boolean
  message: string
  data?: {
    contractId: string
    oldCap: number
    newCap: number
    changes: QuotaChangeEntry[]
    hardBlockedKeyIds: string[]
  }
  error?: string
}

export interface AdjustQuotaInput {
  contractId: string
  newCap: number
  callerRole: string
}

/**
 * AdjustContractQuotaService
 *
 * 實作 §5.3 配額調整演算法：
 * - 只允許 admin 呼叫
 * - newCap >= sumAllocated：只更新合約上限，不動 key
 * - newCap < sumAllocated：依比例縮減各 key 的 quotaAllocated，
 *   最後一個 key 補上尾差確保 Σ = newCap
 */
export class AdjustContractQuotaService {
  constructor(
    private readonly contractRepo: IContractRepository,
    private readonly keyRepo: IApiKeyRepository,
  ) {}

  async execute(input: AdjustQuotaInput): Promise<AdjustQuotaResult> {
    const { contractId, newCap, callerRole } = input

    // 權限檢查
    if (callerRole !== 'admin') {
      return {
        success: false,
        message: 'Only admins can adjust contract quotas',
        error: 'FORBIDDEN',
      }
    }

    // 基本參數驗證
    if (newCap < 0) {
      return {
        success: false,
        message: 'newCap cannot be negative',
        error: 'INVALID_INPUT',
      }
    }

    try {
      const contract = await this.contractRepo.findById(contractId)
      if (!contract) {
        return {
          success: false,
          message: 'Contract not found',
          error: 'NOT_FOUND',
        }
      }

      const oldCap = contract.terms.creditQuota
      const keys = await this.keyRepo.findActiveByOrgId(contract.targetId)
      const sumAllocated = keys.reduce((sum, k) => sum + k.quotaAllocated, 0)

      const changes: QuotaChangeEntry[] = []
      const hardBlockedKeyIds: string[] = []

      // 更新合約上限
      const updatedContract = contract.adjustCreditQuota(newCap)
      await this.contractRepo.update(updatedContract)

      if (newCap < sumAllocated && keys.length > 0) {
        // §5.3 比例縮減演算法
        // 最後一個 key 補尾差，確保 ΣnewAllocated = newCap
        let runningSum = 0

        for (let idx = 0; idx < keys.length; idx++) {
          const key = keys[idx]
          const isLast = idx === keys.length - 1
          let newAlloc: number

          if (isLast) {
            // 尾差補足，確保總和精確等於 newCap
            newAlloc = newCap - runningSum
          } else {
            newAlloc = sumAllocated > 0
              ? Math.round((key.quotaAllocated / sumAllocated) * newCap)
              : 0
          }

          runningSum += newAlloc

          const updatedKey = key.adjustQuotaAllocated(newAlloc)
          await this.keyRepo.update(updatedKey)

          changes.push({
            keyId: key.id,
            oldAllocated: key.quotaAllocated,
            newAllocated: newAlloc,
          })
        }
      }

      return {
        success: true,
        message: 'Contract quota adjusted',
        data: {
          contractId,
          oldCap,
          newCap,
          changes,
          hardBlockedKeyIds,
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Adjustment failed'
      return {
        success: false,
        message,
        error: message,
      }
    }
  }
}
