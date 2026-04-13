import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GetCostTrendsService } from '../Application/Services/GetCostTrendsService'

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
      queryDailyCostByOrg: vi.fn(),
      queryDailyCostByKeys: vi.fn(),
    } as const)

  return {
    service: new GetCostTrendsService(
      apiKeyRepository as any,
      orgAuth as any,
      usageRepository as any,
    ),
    apiKeyRepository,
    orgAuth,
    usageRepository,
  }
}

describe('GetCostTrendsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns org-wide daily buckets for manager/admin callers', async () => {
    const { service, usageRepository, orgAuth, apiKeyRepository } = createService()

    ;(orgAuth.requireOrgMembership as ReturnType<typeof vi.fn>).mockResolvedValue({
      authorized: true,
      membership: { role: 'manager', userId: 'user-1' },
    })
    ;(apiKeyRepository.findByOrgId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'key-1', createdByUserId: 'user-1', status: 'active' },
    ])
    ;(usageRepository.queryDailyCostByOrg as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        date: '2026-04-11',
        totalCost: 4.5,
        totalRequests: 3,
        totalInputTokens: 200,
        totalOutputTokens: 100,
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
    expect(result.data?.buckets).toHaveLength(1)
    expect(usageRepository.queryDailyCostByOrg).toHaveBeenCalledWith('org-1', {
      startDate: '2026-04-01T00:00:00Z',
      endDate: '2026-04-30T23:59:59Z',
    })
    expect(usageRepository.queryDailyCostByKeys).not.toHaveBeenCalled()
  })

  it('returns member-scoped daily buckets from visible API keys', async () => {
    const { service, usageRepository, orgAuth, apiKeyRepository } = createService()

    ;(orgAuth.requireOrgMembership as ReturnType<typeof vi.fn>).mockResolvedValue({
      authorized: true,
      membership: { role: 'member', userId: 'user-1' },
    })
    ;(apiKeyRepository.findByOrgId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'key-1', createdByUserId: 'user-1', status: 'active' },
      { id: 'key-2', createdByUserId: 'other', status: 'active' },
    ])
    ;(usageRepository.queryDailyCostByKeys as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        date: '2026-04-11',
        totalCost: 1.5,
        totalRequests: 1,
        totalInputTokens: 10,
        totalOutputTokens: 20,
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
    expect(usageRepository.queryDailyCostByOrg).not.toHaveBeenCalled()
    expect(usageRepository.queryDailyCostByKeys).toHaveBeenCalledWith(['key-1'], {
      startDate: '2026-04-01T00:00:00Z',
      endDate: '2026-04-30T23:59:59Z',
    })
  })
})
