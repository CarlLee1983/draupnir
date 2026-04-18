import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { ICreditAccountRepository } from '../../Domain/Repositories/ICreditAccountRepository'
import type { ICreditTransactionRepository } from '../../Domain/Repositories/ICreditTransactionRepository'
import type { DeductCreditService } from './DeductCreditService'

export interface ApplyUsageChargesRequest {
  readonly orgIds: readonly string[]
  readonly startTime?: string
  readonly endTime?: string
}

export interface ApplyUsageChargesResponse {
  readonly processedOrgs: number
  readonly chargedCount: number
  readonly skippedCount: number
  readonly missingAccountOrgIds: readonly string[]
}

interface UsageRecordRow {
  readonly id: string
  readonly bifrost_log_id?: string
  readonly credit_cost: number | string
  readonly occurred_at: string
}

export class ApplyUsageChargesService {
  constructor(
    private readonly accountRepo: ICreditAccountRepository,
    private readonly txRepo: ICreditTransactionRepository,
    private readonly deductCreditService: DeductCreditService,
    private readonly db: IDatabaseAccess,
  ) {}

  async execute(request: ApplyUsageChargesRequest): Promise<ApplyUsageChargesResponse> {
    const orgIds = [...new Set(request.orgIds.map((orgId) => orgId.trim()).filter(Boolean))]
    const missingAccountOrgIds: string[] = []
    let chargedCount = 0
    let skippedCount = 0

    for (const orgId of orgIds) {
      const account = await this.accountRepo.findByOrgId(orgId)
      if (!account) {
        missingAccountOrgIds.push(orgId)
        continue
      }

      const chargedUsageIds = new Set(
        await this.txRepo.findReferenceIdsByAccountAndReferenceType(
          account.id,
          'deduction',
          'usage_record',
        ),
      )

      let query = this.db.table('usage_records').where('org_id', '=', orgId)
      if (request.startTime && request.endTime) {
        query = query.whereBetween('occurred_at', [request.startTime, request.endTime])
      } else {
        if (request.startTime) {
          query = query.where('occurred_at', '>=', request.startTime)
        }
        if (request.endTime) {
          query = query.where('occurred_at', '<=', request.endTime)
        }
      }

      const rows: UsageRecordRow[] = (await query.orderBy('occurred_at', 'ASC').select()).map((row) => ({
        id: String(row.id),
        bifrost_log_id:
          typeof row.bifrost_log_id === 'string' ? row.bifrost_log_id : undefined,
        credit_cost:
          typeof row.credit_cost === 'number' || typeof row.credit_cost === 'string'
            ? row.credit_cost
            : '0',
        occurred_at: String(row.occurred_at),
      }))

      for (const row of rows) {
        if (chargedUsageIds.has(row.id)) {
          skippedCount++
          continue
        }

        const amount = normalizeAmount(row.credit_cost)
        if (Number(amount) <= 0) {
          skippedCount++
          continue
        }

        const result = await this.deductCreditService.execute({
          orgId,
          amount,
          referenceType: 'usage_record',
          referenceId: row.id,
          description: `Bifrost usage ${row.bifrost_log_id ?? row.id}`,
        })

        if (!result.success) {
          throw new Error(`Failed to deduct usage charge for org ${orgId}: ${result.error}`)
        }

        chargedUsageIds.add(row.id)
        chargedCount++
      }
    }

    return {
      processedOrgs: orgIds.length,
      chargedCount,
      skippedCount,
      missingAccountOrgIds,
    }
  }
}

function normalizeAmount(value: number | string): string {
  return typeof value === 'number' ? String(value) : value
}
