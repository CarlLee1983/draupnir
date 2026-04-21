import type { IUsageRepository } from '../Ports/IUsageRepository'

const MS_PER_DAY = 86_400_000
const DEFAULT_DAY_COUNT = 14

export interface AdminUsageTrendPoint {
  readonly date: string
  readonly requests: number
  readonly tokens: number
}

export interface GetAdminPlatformUsageTrendResult {
  readonly success: true
  readonly data: { readonly points: readonly AdminUsageTrendPoint[] }
}

export interface GetAdminPlatformUsageTrendError {
  readonly success: false
  readonly message: string
  readonly error: string
}

export type GetAdminPlatformUsageTrendResponse =
  | GetAdminPlatformUsageTrendResult
  | GetAdminPlatformUsageTrendError

/**
 * Builds a fixed window (default 14 days, UTC calendar days) of platform-wide
 * request/token totals from cached `usage_records` for the admin dashboard chart.
 */
export class GetAdminPlatformUsageTrendService {
  constructor(private readonly usageRepository: IUsageRepository) {}

  async execute(dayCount: number = DEFAULT_DAY_COUNT): Promise<GetAdminPlatformUsageTrendResponse> {
    try {
      const safeCount = Math.min(Math.max(dayCount, 1), 90)
      const end = new Date()
      const start = new Date(end.getTime() - (safeCount - 1) * MS_PER_DAY)
      const startKey = toUtcDateKey(start)
      const endKey = toUtcDateKey(end)

      const range = {
        startDate: `${startKey}T00:00:00.000Z`,
        endDate: `${endKey}T23:59:59.999Z`,
      }

      const buckets = await this.usageRepository.queryDailyCostPlatform(range)
      const byDay = new Map(buckets.map((b) => [normalizeBucketDate(b.date), b]))

      const points: AdminUsageTrendPoint[] = []
      for (let i = 0; i < safeCount; i++) {
        const d = new Date(start.getTime() + i * MS_PER_DAY)
        const key = toUtcDateKey(d)
        const b = byDay.get(key)
        const requests = b ? Number(b.totalRequests) : 0
        const tokens = b
          ? Number(b.totalInputTokens) + Number(b.totalOutputTokens)
          : 0
        points.push({ date: `${key}T12:00:00.000Z`, requests, tokens })
      }

      return { success: true, data: { points } }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Query failed'
      return { success: false, message, error: message }
    }
  }
}

function toUtcDateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Bucket `date` may be `YYYY-MM-DD` or ISO; normalize to `YYYY-MM-DD`. */
function normalizeBucketDate(raw: string): string {
  if (raw.length >= 10) return raw.slice(0, 10)
  return raw
}
