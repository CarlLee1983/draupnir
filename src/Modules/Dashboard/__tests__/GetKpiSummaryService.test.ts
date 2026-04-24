import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GetKpiSummaryService } from '../Application/Services/GetKpiSummaryService'

function createService(
  overrides: {
    apiKeyRepository?: Record<string, unknown>
    orgAuth?: Record<string, unknown>
    usageRepository?: Record<string, unknown>
    cursorRepo?: Record<string, unknown>
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
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      apiKeyRepository as any,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      orgAuth as any,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
      usageRepository as any,
      // biome-ignore lint/suspicious/noExplicitAny: explicit any: incremental cleanup
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
      .mockResolvedValue({
        totalRequests: 0,
        totalCost: 0,
        totalTokens: 0,
        avgLatency: 0,
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
    expect(usageRepository.queryStatsByKey).toHaveBeenCalledTimes(4)
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

  it('returns previousPeriod scoped to member visible keys', async () => {
    const { service, usageRepository, orgAuth, apiKeyRepository } = createService()

    ;(orgAuth.requireOrgMembership as ReturnType<typeof vi.fn>).mockResolvedValue({
      authorized: true,
      membership: { role: 'member', userId: 'user-1' },
    })
    ;(apiKeyRepository.findByOrgId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'key-1', createdByUserId: 'user-1', status: 'active' },
      { id: 'key-2', createdByUserId: 'other', status: 'active' }, // not visible
    ])

    // current period calls (1x for key-1)
    // prior period calls (1x for key-1)
    ;(usageRepository.queryStatsByKey as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        totalRequests: 10,
        totalCost: 2.0,
        totalTokens: 400,
        avgLatency: 100,
      }) // current key-1
      .mockResolvedValueOnce({ totalRequests: 5, totalCost: 1.0, totalTokens: 200, avgLatency: 80 }) // prior key-1

    const result = await service.execute({
      orgId: 'org-1',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
      startTime: '2026-03-13T00:00:00Z',
      endTime: '2026-04-12T00:00:00Z',
    })

    expect(result.success).toBe(true)
    expect(result.data?.previousPeriod).toEqual({
      totalRequests: 5,
      totalCost: 1.0,
      totalTokens: 200,
      avgLatency: 80,
    })
    // queryStatsByOrg must NOT be called at all
    expect(usageRepository.queryStatsByOrg).not.toHaveBeenCalled()
    // queryStatsByKey called twice: once for current, once for prior
    expect(usageRepository.queryStatsByKey).toHaveBeenCalledTimes(2)
  })

  it('returns previousPeriod as zeroUsage when prior period has no records', async () => {
    const { service, usageRepository, orgAuth } = createService()

    ;(orgAuth.requireOrgMembership as ReturnType<typeof vi.fn>).mockResolvedValue({
      authorized: true,
      membership: { role: 'manager', userId: 'user-1' },
    })
    ;(usageRepository.queryStatsByOrg as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        totalRequests: 8,
        totalCost: 1.5,
        totalTokens: 300,
        avgLatency: 120,
      }) // current
      .mockResolvedValueOnce({ totalRequests: 0, totalCost: 0, totalTokens: 0, avgLatency: 0 }) // prior

    const result = await service.execute({
      orgId: 'org-1',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
      startTime: '2026-03-13T00:00:00Z',
      endTime: '2026-04-12T00:00:00Z',
    })

    expect(result.success).toBe(true)
    expect(result.data?.previousPeriod).toEqual({
      totalRequests: 0,
      totalCost: 0,
      totalTokens: 0,
      avgLatency: 0,
    })
  })

  it('prior window duration mirrors the selected window exactly', async () => {
    const { service, usageRepository, orgAuth } = createService()

    ;(orgAuth.requireOrgMembership as ReturnType<typeof vi.fn>).mockResolvedValue({
      authorized: true,
      membership: null,
    })
    ;(usageRepository.queryStatsByOrg as ReturnType<typeof vi.fn>).mockResolvedValue({
      totalRequests: 0,
      totalCost: 0,
      totalTokens: 0,
      avgLatency: 0,
    })

    const startTime = '2026-03-13T00:00:00.000Z'
    const endTime = '2026-04-12T00:00:00.000Z'

    await service.execute({
      orgId: 'org-1',
      callerUserId: 'user-1',
      callerSystemRole: 'admin',
      startTime,
      endTime,
    })

    // queryStatsByOrg called twice: current range, then prior range
    expect(usageRepository.queryStatsByOrg).toHaveBeenCalledTimes(2)

    const windowMs = new Date(endTime).getTime() - new Date(startTime).getTime()
    const expectedPriorStart = new Date(new Date(startTime).getTime() - windowMs).toISOString()
    const expectedPriorEnd = startTime

    expect(usageRepository.queryStatsByOrg).toHaveBeenNthCalledWith(2, 'org-1', {
      startDate: expectedPriorStart,
      endDate: expectedPriorEnd,
    })
  })
})
