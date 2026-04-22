import type {
  DailyCostBucket,
  IUsageRepository,
  UsageStats,
} from '@/Modules/Dashboard/Application/Ports/IUsageRepository'
import type { ReportType } from '../../Domain/Aggregates/ReportSchedule'

export interface ReportRunContext {
  readonly orgId: string
  readonly scheduleId: string
  readonly reportType: ReportType
  readonly timezone: string
  readonly generatedAt: string
}

export interface ReportWindow {
  readonly startDate: string
  readonly endDate: string
}

export interface UsageTrendPoint {
  readonly date: string
  readonly requests: number
  readonly tokens: number
}

export interface ReportSnapshot extends ReportRunContext {
  readonly window: ReportWindow
  readonly summary: UsageStats
  readonly dailyTrend: readonly UsageTrendPoint[]
}

export async function buildReportSnapshot(
  context: ReportRunContext,
  usageRepository: IUsageRepository,
): Promise<ReportSnapshot> {
  const window = resolveReportWindow(context.reportType, context.timezone, context.generatedAt)

  const [summary, dailyBuckets] = await Promise.all([
    usageRepository.queryStatsByOrg(context.orgId, window),
    usageRepository.queryDailyCostByOrg(context.orgId, window),
  ])

  return {
    ...context,
    window,
    summary,
    dailyTrend: buildDailyTrend(window, context.timezone, dailyBuckets),
  }
}

export function resolveReportWindow(
  reportType: ReportType,
  timeZone: string,
  generatedAt: string,
): ReportWindow {
  const anchor = parseInstant(generatedAt)
  const anchorCivil = getZonedDateTime(anchor, timeZone)

  if (reportType === 'monthly') {
    const endCivil = startOfMonthCivil(anchorCivil)
    const startCivil = shiftCivilMonth(endCivil, -1)
    return {
      startDate: civilToInstant(startCivil, timeZone).toISOString(),
      endDate: civilToInstant(endCivil, timeZone).toISOString(),
    }
  }

  const endCivil = startOfNextDayCivil(anchorCivil)
  const startCivil = shiftCivilDays(endCivil, -7)
  return {
    startDate: civilToInstant(startCivil, timeZone).toISOString(),
    endDate: civilToInstant(endCivil, timeZone).toISOString(),
  }
}

function buildDailyTrend(
  window: ReportWindow,
  timeZone: string,
  buckets: readonly DailyCostBucket[],
): readonly UsageTrendPoint[] {
  const bucketMap = new Map<string, DailyCostBucket>(
    buckets.map((bucket) => [normalizeBucketDate(bucket.date), bucket]),
  )

  const startCivil = getZonedDateTime(parseInstant(window.startDate), timeZone)
  const endCivil = getZonedDateTime(parseInstant(window.endDate), timeZone)

  const points: UsageTrendPoint[] = []
  let current = startCivil
  while (civilCompare(current, endCivil) < 0) {
    const labelInstant = civilToInstant({ ...current, hour: 12, minute: 0, second: 0 }, timeZone)
    const bucket = bucketMap.get(labelInstant.toISOString().slice(0, 10))

    points.push({
      date: labelInstant.toISOString(),
      requests: bucket?.totalRequests ?? 0,
      tokens: (bucket?.totalInputTokens ?? 0) + (bucket?.totalOutputTokens ?? 0),
    })

    current = shiftCivilDays(current, 1)
  }

  return points
}

type CivilDateTime = {
  readonly year: number
  readonly month: number
  readonly day: number
  readonly hour: number
  readonly minute: number
  readonly second: number
}

function parseInstant(value: string): Date {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid timestamp: ${value}`)
  }
  return date
}

function getZonedDateTime(instant: Date, timeZone: string): CivilDateTime {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })

  const parts = formatter.formatToParts(instant)
  const map = new Map(parts.map((part) => [part.type, part.value]))

  return {
    year: Number(map.get('year')),
    month: Number(map.get('month')),
    day: Number(map.get('day')),
    hour: Number(map.get('hour')),
    minute: Number(map.get('minute')),
    second: Number(map.get('second')),
  }
}

function civilToInstant(civil: CivilDateTime, timeZone: string): Date {
  let guess = Date.UTC(
    civil.year,
    civil.month - 1,
    civil.day,
    civil.hour,
    civil.minute,
    civil.second,
    0,
  )

  for (let i = 0; i < 4; i += 1) {
    const offset = getTimeZoneOffsetMs(new Date(guess), timeZone)
    const next =
      Date.UTC(civil.year, civil.month - 1, civil.day, civil.hour, civil.minute, civil.second, 0) -
      offset
    if (Math.abs(next - guess) < 1) {
      return new Date(next)
    }
    guess = next
  }

  return new Date(guess)
}

function getTimeZoneOffsetMs(instant: Date, timeZone: string): number {
  const zoned = getZonedDateTime(instant, timeZone)
  return (
    Date.UTC(zoned.year, zoned.month - 1, zoned.day, zoned.hour, zoned.minute, zoned.second, 0) -
    instant.getTime()
  )
}

function startOfMonthCivil(civil: CivilDateTime): CivilDateTime {
  return {
    year: civil.year,
    month: civil.month,
    day: 1,
    hour: 0,
    minute: 0,
    second: 0,
  }
}

function startOfNextDayCivil(civil: CivilDateTime): CivilDateTime {
  return shiftCivilDays({ ...civil, hour: 0, minute: 0, second: 0 }, 1)
}

function shiftCivilDays(civil: CivilDateTime, days: number): CivilDateTime {
  const date = new Date(
    Date.UTC(
      civil.year,
      civil.month - 1,
      civil.day + days,
      civil.hour,
      civil.minute,
      civil.second,
      0,
    ),
  )
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: civil.hour,
    minute: civil.minute,
    second: civil.second,
  }
}

function shiftCivilMonth(civil: CivilDateTime, deltaMonths: number): CivilDateTime {
  const date = new Date(
    Date.UTC(
      civil.year,
      civil.month - 1 + deltaMonths,
      civil.day,
      civil.hour,
      civil.minute,
      civil.second,
      0,
    ),
  )
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: civil.hour,
    minute: civil.minute,
    second: civil.second,
  }
}

function civilCompare(left: CivilDateTime, right: CivilDateTime): number {
  const leftValue = Date.UTC(
    left.year,
    left.month - 1,
    left.day,
    left.hour,
    left.minute,
    left.second,
    0,
  )
  const rightValue = Date.UTC(
    right.year,
    right.month - 1,
    right.day,
    right.hour,
    right.minute,
    right.second,
    0,
  )
  if (leftValue < rightValue) return -1
  if (leftValue > rightValue) return 1
  return 0
}

function normalizeBucketDate(raw: string): string {
  return raw.length >= 10 ? raw.slice(0, 10) : raw
}
