import type { Contract } from '../../Domain/Aggregates/Contract'

/** Maps contract aggregates to `contracts` table row shape (JSON-serialized terms). */
export const ContractMapper = {
  /** Flattens an aggregate into columns for insert/update. */
  toDatabaseRow(entity: Contract): Record<string, unknown> {
    return {
      id: entity.id,
      target_type: entity.targetType,
      target_id: entity.targetId,
      status: entity.status,
      terms: JSON.stringify(entity.terms.toJSON()),
      created_by: entity.createdBy,
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString(),
    }
  },
}
