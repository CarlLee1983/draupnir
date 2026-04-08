import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiKeyBifrostSync } from '../Infrastructure/Services/ApiKeyBifrostSync'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'
import type { BifrostVirtualKey } from '@/Foundation/Infrastructure/Services/BifrostClient/types'
import { KeyScope } from '../Domain/ValueObjects/KeyScope'

function createMockBifrostClient(): BifrostClient {
	return {
		createVirtualKey: vi.fn().mockResolvedValue({
			id: 'bfr-vk-new',
			name: 'test-key',
			value: 'vk_live_abc123',
			is_active: true,
			provider_configs: [],
		} satisfies BifrostVirtualKey),
		updateVirtualKey: vi.fn().mockResolvedValue({
			id: 'bfr-vk-1',
			name: 'updated',
			is_active: true,
			provider_configs: [],
		} satisfies BifrostVirtualKey),
		deleteVirtualKey: vi.fn().mockResolvedValue(undefined),
		listModels: vi.fn().mockResolvedValue([{ id: 'gpt-4' }, { id: 'claude-3-sonnet' }]),
	} as unknown as BifrostClient
}

describe('ApiKeyBifrostSync', () => {
	let sync: ApiKeyBifrostSync
	let mockClient: BifrostClient

	beforeEach(() => {
		mockClient = createMockBifrostClient()
		sync = new ApiKeyBifrostSync(mockClient)
	})

	it('createVirtualKey 應呼叫 BifrostClient 並回傳 ID', async () => {
		const result = await sync.createVirtualKey('My Key', 'org-1')
		expect(result.bifrostVirtualKeyId).toBe('bfr-vk-new')
		expect(result.bifrostKeyValue).toBe('vk_live_abc123')
		expect(mockClient.createVirtualKey).toHaveBeenCalledWith(
			expect.objectContaining({ name: 'My Key', customer_id: 'org-1' }),
		)
	})

	it('syncPermissions 應將 scope 同步至 Bifrost', async () => {
		const scope = KeyScope.create({ allowedModels: ['gpt-4'], rateLimitRpm: 60, rateLimitTpm: 50000 })
		await sync.syncPermissions('bfr-vk-1', scope)
		expect(mockClient.updateVirtualKey).toHaveBeenCalledWith(
			'bfr-vk-1',
			expect.objectContaining({
				provider_configs: expect.arrayContaining([expect.objectContaining({ allowed_models: ['gpt-4'] })]),
				rate_limit: expect.objectContaining({
					request_max_limit: 60,
					token_max_limit: 50000,
				}),
			}),
		)
	})

	it('deactivateVirtualKey 應停用 Bifrost Virtual Key', async () => {
		await sync.deactivateVirtualKey('bfr-vk-1')
		expect(mockClient.updateVirtualKey).toHaveBeenCalledWith(
			'bfr-vk-1',
			expect.objectContaining({ is_active: false }),
		)
	})

	it('deleteVirtualKey 應刪除 Bifrost Virtual Key', async () => {
		await sync.deleteVirtualKey('bfr-vk-1')
		expect(mockClient.deleteVirtualKey).toHaveBeenCalledWith('bfr-vk-1')
	})
})
