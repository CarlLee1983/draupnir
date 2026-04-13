import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChangeOrgStatusService } from '../Application/Services/ChangeOrgStatusService'
import type { OrgAuthorizationHelper } from '../Application/Services/OrgAuthorizationHelper'
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
  return Organization.create('org-1', 'Test Org', '說明')
}

describe('ChangeOrgStatusService', () => {
  let service: ChangeOrgStatusService
  let orgRepo: IOrganizationRepository
  let orgAuth: OrgAuthorizationHelper

  beforeEach(() => {
    orgRepo = makeMockOrgRepo()
    orgAuth = makeMockOrgAuth(true)
    service = new ChangeOrgStatusService(orgRepo, orgAuth)
  })

  it('應成功暫停組織', async () => {
    vi.mocked(orgRepo.findById).mockResolvedValue(makeOrg())
    vi.mocked(orgRepo.update).mockResolvedValue()

    const result = await service.execute('org-1', 'suspended', 'user-1', 'user')
    expect(result.success).toBe(true)
    expect(result.data?.status).toBe('suspended')
  })

  it('應成功啟用組織', async () => {
    const suspendedOrg = makeOrg().suspend()
    vi.mocked(orgRepo.findById).mockResolvedValue(suspendedOrg)
    vi.mocked(orgRepo.update).mockResolvedValue()

    const result = await service.execute('org-1', 'active', 'user-1', 'user')
    expect(result.success).toBe(true)
    expect(result.data?.status).toBe('active')
  })

  it('無效 status 應回傳 INVALID_STATUS', async () => {
    const result = await service.execute('org-1', 'deleted', 'user-1', 'user')
    expect(result.success).toBe(false)
    expect(result.error).toBe('INVALID_STATUS')
  })

  it('組織不存在應回傳 ORG_NOT_FOUND', async () => {
    vi.mocked(orgRepo.findById).mockResolvedValue(null)

    const result = await service.execute('org-1', 'suspended', 'user-1', 'user')
    expect(result.success).toBe(false)
    expect(result.error).toBe('ORG_NOT_FOUND')
  })

  it('未授權時應回傳 Insufficient permissions', async () => {
    service = new ChangeOrgStatusService(orgRepo, makeMockOrgAuth(false))

    const result = await service.execute('org-1', 'suspended', 'user-1', 'user')
    expect(result.success).toBe(false)
    expect(result.message).toContain('Insufficient permissions')
  })
})
