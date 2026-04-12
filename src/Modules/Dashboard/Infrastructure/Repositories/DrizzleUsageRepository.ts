import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm'
import { getDrizzleInstance } from '@/Shared/Infrastructure/Database/Adapters/Drizzle/config'
import { usageRecords } from '@/Shared/Infrastructure/Database/Adapters/Drizzle/schema'
import type {
  DailyCostBucket,
  DateRange,
  IUsageRepository,
  ModelUsageBucket,
  PerKeyCostBucket,
  UsageRecordInsert,
  UsageStats,
} from '../../Application/Ports/IUsageRepository'

export class DrizzleUsageRepository implements IUsageRepository {
  constructor(_db: any) {}

  async upsert(record: UsageRecordInsert): Promise<void> {
    const db = getDrizzleInstance()
    await db
      .insert(usageRecords)
      .values({
        id: record.id,
        bifrost_log_id: record.bifrostLogId,
        api_key_id: record.apiKeyId,
        org_id: record.orgId,
        model: record.model,
        provider: record.provider,
        input_tokens: record.inputTokens,
        output_tokens: record.outputTokens,
        credit_cost: record.creditCost,
        latency_ms: record.latencyMs,
        status: record.status,
        occurred_at: record.occurredAt,
        created_at: record.createdAt,
      })
      .onConflictDoNothing({ target: usageRecords.bifrost_log_id })
  }

  async queryDailyCostByOrg(orgId: string, range: DateRange): Promise<readonly DailyCostBucket[]> {
    return this.queryDailyCost(
      and(
        eq(usageRecords.org_id, orgId),
        gte(usageRecords.occurred_at, range.startDate),
        lte(usageRecords.occurred_at, range.endDate),
      ),
    )
  }

  async queryDailyCostByKeys(
    apiKeyIds: readonly string[],
    range: DateRange,
  ): Promise<readonly DailyCostBucket[]> {
    if (apiKeyIds.length === 0) {
      return []
    }

    return this.queryDailyCost(
      and(
        inArray(usageRecords.api_key_id, [...apiKeyIds]),
        gte(usageRecords.occurred_at, range.startDate),
        lte(usageRecords.occurred_at, range.endDate),
      ),
    )
  }

  async queryModelBreakdown(orgId: string, range: DateRange): Promise<readonly ModelUsageBucket[]> {
    return this.queryModelBreakdownInternal(
      and(
        eq(usageRecords.org_id, orgId),
        gte(usageRecords.occurred_at, range.startDate),
        lte(usageRecords.occurred_at, range.endDate),
      ),
    )
  }

  async queryModelBreakdownByKeys(
    apiKeyIds: readonly string[],
    range: DateRange,
  ): Promise<readonly ModelUsageBucket[]> {
    if (apiKeyIds.length === 0) {
      return []
    }

    return this.queryModelBreakdownInternal(
      and(
        inArray(usageRecords.api_key_id, [...apiKeyIds]),
        gte(usageRecords.occurred_at, range.startDate),
        lte(usageRecords.occurred_at, range.endDate),
      ),
    )
  }

  async queryStatsByOrg(orgId: string, range: DateRange): Promise<UsageStats> {
    return this.queryStats(eq(usageRecords.org_id, orgId), range)
  }

  async queryStatsByKey(apiKeyId: string, range: DateRange): Promise<UsageStats> {
    return this.queryStats(eq(usageRecords.api_key_id, apiKeyId), range)
  }

  async queryPerKeyCost(orgId: string, range: DateRange): Promise<readonly PerKeyCostBucket[]> {
    return this.queryPerKeyCostInternal(
      and(
        eq(usageRecords.org_id, orgId),
        gte(usageRecords.occurred_at, range.startDate),
        lte(usageRecords.occurred_at, range.endDate),
      ),
    )
  }

  async queryPerKeyCostByKeys(
    apiKeyIds: readonly string[],
    range: DateRange,
  ): Promise<readonly PerKeyCostBucket[]> {
    if (apiKeyIds.length === 0) {
      return []
    }

    return this.queryPerKeyCostInternal(
      and(
        inArray(usageRecords.api_key_id, [...apiKeyIds]),
        gte(usageRecords.occurred_at, range.startDate),
        lte(usageRecords.occurred_at, range.endDate),
      ),
    )
  }

