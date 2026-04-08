import type { BifrostClient } from '@/Foundation/Infrastructure/Services/BifrostClient/BifrostClient'
import type { BifrostLogEntry, BifrostLogsQuery } from '@/Foundation/Infrastructure/Services/BifrostClient/types'

export interface UsageStats {
	totalRequests: number
	totalCost: number
	totalTokens: number
	avgLatency: number
}

export class UsageAggregator {
	constructor(private readonly bifrostClient: BifrostClient) {}

	async getStats(
		virtualKeyIds: readonly string[],
		query?: Partial<BifrostLogsQuery>,
	): Promise<UsageStats> {
		if (virtualKeyIds.length === 0) {
			return { totalRequests: 0, totalCost: 0, totalTokens: 0, avgLatency: 0 }
		}

		const stats = await this.bifrostClient.getLogsStats({
			virtual_key_ids: virtualKeyIds.join(','),
			...query,
		})

		return {
			totalRequests: stats.total_requests,
			totalCost: stats.total_cost,
			totalTokens: stats.total_tokens,
			avgLatency: stats.avg_latency,
		}
	}

	async getLogs(
		virtualKeyIds: readonly string[],
		query?: Partial<BifrostLogsQuery>,
	): Promise<readonly BifrostLogEntry[]> {
		if (virtualKeyIds.length === 0) {
			return []
		}

		const response = await this.bifrostClient.getLogs({
			virtual_key_ids: virtualKeyIds.join(','),
			...query,
		})

		return response.logs
	}
}
