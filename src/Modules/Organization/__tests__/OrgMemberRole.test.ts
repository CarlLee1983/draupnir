import { describe, expect, it } from 'vitest'
import { OrgMemberRole, OrgMemberRoleType } from '../Domain/ValueObjects/OrgMemberRole'

describe('OrgMemberRole', () => {
  it('應接受有效 role "manager"', () => {
    const role = new OrgMemberRole('manager')
    expect(role.getValue()).toBe(OrgMemberRoleType.MANAGER)
  })

  it('應接受有效 role "member"', () => {
    const role = new OrgMemberRole('member')
    expect(role.getValue()).toBe(OrgMemberRoleType.MEMBER)
  })

  it('應拒絕無效 role', () => {
    expect(() => new OrgMemberRole('owner')).toThrow()
    expect(() => new OrgMemberRole('')).toThrow()
    expect(() => new OrgMemberRole('admin')).toThrow()
  })

  it('isManager() 對 manager 應回傳 true', () => {
    expect(new OrgMemberRole('manager').isManager()).toBe(true)
  })

  it('isManager() 對 member 應回傳 false', () => {
    expect(new OrgMemberRole('member').isManager()).toBe(false)
  })

  it('equals() 應依值比較', () => {
    const r1 = new OrgMemberRole('manager')
    const r2 = new OrgMemberRole('manager')
    const r3 = new OrgMemberRole('member')
    expect(r1.equals(r2)).toBe(true)
    expect(r1.equals(r3)).toBe(false)
  })

  it('toString() 應回傳字串值', () => {
    expect(new OrgMemberRole('manager').toString()).toBe('manager')
    expect(new OrgMemberRole('member').toString()).toBe('member')
  })
})
