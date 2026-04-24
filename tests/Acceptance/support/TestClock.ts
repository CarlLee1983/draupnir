import type { IClock } from '@/Shared/Application/Ports/IClock'

/**
 * Test fake for IClock. Controlled explicitly via setNow / advance — never drifts unless asked.
 */
export class TestClock implements IClock {
  private current: Date

  constructor(initial: Date = new Date('2026-01-01T00:00:00.000Z')) {
    this.current = new Date(initial.getTime())
  }

  now(): Date {
    return new Date(this.current.getTime())
  }

  nowIso(): string {
    return this.current.toISOString()
  }

  setNow(date: Date): void {
    this.current = new Date(date.getTime())
  }

  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms)
  }
}
