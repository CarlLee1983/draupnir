import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GetModelComparisonService } from '../Application/Services/GetModelComparisonService'

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
      queryModelBreakdown: vi.fn(),
      queryModelBreakdownByKeys: vi.fn(),
    } as const)

  return {
    service: new GetModelComparisonService(
      apiKeyRepository as any,
      orgAuth as any,
      usageRepository as any,
    ),
    apiKeyRepository,
    orgAuth,
    usageRepository,
  }
}

describe('GetModelComparisonService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns org-wide model rows for manager/admin callers', async () => {
    const { service, usageRepository, orgAuth, apiKeyRepository } = createService()

    ;(orgAuth.requireOrgMembership as ReturnType<typeof vi.fn>).mockResolvedValue({
      authorized: true,
      membership: { role: 'manager', userId: 'user-1' },
    })
    ;(apiKeyRepository.findByOrgId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'key-1', createdByUserId: 'user-1', status: 'active' },
    ])
    ;(usageRepository.queryModelBreakdown as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        model: 'gpt-4o',
        provider: 'openai',
        totalCost: 5.5,
        totalRequests: 8,
        avgLatencyMs: 120,
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
    expect(usageRepository.queryModelBreakdown).toHaveBeenCalledWith('org-1', {
      startDate: '2026-04-01T00:00:00Z',
      endDate: '2026-04-30T23:59:59Z',
    })
    expect(usageRepository.queryModelBreakdownByKeys).not.toHaveBeenCalled()
  })

  it('returns member-scoped model rows from visible API keys', async () => {
    const { service, usageRepository, orgAuth, apiKeyRepository } = createService()

    ;(orgAuth.requireOrgMembership as ReturnType<typeof vi.fn>).mockResolvedValue({
      authorized: true,
      membership: { role: 'member', userId: 'user-1' },
    })
    ;(apiKeyRepository.findByOrgId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'key-1', createdByUserId: 'user-1', status: 'active' },
      { id: 'key-2', createdByUserId: 'other', status: 'active' },
    ])
    ;(usageRepository.queryModelBreakdownByKeys as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        model: 'gpt-4o',
        provider: 'openai',
        totalCost: 4.5,
        totalRequests: 6,
        avgLatencyMs: 150,
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
    expect(usageRepository.queryModelBreakdownByKeys).toHaveBeenCalledWith(['key-1'], {
      startDate: '2026-04-01T00:00:00Z',
      endDate: '2026-04-30T23:59:59Z',
    })
  })

  it('filters model rows to a specific key when apiKeyIds are supplied', async () => {
    const { service, usageRepository, orgAuth, apiKeyRepository } = createService()

    ;(orgAuth.requireOrgMembership as ReturnType<typeof vi.fn>).mockResolvedValue({
      authorized: true,
      membership: { role: 'member', userId: 'user-1' },
    })
    ;(apiKeyRepository.findByOrgId as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'key-1', createdByUserId: 'user-1', status: 'active' },
      { id: 'key-2', createdByUserId: 'user-1', status: 'active' },
    ])
    ;(usageRepository.queryModelBreakdownByKeys as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        model: 'gpt-4o',
        provider: 'openai',
        totalCost: 2.25,
        totalRequests: 3,
        avgLatencyMs: 110,
      },
    ])

    const result = await service.execute({
      orgId: 'org-1',
      callerUserId: 'user-1',
      callerSystemRole: 'user',
      startTime: '2026-04-01T00:00:00Z',
      endTime: '2026-04-30T23:59:59Z',
      apiKeyIds: ['key-1'],
    })

    expect(result.success).toBe(true)
    expect(usageRepository.queryModelBreakdownByKeys).toHaveBeenCalledWith(['key-1'], {
      startDate: '2026-04-01T00:00:00Z',
      endDate: '2026-04-30T23:59:59Z',
    })
    expect(usageRepository.queryModelBreakdown).not.toHaveBeenCalled()
  })
})
