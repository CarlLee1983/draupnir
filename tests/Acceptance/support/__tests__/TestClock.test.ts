import { describe, expect, it } from 'vitest'
import { TestClock } from '../TestClock'

describe('TestClock', () => {
  it('預設 now 為 constructor 傳入的時間', () => {
    const initial = new Date('2026-01-01T00:00:00.000Z')
    const clock = new TestClock(initial)

    expect(clock.now().toISOString()).toBe('2026-01-01T00:00:00.000Z')
    expect(clock.nowIso()).toBe('2026-01-01T00:00:00.000Z')
  })

  it('setNow 會改變 now()', () => {
    const clock = new TestClock(new Date('2026-01-01T00:00:00.000Z'))
    clock.setNow(new Date('2026-06-15T12:00:00.000Z'))

    expect(clock.nowIso()).toBe('2026-06-15T12:00:00.000Z')
  })

  it('advance(ms) 會往前推進指定毫秒', () => {
    const clock = new TestClock(new Date('2026-01-01T00:00:00.000Z'))
    clock.advance(1000 * 60 * 60 * 24)

    expect(clock.nowIso()).toBe('2026-01-02T00:00:00.000Z')
  })

  it('now() 每次回傳新的 Date 實例（避免 caller mutate）', () => {
    const clock = new TestClock(new Date('2026-01-01T00:00:00.000Z'))
    const a = clock.now()
    const b = clock.now()

    expect(a).not.toBe(b)
    expect(a.getTime()).toBe(b.getTime())
  })
})
