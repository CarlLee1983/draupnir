import { describe, expect, it, mock } from 'bun:test'
import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import type { IOrganizationRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationRepository'
import { OrganizationInvitation } from '@/Modules/Organization/Domain/Entities/OrganizationInvitation'
import { InvitationStatus } from '@/Modules/Organization/Domain/ValueObjects/InvitationStatus'
import { OrgMemberRole } from '@/Modules/Organization/Domain/ValueObjects/OrgMemberRole'
import type { IOrganizationInvitationRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationInvitationRepository'
import { GetPendingInvitationsService } from '@/Modules/Organization/Application/Services/GetPendingInvitationsService'

function makePendingInvitation(orgId = 'org-1'): OrganizationInvitation {
  return OrganizationInvitation.reconstitute({
    id: 'inv-1',
    organizationId: orgId,
    email: 'member@example.com',
    token: '',
    tokenHash: 'hash-abc',
    role: new OrgMemberRole('member'),
    invitedByUserId: 'user-manager',
    status: new InvitationStatus('pending'),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  })
}

function makeUser(email = 'member@example.com') {
  return { emailValue: email, id: 'user-1' }
}

function makeOrg(id = 'org-1', name = 'Test Org') {
  return { id, name }
}

describe('GetPendingInvitationsService', () => {
  it('無組織時回傳 pending 邀請列表（含 org name）', async () => {
    const invitationRepo = {
      findPendingByEmail: mock().mockResolvedValue([makePendingInvitation('org-1')]),
    } as unknown as IOrganizationInvitationRepository

    const authRepo = {
      findById: mock().mockResolvedValue(makeUser('member@example.com')),
    } as unknown as IAuthRepository

    const orgRepo = {
      findById: mock().mockResolvedValue(makeOrg('org-1', 'Test Org')),
    } as unknown as IOrganizationRepository

    const service = new GetPendingInvitationsService(invitationRepo, authRepo, orgRepo)
    const result = await service.execute('user-1')

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('inv-1')
    expect(result[0].organizationName).toBe('Test Org')
    expect(result[0].role).toBe('member')
    expect(result[0].organizationId).toBe('org-1')
    expect(typeof result[0].expiresAt).toBe('string')
  })

  it('user 不存在時回傳空陣列', async () => {
    const invitationRepo = {
      findPendingByEmail: mock().mockResolvedValue([]),
    } as unknown as IOrganizationInvitationRepository

    const authRepo = {
      findById: mock().mockResolvedValue(null),
    } as unknown as IAuthRepository

    const orgRepo = {
      findById: mock().mockResolvedValue(null),
    } as unknown as IOrganizationRepository

    const service = new GetPendingInvitationsService(invitationRepo, authRepo, orgRepo)
    const result = await service.execute('unknown-user')

    expect(result).toHaveLength(0)
  })

  it('org 不存在時邀請仍回傳（name 為空字串）', async () => {
    const invitationRepo = {
      findPendingByEmail: mock().mockResolvedValue([makePendingInvitation('deleted-org')]),
    } as unknown as IOrganizationInvitationRepository

    const authRepo = {
      findById: mock().mockResolvedValue(makeUser()),
    } as unknown as IAuthRepository

    const orgRepo = {
      findById: mock().mockResolvedValue(null),
    } as unknown as IOrganizationRepository

    const service = new GetPendingInvitationsService(invitationRepo, authRepo, orgRepo)
    const result = await service.execute('user-1')

    expect(result).toHaveLength(1)
    expect(result[0].organizationName).toBe('')
  })
})
