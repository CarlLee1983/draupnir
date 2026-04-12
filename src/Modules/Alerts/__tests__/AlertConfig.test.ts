import { describe, expect, it } from 'vitest'
import { AlertConfig } from '../Domain/Aggregates/AlertConfig'

describe('AlertConfig', () => {
  it('creates a new immutable config with empty dedup state', () => {
    const config = AlertConfig.create('cfg-1', 'org-1', '500.00')

    expect(config.id).toBe('cfg-1')
    expect(config.orgId).toBe('org-1')
    expect(config.budgetUsd).toBe('500.00')
    expect(config.lastAlertedTier).toBeNull()
    expect(config.lastAlertedMonth).toBeNull()
    expect(config.lastAlertedAt).toBeNull()
  })

  it('returns a new instance when updating the budget', () => {
    const config = AlertConfig.create('cfg-1', 'org-1', '500.00')
    const updated = config.updateBudget('1000.00')

    expect(updated).not.toBe(config)
    expect(updated.budgetUsd).toBe('1000.00')
    expect(config.budgetUsd).toBe('500.00')
  })

  it('marks a tier as alerted without mutating the original instance', () => {
    const config = AlertConfig.create('cfg-1', 'org-1', '500.00')
    const alerted = config.markAlerted('warning', '2026-04')

    expect(alerted).not.toBe(config)
    expect(alerted.lastAlertedTier).toBe('warning')
    expect(alerted.lastAlertedMonth).toBe('2026-04')
    expect(alerted.lastAlertedAt).toBeTruthy()
    expect(config.lastAlertedTier).toBeNull()
  })

  it('decides when an alert is needed based on month boundaries', () => {
    const initial = AlertConfig.create('cfg-1', 'org-1', '500.00')
    const warned = initial.markAlerted('warning', '2026-03')
    const critical = initial.markAlerted('critical', '2026-04')

    expect(initial.needsAlert('2026-04')).toBe(true)
    expect(warned.needsAlert('2026-04')).toBe(true)
    expect(critical.needsAlert('2026-04')).toBe(false)
  })

  it('allows escalation from warning to critical within the same month only', () => {
    const warned = AlertConfig.create('cfg-1', 'org-1', '500.00').markAlerted('warning', '2026-04')

    expect(warned.canEscalate('warning', '2026-04')).toBe(false)
    expect(warned.canEscalate('critical', '2026-04')).toBe(true)
    expect(warned.canEscalate('warning', '2026-05')).toBe(true)
  })
})
