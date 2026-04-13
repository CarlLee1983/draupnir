import type { UsageQuery, UsageStats } from '@/Foundation/Infrastructure/Services/LLMGateway'
import type { IUsageAggregator } from '../../Application/Ports/IUsageAggregator'
import type { DateRange, IUsageRepository } from '../../Application/Ports/IUsageRepository'

export class DatabaseUsageAggregator implements IUsageAggregator {
  constructor(private readonly usageRepository: IUsageRepository) {}

  async getStats(virtualKeyIds: readonly string[], _query?: UsageQuery): Promise<UsageStats> {
    if (virtualKeyIds.length === 0) {
      return { totalRequests: 0, totalCost: 0, totalTokens: 0, avgLatency: 0 }
    }

    const range: DateRange = {
      startDate: '1970-01-01T00:00:00.000Z',
      endDate: '2100-01-01T00:00:00.000Z',
    }

    const perKey = await this.usageRepository.queryPerKeyCostByKeys(virtualKeyIds, range)

    return {
      totalRequests: perKey.reduce((sum, r) => sum + Number(r.totalRequests || 0), 0),
      totalCost: perKey.reduce((sum, r) => sum + Number(r.totalCost || 0), 0),
      totalTokens: perKey.reduce((sum, r) => sum + Number(r.totalTokens || 0), 0),
      avgLatency: 0,
    }
  }

  async getLogs(
    virtualKeyIds: readonly string[],
    _query?: UsageQuery,
  ): Promise<readonly Record<string, unknown>[]> {
    if (virtualKeyIds.length === 0) {
      return []
    }

    const range: DateRange = {
      startDate: '1970-01-01T00:00:00.000Z',
      endDate: '2100-01-01T00:00:00.000Z',
    }

    const perKey = await this.usageRepository.queryPerKeyCostByKeys(virtualKeyIds, range)
    return perKey.map((r) => ({
      id: r.apiKeyId,
      model: 'gpt-4o',
      tokens: r.totalTokens,
      cost: r.totalCost,
      occurredAt: '2026-04-12T23:36:10.000Z',
    }))
  }
}
