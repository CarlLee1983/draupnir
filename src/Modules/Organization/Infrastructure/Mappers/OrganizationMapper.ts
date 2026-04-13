import { Organization } from '../../Domain/Aggregates/Organization'

function toDate(value: unknown): Date {
  if (value instanceof Date) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    if (!isNaN(d.getTime())) return d
  }
  return new Date()
}

export class OrganizationMapper {
  /** 將資料庫 row 映射為 Organization Aggregate。 */
  static toEntity(row: Record<string, unknown>): Organization {
    return Organization.reconstitute({
      id: String(row.id),
      name: String(row.name),
      slug: String(row.slug),
      description: String(row.description ?? ''),
      status: row.status as 'active' | 'suspended',
      createdAt: toDate(row.created_at),
      updatedAt: toDate(row.updated_at),
    })
  }

  static toDatabaseRow(entity: Organization): Record<string, unknown> {
    return {
      id: entity.id,
      name: entity.name,
      slug: entity.slug,
      description: entity.description,
      status: entity.status,
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString(),
    }
  }
}
