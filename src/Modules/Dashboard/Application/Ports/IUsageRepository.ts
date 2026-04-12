/**
 * IUsageRepository — Dashboard Read Model Port
 *
 * Application-layer port for local usage_records queries.
 * Implemented by DrizzleUsageRepository in Infrastructure.
 * Used by Phase 10 chart services instead of live Bifrost API calls.
 *
 * Constraint: All fields readonly (immutability rule).
 * Constraint: credit_cost stored as TEXT in DB - callers receive number (repository converts).
 */

export interface DateRange {
  readonly startDate: string
  readonly endDate: string
}

/** One day's aggregated cost and usage - used by cost trend AreaChart. */
export interface DailyCostBucket {
  readonly date: string
  readonly totalCost: number
  readonly totalRequests: number
  readonly totalInputTokens: number
  readonly totalOutputTokens: number
}

/** Per-model aggregation - used by model comparison BarChart and table. */
export interface ModelUsageBucket {
  readonly model: string
  readonly provider: string | null
  readonly totalCost: number
  readonly totalRequests: number
  readonly avgLatencyMs: number
}

/** KPI stats bucket shared by org and API-key scoped dashboard summaries. */
export interface UsageStats {
  readonly totalRequests: number
  readonly totalCost: number
  readonly totalTokens: number
  readonly avgLatency: number
}

/** Per-API-key aggregation — used by the per-key cost breakdown table. */
export interface PerKeyCostBucket {
  readonly apiKeyId: string
  readonly totalCost: number
  readonly totalRequests: number
  readonly totalTokens: number
}

/** Insert shape for the usage_records table. */
export interface UsageRecordInsert {
  readonly id: string
  readonly bifrostLogId: string
  readonly apiKeyId: string
  readonly orgId: string
  readonly model: string
  readonly provider: string | null
  readonly inputTokens: number
  readonly outputTokens: number
  readonly creditCost: string
  readonly latencyMs: number | null
  readonly status: 'success' | 'error' | null
  readonly occurredAt: string
  readonly createdAt: string
}

export interface IUsageRepository {
  upsert(record: UsageRecordInsert): Promise<void>
  queryDailyCostByOrg(orgId: string, range: DateRange): Promise<readonly DailyCostBucket[]>
  queryDailyCostByKeys(
    apiKeyIds: readonly string[],
    range: DateRange,
  ): Promise<readonly DailyCostBucket[]>
  queryModelBreakdown(orgId: string, range: DateRange): Promise<readonly ModelUsageBucket[]>
  queryModelBreakdownByKeys(
    apiKeyIds: readonly string[],
    range: DateRange,
  ): Promise<readonly ModelUsageBucket[]>
  queryStatsByOrg(orgId: string, range: DateRange): Promise<UsageStats>
  queryStatsByKey(apiKeyId: string, range: DateRange): Promise<UsageStats>
  queryPerKeyCost(orgId: string, range: DateRange): Promise<readonly PerKeyCostBucket[]>
  queryPerKeyCostByKeys(
    apiKeyIds: readonly string[],
    range: DateRange,
  ): Promise<readonly PerKeyCostBucket[]>
}
