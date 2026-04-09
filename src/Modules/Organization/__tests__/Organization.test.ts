import { describe, it, expect } from 'vitest'
import { Organization } from '../Domain/Aggregates/Organization'
import { OrganizationMember } from '../Domain/Entities/OrganizationMember'
import { OrganizationInvitation } from '../Domain/Entities/OrganizationInvitation'

describe('Organization Aggregate', () => {
	it('應成功建立 Organization', () => {
		const org = Organization.create('org-1', 'CMG 科技', '公司描述')
		expect(org.id).toBe('org-1')
		expect(org.name).toBe('CMG 科技')
		expect(org.slug).toMatch(/^[a-z0-9\-]+$/)
		expect(org.status).toBe('active')
	})

	it('update 應回傳新物件', () => {
		const org = Organization.create('org-1', 'CMG 科技', '舊描述')
		const updated = org.update({ description: '新描述' })
		expect(updated.description).toBe('新描述')
		expect(org.description).toBe('舊描述')
	})

	it('suspend 和 activate 應正確切換狀態', () => {
		const org = Organization.create('org-1', 'CMG', '')
		const suspended = org.suspend()
		expect(suspended.status).toBe('suspended')
		const activated = suspended.activate()
		expect(activated.status).toBe('active')
	})
})

describe('OrganizationMember Entity', () => {
	it('應成功建立成員', () => {
		const member = OrganizationMember.create('m-1', 'org-1', 'user-1', 'manager')
		expect(member.organizationId).toBe('org-1')
		expect(member.userId).toBe('user-1')
		expect(member.role).toBe('manager')
	})
})

describe('OrganizationInvitation Entity', () => {
	it('應成功建立邀請', async () => {
		const invitation = await OrganizationInvitation.create('org-1', 'new@example.com', 'member', 'inviter-1')
		expect(invitation.organizationId).toBe('org-1')
		expect(invitation.email).toBe('new@example.com')
		expect(invitation.status).toBe('pending')
		expect(invitation.token).toBeTruthy()
		expect(invitation.isExpired()).toBe(false)
	})

	it('getTokenHash 應回傳 SHA-256', async () => {
		const invitation = await OrganizationInvitation.create('org-1', 'new@example.com', 'member', 'inviter-1')
		expect(invitation.getTokenHash()).toMatch(/^[a-f0-9]{64}$/)
	})
})
