import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'
import type { AppAuthContext, UsageResponse } from '../DTOs/SdkApiDTO'

interface QueryUsageOptions {
	startDate?: string
	endDate?: string
}

export class QueryUsage {
	constructor(private readonly bifrostClient: BifrostClient) {}

	async execute(auth: AppAuthContext, options?: QueryUsageOptions): Promise<UsageResponse> {
		try {
			const stats = await this.bifrostClient.getLogsStats({
				virtual_key_ids: auth.bifrostVirtualKeyId,
				...(options?.startDate && { start_time: options.startDate }),
				...(options?.endDate && { end_time: options.endDate }),
			})

			return {
				success: true,
				message: '查詢成功',
				data: {
					totalRequests: stats.total_requests,
					totalCost: stats.total_cost,
					totalTokens: stats.total_tokens,
					avgLatency: stats.avg_latency,
				},
			}
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : '查詢用量失敗'
			return { success: false, message, error: 'USAGE_QUERY_ERROR' }
		}
	}
}
