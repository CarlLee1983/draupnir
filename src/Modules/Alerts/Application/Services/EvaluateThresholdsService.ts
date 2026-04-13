import Decimal from 'decimal.js'
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { IUsageRepository } from '@/Modules/Dashboard/Application/Ports/IUsageRepository'
import type { AlertTier } from '../../Domain/Aggregates/AlertConfig'
import type { IAlertConfigRepository } from '../../Domain/Repositories/IAlertConfigRepository'
import { MonthlyPeriod } from '../../Domain/ValueObjects/MonthlyPeriod'
import { ThresholdTier } from '../../Domain/ValueObjects/ThresholdTier'
import type { AlertKeyBreakdownItem, SendAlertService } from './SendAlertService'

type KeyCostRow = {
  readonly label: string
  readonly cost: Decimal
}

/**
 * Compares org usage against its budget and dispatches alert emails.
 */
export class EvaluateThresholdsService {
  constructor(
    private readonly deps: {
      readonly configRepo: IAlertConfigRepository
      readonly usageRepo: IUsageRepository
      readonly apiKeyRepo: IApiKeyRepository
      readonly sendAlertService: SendAlertService
    },
  ) {}

  async evaluateOrgs(orgIds: readonly string[]): Promise<void> {
    const uniqueOrgIds = [...new Set(orgIds)]

    for (const orgId of uniqueOrgIds) {
      await this.evaluateOrg(orgId)
    }
  }

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

    const stats = await this.deps.usageRepo.queryStatsByOrg(orgId, dateRange)
    const costDecimal = new Decimal(stats.totalCost ?? 0)
    const budgetDecimal = new Decimal(config.budgetUsd)
    const percentageDecimal = costDecimal.div(budgetDecimal).times(100)
    const tier = ThresholdTier.fromPercentage(percentageDecimal.toNumber())

    if (!tier) {
      return
    }

    const shouldSend = this.shouldSendAlert(config, tier.value, currentMonth.key)
    if (!shouldSend) {
      return
    }

    const keyBreakdown = await this.buildKeyBreakdown(orgId, budgetDecimal, dateRange)

    await this.deps.sendAlertService.send({
      orgId,
      tier: tier.value,
      budgetUsd: config.budgetUsd,
      actualCostUsd: costDecimal.toString(),
      percentage: percentageDecimal.toFixed(1),
      month: currentMonth.key,
      keyBreakdown,
    })

    const updated = config.markAlerted(tier.value as AlertTier, currentMonth.key)
    await this.deps.configRepo.update(updated)
  }

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
