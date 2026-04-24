import { describe, expect, it, mock } from 'bun:test'
import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import { AcceptInvitationByIdService } from '@/Modules/Organization/Application/Services/AcceptInvitationByIdService'
import { OrganizationInvitation } from '@/Modules/Organization/Domain/Entities/OrganizationInvitation'
import type { IOrganizationInvitationRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationInvitationRepository'
import type { IOrganizationMemberRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository'
import { InvitationStatus } from '@/Modules/Organization/Domain/ValueObjects/InvitationStatus'
import { OrgMemberRole } from '@/Modules/Organization/Domain/ValueObjects/OrgMemberRole'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'

function makePendingInvitation(
  email = 'member@example.com',
  orgId = 'org-1',
): OrganizationInvitation {
  return OrganizationInvitation.reconstitute({
    id: 'inv-1',
    organizationId: orgId,
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

function makeMockMemberRepo(): IOrganizationMemberRepository {
  return {
    save: mock(),
    findByUserAndOrgId: mock().mockResolvedValue(null),
    findByOrgId: mock(),
    findByUserId: mock(),
    remove: mock(),
    update: mock(),
    countByOrgId: mock(),
    countManagersByOrgId: mock(),
    isOrgManagerInAnyOrg: mock(),
    findOrgManagerMembershipByUserId: mock(),
    withTransaction: mock().mockReturnThis(),
  }
}

function makeUser(email = 'member@example.com') {
  return { emailValue: email, id: 'user-1' }
}

function makeMockDb(): IDatabaseAccess {
  return {
    transaction: mock().mockImplementation(async (fn: (tx: IDatabaseAccess) => Promise<void>) => {
      await fn({
        table: mock().mockReturnThis(),
        insert: mock().mockResolvedValue(undefined),
        update: mock().mockResolvedValue(undefined),
        where: mock().mockReturnThis(),
        first: mock().mockResolvedValue(null),
        select: mock().mockResolvedValue([]),
      } as unknown as IDatabaseAccess)
    }),
    table: mock().mockReturnThis(),
    where: mock().mockReturnThis(),
    insert: mock().mockResolvedValue(undefined),
  } as unknown as IDatabaseAccess
}

describe('AcceptInvitationByIdService', () => {
  it('應成功接受邀請並建立 membership', async () => {
    const invitationRepo = makeMockInvitationRepo()
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    ;(invitationRepo.findById as any).mockResolvedValue(makePendingInvitation())

    const memberRepo = makeMockMemberRepo()
    const authRepo = {
      findById: mock().mockResolvedValue(makeUser()),
    } as unknown as IAuthRepository
    const db = makeMockDb()

    const service = new AcceptInvitationByIdService(invitationRepo, memberRepo, authRepo, db)
    const result = await service.execute('inv-1', 'user-1')

    expect(result.success).toBe(true)
  })

  it('邀請不存在應回傳 INVALID_INVITATION', async () => {
    const invitationRepo = makeMockInvitationRepo()
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    ;(invitationRepo.findById as any).mockResolvedValue(null)

    const memberRepo = makeMockMemberRepo()
    const authRepo = {
      findById: mock().mockResolvedValue(makeUser()),
    } as unknown as IAuthRepository
    const db = makeMockDb()

    const service = new AcceptInvitationByIdService(invitationRepo, memberRepo, authRepo, db)
    const result = await service.execute('nonexistent', 'user-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe('INVALID_INVITATION')
  })

  it('user 不存在應回傳 USER_NOT_FOUND', async () => {
    const invitationRepo = makeMockInvitationRepo()
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    ;(invitationRepo.findById as any).mockResolvedValue(makePendingInvitation())

    const memberRepo = makeMockMemberRepo()
    const authRepo = {
      findById: mock().mockResolvedValue(null),
    } as unknown as IAuthRepository
    const db = makeMockDb()

    const service = new AcceptInvitationByIdService(invitationRepo, memberRepo, authRepo, db)
    const result = await service.execute('inv-1', 'unknown-user')

    expect(result.success).toBe(false)
    expect(result.error).toBe('USER_NOT_FOUND')
  })

  it('email 不匹配應回傳 EMAIL_MISMATCH', async () => {
    const invitationRepo = makeMockInvitationRepo()
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    ;(invitationRepo.findById as any).mockResolvedValue(makePendingInvitation('other@example.com'))

    const memberRepo = makeMockMemberRepo()
    const authRepo = {
      findById: mock().mockResolvedValue(makeUser('member@example.com')),
    } as unknown as IAuthRepository
    const db = makeMockDb()

    const service = new AcceptInvitationByIdService(invitationRepo, memberRepo, authRepo, db)
    const result = await service.execute('inv-1', 'user-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe('EMAIL_MISMATCH')
  })

  it('已是成員時應回傳 USER_ALREADY_IN_ORG', async () => {
    const invitationRepo = makeMockInvitationRepo()
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    ;(invitationRepo.findById as any).mockResolvedValue(makePendingInvitation())

    const memberRepo = makeMockMemberRepo()
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    ;(memberRepo.findByUserAndOrgId as any).mockResolvedValue({ userId: 'user-1' })

    const authRepo = {
      findById: mock().mockResolvedValue(makeUser()),
    } as unknown as IAuthRepository
    const db = makeMockDb()

    const service = new AcceptInvitationByIdService(invitationRepo, memberRepo, authRepo, db)
    const result = await service.execute('inv-1', 'user-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe('USER_ALREADY_IN_ORG')
  })
})
