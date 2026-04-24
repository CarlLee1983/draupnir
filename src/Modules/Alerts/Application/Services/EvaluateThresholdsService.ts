import Decimal from 'decimal.js'
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { IUsageRepository } from '@/Modules/Dashboard/Application/Ports/IUsageRepository'
import type { AlertTier } from '../../Domain/Aggregates/AlertConfig'
import type { IAlertConfigRepository } from '../../Domain/Repositories/IAlertConfigRepository'
import { MonthlyPeriod } from '../../Domain/ValueObjects/MonthlyPeriod'
import { ThresholdTier } from '../../Domain/ValueObjects/ThresholdTier'
import type { AlertKeyBreakdownItem, SendAlertService } from './SendAlertService'

/**
 * Represents a row in the key cost breakdown.
 */
type KeyCostRow = {
  /** The label or name of the API key. */
  readonly label: string
  /** The calculated cost for this key in the current period. */
  readonly cost: Decimal
}

/**
 * Service responsible for evaluating organization usage against their configured budgets.
 *
 * Responsibilities:
 * - Iterate through organizations and compare their monthly cost with their budget.
 * - Detect if a usage threshold (e.g., 80%, 100%) has been reached.
 * - Trigger alerts via SendAlertService when thresholds are crossed or escalated.
 * - Update alert history in AlertConfig to prevent spamming.
 * - Provide a breakdown of costs per API key in the alert.
 */
export class EvaluateThresholdsService {
  /**
   * Initializes the service with required repositories and services.
   *
   * @param deps Dependencies including repositories for config, usage, and API keys, and the alert sending service.
   */
  constructor(
    private readonly deps: {
      readonly configRepo: IAlertConfigRepository
      readonly usageRepo: IUsageRepository
      readonly apiKeyRepo: IApiKeyRepository
      readonly sendAlertService: SendAlertService
    },
  ) {}

  /**
   * Evaluates usage for a list of organizations.
   *
   * @param orgIds Array of organization identifiers to evaluate.
   */
  async evaluateOrgs(orgIds: readonly string[]): Promise<void> {
    const uniqueOrgIds = [...new Set(orgIds)]

    for (const orgId of uniqueOrgIds) {
      await this.evaluateOrg(orgId)
    }
  }

  /**
   * Evaluates usage for a single organization.
   *
   * @param orgId The organization identifier.
   */
  private async evaluateOrg(orgId: string): Promise<void> {
    const config = await this.deps.configRepo.findByOrgId(orgId)
    if (!config) {
      return
    }

    const currentMonth = MonthlyPeriod.current()
    const dateRange = {
      startDate: currentMonth.startDate,
      endDate: currentMonth.endDate,
    }

    // 1. Query total cost for the current month
    const stats = await this.deps.usageRepo.queryStatsByOrg(orgId, dateRange)
    const costDecimal = new Decimal(stats.totalCost ?? 0)
    const budgetDecimal = new Decimal(config.budgetUsd)
    
    // 2. Calculate percentage of budget used
    const percentageDecimal = costDecimal.div(budgetDecimal).times(100)
    const tier = ThresholdTier.fromPercentage(percentageDecimal.toNumber())

    if (!tier) {
      return
    }

    // 3. Determine if an alert should be sent (new month or higher tier)
    const shouldSend = this.shouldSendAlert(config, tier.value, currentMonth.key)
    if (!shouldSend) {
      return
    }

    // 4. Build per-key breakdown for the alert content
    const keyBreakdown = await this.buildKeyBreakdown(orgId, budgetDecimal, dateRange)

    // 5. Send the alert
    await this.deps.sendAlertService.send({
      orgId,
      tier: tier.value,
      budgetUsd: config.budgetUsd,
      actualCostUsd: costDecimal.toString(),
      percentage: percentageDecimal.toFixed(1),
      month: currentMonth.key,
      keyBreakdown,
    })

    // 6. Record that the alert was sent to prevent duplicate alerts for the same tier/month
    const updated = config.markAlerted(tier.value as AlertTier, currentMonth.key)
    await this.deps.configRepo.update(updated)
  }

  /**
   * Logic to decide if an alert should be dispatched.
   * Alerts are sent if:
   * - No alert has been sent this month.
   * - A 'critical' threshold is reached and only a 'warning' was sent previously.
   *
   * @param config The current alert configuration and history.
   * @param tier The current threshold tier detected.
   * @param currentMonthKey The current month identifier (YYYY-MM).
   * @returns True if an alert should be sent.
   */
  private shouldSendAlert(
    config: { lastAlertedMonth: string | null; lastAlertedTier: string | null },
    tier: AlertTier,
    currentMonthKey: string,
  ): boolean {
    if (config.lastAlertedMonth !== currentMonthKey) {
      return true
    }

    if (tier === 'critical' && config.lastAlertedTier !== 'critical') {
      return true
    }

    return tier === 'warning' && config.lastAlertedTier === null
  }

  /**
   * Builds a list of cost breakdown items per API key, sorted by cost descending.
   *
   * @param orgId The organization identifier.
   * @param budgetDecimal The total budget amount as a Decimal.
   * @param range The date range for usage querying.
   * @returns A promise resolving to an array of breakdown items.
   */
  private async buildKeyBreakdown(
    orgId: string,
    budgetDecimal: Decimal,
    range: { readonly startDate: string; readonly endDate: string },
  ): Promise<readonly AlertKeyBreakdownItem[]> {
    const keys = await this.deps.apiKeyRepo.findByOrgId(orgId)
    const rows: KeyCostRow[] = []

    for (const key of keys) {
      const stats = await this.deps.usageRepo.queryStatsByKey(key.id, range)
      const cost = new Decimal(stats.totalCost ?? 0)
      if (cost.lte(0)) {
        continue
      }

      rows.push({
        label: key.label,
        cost,
      })
    }

    return rows
      .sort((left, right) => right.cost.comparedTo(left.cost))
      .map((row) => ({
        label: row.label,
        costUsd: row.cost.toFixed(2),
        percentage: row.cost.div(budgetDecimal).times(100).toFixed(1),
      }))
  }
}
