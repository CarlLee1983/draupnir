import { describe, expect, it } from 'vitest'
import { ReportSchedule } from '../Domain/Aggregates/ReportSchedule'

describe('ReportSchedule', () => {
  it('should generate weekly cron string for Monday 9AM', () => {
    const schedule = ReportSchedule.create({
      orgId: 'org-123',
      type: 'weekly',
      day: 1, // Mon
      time: '09:00',
      timezone: 'UTC',
      recipients: ['admin@example.com'],
      enabled: true,
    })

    expect(schedule.cronString).toBe('0 9 * * 1')
  })

  it('should generate monthly cron string for 1st day 9AM', () => {
    const schedule = ReportSchedule.create({
      orgId: 'org-123',
      type: 'monthly',
      day: 1, // 1st
      time: '09:00',
      timezone: 'UTC',
      recipients: ['admin@example.com'],
      enabled: true,
    })

    expect(schedule.cronString).toBe('0 9 1 * *')
  })

  it('should handle different times correctly', () => {
    const schedule = ReportSchedule.create({
      orgId: 'org-123',
      type: 'weekly',
      day: 5, // Fri
      time: '14:30',
      timezone: 'UTC',
      recipients: ['admin@example.com'],
      enabled: true,
    })

    expect(schedule.cronString).toBe('30 14 * * 5')
  })
})
