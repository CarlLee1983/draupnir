import { describe, expect, it } from 'bun:test'
import type { JobSpec } from '@/Foundation/Infrastructure/Ports/Scheduler/IScheduler'
import { FakeScheduler } from './FakeScheduler'

const spec: JobSpec = {
  name: 'x',
  cron: '* * * * *',
}

describe('FakeScheduler', () => {
  it('tracks scheduled jobs by name', () => {
    const scheduler = new FakeScheduler()

    scheduler.schedule(spec, async () => {})

    expect(scheduler.has('x')).toBe(true)
    expect(scheduler.scheduled.get('x')?.spec).toBe(spec)
  })

  it('rejects duplicate job names', () => {
    const scheduler = new FakeScheduler()

    scheduler.schedule(spec, async () => {})

    expect(() => scheduler.schedule(spec, async () => {})).toThrow(/duplicate.*x/)
  })

  it('unschedules existing jobs and ignores unknown ones', () => {
    const scheduler = new FakeScheduler()

    scheduler.schedule(spec, async () => {})
    scheduler.unschedule('x')
    scheduler.unschedule('missing')

    expect(scheduler.has('x')).toBe(false)
    expect(scheduler.scheduled.size).toBe(0)
  })

  it('triggers scheduled handlers and awaits their promise', async () => {
    const scheduler = new FakeScheduler()
    const calls: string[] = []

    scheduler.schedule(spec, async () => {
      calls.push('start')
      await Promise.resolve()
      calls.push('end')
    })

    await scheduler.trigger('x')

    expect(calls).toEqual(['start', 'end'])
  })

  it('throws on unknown trigger', async () => {
    const scheduler = new FakeScheduler()

    await expect(scheduler.trigger('missing')).rejects.toThrow('no scheduled job: missing')
  })

  it('exposes scheduled entries for assertions', () => {
    const scheduler = new FakeScheduler()
    const handler = async () => {}

    scheduler.schedule(spec, handler)

    expect(scheduler.scheduled.get('x')?.spec).toBe(spec)
    expect(scheduler.scheduled.get('x')?.handler).toBe(handler)
  })
})
