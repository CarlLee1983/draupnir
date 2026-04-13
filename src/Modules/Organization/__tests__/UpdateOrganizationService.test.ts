import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { OrgAuthorizationHelper } from '../Application/Services/OrgAuthorizationHelper'
import { UpdateOrganizationService } from '../Application/Services/UpdateOrganizationService'
import { Organization } from '../Domain/Aggregates/Organization'
import type { IOrganizationRepository } from '../Domain/Repositories/IOrganizationRepository'

function makeMockOrgRepo(): IOrganizationRepository {
  return {
    findById: vi.fn(),
    findBySlug: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    findAll: vi.fn(),
    count: vi.fn(),
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

function makeOrg(): Organization {
  return Organization.create('org-1', '原始名稱', '原始描述')
}

describe('UpdateOrganizationService', () => {
  let service: UpdateOrganizationService
  let orgRepo: IOrganizationRepository
  let orgAuth: OrgAuthorizationHelper

  beforeEach(() => {
    orgRepo = makeMockOrgRepo()
    orgAuth = makeMockOrgAuth(true)
    service = new UpdateOrganizationService(orgRepo, orgAuth)
  })

  it('應成功更新名稱和描述', async () => {
    vi.mocked(orgRepo.findById).mockResolvedValue(makeOrg())
    vi.mocked(orgRepo.update).mockResolvedValue()

    const result = await service.execute(
      'org-1',
      { name: '新名稱', description: '新描述' },
      'user-1',
      'user',
    )
    expect(result.success).toBe(true)
    expect(result.data?.name).toBe('新名稱')
    expect(result.data?.description).toBe('新描述')
  })

  it('組織不存在應回傳 ORG_NOT_FOUND', async () => {
    vi.mocked(orgRepo.findById).mockResolvedValue(null)

    const result = await service.execute('org-1', { name: '新名稱' }, 'user-1', 'user')
    expect(result.success).toBe(false)
    expect(result.error).toBe('ORG_NOT_FOUND')
  })

  it('未授權時應回傳 Insufficient permissions', async () => {
    service = new UpdateOrganizationService(orgRepo, makeMockOrgAuth(false))

    const result = await service.execute('org-1', { name: '新名稱' }, 'user-1', 'user')
    expect(result.success).toBe(false)
    expect(result.message).toContain('Insufficient permissions')
  })
})
