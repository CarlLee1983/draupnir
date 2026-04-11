import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GetKpiSummaryService } from '../Application/Services/GetKpiSummaryService'

function createService(overrides: {
  apiKeyRepository?: Record<string, unknown>
  orgAuth?: Record<string, unknown>
  usageRepository?: Record<string, unknown>
  cursorRepo?: Record<string, unknown>
} = {}) {
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
      queryStatsByOrg: vi.fn(),
      queryStatsByKey: vi.fn(),
    } as const)
  const cursorRepo =
    overrides.cursorRepo ??
    ({
      get: vi.fn().mockResolvedValue(null),
    } as const)

  return {
    service: new GetKpiSummaryService(
      apiKeyRepository as any,
      orgAuth as any,
      usageRepository as any,
      cursorRepo as any,
    ),
    apiKeyRepository,
    orgAuth,
    usageRepository,
    cursorRepo,
  }
}

describe('GetKpiSummaryService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns org-wide KPI stats for manager/admin callers', async () => {
    const { service, usageRepository, orgAuth, apiKeyRepository } = createService()

    ;(orgAuth.requireOrgMembership as ReturnType<typeof vi.fn>).mockResolvedValue({
      authorized: true,
      membership: { role: 'manager', userId: 'user-1' },
    })
    ;(apiKeyRepository.findByOrgId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'key-1', createdByUserId: 'user-1', status: 'active' },
    ])
    ;(usageRepository.queryStatsByOrg as ReturnType<typeof vi.fn>).mockResolvedValue({
      totalRequests: 12,
      totalCost: 4.5,
      totalTokens: 900,
      avgLatency: 155,
    })

    const result = await service.execute({
      orgId: 'org-1',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
      startTime: '2026-04-01T00:00:00Z',
      endTime: '2026-04-30T23:59:59Z',
    })

    expect(result.success).toBe(true)
    expect(result.data?.usage).toEqual({
      totalRequests: 12,
      totalCost: 4.5,
      totalTokens: 900,
      avgLatency: 155,
    })
    expect(usageRepository.queryStatsByOrg).toHaveBeenCalledWith('org-1', {
      startDate: '2026-04-01T00:00:00Z',
      endDate: '2026-04-30T23:59:59Z',
    })
    expect(usageRepository.queryStatsByKey).not.toHaveBeenCalled()
  })

  it('aggregates member KPI stats across visible keys with weighted latency', async () => {
    const { service, usageRepository, orgAuth, apiKeyRepository } = createService()

    ;(orgAuth.requireOrgMembership as ReturnType<typeof vi.fn>).mockResolvedValue({
      authorized: true,
      membership: { role: 'member', userId: 'user-1' },
    })
    ;(apiKeyRepository.findByOrgId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'key-1', createdByUserId: 'user-1', status: 'active' },
      { id: 'key-2', createdByUserId: 'user-1', status: 'active' },
      { id: 'key-3', createdByUserId: 'other', status: 'active' },
    ])
    ;(usageRepository.queryStatsByKey as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        totalRequests: 4,
        totalCost: 1.25,
        totalTokens: 250,
        avgLatency: 100,
      })
      .mockResolvedValueOnce({
        totalRequests: 1,
        totalCost: 0.75,
        totalTokens: 100,
        avgLatency: 300,
      })

    const result = await service.execute({
      orgId: 'org-1',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
      startTime: '2026-04-01T00:00:00Z',
      endTime: '2026-04-30T23:59:59Z',
    })

    expect(result.success).toBe(true)
    expect(usageRepository.queryStatsByOrg).not.toHaveBeenCalled()
    expect(usageRepository.queryStatsByKey).toHaveBeenCalledTimes(2)
    expect(result.data?.usage).toEqual({
      totalRequests: 5,
      totalCost: 2,
      totalTokens: 350,
      avgLatency: 140,
    })
  })

  it('includes lastSyncedAt from cursor in KPI response for admin caller', async () => {
    const { service, usageRepository, orgAuth, cursorRepo } = createService()

    ;(orgAuth.requireOrgMembership as ReturnType<typeof vi.fn>).mockResolvedValue({
      authorized: true,
      membership: null,
    })
    ;(usageRepository.queryStatsByOrg as ReturnType<typeof vi.fn>).mockResolvedValue({
      totalRequests: 9,
      totalCost: 1.5,
      totalTokens: 300,
      avgLatency: 120,
    })
    ;(cursorRepo.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      cursorType: 'bifrost_logs',
      lastSyncedAt: '2026-04-12T10:00:00.000Z',
      lastBifrostLogId: null,
    })

    const result = await service.execute({
      orgId: 'org-1',
      callerUserId: 'user-1',
      callerSystemRole: 'admin',
      startTime: '2026-04-01T00:00:00Z',
      endTime: '2026-04-30T23:59:59Z',
    })

    expect(result.data?.lastSyncedAt).toBe('2026-04-12T10:00:00.000Z')
  })

  it('includes lastSyncedAt as null when cursor has no record', async () => {
    const { service, usageRepository, orgAuth, cursorRepo } = createService()

    ;(orgAuth.requireOrgMembership as ReturnType<typeof vi.fn>).mockResolvedValue({
      authorized: true,
      membership: { role: 'manager', userId: 'user-1' },
    })
    ;(usageRepository.queryStatsByOrg as ReturnType<typeof vi.fn>).mockResolvedValue({
      totalRequests: 1,
      totalCost: 0.25,
      totalTokens: 50,
      avgLatency: 90,
    })
    ;(cursorRepo.get as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const result = await service.execute({
      orgId: 'org-1',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
      startTime: '2026-04-01T00:00:00Z',
      endTime: '2026-04-30T23:59:59Z',
    })

    expect(result.data?.lastSyncedAt).toBeNull()
  })
})
