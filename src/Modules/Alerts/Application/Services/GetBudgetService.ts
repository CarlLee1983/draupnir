import type { IAlertConfigRepository } from '../../Domain/Repositories/IAlertConfigRepository'

export interface GetBudgetResult {
  readonly success: boolean
  readonly data: {
    readonly budgetUsd: string
    readonly lastAlertedTier: string | null
    readonly lastAlertedMonth: string | null
  } | null
}

/**
 * Reads the current alert budget for an organization.
 */
export class GetBudgetService {
  constructor(private readonly alertConfigRepo: IAlertConfigRepository) {}

  async execute(orgId: string): Promise<GetBudgetResult> {
    const config = await this.alertConfigRepo.findByOrgId(orgId)
    if (!config) {
      return { success: true, data: null }
    }

    return {
      success: true,
      data: {
        budgetUsd: config.budgetUsd,
        lastAlertedTier: config.lastAlertedTier,
        lastAlertedMonth: config.lastAlertedMonth,
      },
    }
  }
}
