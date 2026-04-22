import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import type { IUsageRepository } from '@/Modules/Dashboard/Application/Ports/IUsageRepository'
import { ReportSchedule } from '@/Modules/Reports/Domain/Aggregates/ReportSchedule'
import type { IReportRepository } from '@/Modules/Reports/Domain/Repositories/IReportRepository'
import { ReportToken } from '@/Modules/Reports/Domain/ValueObjects/ReportToken'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AdminReportTemplatePage } from '../../Admin/Pages/AdminReportTemplatePage'
import type { InertiaService } from '../../Http/Inertia/InertiaRequestHandler'

function createMockContext(overrides: Partial<IHttpContext> = {}): IHttpContext {
  const store = new Map<string, unknown>()
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: () => undefined,
    getParam: () => undefined,
    getPathname: () => '/admin/reports/template',
    getQuery: () => undefined,
    params: {},
    query: {},
    headers: {},
    json: (data: unknown, statusCode?: number) =>
      Response.json(data, { status: statusCode ?? 200 }),
    text: (content: string, statusCode?: number) =>
      new Response(content, { status: statusCode ?? 200 }),
    redirect: (url: string, statusCode?: number) => Response.redirect(url, statusCode ?? 302),
    get: <T>(key: string) => store.get(key) as T | undefined,
    set: (key: string, value: unknown) => {
      store.set(key, value)
    },
    getCookie: (_name: string) => undefined,
    setCookie: (_name: string, _value: string, _options?: unknown) => {},
    ...overrides,
    getMethod: overrides.getMethod ?? (() => 'GET'),
  }
}

type InertiaCapture = { component: string; props: Record<string, unknown> } | null

type ReportRepositoryStub = IReportRepository
type UsageRepositoryStub = IUsageRepository

function createMockInertia(): { inertia: InertiaService; captured: { lastCall: InertiaCapture } } {
  const captured = { lastCall: null as InertiaCapture }
  const inertia = {
    render: (_ctx: IHttpContext, component: string, props: Record<string, unknown>) => {
      captured.lastCall = { component, props }
      return new Response(JSON.stringify({ component, props }), {
        headers: { 'Content-Type': 'application/json' },
      })
    },
  } as unknown as InertiaService
  return { inertia, captured }
}

function createReportRepositoryStub(
  findById: ReportRepositoryStub['findById'],
): ReportRepositoryStub {
  return {
    save: mock(async () => {}),
    findById,
    findByOrgId: mock(async () => []),
    findAllEnabled: mock(async () => []),
    delete: mock(async () => {}),
  }
}

function createUsageRepositoryStub(
  overrides: Partial<Pick<UsageRepositoryStub, 'queryStatsByOrg' | 'queryDailyCostByOrg'>> = {},
): UsageRepositoryStub {
  return {
    upsert: mock(async () => {}),
    queryDailyCostPlatform: mock(async () => []),
    queryDailyCostByOrg: overrides.queryDailyCostByOrg ?? mock(async () => []),
    queryDailyCostByKeys: mock(async () => []),
    queryModelBreakdown: mock(async () => []),
    queryModelBreakdownByKeys: mock(async () => []),
    queryStatsByOrg:
      overrides.queryStatsByOrg ??
      mock(async () => ({
        totalRequests: 0,
        totalCost: 0,
        totalTokens: 0,
        avgLatency: 0,
      })),
    queryStatsByKey: mock(async () => ({
      totalRequests: 0,
      totalCost: 0,
      totalTokens: 0,
      avgLatency: 0,
    })),
    queryPerKeyCost: mock(async () => []),
    queryPerKeyCostByKeys: mock(async () => []),
  }
}

