import type { IClock } from '@/Shared/Application/Ports/IClock'

/**
 * Production clock — delegates to the system wall clock.
 */
export class SystemClock implements IClock {
  now(): Date {
    return new Date()
  }

  nowIso(): string {
    return this.now().toISOString()
  }
}
