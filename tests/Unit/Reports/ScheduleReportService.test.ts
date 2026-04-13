import { afterEach, describe, expect, it, spyOn, vi } from 'bun:test'
import { FakeScheduler } from '../Scheduler/FakeScheduler'
import { ReportSchedule } from '../../../src/Modules/Reports/Domain/Aggregates/ReportSchedule'
import { ScheduleReportService } from '../../../src/Modules/Reports/Application/Services/ScheduleReportService'
import type { IReportRepository } from '../../../src/Modules/Reports/Domain/Repositories/IReportRepository'
import type { GeneratePdfService } from '../../../src/Modules/Reports/Application/Services/GeneratePdfService'
import type { SendReportEmailService } from '../../../src/Modules/Reports/Application/Services/SendReportEmailService'

function makeSchedule(overrides: Partial<{
  id: string
  orgId: string
  type: 'weekly' | 'monthly'
  day: number
  time: string
  timezone: string
  recipients: string[]
  enabled: boolean
}> = {}): ReportSchedule {
  return ReportSchedule.create({
    id: overrides.id ?? 'report-1',
    orgId: overrides.orgId ?? 'org-1',
    type: overrides.type ?? 'weekly',
    day: overrides.day ?? 1,
    time: overrides.time ?? '09:00',
    timezone: overrides.timezone ?? 'UTC',
    recipients: overrides.recipients ?? ['ops@example.com'],
    enabled: overrides.enabled ?? true,
  })
}

function makeRepository(schedules: ReportSchedule[]): IReportRepository {
  return {
    save: async () => {},
    findById: async (id: string) => schedules.find((schedule) => schedule.id === id) ?? null,
    findByOrgId: async () => schedules,
    findAllEnabled: async () => schedules.filter((schedule) => schedule.enabled),
    delete: async () => {},
  }
}

function makeService(schedules: ReportSchedule[], scheduler = new FakeScheduler()) {
  const pdfService = {
    generate: async () => Buffer.from('pdf'),
  } as unknown as GeneratePdfService
  const emailService = {
    send: async () => {},
  } as unknown as SendReportEmailService

  return {
    scheduler,
    pdfService,
    emailService,
    service: new ScheduleReportService(makeRepository(schedules), pdfService, emailService, scheduler),
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ScheduleReportService', () => {
  it('registers enabled schedules with cron and timezone', async () => {
    const schedule = makeSchedule()
    const { service, scheduler } = makeService([schedule])

    await service.schedule(schedule.id)

    expect(scheduler.has(`report:${schedule.id}`)).toBe(true)
    expect(scheduler.scheduled.get(`report:${schedule.id}`)?.spec.cron).toBe(schedule.cronString)
    expect(scheduler.scheduled.get(`report:${schedule.id}`)?.spec.timezone).toBe(schedule.timezone)
  })

  it('ignores disabled schedules', async () => {
    const schedule = makeSchedule({ enabled: false })
    const { service, scheduler } = makeService([schedule])

    await service.schedule(schedule.id)

    expect(scheduler.has(`report:${schedule.id}`)).toBe(false)
  })

  it('unschedules before re-registering the same schedule', async () => {
    const schedule = makeSchedule()
    const { service, scheduler } = makeService([schedule])
    const unscheduleSpy = spyOn(scheduler, 'unschedule')

    await service.schedule(schedule.id)
    await service.schedule(schedule.id)

    expect(unscheduleSpy).toHaveBeenCalledWith(`report:${schedule.id}`)
    expect(scheduler.scheduled.size).toBe(1)
  })

  it('stops jobs safely', async () => {
    const schedule = makeSchedule()
    const { service, scheduler } = makeService([schedule])
    const unscheduleSpy = spyOn(scheduler, 'unschedule')

    await service.schedule(schedule.id)
    service.stop(schedule.id)
    service.stop('missing')

    expect(unscheduleSpy).toHaveBeenCalledWith(`report:${schedule.id}`)
    expect(scheduler.has(`report:${schedule.id}`)).toBe(false)
  })

  it('reports scheduled state', async () => {
    const schedule = makeSchedule()
    const { service, scheduler } = makeService([schedule])

    await service.schedule(schedule.id)

    expect(service.isScheduled(schedule.id)).toBe(true)
    expect(scheduler.has(`report:${schedule.id}`)).toBe(true)
  })

  it('bootstraps all enabled schedules', async () => {
    const schedules = [makeSchedule(), makeSchedule({ id: 'report-2' })]
    const { service, scheduler } = makeService(schedules)

    await service.bootstrap()

    expect(scheduler.has('report:report-1')).toBe(true)
    expect(scheduler.has('report:report-2')).toBe(true)
  })

  it('executes the handler with generated pdf and email delivery', async () => {
    const schedule = makeSchedule()
    const scheduler = new FakeScheduler()
    const pdfService = {
      generate: async (orgId: string) => Buffer.from(orgId),
    } as unknown as GeneratePdfService
    const emailService = {
      send: async () => {},
    } as unknown as SendReportEmailService
    const service = new ScheduleReportService(
      makeRepository([schedule]),
      pdfService,
      emailService,
      scheduler,
    )
    const sendSpy = spyOn(emailService, 'send')

    await service.schedule(schedule.id)
    await scheduler.trigger(`report:${schedule.id}`)

    expect(sendSpy).toHaveBeenCalledWith(schedule.recipients, Buffer.from(schedule.orgId), schedule.type)
  })

  it('swallows handler errors so retry policy stays in the scheduler', async () => {
    const schedule = makeSchedule()
    const scheduler = new FakeScheduler()
    const errorSpy = spyOn(console, 'error')
    const pdfService = {
      generate: async () => {
        throw new Error('pdf failed')
      },
    } as unknown as GeneratePdfService
    const emailService = {
      send: async () => {},
    } as unknown as SendReportEmailService
    const service = new ScheduleReportService(
      makeRepository([schedule]),
      pdfService,
      emailService,
      scheduler,
    )

    await service.schedule(schedule.id)
    await scheduler.trigger(`report:${schedule.id}`)

    expect(errorSpy).toHaveBeenCalled()
  })
})
