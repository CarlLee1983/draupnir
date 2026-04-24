import { describe, expect, mock, test } from 'bun:test'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import { ListApiKeysService } from '../Application/Services/ListApiKeysService'
import type { ApiKey } from '../Domain/Aggregates/ApiKey'
import type { IApiKeyRepository } from '../Domain/Repositories/IApiKeyRepository'

describe('ListApiKeysService — assignedMemberId filter', () => {
  const orgAuth = {
    requireOrgMembership: mock(() => Promise.resolve({ authorized: true })),
  } as unknown as OrgAuthorizationHelper

  test('未傳 assignedMemberId 時使用 findByOrgId', async () => {
    const repo = {
      findByOrgId: mock(() => Promise.resolve([] as ApiKey[])),
      findByOrgAndAssignedMember: mock(() => Promise.resolve([] as ApiKey[])),
      countByOrgId: mock(() => Promise.resolve(0)),
      countByOrgAndAssignedMember: mock(() => Promise.resolve(0)),
    } as unknown as IApiKeyRepository
    const svc = new ListApiKeysService(repo, orgAuth)
    await svc.execute('org-A', 'u-1', 'manager')
    expect(repo.findByOrgId).toHaveBeenCalledTimes(1)
    expect(repo.findByOrgAndAssignedMember).not.toHaveBeenCalled()
  })

  test('傳入 assignedMemberId 時使用 findByOrgAndAssignedMember', async () => {
    const findByOrgAndAssignedMember = mock(
      (_orgId: string, _memberId: string, _limit?: number, _offset?: number) =>
        Promise.resolve([] as ApiKey[]),
    )
    const repo = {
      findByOrgId: mock(() => Promise.resolve([] as ApiKey[])),
      findByOrgAndAssignedMember,
      countByOrgId: mock(() => Promise.resolve(0)),
      countByOrgAndAssignedMember: mock(() => Promise.resolve(0)),
    } as unknown as IApiKeyRepository
    const svc = new ListApiKeysService(repo, orgAuth)
    await svc.execute('org-A', 'u-1', 'member', 1, 20, { assignedMemberId: 'u-1' })
    expect(findByOrgAndAssignedMember).toHaveBeenCalledTimes(1)
    const firstCall = findByOrgAndAssignedMember.mock.calls[0]
    if (firstCall === undefined) {
      throw new Error('expected one call to findByOrgAndAssignedMember')
    }
    expect(firstCall[0]).toBe('org-A')
    expect(firstCall[1]).toBe('u-1')
  })
})
