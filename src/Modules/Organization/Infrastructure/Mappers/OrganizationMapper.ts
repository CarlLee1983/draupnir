import { Organization } from '../../Domain/Aggregates/Organization'

function toDate(value: unknown): Date {
  if (value instanceof Date) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    if (!Number.isNaN(d.getTime())) return d
  }
  return new Date()
}

export const OrganizationMapper = {
  /** 將資料庫 row 映射為 Organization Aggregate。 */
  toEntity(row: Record<string, unknown>): Organization {
    return Organization.reconstitute({
      id: String(row.id),
      name: String(row.name),
      slug: String(row.slug),
      description: String(row.description ?? ''),
      status: row.status as 'active' | 'suspended',
      gatewayTeamId: row.gateway_team_id == null ? null : String(row.gateway_team_id),
      createdAt: toDate(row.created_at),
      updatedAt: toDate(row.updated_at),
    })
  },

  toDatabaseRow(entity: Organization): Record<string, unknown> {
    return {
      id: entity.id,
      name: entity.name,
      slug: entity.slug,
      description: entity.description,
      status: entity.status,
      gateway_team_id: entity.gatewayTeamId,
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString(),
    }
  },
}
