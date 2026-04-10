import type { ILLMGatewayClient } from '@/Foundation/Infrastructure/Services/LLMGateway'
import type { UsageQuery, UsageStats } from '@/Foundation/Infrastructure/Services/LLMGateway'
import type { IUsageAggregator } from '../../Application/Ports/IUsageAggregator'

export class UsageAggregator implements IUsageAggregator {
  constructor(private readonly gatewayClient: ILLMGatewayClient) {}

  async getStats(
    virtualKeyIds: readonly string[],
    query?: UsageQuery,
  ): Promise<UsageStats> {
    if (virtualKeyIds.length === 0) {
      return { totalRequests: 0, totalCost: 0, totalTokens: 0, avgLatency: 0 }
    }

    const stats = await this.gatewayClient.getUsageStats(virtualKeyIds, query)
    return {
      totalRequests: stats.totalRequests,
      totalCost: stats.totalCost,
      totalTokens: stats.totalTokens,
      avgLatency: stats.avgLatency,
    }
  }

  async getLogs(
    virtualKeyIds: readonly string[],
    query?: UsageQuery,
  ): Promise<readonly Record<string, unknown>[]> {
    if (virtualKeyIds.length === 0) {
      return []
    }

    return (this.gatewayClient.getUsageLogs(virtualKeyIds, query) as unknown) as Promise<readonly Record<string, unknown>[]>
  }
}
