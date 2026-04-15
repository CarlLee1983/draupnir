import { describe, expect, it, vi } from 'vitest'
import { SchedulerShutdownHook } from '../hooks/SchedulerShutdownHook'
import type { IScheduler } from '@/Foundation/Infrastructure/Ports/Scheduler/IScheduler'

const makeScheduler = (): IScheduler => ({
  schedule: vi.fn(),
  unschedule: vi.fn(),
  has: vi.fn(),
  stopAll: vi.fn(),
})

describe('SchedulerShutdownHook', () => {
  it('name 為 "Scheduler"', () => {
    expect(new SchedulerShutdownHook(makeScheduler()).name).toBe('Scheduler')
  })

  it('shutdown() 呼叫 scheduler.stopAll()', async () => {
    const scheduler = makeScheduler()
    await new SchedulerShutdownHook(scheduler).shutdown()
    expect(scheduler.stopAll).toHaveBeenCalledOnce()
  })
})
