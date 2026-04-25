import { describe, expect, it } from 'vitest'
import type { IClock } from '@/Shared/Application/Ports/IClock'
import { JwtTokenService } from '../Infrastructure/Services/JwtTokenService'

class MutableClock implements IClock {
  constructor(private current: Date) {}

  now(): Date {
    return new Date(this.current.getTime())
  }

  nowIso(): string {
    return this.now().toISOString()
  }

  setNow(next: Date): void {
    this.current = new Date(next.getTime())
  }
}

describe('JwtTokenService clock injection', () => {
  it('signs and verifies access tokens against the injected clock', () => {
    const clock = new MutableClock(new Date('2026-01-01T00:00:00.000Z'))
    const service = new JwtTokenService(clock)

    const token = service.signAccessToken({
      userId: 'user-clock-1',
      email: 'clock@example.test',
      role: 'member',
      permissions: [],
    })

    expect(token.getExpiresAt().toISOString()).toBe('2026-01-01T00:15:00.000Z')
    expect(service.verify(token.getValue())?.userId).toBe('user-clock-1')
    expect(service.getTimeToExpire(token.getValue())).toBe(15 * 60 * 1000)

    clock.setNow(new Date('2026-01-01T00:16:00.000Z'))

    expect(service.verify(token.getValue())).toBeNull()
    expect(service.isValid(token.getValue())).toBe(false)
    expect(service.getTimeToExpire(token.getValue())).toBe(0)
  })
})
