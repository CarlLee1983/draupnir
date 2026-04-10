import type { Organization } from '../../Domain/Aggregates/Organization'

export class OrganizationMapper {
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
