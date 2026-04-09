import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryUsage } from '../Application/UseCases/QueryUsage'
import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'
import type { AppAuthContext } from '../Application/DTOs/SdkApiDTO'

function createMockBifrostClient(
	stats = {
		total_requests: 100,
		total_cost: 5.25,
		total_tokens: 50000,
		avg_latency: 320,
	},
): BifrostClient {
	return {
		getLogsStats: vi.fn().mockResolvedValue(stats),
		getLogs: vi.fn().mockResolvedValue({ logs: [], total: 0 }),
		createVirtualKey: vi.fn(),
		listVirtualKeys: vi.fn(),
		getVirtualKey: vi.fn(),
		updateVirtualKey: vi.fn(),
		deleteVirtualKey: vi.fn(),
		listModels: vi.fn(),
	} as unknown as BifrostClient
}

describe('QueryUsage', () => {
	let useCase: QueryUsage
	let mockClient: BifrostClient
	const authContext: AppAuthContext = {
		appKeyId: 'appkey-1',
		orgId: 'org-1',
		bifrostVirtualKeyId: 'bfr-vk-1',
		scope: 'read',
		boundModuleIds: [],
	}

	beforeEach(() => {
		mockClient = createMockBifrostClient()
		useCase = new QueryUsage(mockClient)
	})

	it('應成功查詢用量統計', async () => {
		const result = await useCase.execute(authContext)

		expect(result.success).toBe(true)
		expect(result.data).toEqual({
			totalRequests: 100,
			totalCost: 5.25,
			totalTokens: 50000,
			avgLatency: 320,
		})
		expect(mockClient.getLogsStats).toHaveBeenCalledWith(
			expect.objectContaining({ virtual_key_ids: 'bfr-vk-1' }),
		)
	})

	it('應支援日期範圍過濾', async () => {
		const result = await useCase.execute(authContext, {
			startDate: '2026-04-01',
			endDate: '2026-04-09',
		})

		expect(result.success).toBe(true)
		expect(mockClient.getLogsStats).toHaveBeenCalledWith(
			expect.objectContaining({
				virtual_key_ids: 'bfr-vk-1',
				start_time: '2026-04-01',
				end_time: '2026-04-09',
			}),
		)
	})

	it('Bifrost 錯誤應回傳失敗', async () => {
		const failClient = {
			...createMockBifrostClient(),
			getLogsStats: vi.fn().mockRejectedValue(new Error('Bifrost 連線失敗')),
		} as unknown as BifrostClient
		const failUseCase = new QueryUsage(failClient)

		const result = await failUseCase.execute(authContext)

		expect(result.success).toBe(false)
		expect(result.error).toBe('USAGE_QUERY_ERROR')
	})
})
