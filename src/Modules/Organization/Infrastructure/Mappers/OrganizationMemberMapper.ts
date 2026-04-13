import { OrganizationMember } from '../../Domain/Entities/OrganizationMember'
import { OrgMemberRole } from '../../Domain/ValueObjects/OrgMemberRole'

function toDate(value: unknown): Date {
  if (value instanceof Date) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    if (!isNaN(d.getTime())) return d
  }
  return new Date()
}

export class OrganizationMemberMapper {
  /** 將資料庫 row 映射為 OrganizationMember Entity。 */
  static toEntity(row: Record<string, unknown>): OrganizationMember {
    return OrganizationMember.reconstitute({
      id: String(row.id),
      organizationId: String(row.organization_id),
      userId: String(row.user_id),
      role: new OrgMemberRole(String(row.role)),
      joinedAt: toDate(row.joined_at),
      createdAt: toDate(row.created_at),
    })
  }

  static toDatabaseRow(entity: OrganizationMember): Record<string, unknown> {
    return {
      id: entity.id,
      organization_id: entity.organizationId,
      user_id: entity.userId,
      role: entity.role.getValue(),
      joined_at: entity.joinedAt.toISOString(),
      created_at: entity.createdAt.toISOString(),
    }
  }
}
