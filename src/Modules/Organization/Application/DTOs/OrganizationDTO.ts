import type { Organization } from '../../Domain/Aggregates/Organization'
import type { OrganizationInvitation } from '../../Domain/Entities/OrganizationInvitation'
import type { OrganizationMember } from '../../Domain/Entities/OrganizationMember'

export class OrganizationPresenter {
  static fromEntity(entity: Organization): Record<string, unknown> {
    return {
      id: entity.id,
      name: entity.name,
      slug: entity.slug,
      description: entity.description,
      status: entity.status,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
    }
  }
}

export class OrganizationMemberPresenter {
  static fromEntity(entity: OrganizationMember): Record<string, unknown> {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      userId: entity.userId,
      role: entity.role.getValue(),
      joinedAt: entity.joinedAt.toISOString(),
    }
  }
}

export class OrganizationInvitationPresenter {
  static fromEntity(entity: OrganizationInvitation): Record<string, unknown> {
    return {
      id: entity.id,
      organizationId: entity.organizationId,
      email: entity.email,
      role: entity.role.getValue(),
      status: entity.status.getValue(),
      expiresAt: entity.expiresAt.toISOString(),
      createdAt: entity.createdAt.toISOString(),
    }
  }
}

export interface CreateOrganizationRequest {
  name: string
  description?: string
  slug?: string
  managerUserId: string
}

export interface UpdateOrganizationRequest {
  name?: string
  description?: string
}

export interface InviteMemberRequest {
  email: string
  role?: string
}

export interface AcceptInvitationRequest {
  token: string
}

export interface OrganizationResponse {
  success: boolean
  message: string
  data?: Record<string, unknown>
  error?: string
}

export interface ListOrganizationsResponse {
  success: boolean
  message: string
  data?: {
    organizations: Record<string, unknown>[]
    meta: { total: number; page: number; limit: number; totalPages: number }
  }
  error?: string
}
