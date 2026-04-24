import { describe, expect, it } from 'vitest'
import { SystemClock } from '../SystemClock'

describe('SystemClock', () => {
  it('now() 回傳接近系統時間的 Date', () => {
    const clock = new SystemClock()
    const before = Date.now()
    const result = clock.now()
    const after = Date.now()

    expect(result).toBeInstanceOf(Date)
    expect(result.getTime()).toBeGreaterThanOrEqual(before)
    expect(result.getTime()).toBeLessThanOrEqual(after)
  })

  it('nowIso() 回傳 ISO-8601 字串並與 now() 一致', () => {
    const clock = new SystemClock()
    const iso = clock.nowIso()

    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/)
    expect(Math.abs(new Date(iso).getTime() - clock.now().getTime())).toBeLessThan(100)
  })
})
