import { describe, expect, it, vi } from 'vitest'
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
})
