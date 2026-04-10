import { describe, it, expect } from 'vitest'
import { BoundModules } from '../Domain/ValueObjects/BoundModules'

describe('BoundModules', () => {
  it('應建立空的模組綁定', () => {
    const bound = BoundModules.empty()
    expect(bound.getModuleIds()).toEqual([])
    expect(bound.isEmpty()).toBe(true)
  })

  it('應從模組 ID 列表建立', () => {
    const bound = BoundModules.from(['mod-1', 'mod-2'])
    expect(bound.getModuleIds()).toEqual(['mod-1', 'mod-2'])
    expect(bound.isEmpty()).toBe(false)
  })

  it('應去除重複的模組 ID', () => {
    const bound = BoundModules.from(['mod-1', 'mod-1', 'mod-2'])
    expect(bound.getModuleIds()).toEqual(['mod-1', 'mod-2'])
  })

  it('應檢查是否包含特定模組', () => {
    const bound = BoundModules.from(['mod-1', 'mod-2'])
    expect(bound.includes('mod-1')).toBe(true)
    expect(bound.includes('mod-3')).toBe(false)
  })

  it('空綁定應對任何模組回傳 true（不限制）', () => {
    const bound = BoundModules.empty()
    expect(bound.allowsAccess('any-module')).toBe(true)
  })

  it('非空綁定只允許已綁定的模組', () => {
    const bound = BoundModules.from(['mod-1'])
    expect(bound.allowsAccess('mod-1')).toBe(true)
    expect(bound.allowsAccess('mod-2')).toBe(false)
  })

  it('應正確序列化為 JSON', () => {
    const bound = BoundModules.from(['mod-1', 'mod-2'])
    const json = bound.toJSON()
    expect(json).toEqual(['mod-1', 'mod-2'])
  })

  it('應從 JSON 反序列化', () => {
    const bound = BoundModules.fromJSON(['mod-1', 'mod-2'])
    expect(bound.getModuleIds()).toEqual(['mod-1', 'mod-2'])
  })
})
