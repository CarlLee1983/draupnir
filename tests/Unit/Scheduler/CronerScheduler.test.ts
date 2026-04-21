import { afterEach, describe, expect, it, spyOn, vi } from 'bun:test'
import { Cron } from 'croner'
import { CronerScheduler } from '@/Foundation/Infrastructure/Services/Scheduler/CronerScheduler'

const flushMicrotasks = async (): Promise<void> => {
  await Promise.resolve()
  await Promise.resolve()
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('CronerScheduler', () => {
  it('registers jobs and rejects duplicate names', () => {
    const scheduler = new CronerScheduler()

    scheduler.schedule({ name: 'job-1', cron: '* * * * * *' }, async () => {})

    expect(scheduler.has('job-1')).toBe(true)
    expect(() =>
      scheduler.schedule({ name: 'job-1', cron: '* * * * * *' }, async () => {}),
    ).toThrow(/duplicate job name: job-1/)

    scheduler.unschedule('job-1')
  })

  it('unschedules jobs, calls stop, and cancels pending retries', async () => {
    vi.useFakeTimers({ now: 0 })
    const stopSpy = spyOn(Cron.prototype, 'stop')
    const scheduler = new CronerScheduler()
    let calls = 0

    try {
      scheduler.schedule(
        { name: 'job-2', cron: '* * * * * *', runOnInit: true, maxRetries: 2, backoffMs: 10 },
        async () => {
          calls += 1
          throw new Error('boom')
        },
      )

      await flushMicrotasks()
      expect(calls).toBe(1)

      scheduler.unschedule('job-2')
      expect(scheduler.has('job-2')).toBe(false)
      expect(stopSpy).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(10)
      await flushMicrotasks()
      expect(calls).toBe(1)
    } finally {
      scheduler.unschedule('job-2')
    }
  })

  it('does not retry when maxRetries is absent', async () => {
    vi.useFakeTimers({ now: 0 })
    const errorSpy = spyOn(console, 'error')
    const scheduler = new CronerScheduler()
    let calls = 0

    try {
      scheduler.schedule({ name: 'job-3', cron: '* * * * * *', runOnInit: true }, async () => {
        calls += 1
        throw new Error('boom')
      })

      await flushMicrotasks()

      expect(calls).toBe(1)
      expect(errorSpy).not.toHaveBeenCalled()
    } finally {
      scheduler.unschedule('job-3')
    }
  })

  it('retries failures with exponential backoff', async () => {
    vi.useFakeTimers({ now: 0 })
    const scheduler = new CronerScheduler()
    const callTimes: number[] = []

    try {
      scheduler.schedule(
        { name: 'job-4', cron: '* * * * * *', runOnInit: true, maxRetries: 3, backoffMs: 10 },
        async () => {
          callTimes.push(Date.now())
          if (callTimes.length < 3) {
            throw new Error('retry')
          }
        },
      )

      await flushMicrotasks()
      expect(callTimes).toEqual([0])

      vi.advanceTimersByTime(10)
      await flushMicrotasks()
      expect(callTimes).toEqual([0, 10])

      vi.advanceTimersByTime(20)
      await flushMicrotasks()
      expect(callTimes).toEqual([0, 10, 30])
    } finally {
      scheduler.unschedule('job-4')
    }
  })

  it('logs exhaustion with the exact scheduler format', async () => {
    vi.useFakeTimers({ now: 0 })
    const errorSpy = spyOn(console, 'error')
    const scheduler = new CronerScheduler()
    let calls = 0

    try {
      scheduler.schedule(
        { name: 'test-job', cron: '* * * * * *', runOnInit: true, maxRetries: 2, backoffMs: 1 },
        async () => {
          calls += 1
          throw new Error('fail')
        },
      )

      await flushMicrotasks()
      vi.advanceTimersByTime(1)
      await flushMicrotasks()
      vi.advanceTimersByTime(2)
      await flushMicrotasks()

      expect(calls).toBe(3)
      expect(errorSpy).toHaveBeenCalledTimes(1)
      expect(errorSpy.mock.calls[0]?.[0]).toBe("[Scheduler] Job 'test-job' exhausted 2 retries:")
    } finally {
      scheduler.unschedule('test-job')
    }
  })

  it('runs runOnInit on a microtask without blocking schedule()', async () => {
    const scheduler = new CronerScheduler()
    let started = false

    try {
      scheduler.schedule({ name: 'job-6', cron: '* * * * * *', runOnInit: true }, async () => {
        started = true
      })

      expect(started).toBe(false)
      await flushMicrotasks()
      expect(started).toBe(true)
    } finally {
      scheduler.unschedule('job-6')
    }
  })

  it('runOnInit failures still flow through the retry pipeline', async () => {
    vi.useFakeTimers({ now: 0 })
    const errorSpy = spyOn(console, 'error')
    const scheduler = new CronerScheduler()
    let calls = 0

    try {
      scheduler.schedule(
        { name: 'job-7', cron: '* * * * * *', runOnInit: true, maxRetries: 1, backoffMs: 1 },
        async () => {
          calls += 1
          throw new Error('fail')
        },
      )

      await flushMicrotasks()
      expect(calls).toBe(1)

      vi.advanceTimersByTime(1)
      await flushMicrotasks()

      expect(calls).toBe(2)
      expect(errorSpy).toHaveBeenCalledTimes(1)
      expect(errorSpy.mock.calls[0]?.[0]).toBe("[Scheduler] Job 'job-7' exhausted 1 retries:")
    } finally {
      scheduler.unschedule('job-7')
    }
  })

  it('cancels retries when a job is unscheduled mid-backoff', async () => {
    vi.useFakeTimers({ now: 0 })
    const scheduler = new CronerScheduler()
    let calls = 0

    try {
      scheduler.schedule(
        { name: 'job-8', cron: '* * * * * *', runOnInit: true, maxRetries: 2, backoffMs: 10 },
        async () => {
          calls += 1
          throw new Error('fail')
        },
      )

      await flushMicrotasks()
      expect(calls).toBe(1)

      scheduler.unschedule('job-8')
      vi.advanceTimersByTime(10)
      await flushMicrotasks()

      expect(calls).toBe(1)
      expect(scheduler.has('job-8')).toBe(false)
    } finally {
      scheduler.unschedule('job-8')
    }
  })

  it('stops all jobs when stopAll() is invoked', () => {
    const scheduler = new CronerScheduler()

    scheduler.schedule({ name: 'job-a', cron: '* * * * * *' }, async () => {})
    scheduler.schedule({ name: 'job-b', cron: '* * * * * *' }, async () => {})

    scheduler.stopAll()

    expect(scheduler.has('job-a')).toBe(false)
    expect(scheduler.has('job-b')).toBe(false)
  })
})
