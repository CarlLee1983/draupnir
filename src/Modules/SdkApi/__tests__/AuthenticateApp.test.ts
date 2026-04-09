import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryDatabaseAccess } from '@/Shared/Infrastructure/Database/Adapters/Memory/MemoryDatabaseAccess'
import { AuthenticateApp } from '../Application/UseCases/AuthenticateApp'
import { AppApiKeyRepository } from '@/Modules/AppApiKey/Infrastructure/Repositories/AppApiKeyRepository'
import { AppApiKey } from '@/Modules/AppApiKey/Domain/Aggregates/AppApiKey'
import { AppKeyScope } from '@/Modules/AppApiKey/Domain/ValueObjects/AppKeyScope'
import { BoundModules } from '@/Modules/AppApiKey/Domain/ValueObjects/BoundModules'

describe('AuthenticateApp', () => {
	let useCase: AuthenticateApp
	let db: MemoryDatabaseAccess
	let repo: AppApiKeyRepository
	const rawKey = 'drp_app_testauthkey123'

	beforeEach(async () => {
		db = new MemoryDatabaseAccess()
		repo = new AppApiKeyRepository(db)
		useCase = new AuthenticateApp(repo)

		const key = await AppApiKey.create({
			id: 'appkey-auth-1',
			orgId: 'org-1',
			issuedByUserId: 'user-1',
			label: 'Test SDK Key',
			bifrostVirtualKeyId: 'bfr-vk-app-1',
			rawKey,
			scope: AppKeyScope.write(),
			boundModules: BoundModules.from(['mod-1', 'mod-2']),
		})
		const activated = key.activate()
		await repo.save(activated)
	})

	it('應以有效的 App Key 認證成功', async () => {
		const result = await useCase.execute(rawKey)
		expect(result.success).toBe(true)
		expect(result.context).toBeDefined()
		expect(result.context!.appKeyId).toBe('appkey-auth-1')
		expect(result.context!.orgId).toBe('org-1')
		expect(result.context!.bifrostVirtualKeyId).toBe('bfr-vk-app-1')
		expect(result.context!.scope).toBe('write')
		expect(result.context!.boundModuleIds).toEqual(['mod-1', 'mod-2'])
	})

	it('無效的 Key 應認證失敗', async () => {
		const result = await useCase.execute('drp_app_invalidkey')
		expect(result.success).toBe(false)
		expect(result.error).toBe('INVALID_APP_KEY')
	})

	it('非 drp_app_ 前綴的 Key 應認證失敗', async () => {
		const result = await useCase.execute('drp_sk_wrongprefix')
		expect(result.success).toBe(false)
		expect(result.error).toBe('INVALID_KEY_FORMAT')
	})

	it('已撤銷的 Key 應認證失敗', async () => {
		const key = await repo.findById('appkey-auth-1')
		const revoked = key!.revoke()
		await repo.update(revoked)

		const result = await useCase.execute(rawKey)
		expect(result.success).toBe(false)
		expect(result.error).toBe('KEY_REVOKED')
	})

	it('已過期的 Key 應認證失敗', async () => {
		const expiredKey = await AppApiKey.create({
			id: 'appkey-expired',
			orgId: 'org-1',
			issuedByUserId: 'user-1',
			label: 'Expired Key',
			bifrostVirtualKeyId: 'bfr-vk-exp',
			rawKey: 'drp_app_expiredkey',
			expiresAt: new Date(Date.now() - 86400000),
		})
		const activated = expiredKey.activate()
		await repo.save(activated)

		const result = await useCase.execute('drp_app_expiredkey')
		expect(result.success).toBe(false)
		expect(result.error).toBe('KEY_EXPIRED')
	})

	it('grace period 內的舊 Key 應認證成功', async () => {
		const key = await repo.findById('appkey-auth-1')
		const rotated = await key!.rotate('drp_app_newkeyrotated', 'bfr-vk-new')
		await repo.update(rotated)

		const result = await useCase.execute(rawKey)
		expect(result.success).toBe(true)
		expect(result.context!.appKeyId).toBe('appkey-auth-1')
	})
})
