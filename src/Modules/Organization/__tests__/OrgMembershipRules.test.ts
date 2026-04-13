import { describe, expect, it } from 'vitest'
import { OrganizationMember } from '../Domain/Entities/OrganizationMember'
import { OrgMembershipRules } from '../Domain/Services/OrgMembershipRules'
import { OrgMemberRole } from '../Domain/ValueObjects/OrgMemberRole'

function makeManager(id = 'mem-1'): OrganizationMember {
  return OrganizationMember.create(id, 'org-1', `user-${id}`, new OrgMemberRole('manager'))
}

function makeMember(id = 'mem-2'): OrganizationMember {
  return OrganizationMember.create(id, 'org-1', `user-${id}`, new OrgMemberRole('member'))
}

describe('OrgMembershipRules.assertNotLastManager', () => {
  it('最後一位 manager 被降級時應拋出錯誤', () => {
    const manager = makeManager()
    expect(() => OrgMembershipRules.assertNotLastManager(manager, 1)).toThrow(
      'Cannot remove or demote the last manager',
    )
  })

  it('有多位 manager 時不應拋出錯誤', () => {
    const manager = makeManager()
    expect(() => OrgMembershipRules.assertNotLastManager(manager, 2)).not.toThrow()
  })

  it('member 被降級時不應拋出錯誤（member 本就非 manager）', () => {
    const member = makeMember()
    expect(() => OrgMembershipRules.assertNotLastManager(member, 1)).not.toThrow()
  })
})
