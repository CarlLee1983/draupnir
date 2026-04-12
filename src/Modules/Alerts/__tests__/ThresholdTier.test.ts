import { describe, expect, it } from 'vitest'
import { ThresholdTier } from '../Domain/ValueObjects/ThresholdTier'

describe('ThresholdTier', () => {
  it('exposes warning and critical tiers with fixed percentages', () => {
    expect(ThresholdTier.WARNING.value).toBe('warning')
    expect(ThresholdTier.WARNING.percentage).toBe(80)
    expect(ThresholdTier.CRITICAL.value).toBe('critical')
    expect(ThresholdTier.CRITICAL.percentage).toBe(100)
  })

  it('derives the highest breached tier from a percentage', () => {
    expect(ThresholdTier.fromPercentage(85)).toBe(ThresholdTier.WARNING)
    expect(ThresholdTier.fromPercentage(100)).toBe(ThresholdTier.CRITICAL)
    expect(ThresholdTier.fromPercentage(50)).toBeNull()
  })

  it('reconstitutes a tier from its string value', () => {
    expect(ThresholdTier.fromValue('warning')).toBe(ThresholdTier.WARNING)
    expect(ThresholdTier.fromValue('critical')).toBe(ThresholdTier.CRITICAL)
    expect(ThresholdTier.fromValue('unknown')).toBeNull()
  })

  it('compares tier severity by percentage', () => {
    expect(ThresholdTier.CRITICAL.isHigherThan(ThresholdTier.WARNING)).toBe(true)
    expect(ThresholdTier.WARNING.isHigherThan(ThresholdTier.CRITICAL)).toBe(false)
  })
})
