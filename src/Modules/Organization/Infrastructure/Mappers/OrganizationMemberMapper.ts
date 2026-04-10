import type { OrganizationMember } from '../../Domain/Entities/OrganizationMember'

export class OrganizationMemberMapper {
  static toDatabaseRow(entity: OrganizationMember): Record<string, unknown> {
    return {
      id: entity.id,
      organization_id: entity.organizationId,
      user_id: entity.userId,
      role: entity.role,
      joined_at: entity.joinedAt.toISOString(),
      created_at: entity.createdAt.toISOString(),
    }
  }
}
