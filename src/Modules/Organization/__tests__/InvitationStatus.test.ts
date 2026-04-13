import { describe, expect, it } from 'vitest'
import { InvitationStatus, InvitationStatusType } from '../Domain/ValueObjects/InvitationStatus'

describe('InvitationStatus', () => {
  it('應接受所有有效狀態：pending、accepted、expired、cancelled', () => {
    expect(() => new InvitationStatus('pending')).not.toThrow()
    expect(() => new InvitationStatus('accepted')).not.toThrow()
    expect(() => new InvitationStatus('expired')).not.toThrow()
    expect(() => new InvitationStatus('cancelled')).not.toThrow()
  })

  it('應拒絕無效狀態', () => {
    expect(() => new InvitationStatus('active')).toThrow()
    expect(() => new InvitationStatus('')).toThrow()
    expect(() => new InvitationStatus('rejected')).toThrow()
  })

  it('isPending() 對 pending 應回傳 true', () => {
    expect(new InvitationStatus('pending').isPending()).toBe(true)
    expect(new InvitationStatus('accepted').isPending()).toBe(false)
  })

  it('isAccepted() 對 accepted 應回傳 true', () => {
    expect(new InvitationStatus('accepted').isAccepted()).toBe(true)
    expect(new InvitationStatus('pending').isAccepted()).toBe(false)
  })

  it('getValue() 應回傳對應 enum 值', () => {
    expect(new InvitationStatus('pending').getValue()).toBe(InvitationStatusType.PENDING)
    expect(new InvitationStatus('cancelled').getValue()).toBe(InvitationStatusType.CANCELLED)
  })

  it('equals() 應依值比較', () => {
    const s1 = new InvitationStatus('pending')
    const s2 = new InvitationStatus('pending')
    const s3 = new InvitationStatus('accepted')
    expect(s1.equals(s2)).toBe(true)
    expect(s1.equals(s3)).toBe(false)
  })
})
