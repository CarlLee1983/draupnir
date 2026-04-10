import type { OrganizationInvitation } from '../../Domain/Entities/OrganizationInvitation'

export class OrganizationInvitationMapper {
  static toDatabaseRow(entity: OrganizationInvitation): Record<string, unknown> {
    return {
      id: entity.id,
      organization_id: entity.organizationId,
      email: entity.email,
      token_hash: entity.getTokenHash(),
      role: entity.role,
      invited_by_user_id: entity.invitedByUserId,
      status: entity.status,
      expires_at: entity.expiresAt.toISOString(),
      created_at: entity.createdAt.toISOString(),
    }
  }
}
