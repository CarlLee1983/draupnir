export interface UsageSummary {
  totalRequests: number
  totalCost: number
  totalTokens: number
  avgLatency: number
}

export interface IUsageAggregator {
  getStats(virtualKeyIds: readonly string[], query?: Record<string, unknown>): Promise<UsageSummary>
  getLogs(virtualKeyIds: readonly string[], query?: Record<string, unknown>): Promise<readonly Record<string, unknown>[]>
}
