import type { Contract } from '../../Domain/Aggregates/Contract'

export class ContractMapper {
  static toDatabaseRow(entity: Contract): Record<string, unknown> {
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
  }
}
