import { describe, expect, it, vi } from 'vitest'
import { ManualScheduler } from '../fakes/ManualScheduler'

describe('ManualScheduler', () => {
  it('schedule 註冊的 handler 不會自動執行', async () => {
    const scheduler = new ManualScheduler()
    const handler = vi.fn().mockResolvedValue(undefined)

    scheduler.schedule({ name: 'nightly', cron: '0 0 * * *' }, handler)

    await Promise.resolve()
    expect(handler).not.toHaveBeenCalled()
  })

  it('trigger(name) 會執行對應 handler', async () => {
    const scheduler = new ManualScheduler()
    const handler = vi.fn().mockResolvedValue(undefined)
    scheduler.schedule({ name: 'nightly', cron: '0 0 * * *' }, handler)

    await scheduler.trigger('nightly')

    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('trigger(name) 對未註冊 job 拋清楚錯誤', async () => {
    const scheduler = new ManualScheduler()
    await expect(scheduler.trigger('no-such-job')).rejects.toThrow(/no-such-job/)
  })

  it('has / unschedule 正確運作', () => {
    const scheduler = new ManualScheduler()
    scheduler.schedule({ name: 'nightly', cron: '0 0 * * *' }, async () => {})

    expect(scheduler.has('nightly')).toBe(true)
    scheduler.unschedule('nightly')
    expect(scheduler.has('nightly')).toBe(false)
  })

  it('stopAll 清空所有 jobs', () => {
    const scheduler = new ManualScheduler()
    scheduler.schedule({ name: 'a', cron: '* * * * *' }, async () => {})
    scheduler.schedule({ name: 'b', cron: '* * * * *' }, async () => {})

    scheduler.stopAll()

    expect(scheduler.has('a')).toBe(false)
    expect(scheduler.has('b')).toBe(false)
    expect(scheduler.registeredJobs()).toEqual([])
  })

  it('registeredJobs 回傳目前已註冊 job 名稱（依註冊順序）', () => {
    const scheduler = new ManualScheduler()
    scheduler.schedule({ name: 'b', cron: '* * * * *' }, async () => {})
    scheduler.schedule({ name: 'a', cron: '* * * * *' }, async () => {})

    expect(scheduler.registeredJobs()).toEqual(['b', 'a'])
  })
})
