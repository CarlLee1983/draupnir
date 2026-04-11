import type { DailyCostBucket, ModelUsageBucket, UsageStats } from '../Ports/IUsageRepository'

export interface DashboardSummaryResponse {
  success: boolean
  message: string
  data?: {
    totalKeys: number
    activeKeys: number
    usage: {
      totalRequests: number
      totalCost: number
      totalTokens: number
      avgLatency: number
    }
  }
  error?: string
}

export interface DashboardAnalyticsQuery {
  orgId: string
  callerUserId: string
  callerSystemRole: string
  startTime?: string
  endTime?: string
}

export interface KpiSummaryResponse {
  success: boolean
  message: string
  data?: {
    usage: UsageStats
    lastSyncedAt: string | null
  }
  error?: string
}

export interface CostTrendsResponse {
  success: boolean
  message: string
  data?: {
    buckets: readonly DailyCostBucket[]
  }
  error?: string
}

export interface ModelComparisonResponse {
  success: boolean
  message: string
  data?: {
    rows: readonly ModelUsageBucket[]
  }
  error?: string
}

export interface UsageChartQuery {
  orgId: string
  callerUserId: string
  callerSystemRole: string
  startTime?: string
  endTime?: string
  providers?: string
  models?: string
  limit?: number
}

export interface UsageChartResponse {
  success: boolean
  message: string
  data?: {
    logs: Record<string, unknown>[]
    stats: {
      totalRequests: number
      totalCost: number
      totalTokens: number
      avgLatency: number
    }
  }
  error?: string
}
