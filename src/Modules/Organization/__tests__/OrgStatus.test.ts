import { describe, expect, it } from 'vitest'
import { OrgStatus } from '../Domain/ValueObjects/OrgStatus'

describe('OrgStatus', () => {
  it('OrgStatus.from() 應接受 "active" 和 "suspended"', () => {
    expect(() => OrgStatus.from('active')).not.toThrow()
    expect(() => OrgStatus.from('suspended')).not.toThrow()
  })

  it('OrgStatus.from() 應拒絕無效狀態', () => {
    expect(() => OrgStatus.from('inactive')).toThrow()
    expect(() => OrgStatus.from('')).toThrow()
    expect(() => OrgStatus.from('deleted')).toThrow()
  })

  it('OrgStatus.active() 應建立 active 狀態', () => {
    const s = OrgStatus.active()
    expect(s.isActive()).toBe(true)
    expect(s.isSuspended()).toBe(false)
  })

  it('OrgStatus.suspended() 應建立 suspended 狀態', () => {
    const s = OrgStatus.suspended()
    expect(s.isSuspended()).toBe(true)
    expect(s.isActive()).toBe(false)
  })

  it('isActive() / isSuspended() 應正確運作', () => {
    expect(OrgStatus.from('active').isActive()).toBe(true)
    expect(OrgStatus.from('active').isSuspended()).toBe(false)
    expect(OrgStatus.from('suspended').isSuspended()).toBe(true)
    expect(OrgStatus.from('suspended').isActive()).toBe(false)
  })

  it('equals() 應依值比較', () => {
    expect(OrgStatus.active().equals(OrgStatus.active())).toBe(true)
    expect(OrgStatus.active().equals(OrgStatus.suspended())).toBe(false)
  })

  it('toString() 應回傳字串值', () => {
    expect(OrgStatus.active().toString()).toBe('active')
    expect(OrgStatus.suspended().toString()).toBe('suspended')
  })
})
