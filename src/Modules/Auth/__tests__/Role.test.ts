import { describe, expect, it } from 'vitest'
import { Role, RoleType } from '../Domain/ValueObjects/Role'

describe('Role', () => {
  it('只允許 ADMIN / MANAGER / MEMBER', () => {
    expect(Object.values(RoleType)).toEqual(['admin', 'manager', 'member'])
    expect(() => new Role('user')).toThrow('Invalid role: user')
    expect(() => new Role('guest')).toThrow('Invalid role: guest')
  })

  it('提供系統角色判斷', () => {
    const admin = new Role(RoleType.ADMIN)
    const member = new Role(RoleType.MEMBER)

    expect(admin.isAdmin()).toBe(true)
    expect(admin.isManager()).toBe(false)
    expect(admin.isMember()).toBe(false)
    expect(member.isMember()).toBe(true)
  })
})
