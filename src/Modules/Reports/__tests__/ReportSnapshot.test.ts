import { describe, expect, it } from 'vitest'
import { resolveReportWindow } from '../Application/Services/ReportSnapshot'

describe('resolveReportWindow', () => {
  it('resolves weekly windows as 7 civil days in the report timezone', () => {
    const window = resolveReportWindow('weekly', 'Asia/Taipei', '2026-04-22T03:00:00.000Z')

    expect(window.startDate).toBe('2026-04-15T16:00:00.000Z')
    expect(window.endDate).toBe('2026-04-22T16:00:00.000Z')
  })

  it('resolves monthly windows as the previous calendar month in the report timezone', () => {
    const window = resolveReportWindow('monthly', 'Asia/Taipei', '2026-04-22T03:00:00.000Z')

    expect(window.startDate).toBe('2026-02-28T16:00:00.000Z')
    expect(window.endDate).toBe('2026-03-31T16:00:00.000Z')
  })
})
