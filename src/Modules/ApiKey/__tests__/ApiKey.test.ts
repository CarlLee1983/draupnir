import { describe, it, expect } from 'vitest'
import { ApiKey } from '../Domain/Aggregates/ApiKey'
import { KeyScope } from '../Domain/ValueObjects/KeyScope'

describe('ApiKey', () => {
	it('應建立新的 ApiKey（初始為 pending 狀態）', async () => {
		const result = await ApiKey.create({
			id: 'key-1',
			orgId: 'org-1',
			createdByUserId: 'user-1',
			label: 'My Test Key',
			bifrostVirtualKeyId: 'bfr-vk-1',
			rawKey: 'drp_sk_test123',
		})
		expect(result.id).toBe('key-1')
		expect(result.orgId).toBe('org-1')
		expect(result.createdByUserId).toBe('user-1')
		expect(result.label).toBe('My Test Key')
		expect(result.bifrostVirtualKeyId).toBe('bfr-vk-1')
		expect(result.status).toBe('pending')
		expect(result.keyHashValue).toMatch(/^[a-f0-9]{64}$/)
		expect(result.scope.getAllowedModels()).toBeNull()
	})

	it('activate 應將 pending 轉為 active', async () => {
		const key = await ApiKey.create({
			id: 'key-1a',
			orgId: 'org-1',
			createdByUserId: 'user-1',
			label: 'Pending Key',
			bifrostVirtualKeyId: 'bfr-vk-1a',
			rawKey: 'drp_sk_pending',
		})
		expect(key.status).toBe('pending')
		const activated = key.activate()
		expect(activated.status).toBe('active')
	})

	it('已 active 的 key 不能再 activate', async () => {
		const key = await ApiKey.create({
			id: 'key-1b',
			orgId: 'org-1',
			createdByUserId: 'user-1',
			label: 'Active Key',
			bifrostVirtualKeyId: 'bfr-vk-1b',
			rawKey: 'drp_sk_act',
		})
		const activated = key.activate()
		expect(() => activated.activate()).toThrow()
	})

	it('應建立帶 scope 的 ApiKey', async () => {
		const result = await ApiKey.create({
			id: 'key-2',
			orgId: 'org-1',
			createdByUserId: 'user-1',
			label: 'Restricted Key',
			bifrostVirtualKeyId: 'bfr-vk-2',
			rawKey: 'drp_sk_restricted',
			scope: KeyScope.create({ allowedModels: ['gpt-4'], rateLimitRpm: 60 }),
		})
		expect(result.scope.getAllowedModels()).toEqual(['gpt-4'])
		expect(result.scope.getRateLimitRpm()).toBe(60)
	})

	it('撤銷後狀態應為 revoked', async () => {
		const key = await ApiKey.create({
			id: 'key-3',
			orgId: 'org-1',
			createdByUserId: 'user-1',
			label: 'To Revoke',
			bifrostVirtualKeyId: 'bfr-vk-3',
			rawKey: 'drp_sk_revoke',
		})
		const active = key.activate()
		const revoked = active.revoke()
		expect(revoked.status).toBe('revoked')
		expect(revoked.revokedAt).toBeInstanceOf(Date)
	})

	it('已撤銷的 key 不能再撤銷', async () => {
		const key = await ApiKey.create({
			id: 'key-4',
			orgId: 'org-1',
			createdByUserId: 'user-1',
			label: 'Already Revoked',
			bifrostVirtualKeyId: 'bfr-vk-4',
			rawKey: 'drp_sk_already',
		})
		const revoked = key.activate().revoke()
		expect(() => revoked.revoke()).toThrow('已撤銷')
	})

	it('pending 狀態的 key 不能撤銷（需先 activate）', async () => {
		const key = await ApiKey.create({
			id: 'key-4b',
			orgId: 'org-1',
			createdByUserId: 'user-1',
			label: 'Pending No Revoke',
			bifrostVirtualKeyId: 'bfr-vk-4b',
			rawKey: 'drp_sk_pnr',
		})
		expect(() => key.revoke()).toThrow('pending')
	})

	it('應更新 label', async () => {
		const key = await ApiKey.create({
			id: 'key-5',
			orgId: 'org-1',
			createdByUserId: 'user-1',
			label: 'Old Label',
			bifrostVirtualKeyId: 'bfr-vk-5',
			rawKey: 'drp_sk_label',
		})
		const updated = key.updateLabel('New Label')
		expect(updated.label).toBe('New Label')
	})

	it('應更新 scope', async () => {
		const key = await ApiKey.create({
			id: 'key-6',
			orgId: 'org-1',
			createdByUserId: 'user-1',
			label: 'Scope Test',
			bifrostVirtualKeyId: 'bfr-vk-6',
			rawKey: 'drp_sk_scope',
		})
		const newScope = KeyScope.create({ rateLimitRpm: 120 })
		const updated = key.updateScope(newScope)
		expect(updated.scope.getRateLimitRpm()).toBe(120)
	})

	it('已撤銷的 key 不能更新 scope', async () => {
		const key = await ApiKey.create({
			id: 'key-7',
			orgId: 'org-1',
			createdByUserId: 'user-1',
			label: 'Revoked Scope',
			bifrostVirtualKeyId: 'bfr-vk-7',
			rawKey: 'drp_sk_rs',
		})
		const revoked = key.activate().revoke()
		expect(() => revoked.updateScope(KeyScope.unrestricted())).toThrow('已撤銷')
	})

	it('toDatabaseRow 應正確轉換', async () => {
		const key = await ApiKey.create({
			id: 'key-8',
			orgId: 'org-1',
			createdByUserId: 'user-1',
			label: 'DB Test',
			bifrostVirtualKeyId: 'bfr-vk-8',
			rawKey: 'drp_sk_db',
		})
		const row = key.toDatabaseRow()
		expect(row.id).toBe('key-8')
		expect(row.org_id).toBe('org-1')
		expect(row.created_by_user_id).toBe('user-1')
		expect(row.label).toBe('DB Test')
		expect(row.key_hash).toMatch(/^[a-f0-9]{64}$/)
		expect(row.bifrost_virtual_key_id).toBe('bfr-vk-8')
		expect(row.status).toBe('pending')
		expect(row.scope).toBeTruthy()
	})

	it('fromDatabase 應正確重建', async () => {
		const key = await ApiKey.create({
			id: 'key-9',
			orgId: 'org-1',
			createdByUserId: 'user-1',
			label: 'Rebuild',
			bifrostVirtualKeyId: 'bfr-vk-9',
			rawKey: 'drp_sk_rebuild',
		})
		const row = key.toDatabaseRow()
		const rebuilt = ApiKey.fromDatabase(row)
		expect(rebuilt.id).toBe('key-9')
		expect(rebuilt.label).toBe('Rebuild')
		expect(rebuilt.status).toBe('pending')
	})
})
