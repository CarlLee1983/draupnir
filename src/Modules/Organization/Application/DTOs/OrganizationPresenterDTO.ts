import type { Organization } from '../../Domain/Aggregates/Organization'
import type { OrganizationInvitation } from '../../Domain/Entities/OrganizationInvitation'
import type { OrganizationMember } from '../../Domain/Entities/OrganizationMember'

export const OrganizationPresenter = {
  fromEntity(entity: Organization): Record<string, unknown> {
    return {
      id: entity.id,
      name: entity.name,
      slug: entity.slug,
      description: entity.description,
      status: entity.status,
      gatewayTeamId: entity.gatewayTeamId,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    }
  },
}

export const OrganizationMemberPresenter = {
  fromEntity(entity: OrganizationMember): Record<string, unknown> {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      userId: entity.userId,
      role: entity.role.getValue(),
      joinedAt: entity.joinedAt.toISOString(),
    }
  },
}

export const OrganizationInvitationPresenter = {
  fromEntity(entity: OrganizationInvitation): Record<string, unknown> {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      email: entity.email,
      role: entity.role.getValue(),
      status: entity.status.getValue(),
      expiresAt: entity.expiresAt.toISOString(),
      createdAt: entity.createdAt.toISOString(),
    }
  },
}