describe('AdminReportTemplatePage', () => {
  const secret = 'test-secret-12345678901234567890123456789012'
  let originalSecret: string | undefined

  beforeEach(() => {
    originalSecret = process.env.REPORT_SIGNING_SECRET
    process.env.REPORT_SIGNING_SECRET = secret
  })

  afterEach(() => {
    process.env.REPORT_SIGNING_SECRET = originalSecret
  })

  test('renders live report data for a valid token and schedule', async () => {
    const { inertia, captured } = createMockInertia()
    const schedule = ReportSchedule.create({
      id: 'schedule-123',
      orgId: 'org-123',
      type: 'weekly',
      day: 1,
      time: '09:00',
      timezone: 'Asia/Taipei',
      recipients: ['admin@example.com'],
      enabled: true,
    })

    const mockReportRepository = createReportRepositoryStub(
      mock(async (id: string) => (id === schedule.id ? schedule : null)),
    )
    const mockUsageRepository = createUsageRepositoryStub({
      queryStatsByOrg: mock(async () => ({
        totalRequests: 10,
        totalCost: 42.5,
        totalTokens: 315000,
        avgLatency: 120,
      })),
      queryDailyCostByOrg: mock(async () => [
        {
          date: '2026-04-21',
          totalCost: 1.5,
          totalRequests: 4,
          totalInputTokens: 100,
          totalOutputTokens: 200,
        },
      ]),
    })

    const page = new AdminReportTemplatePage(inertia, mockReportRepository, mockUsageRepository)

    const token = await ReportToken.generate(
      schedule.orgId,
      schedule.id,
      new Date(Date.now() + 3600 * 1000),
    )
    const ctx = createMockContext({
      query: { token: token.value, isAnimationActive: 'false' },
    })

    await page.handle(ctx)

    expect(captured.lastCall?.component).toBe('Admin/Reports/Template')
    const report = captured.lastCall?.props.report as
      | {
          orgId: string
          scheduleId: string
          summary: { totalRequests: number }
          dailyTrend: unknown[]
        }
      | undefined
    expect(report).toBeDefined()
    expect(report?.orgId).toBe('org-123')
    expect(report?.scheduleId).toBe('schedule-123')
    expect(report?.summary.totalRequests).toBe(10)
    expect(report?.dailyTrend.length).toBeGreaterThan(0)
    expect(mockReportRepository.findById).toHaveBeenCalledWith('schedule-123')
    expect(mockUsageRepository.queryStatsByOrg).toHaveBeenCalled()
    expect(mockUsageRepository.queryDailyCostByOrg).toHaveBeenCalled()
  })

  test('rejects invalid token before rendering the report template', async () => {
    const { inertia, captured } = createMockInertia()
    const page = new AdminReportTemplatePage(
      inertia,
      createReportRepositoryStub(mock(async () => null)),
      createUsageRepositoryStub({
        queryStatsByOrg: mock(async () => ({
          totalRequests: 0,
          totalCost: 0,
          totalTokens: 0,
          avgLatency: 0,
        })),
        queryDailyCostByOrg: mock(async () => []),
      }),
    )

    const ctx = createMockContext({ query: { token: 'bad.token.value' } })
    await page.handle(ctx)

    expect(captured.lastCall?.component).toBe('Error')
    expect(captured.lastCall?.props.message).toContain('Invalid or expired report token')
  })

  test('rejects schedule/org mismatches', async () => {
    const { inertia, captured } = createMockInertia()
    const schedule = ReportSchedule.create({
      id: 'schedule-123',
      orgId: 'org-xyz',
      type: 'monthly',
      day: 1,
      time: '09:00',
      timezone: 'UTC',
      recipients: ['admin@example.com'],
      enabled: true,
    })

    const page = new AdminReportTemplatePage(
      inertia,
      createReportRepositoryStub(mock(async () => schedule)),
      createUsageRepositoryStub({
        queryStatsByOrg: mock(async () => ({
          totalRequests: 0,
          totalCost: 0,
          totalTokens: 0,
          avgLatency: 0,
        })),
        queryDailyCostByOrg: mock(async () => []),
      }),
    )

    const token = await ReportToken.generate(
      'org-123',
      schedule.id,
      new Date(Date.now() + 3600 * 1000),
    )
    const ctx = createMockContext({ query: { token: token.value } })
    await page.handle(ctx)

    expect(captured.lastCall?.component).toBe('Error')
    expect(captured.lastCall?.props.message).toContain('Invalid or expired report token')
  })
})
