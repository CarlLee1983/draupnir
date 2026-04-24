import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GetPerKeyCostService } from '../Application/Services/GetPerKeyCostService'

function createService(
  overrides: {
    apiKeyRepository?: Record<string, unknown>
    orgAuth?: Record<string, unknown>
    usageRepository?: Record<string, unknown>
  } = {},
) {
  const apiKeyRepository =
    overrides.apiKeyRepository ??
    ({
      findByOrgId: vi.fn(),
    } as const)
  const orgAuth =
    overrides.orgAuth ??
    ({
      requireOrgMembership: vi.fn(),
    } as const)
  const usageRepository =
    overrides.usageRepository ??
    ({
      queryPerKeyCost: vi.fn(),
      queryPerKeyCostByKeys: vi.fn(),
    } as const)

  return {
    service: new GetPerKeyCostService(
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      apiKeyRepository as any,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      orgAuth as any,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      usageRepository as any,
    ),
    apiKeyRepository,
    orgAuth,
    usageRepository,
  }
}

describe('GetPerKeyCostService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns org-wide key rows for manager/admin callers', async () => {
    const { service, usageRepository, orgAuth, apiKeyRepository } = createService()

    ;(orgAuth.requireOrgMembership as ReturnType<typeof vi.fn>).mockResolvedValue({
      authorized: true,
      membership: { role: 'manager', userId: 'user-1' },
    })
    ;(apiKeyRepository.findByOrgId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'key-1', label: 'Primary Key', createdByUserId: 'user-1', status: 'active' },
    ])
    ;(usageRepository.queryPerKeyCost as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        apiKeyId: 'key-1',
        totalCost: 5.5,
        totalRequests: 8,
        totalTokens: 1200,
      },
    ])

    const result = await service.execute({
      orgId: 'org-1',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
      startTime: '2026-04-01T00:00:00Z',
      endTime: '2026-04-30T23:59:59Z',
    })

    expect(result.success).toBe(true)
    expect(result.data?.rows).toHaveLength(1)
    expect(result.data?.rows[0]).toMatchObject({
      apiKeyId: 'key-1',
      keyName: 'Primary Key',
      totalCost: 5.5,
      totalRequests: 8,
      totalTokens: 1200,
      costPerRequest: 0.6875,
      tokensPerRequest: 150,
      percentOfTotal: 100,
    })
    expect(usageRepository.queryPerKeyCost).toHaveBeenCalledWith('org-1', {
      startDate: '2026-04-01T00:00:00Z',
      endDate: '2026-04-30T23:59:59Z',
    })
    expect(usageRepository.queryPerKeyCostByKeys).not.toHaveBeenCalled()
  })

  it('returns member-scoped key rows from visible API keys', async () => {
    const { service, usageRepository, orgAuth, apiKeyRepository } = createService()

    ;(orgAuth.requireOrgMembership as ReturnType<typeof vi.fn>).mockResolvedValue({
      authorized: true,
      membership: { role: 'member', userId: 'user-1' },
    })
    ;(apiKeyRepository.findByOrgId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'key-1', label: 'Primary Key', createdByUserId: 'user-1', status: 'active' },
      { id: 'key-2', label: 'Shared Key', createdByUserId: 'other', status: 'active' },
    ])
    ;(usageRepository.queryPerKeyCostByKeys as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        apiKeyId: 'key-1',
        totalCost: 4.5,
        totalRequests: 6,
        totalTokens: 900,
      },
    ])

    const result = await service.execute({
      orgId: 'org-1',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
      startTime: '2026-04-01T00:00:00Z',
      endTime: '2026-04-30T23:59:59Z',
    })

    expect(result.success).toBe(true)
    expect(result.data?.rows).toHaveLength(1)
    expect(usageRepository.queryPerKeyCostByKeys).toHaveBeenCalledWith(['key-1'], {
      startDate: '2026-04-01T00:00:00Z',
      endDate: '2026-04-30T23:59:59Z',
    })
    expect(result.data?.rows[0]).toMatchObject({
      apiKeyId: 'key-1',
      keyName: 'Primary Key',
    })
  })

  it('computes per-request efficiency metrics from totals', async () => {
    const { service, usageRepository, orgAuth, apiKeyRepository } = createService()

    ;(orgAuth.requireOrgMembership as ReturnType<typeof vi.fn>).mockResolvedValue({
      authorized: true,
      membership: { role: 'manager', userId: 'user-1' },
    })
    ;(apiKeyRepository.findByOrgId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'key-1', label: 'Primary Key', createdByUserId: 'user-1', status: 'active' },
    ])
    ;(usageRepository.queryPerKeyCost as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        apiKeyId: 'key-1',
        totalCost: 5,
        totalRequests: 10,
        totalTokens: 250,
      },
    ])

    const result = await service.execute({
      orgId: 'org-1',
      callerUserId: 'user-1',
      callerSystemRole: 'admin',
    })

    expect(result.data?.rows[0]).toMatchObject({
      costPerRequest: 0.5,
      tokensPerRequest: 25,
    })
  })

  it('returns zero efficiency metrics when totalRequests is zero', async () => {
    const { service, usageRepository, orgAuth, apiKeyRepository } = createService()

    ;(orgAuth.requireOrgMembership as ReturnType<typeof vi.fn>).mockResolvedValue({
      authorized: true,
      membership: { role: 'manager', userId: 'user-1' },
    })
    ;(apiKeyRepository.findByOrgId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'key-1', label: 'Primary Key', createdByUserId: 'user-1', status: 'active' },
    ])
    ;(usageRepository.queryPerKeyCost as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        apiKeyId: 'key-1',
        totalCost: 5,
        totalRequests: 0,
        totalTokens: 250,
      },
    ])

    const result = await service.execute({
      orgId: 'org-1',
      callerUserId: 'user-1',
      callerSystemRole: 'admin',
    })

    expect(result.data?.rows[0]).toMatchObject({
      costPerRequest: 0,
      tokensPerRequest: 0,
    })
  })

  it('computes percent of total from visible rows only', async () => {
    const { service, usageRepository, orgAuth, apiKeyRepository } = createService()

    ;(orgAuth.requireOrgMembership as ReturnType<typeof vi.fn>).mockResolvedValue({
      authorized: true,
      membership: { role: 'member', userId: 'user-1' },
    })
    ;(apiKeyRepository.findByOrgId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'key-1', label: 'Primary Key', createdByUserId: 'user-1', status: 'active' },
      { id: 'key-2', label: 'Secondary Key', createdByUserId: 'user-1', status: 'active' },
    ])
    ;(usageRepository.queryPerKeyCostByKeys as ReturnType<typeof vi.fn>).mockResolvedValue([
      { apiKeyId: 'key-1', totalCost: 3, totalRequests: 3, totalTokens: 30 },
      { apiKeyId: 'key-2', totalCost: 7, totalRequests: 7, totalTokens: 70 },
    ])

    const result = await service.execute({
      orgId: 'org-1',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
    })

    expect(result.data?.rows).toHaveLength(2)
    expect(result.data?.rows[0]?.percentOfTotal).toBe(30)
    expect(result.data?.rows[1]?.percentOfTotal).toBe(70)
  })

  it('returns NOT_ORG_MEMBER for unauthorized callers', async () => {
    const { service, orgAuth } = createService()

    ;(orgAuth.requireOrgMembership as ReturnType<typeof vi.fn>).mockResolvedValue({
      authorized: false,
      error: 'NOT_ORG_MEMBER',
    })

    const result = await service.execute({
      orgId: 'org-1',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_ORG_MEMBER')
  })

  it('returns empty rows and zero grand total when member has no visible keys', async () => {
    const { service, usageRepository, orgAuth, apiKeyRepository } = createService()

    ;(orgAuth.requireOrgMembership as ReturnType<typeof vi.fn>).mockResolvedValue({
      authorized: true,
      membership: { role: 'member', userId: 'user-1' },
    })
    ;(apiKeyRepository.findByOrgId as ReturnType<typeof vi.fn>).mockResolvedValue([])

    const result = await service.execute({
      orgId: 'org-1',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
    })

    expect(result.success).toBe(true)
    expect(result.data?.rows).toEqual([])
    expect(result.data?.grandTotal).toEqual({
      totalCost: 0,
      totalRequests: 0,
      totalTokens: 0,
    })
    expect(usageRepository.queryPerKeyCostByKeys).not.toHaveBeenCalled()
  })
})
