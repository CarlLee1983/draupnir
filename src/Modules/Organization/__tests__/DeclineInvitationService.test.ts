import { describe, expect, it, mock } from 'bun:test'
import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import { DeclineInvitationService } from '@/Modules/Organization/Application/Services/DeclineInvitationService'
import { OrganizationInvitation } from '@/Modules/Organization/Domain/Entities/OrganizationInvitation'
import type { IOrganizationInvitationRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationInvitationRepository'
import { InvitationStatus } from '@/Modules/Organization/Domain/ValueObjects/InvitationStatus'
import { OrgMemberRole } from '@/Modules/Organization/Domain/ValueObjects/OrgMemberRole'

function makePendingInvitation(email = 'member@example.com'): OrganizationInvitation {
  return OrganizationInvitation.reconstitute({
    id: 'inv-1',
    organizationId: 'org-1',
    email,
    token: '',
    tokenHash: 'hash-abc',
    role: new OrgMemberRole('member'),
    invitedByUserId: 'user-manager',
    status: new InvitationStatus('pending'),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  })
}

function makeMockInvitationRepo(): IOrganizationInvitationRepository {
  return {
    save: mock(),
    update: mock(),
    findById: mock(),
    findByTokenHash: mock(),
    findByOrgId: mock(),
    findPendingByEmail: mock(),
    deleteExpired: mock(),
    withTransaction: mock().mockReturnThis(),
  }
}

function makeUser(email = 'member@example.com') {
  return { emailValue: email, id: 'user-1' }
}

describe('DeclineInvitationService', () => {
  it('應成功拒絕 pending 邀請', async () => {
    const invitationRepo = makeMockInvitationRepo()
    ;(invitationRepo.findById as any).mockResolvedValue(makePendingInvitation())
    ;(invitationRepo.update as any).mockResolvedValue(undefined)

    const authRepo = {
      findById: mock().mockResolvedValue(makeUser()),
    } as unknown as IAuthRepository

    const service = new DeclineInvitationService(invitationRepo, authRepo)
    const result = await service.execute('inv-1', 'user-1')

    expect(result.success).toBe(true)
    const updatedArg = (invitationRepo.update as any).mock.calls[0][0]
    expect(updatedArg.status.getValue()).toBe('cancelled')
  })

  it('邀請不存在應回傳 INVALID_INVITATION', async () => {
    const invitationRepo = makeMockInvitationRepo()
    ;(invitationRepo.findById as any).mockResolvedValue(null)

    const authRepo = {
      findById: mock().mockResolvedValue(makeUser()),
    } as unknown as IAuthRepository

    const service = new DeclineInvitationService(invitationRepo, authRepo)
    const result = await service.execute('nonexistent', 'user-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe('INVALID_INVITATION')
  })

  it('user 不存在應回傳 USER_NOT_FOUND', async () => {
    const invitationRepo = makeMockInvitationRepo()
    const authRepo = {
      findById: mock().mockResolvedValue(null),
    } as unknown as IAuthRepository

    const service = new DeclineInvitationService(invitationRepo, authRepo)
    const result = await service.execute('inv-1', 'unknown-user')

    expect(result.success).toBe(false)
    expect(result.error).toBe('USER_NOT_FOUND')
  })

  it('email 不匹配應回傳 EMAIL_MISMATCH', async () => {
    const invitationRepo = makeMockInvitationRepo()
    ;(invitationRepo.findById as any).mockResolvedValue(makePendingInvitation('other@example.com'))

    const authRepo = {
      findById: mock().mockResolvedValue(makeUser('member@example.com')),
    } as unknown as IAuthRepository

    const service = new DeclineInvitationService(invitationRepo, authRepo)
    const result = await service.execute('inv-1', 'user-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe('EMAIL_MISMATCH')
  })

  it('邀請已過期應回傳 INVALID_INVITATION', async () => {
    const expiredInv = OrganizationInvitation.reconstitute({
      id: 'inv-expired',
      organizationId: 'org-1',
      email: 'member@example.com',
      token: '',
      tokenHash: 'hash-expired',
      role: new OrgMemberRole('member'),
      invitedByUserId: 'user-manager',
      status: new InvitationStatus('pending'),
      expiresAt: new Date(Date.now() - 1000), // already expired
      createdAt: new Date(),
    })

    const invitationRepo = makeMockInvitationRepo()
    ;(invitationRepo.findById as any).mockResolvedValue(expiredInv)

    const authRepo = {
      findById: mock().mockResolvedValue(makeUser()),
    } as unknown as IAuthRepository

    const service = new DeclineInvitationService(invitationRepo, authRepo)
    const result = await service.execute('inv-expired', 'user-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe('INVALID_INVITATION')
  })
})
