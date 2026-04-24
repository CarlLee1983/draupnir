import { OrganizationInvitation } from '../../Domain/Entities/OrganizationInvitation'
import { InvitationStatus } from '../../Domain/ValueObjects/InvitationStatus'
import { OrgMemberRole } from '../../Domain/ValueObjects/OrgMemberRole'

function toDate(value: unknown): Date {
  if (value instanceof Date) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value)
    if (!Number.isNaN(d.getTime())) return d
  }
  return new Date()
}

export const OrganizationInvitationMapper = {
  /** 將資料庫 row 映射為 OrganizationInvitation Entity。 */
  toEntity(row: Record<string, unknown>): OrganizationInvitation {
    return OrganizationInvitation.reconstitute({
      id: String(row.id),
      organizationId: String(row.organization_id),
      email: String(row.email),
      token: '',
      tokenHash: String(row.token_hash),
      role: new OrgMemberRole(String(row.role)),
      invitedByUserId: String(row.invited_by_user_id),
      status: new InvitationStatus(String(row.status)),
      expiresAt: toDate(row.expires_at),
      createdAt: toDate(row.created_at),
    })
  },

  toDatabaseRow(entity: OrganizationInvitation): Record<string, unknown> {
    return {
      id: entity.id,
      organization_id: entity.organizationId,
      email: entity.email,
      token_hash: entity.getTokenHash(),
      role: entity.role.getValue(),
      invited_by_user_id: entity.invitedByUserId,
      status: entity.status.getValue(),
      expires_at: entity.expiresAt.toISOString(),
      created_at: entity.createdAt.toISOString(),
    }
  },
}
