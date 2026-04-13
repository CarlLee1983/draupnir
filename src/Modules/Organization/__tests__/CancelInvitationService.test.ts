import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CancelInvitationService } from '../Application/Services/CancelInvitationService'
import type { OrgAuthorizationHelper } from '../Application/Services/OrgAuthorizationHelper'
import { OrganizationInvitation } from '../Domain/Entities/OrganizationInvitation'
import type { IOrganizationInvitationRepository } from '../Domain/Repositories/IOrganizationInvitationRepository'
import { InvitationStatus } from '../Domain/ValueObjects/InvitationStatus'
import { OrgMemberRole } from '../Domain/ValueObjects/OrgMemberRole'

function makeMockInvitationRepo(): IOrganizationInvitationRepository {
  return {
    save: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(),
    findByTokenHash: vi.fn(),
    findByOrgId: vi.fn(),
    deleteExpired: vi.fn(),
    withTransaction: vi.fn().mockReturnThis(),
  }
}

function makeMockOrgAuth(authorized = true): OrgAuthorizationHelper {
  return {
    requireOrgMembership: vi.fn().mockResolvedValue({ authorized }),
    requireOrgManager: vi.fn().mockResolvedValue(
      authorized
        ? { authorized: true }
        : { authorized: false, error: 'NOT_ORG_MANAGER' },
    ),
  } as unknown as OrgAuthorizationHelper
}

function makePendingInvitation(orgId = 'org-1'): OrganizationInvitation {
  return OrganizationInvitation.reconstitute({
    id: 'inv-1',
    organizationId: orgId,
    email: 'test@example.com',
    token: '',
    tokenHash: 'hash-abc',
    role: new OrgMemberRole('member'),
    invitedByUserId: 'user-manager',
    status: new InvitationStatus('pending'),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  })
}

describe('CancelInvitationService', () => {
  let service: CancelInvitationService
  let invitationRepo: IOrganizationInvitationRepository
  let orgAuth: OrgAuthorizationHelper

  beforeEach(() => {
    invitationRepo = makeMockInvitationRepo()
    orgAuth = makeMockOrgAuth(true)
    service = new CancelInvitationService(invitationRepo, orgAuth)
  })

  it('應成功取消 pending 邀請', async () => {
    const invitation = makePendingInvitation()
    vi.mocked(invitationRepo.findById).mockResolvedValue(invitation)
    vi.mocked(invitationRepo.update).mockResolvedValue()

    const result = await service.execute('org-1', 'inv-1', 'user-manager', 'user')
    expect(result.success).toBe(true)
    // 驗證 update() 被呼叫且傳入 cancelled invitation
    expect(vi.mocked(invitationRepo.update)).toHaveBeenCalledOnce()
    const updatedArg = vi.mocked(invitationRepo.update).mock.calls[0][0]
    expect(updatedArg.status.getValue()).toBe('cancelled')
  })

  it('邀請不存在應回傳 INVITATION_NOT_FOUND', async () => {
    vi.mocked(invitationRepo.findById).mockResolvedValue(null)

    const result = await service.execute('org-1', 'unknown-inv', 'user-manager', 'user')
    expect(result.success).toBe(false)
    expect(result.error).toBe('INVITATION_NOT_FOUND')
  })

  it('邀請屬於不同組織應回傳 INVITATION_NOT_FOUND', async () => {
    const invitation = makePendingInvitation('other-org')
    vi.mocked(invitationRepo.findById).mockResolvedValue(invitation)

    const result = await service.execute('org-1', 'inv-1', 'user-manager', 'user')
    expect(result.success).toBe(false)
    expect(result.error).toBe('INVITATION_NOT_FOUND')
  })

  it('未授權時應回傳 Insufficient permissions', async () => {
    service = new CancelInvitationService(invitationRepo, makeMockOrgAuth(false))

    const result = await service.execute('org-1', 'inv-1', 'user-1', 'user')
    expect(result.success).toBe(false)
    expect(result.message).toContain('Insufficient permissions')
  })
})
