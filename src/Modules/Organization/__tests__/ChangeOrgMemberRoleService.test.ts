import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { RoleType } from '@/Modules/Auth/Domain/ValueObjects/Role'
import { ChangeOrgMemberRoleService } from '../Application/Services/ChangeOrgMemberRoleService'
import { OrganizationMember } from '../Domain/Entities/OrganizationMember'
import type { IOrganizationMemberRepository } from '../Domain/Repositories/IOrganizationMemberRepository'
import { OrgMemberRole } from '../Domain/ValueObjects/OrgMemberRole'

function makeMockMemberRepo(): IOrganizationMemberRepository {
  return {
    findByUserId: mock(),
    findByUserAndOrgId: mock(),
    findByOrgId: mock(),
    save: mock(),
    remove: mock(),
    countByOrgId: mock(),
    countManagersByOrgId: mock(),
    update: mock(),
    isOrgManagerInAnyOrg: mock().mockResolvedValue(true),
    findOrgManagerMembershipByUserId: mock().mockResolvedValue(null),
    withTransaction: mock().mockReturnThis(),
  }
}

function makeMockAuthRepo() {
  return {
    findById: mock(),
    findByEmail: mock(),
    findByGoogleId: mock(),
    emailExists: mock(),
    save: mock(),
    delete: mock(),
    findAll: mock(),
    countAll: mock(),
    updateRole: mock().mockResolvedValue(undefined),
    withTransaction: mock().mockReturnThis(),
  }
}

function makeMockDb() {
  return {
    transaction: mock(async (cb: (tx: unknown) => Promise<void>) => {
      await cb({})
    }),
  }
}

function makeMember(role: string, id = 'mem-1'): OrganizationMember {
  return OrganizationMember.create(id, 'org-1', `user-${id}`, new OrgMemberRole(role))
}

describe('ChangeOrgMemberRoleService', () => {
  let service: ChangeOrgMemberRoleService
  let memberRepo: IOrganizationMemberRepository
  let db: ReturnType<typeof makeMockDb>

  beforeEach(() => {
    memberRepo = makeMockMemberRepo()
    db = makeMockDb()
    const authRepo = makeMockAuthRepo()
    service = new ChangeOrgMemberRoleService(memberRepo, db as never, authRepo as never)
  })

  it('應成功將 member 升級為 manager', async () => {
    const member = makeMember('member')
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    ;(memberRepo.findByUserAndOrgId as any).mockResolvedValue(member)
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    ;(memberRepo.countManagersByOrgId as any).mockResolvedValue(1)
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    ;(memberRepo.update as any).mockResolvedValue()

    const result = await service.execute('org-1', 'user-mem-1', 'manager')
    expect(result.success).toBe(true)
    expect(result.data?.role).toBe('manager')
  })

  it('成員不存在時應回傳 MEMBER_NOT_FOUND', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    ;(memberRepo.findByUserAndOrgId as any).mockResolvedValue(null)

    const result = await service.execute('org-1', 'unknown-user', 'member')
    expect(result.success).toBe(false)
    expect(result.error).toBe('MEMBER_NOT_FOUND')
  })

  it('降級最後一位 manager 應回傳錯誤', async () => {
    const manager = makeMember('manager')
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    ;(memberRepo.findByUserAndOrgId as any).mockResolvedValue(manager)
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    ;(memberRepo.countManagersByOrgId as any).mockResolvedValue(1)

    const result = await service.execute('org-1', 'user-mem-1', 'member')
    expect(result.success).toBe(false)
    expect(result.error).toBe('CANNOT_DEMOTE_LAST_MANAGER')
  })

  it('無效 role 字串應回傳錯誤', async () => {
    const result = await service.execute('org-1', 'user-mem-1', 'owner')
    expect(result.success).toBe(false)
  })
})

describe('ChangeOrgMemberRoleService — 降級邏輯', () => {
  let service: ChangeOrgMemberRoleService
  let memberRepo: IOrganizationMemberRepository
  let authRepo: ReturnType<typeof makeMockAuthRepo>
  let db: ReturnType<typeof makeMockDb>

  beforeEach(() => {
    memberRepo = makeMockMemberRepo()
    authRepo = makeMockAuthRepo()
    db = makeMockDb()
    service = new ChangeOrgMemberRoleService(memberRepo, db as never, authRepo as never)
  })

  it('將 manager 降為 member 後應呼叫 authRepository.updateRole', async () => {
    const manager = makeMember('manager')
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    ;(memberRepo.findByUserAndOrgId as any).mockResolvedValue(manager)
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    ;(memberRepo.countManagersByOrgId as any).mockResolvedValue(2)
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    ;(memberRepo.update as any).mockResolvedValue(undefined)
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    ;(memberRepo.isOrgManagerInAnyOrg as any).mockResolvedValue(false)

    // 模擬 target 是一般 non-admin 使用者
    const normalUser = { role: { isAdmin: () => false } }
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    ;(authRepo.findById as any).mockResolvedValue(normalUser)

    await service.execute('org-1', 'user-mem-1', 'member')

    expect(authRepo.updateRole).toHaveBeenCalledWith('user-mem-1', RoleType.MEMBER)
  })

  it('仍為 manager 時不應呼叫 authRepository.updateRole', async () => {
    const member = makeMember('member')
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    ;(memberRepo.findByUserAndOrgId as any).mockResolvedValue(member)
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    ;(memberRepo.update as any).mockResolvedValue(undefined)
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    ;(memberRepo.isOrgManagerInAnyOrg as any).mockResolvedValue(true)

    await service.execute('org-1', 'user-mem-1', 'manager')

    expect(authRepo.updateRole).not.toHaveBeenCalled()
  })

  it('target 為 global admin 時不應呼叫 authRepository.updateRole', async () => {
    const member = makeMember('manager')
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    ;(memberRepo.findByUserAndOrgId as any).mockResolvedValue(member)
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    ;(memberRepo.countManagersByOrgId as any).mockResolvedValue(2)
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    ;(memberRepo.update as any).mockResolvedValue(undefined)
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    ;(memberRepo.isOrgManagerInAnyOrg as any).mockResolvedValue(false)

    // 模擬 target 是 admin
    const adminUser = { role: { isAdmin: () => true } }
    // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
    ;(authRepo.findById as any).mockResolvedValue(adminUser)

    await service.execute('org-1', 'user-mem-1', 'member')

    expect(authRepo.updateRole).not.toHaveBeenCalled()
  })
})
