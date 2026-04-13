import { describe, expect, it } from 'bun:test'
import { parseBifrostSyncCron } from '../../../config/app'
import { DashboardServiceProvider } from '../../../src/Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider'
import { ReportSchedule } from '../../../src/Modules/Reports/Domain/Aggregates/ReportSchedule'
import { ReportsServiceProvider } from '../../../src/Modules/Reports/Infrastructure/Providers/ReportsServiceProvider'
import type { IContainer } from '../../../src/Shared/Infrastructure/IServiceProvider'
import { FakeScheduler } from '../../Unit/Scheduler/FakeScheduler'

class TestContainer implements IContainer {
  private readonly bindings = new Map<string, (c: IContainer) => unknown>()
  private readonly instances = new Map<string, unknown>()

  singleton(name: string, factory: (c: IContainer) => unknown): void {
    this.bindings.set(name, factory)
  }

  bind(name: string, factory: (c: IContainer) => unknown): void {
    this.bindings.set(name, factory)
  }

  make(name: string): unknown {
    if (this.instances.has(name)) {
      return this.instances.get(name)
    }
    const factory = this.bindings.get(name)
    if (!factory) {
      throw new Error(`unbound: ${name}`)
    }
    const value = factory(this)
    this.instances.set(name, value)
    return value
  }
}

function makeSchedule(id: string): ReportSchedule {
  return ReportSchedule.create({
    id,
    orgId: `org-${id}`,
    type: 'weekly',
    day: 1,
    time: '09:00',
    timezone: 'UTC',
    recipients: [`${id}@example.com`],
    enabled: true,
  })
}

describe('bootstrap registerJobs wiring', () => {
  it('registers bifrost-sync with the expected scheduler spec', () => {
    const container = new TestContainer()
    const scheduler = new FakeScheduler()
    const provider = new DashboardServiceProvider()

    provider.register(container)
    container.singleton('bifrostSyncService', () => ({
      sync: async () => ({ synced: 0, quarantined: 0 }),
    }))

    provider.registerJobs(scheduler)

    const spec = scheduler.scheduled.get('bifrost-sync')?.spec
    expect(spec?.cron).toBe(parseBifrostSyncCron('*/5 * * * *'))
    expect(spec?.runOnInit).toBe(true)
    expect(spec?.maxRetries).toBe(2)
    expect(spec?.backoffMs).toBe(2000)
  })

  it('registers enabled report schedules through registerJobs', async () => {
    const container = new TestContainer()
    const scheduler = new FakeScheduler()
    const provider = new ReportsServiceProvider()
    const schedules = [makeSchedule('report-x'), makeSchedule('report-y')]

    provider.register(container)
    container.singleton('scheduler', () => scheduler)
    container.singleton('reportRepository', () => ({
      save: async () => {},
      findById: async (id: string) => schedules.find((schedule) => schedule.id === id) ?? null,
      findByOrgId: async () => schedules,
      findAllEnabled: async () => schedules,
      delete: async () => {},
    }))
    container.singleton('generatePdfService', () => ({ generate: async () => Buffer.from('pdf') }))
    container.singleton('sendReportEmailService', () => ({ send: async () => {} }))

    await provider.registerJobs(scheduler)

    expect(scheduler.has('report:report-x')).toBe(true)
    expect(scheduler.has('report:report-y')).toBe(true)
  })

  it('rejects invalid BIFROST_SYNC_CRON values', () => {
    expect(() => parseBifrostSyncCron('not-a-cron')).toThrow('Invalid BIFROST_SYNC_CRON')
  })
})
