import { describe, expect, test, mock } from 'bun:test'
import { AssignApiKeyService } from '../Application/Services/AssignApiKeyService'
import { ApiKey } from '../Domain/Aggregates/ApiKey'
import { OrganizationMember } from '@/Modules/Organization/Domain/Entities/OrganizationMember'
import { OrgMemberRole } from '@/Modules/Organization/Domain/ValueObjects/OrgMemberRole'

function makeKey(orgId = 'org-A') {
  return ApiKey.create({
    id: 'k-1', orgId, createdByUserId: 'mgr',
    label: 'L', gatewayKeyId: 'gw', keyHash: 'h'.repeat(64),
  })
}

function memberOf(orgId: string, userId: string, role: 'manager' | 'member') {
  return OrganizationMember.reconstitute({
    id: `m-${userId}`, organizationId: orgId, userId,
    role: new OrgMemberRole(role),
    joinedAt: new Date(), createdAt: new Date(),
  })
}

describe('AssignApiKeyService', () => {
  const okAuth = { authorized: true as const }
  const orgAuth = {
    requireOrgManager: mock(() => Promise.resolve(okAuth)),
  }

  test('指派目標非該組織成員 → INVALID_ASSIGNEE', async () => {
    const key = makeKey('org-A')
    const repo = {
      findById: mock(() => Promise.resolve(key)),
      update: mock(() => Promise.resolve()),
    }
    const memberRepo = {
      findByUserAndOrgId: mock(() => Promise.resolve(null)),
    }
    const svc = new AssignApiKeyService(repo as any, memberRepo as any, orgAuth as any)
    const result = await svc.execute({
      keyId: 'k-1', orgId: 'org-A',
      assigneeUserId: 'u-99',
      callerUserId: 'mgr', callerSystemRole: 'manager',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('INVALID_ASSIGNEE')
  })

  test('指派目標是 manager → INVALID_ASSIGNEE_ROLE (v1 僅接受 member)', async () => {
    const key = makeKey('org-A')
    const repo = {
      findById: mock(() => Promise.resolve(key)),
      update: mock(() => Promise.resolve()),
    }
    const memberRepo = {
      findByUserAndOrgId: mock(() => Promise.resolve(memberOf('org-A', 'u-2', 'manager'))),
    }
    const svc = new AssignApiKeyService(repo as any, memberRepo as any, orgAuth as any)
    const result = await svc.execute({
      keyId: 'k-1', orgId: 'org-A', assigneeUserId: 'u-2',
      callerUserId: 'mgr', callerSystemRole: 'manager',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('INVALID_ASSIGNEE_ROLE')
  })

  test('指派給合法 member → 呼叫 ApiKey.assignTo 與 repo.update', async () => {
    const key = makeKey('org-A')
    const repo = {
      findById: mock(() => Promise.resolve(key)),
      update: mock(() => Promise.resolve()),
    }
    const memberRepo = {
      findByUserAndOrgId: mock(() => Promise.resolve(memberOf('org-A', 'u-7', 'member'))),
    }
    const svc = new AssignApiKeyService(repo as any, memberRepo as any, orgAuth as any)
    const result = await svc.execute({
      keyId: 'k-1', orgId: 'org-A', assigneeUserId: 'u-7',
      callerUserId: 'mgr', callerSystemRole: 'manager',
    })
    expect(result.success).toBe(true)
    expect(repo.update).toHaveBeenCalledTimes(1)
    const saved = (repo.update as any).mock.calls[0][0] as ApiKey
    expect(saved.assignedMemberId).toBe('u-7')
  })

  test('assigneeUserId = null → 取消指派', async () => {
    const key = makeKey('org-A').assignTo('u-7')
    const repo = {
      findById: mock(() => Promise.resolve(key)),
      update: mock(() => Promise.resolve()),
    }
    const memberRepo = { findByUserAndOrgId: mock(() => Promise.resolve(null)) }
    const svc = new AssignApiKeyService(repo as any, memberRepo as any, orgAuth as any)
    const result = await svc.execute({
      keyId: 'k-1', orgId: 'org-A', assigneeUserId: null,
      callerUserId: 'mgr', callerSystemRole: 'manager',
    })
    expect(result.success).toBe(true)
    const saved = (repo.update as any).mock.calls[0][0] as ApiKey
    expect(saved.assignedMemberId).toBe(null)
  })

  test('key 不屬於 orgId → CROSS_ORG_ASSIGNMENT', async () => {
    const key = makeKey('org-B')
    const repo = {
      findById: mock(() => Promise.resolve(key)),
      update: mock(() => Promise.resolve()),
    }
    const memberRepo = {
      findByUserAndOrgId: mock(() => Promise.resolve(memberOf('org-A', 'u-7', 'member'))),
    }
    const svc = new AssignApiKeyService(repo as any, memberRepo as any, orgAuth as any)
    const result = await svc.execute({
      keyId: 'k-1', orgId: 'org-A', assigneeUserId: 'u-7',
      callerUserId: 'mgr', callerSystemRole: 'manager',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('CROSS_ORG_ASSIGNMENT')
  })

  test('呼叫者非 org manager → 拒絕', async () => {
    const deniedAuth = {
      requireOrgManager: mock(() => Promise.resolve({ authorized: false, error: 'NOT_ORG_MANAGER' })),
    }
    const repo = { findById: mock(() => Promise.resolve(makeKey())), update: mock(() => Promise.resolve()) }
    const memberRepo = { findByUserAndOrgId: mock(() => Promise.resolve(memberOf('org-A', 'u-7', 'member'))) }
    const svc = new AssignApiKeyService(repo as any, memberRepo as any, deniedAuth as any)
    const result = await svc.execute({
      keyId: 'k-1', orgId: 'org-A', assigneeUserId: 'u-7',
      callerUserId: 'mgr', callerSystemRole: 'member',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_ORG_MANAGER')
  })
})