  private async queryDailyCost(condition: any): Promise<readonly DailyCostBucket[]> {
    const db = getDrizzleInstance()
    const rows = await db
      .select({
        date: sql<string>`DATE(${usageRecords.occurred_at})`,
        totalCost: sql<number>`SUM(CAST(${usageRecords.credit_cost} AS REAL))`,
        totalRequests: sql<number>`COUNT(*)`,
        totalInputTokens: sql<number>`SUM(${usageRecords.input_tokens})`,
        totalOutputTokens: sql<number>`SUM(${usageRecords.output_tokens})`,
      })
      .from(usageRecords)
      .where(condition)
      .groupBy(sql`DATE(${usageRecords.occurred_at})`)
      .orderBy(sql`DATE(${usageRecords.occurred_at})`)

    return rows.map((row) => ({
      date: String(row.date),
      totalCost: Number(row.totalCost ?? 0),
      totalRequests: Number(row.totalRequests ?? 0),
      totalInputTokens: Number(row.totalInputTokens ?? 0),
      totalOutputTokens: Number(row.totalOutputTokens ?? 0),
    }))
  }

  private async queryModelBreakdownInternal(condition: any): Promise<readonly ModelUsageBucket[]> {
    const db = getDrizzleInstance()
    const rows = await db
      .select({
        model: usageRecords.model,
        provider: usageRecords.provider,
        totalCost: sql<number>`SUM(CAST(${usageRecords.credit_cost} AS REAL))`,
        totalRequests: sql<number>`COUNT(*)`,
        avgLatencyMs: sql<number>`AVG(COALESCE(${usageRecords.latency_ms}, 0))`,
      })
      .from(usageRecords)
      .where(condition)
      .groupBy(usageRecords.model, usageRecords.provider)
      .orderBy(desc(sql`SUM(CAST(${usageRecords.credit_cost} AS REAL))`))
      .limit(10)

    return rows.map((row) => ({
      model: String(row.model),
      provider: (row.provider as string | null) ?? null,
      totalCost: Number(row.totalCost ?? 0),
      totalRequests: Number(row.totalRequests ?? 0),
      avgLatencyMs: Number(row.avgLatencyMs ?? 0),
    }))
  }

  private async queryPerKeyCostInternal(condition: any): Promise<readonly PerKeyCostBucket[]> {
    const db = getDrizzleInstance()
    const rows = await db
      .select({
        apiKeyId: usageRecords.api_key_id,
        totalCost: sql<number>`SUM(CAST(${usageRecords.credit_cost} AS REAL))`,
        totalRequests: sql<number>`COUNT(*)`,
        totalTokens: sql<number>`SUM(${usageRecords.input_tokens} + ${usageRecords.output_tokens})`,
      })
      .from(usageRecords)
      .where(condition)
      .groupBy(usageRecords.api_key_id)
      .orderBy(desc(sql`SUM(CAST(${usageRecords.credit_cost} AS REAL))`))

    return rows.map((row) => ({
      apiKeyId: String(row.apiKeyId),
      totalCost: Number(row.totalCost ?? 0),
      totalRequests: Number(row.totalRequests ?? 0),
      totalTokens: Number(row.totalTokens ?? 0),
    }))
  }

  private async queryStats(condition: any, range: DateRange): Promise<UsageStats> {
    const db = getDrizzleInstance()
    const [row] = await db
      .select({
        totalRequests: sql<number>`COUNT(*)`,
        totalCost: sql<number>`SUM(CAST(${usageRecords.credit_cost} AS REAL))`,
        totalTokens: sql<number>`SUM(${usageRecords.input_tokens} + ${usageRecords.output_tokens})`,
        avgLatency: sql<number>`AVG(COALESCE(${usageRecords.latency_ms}, 0))`,
      })
      .from(usageRecords)
      .where(
        and(
          condition,
          gte(usageRecords.occurred_at, range.startDate),
          lte(usageRecords.occurred_at, range.endDate),
        ),
      )

    return {
      totalRequests: Number(row?.totalRequests ?? 0),
      totalCost: Number(row?.totalCost ?? 0),
      totalTokens: Number(row?.totalTokens ?? 0),
      avgLatency: Number(row?.avgLatency ?? 0),
    }
  }
}
