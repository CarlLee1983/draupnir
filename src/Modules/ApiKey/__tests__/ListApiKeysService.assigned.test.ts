import { describe, expect, mock, test } from 'bun:test'
import { ListApiKeysService } from '../Application/Services/ListApiKeysService'

describe('ListApiKeysService — assignedMemberId filter', () => {
  const orgAuth = { requireOrgMembership: mock(() => Promise.resolve({ authorized: true })) }

  test('未傳 assignedMemberId 時使用 findByOrgId', async () => {
    const repo = {
      findByOrgId: mock(() => Promise.resolve([])),
      findByOrgAndAssignedMember: mock(() => Promise.resolve([])),
      countByOrgId: mock(() => Promise.resolve(0)),
      countByOrgAndAssignedMember: mock(() => Promise.resolve(0)),
    }
    const svc = new ListApiKeysService(repo as any, orgAuth as any)
    await svc.execute('org-A', 'u-1', 'manager')
    expect(repo.findByOrgId).toHaveBeenCalledTimes(1)
    expect(repo.findByOrgAndAssignedMember).not.toHaveBeenCalled()
  })

  test('傳入 assignedMemberId 時使用 findByOrgAndAssignedMember', async () => {
    const repo = {
      findByOrgId: mock(() => Promise.resolve([])),
      findByOrgAndAssignedMember: mock(() => Promise.resolve([])),
      countByOrgId: mock(() => Promise.resolve(0)),
      countByOrgAndAssignedMember: mock(() => Promise.resolve(0)),
    }
    const svc = new ListApiKeysService(repo as any, orgAuth as any)
    await svc.execute('org-A', 'u-1', 'member', 1, 20, { assignedMemberId: 'u-1' })
    expect(repo.findByOrgAndAssignedMember).toHaveBeenCalledTimes(1)
    const args = (repo.findByOrgAndAssignedMember as any).mock.calls[0]
    expect(args[0]).toBe('org-A')
    expect(args[1]).toBe('u-1')
  })
})
