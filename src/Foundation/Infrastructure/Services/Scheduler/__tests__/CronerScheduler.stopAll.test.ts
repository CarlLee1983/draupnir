import { describe, expect, it } from 'vitest'
import { CronerScheduler } from '../CronerScheduler'

describe('CronerScheduler.stopAll()', () => {
  it('stopAll() 停止所有已排程的 job', () => {
    const scheduler = new CronerScheduler()
    let called = 0
    scheduler.schedule({ name: 'job-a', cron: '* * * * *' }, async () => { called++ })
    scheduler.schedule({ name: 'job-b', cron: '* * * * *' }, async () => { called++ })

    expect(scheduler.has('job-a')).toBe(true)
    expect(scheduler.has('job-b')).toBe(true)

    scheduler.stopAll()

    expect(scheduler.has('job-a')).toBe(false)
    expect(scheduler.has('job-b')).toBe(false)
  })

  it('stopAll() 在沒有 job 時不拋出錯誤', () => {
    const scheduler = new CronerScheduler()
    expect(() => scheduler.stopAll()).not.toThrow()
  })

  it('stopAll() 取消進行中的 retry timer', async () => {
    const scheduler = new CronerScheduler()
    // schedule with retry — handler always throws
    scheduler.schedule(
      { name: 'failing-job', cron: '* * * * *', maxRetries: 5, backoffMs: 10_000 },
      async () => { throw new Error('always fails') },
    )
    // trigger one execution to put a retry timer in flight
    // (runOnInit puts it on a microtask)
    scheduler.schedule(
      { name: 'init-job', cron: '* * * * *', runOnInit: true, maxRetries: 3, backoffMs: 10_000 },
      async () => { throw new Error('fail on init') },
    )
    // Give runOnInit a tick to fire
    await new Promise((r) => setTimeout(r, 0))

    // stopAll should cancel everything without hanging
    expect(() => scheduler.stopAll()).not.toThrow()
    expect(scheduler.has('failing-job')).toBe(false)
    expect(scheduler.has('init-job')).toBe(false)
  })

  it('stopAll() 可重複呼叫不拋出錯誤（idempotent）', () => {
    const scheduler = new CronerScheduler()
    scheduler.schedule({ name: 'job-x', cron: '* * * * *' }, async () => {})
    scheduler.stopAll()
    expect(() => scheduler.stopAll()).not.toThrow()
  })
})
