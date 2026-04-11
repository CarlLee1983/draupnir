import { describe, it, expect } from 'vitest'
import { ApplicationStatus } from '../Domain/ValueObjects/ApplicationStatus'

describe('ApplicationStatus', () => {
  it('應建立 active 狀態', () => {
    const status = ApplicationStatus.active()
    expect(status.getValue()).toBe('active')
    expect(status.isActive()).toBe(true)
    expect(status.isSuspended()).toBe(false)
    expect(status.isArchived()).toBe(false)
  })

  it('應建立 suspended 狀態', () => {
    const status = ApplicationStatus.suspended()
    expect(status.getValue()).toBe('suspended')
    expect(status.isActive()).toBe(false)
    expect(status.isSuspended()).toBe(true)
    expect(status.isArchived()).toBe(false)
  })

  it('應建立 archived 狀態', () => {
    const status = ApplicationStatus.archived()
    expect(status.getValue()).toBe('archived')
    expect(status.isActive()).toBe(false)
    expect(status.isSuspended()).toBe(false)
    expect(status.isArchived()).toBe(true)
  })

  it('應從字串建立狀態', () => {
    const status = ApplicationStatus.from('suspended')
    expect(status.getValue()).toBe('suspended')
  })

  it('無效值應拋出錯誤', () => {
    expect(() => ApplicationStatus.from('invalid')).toThrow('Invalid Application status')
  })
})
