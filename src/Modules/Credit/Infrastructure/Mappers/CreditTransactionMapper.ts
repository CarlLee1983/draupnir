// src/Modules/Credit/Infrastructure/Mappers/CreditTransactionMapper.ts
import type { CreditTransaction } from '../../Domain/Entities/CreditTransaction'

export const CreditTransactionMapper = {
  toDatabaseRow(entity: CreditTransaction): Record<string, unknown> {
    return {
      id: entity.id,
      credit_account_id: entity.creditAccountId,
      type: entity.type,
      amount: entity.amount,
      balance_after: entity.balanceAfter,
      reference_type: entity.referenceType,
      reference_id: entity.referenceId,
      description: entity.description,
      created_at: entity.createdAt.toISOString(),
    }
  },
}
