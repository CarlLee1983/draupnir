import { beforeEach, describe, expect, it, mock } from 'bun:test'
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
    service = new ChangeOrgMemberRoleService(memberRepo, db as never)
  })

  it('應成功將 member 升級為 manager', async () => {
    const member = makeMember('member')
    ;(memberRepo.findByUserAndOrgId as any).mockResolvedValue(member)
    ;(memberRepo.countManagersByOrgId as any).mockResolvedValue(1)
    ;(memberRepo.update as any).mockResolvedValue()

    const result = await service.execute('org-1', 'user-mem-1', 'manager')
    expect(result.success).toBe(true)
    expect(result.data?.role).toBe('manager')
  })

  it('成員不存在時應回傳 MEMBER_NOT_FOUND', async () => {
    ;(memberRepo.findByUserAndOrgId as any).mockResolvedValue(null)

    const result = await service.execute('org-1', 'unknown-user', 'member')
    expect(result.success).toBe(false)
    expect(result.error).toBe('MEMBER_NOT_FOUND')
  })

  it('降級最後一位 manager 應回傳錯誤', async () => {
    const manager = makeMember('manager')
    ;(memberRepo.findByUserAndOrgId as any).mockResolvedValue(manager)
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
