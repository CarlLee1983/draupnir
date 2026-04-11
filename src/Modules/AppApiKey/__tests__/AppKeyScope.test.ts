import { describe, it, expect } from 'vitest'
import { AppKeyScope } from '../Domain/ValueObjects/AppKeyScope'

describe('AppKeyScope', () => {
  it('應建立 READ scope', () => {
    const scope = AppKeyScope.read()
    expect(scope.getValue()).toBe('read')
    expect(scope.canRead()).toBe(true)
    expect(scope.canWrite()).toBe(false)
    expect(scope.isAdmin()).toBe(false)
  })

  it('應建立 WRITE scope', () => {
    const scope = AppKeyScope.write()
    expect(scope.getValue()).toBe('write')
    expect(scope.canRead()).toBe(true)
    expect(scope.canWrite()).toBe(true)
    expect(scope.isAdmin()).toBe(false)
  })

  it('應建立 ADMIN scope', () => {
    const scope = AppKeyScope.admin()
    expect(scope.getValue()).toBe('admin')
    expect(scope.canRead()).toBe(true)
    expect(scope.canWrite()).toBe(true)
    expect(scope.isAdmin()).toBe(true)
  })

  it('應從字串建立 scope', () => {
    const scope = AppKeyScope.from('write')
    expect(scope.getValue()).toBe('write')
  })

  it('無效值應拋出錯誤', () => {
    expect(() => AppKeyScope.from('invalid')).toThrow('Invalid App Key Scope')
  })
})
