import { describe, expect, it } from 'vitest'
import { KeyLabel } from '../Domain/ValueObjects/KeyLabel'

describe('KeyLabel', () => {
  it('應接受合法標籤', () => {
    const label = new KeyLabel('My API Key')
    expect(label.getValue()).toBe('My API Key')
  })

  it('空字串應拋錯', () => {
    expect(() => new KeyLabel('')).toThrow()
  })

  it('僅空白應拋錯', () => {
    expect(() => new KeyLabel('   ')).toThrow()
  })

  it('超過 100 字元應拋錯', () => {
    expect(() => new KeyLabel('a'.repeat(101))).toThrow()
  })

  it('100 字元剛好應通過', () => {
    const label = new KeyLabel('a'.repeat(100))
    expect(label.getValue()).toBe('a'.repeat(100))
  })

  it('應 trim 前後空白', () => {
    const label = new KeyLabel('  My Key  ')
    expect(label.getValue()).toBe('My Key')
  })
})
