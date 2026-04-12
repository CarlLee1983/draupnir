import { AlertConfig } from '../../Domain/Aggregates/AlertConfig'
import { BudgetAmount } from '../../Domain/ValueObjects/BudgetAmount'
import type { IAlertConfigRepository } from '../../Domain/Repositories/IAlertConfigRepository'

export interface SetBudgetResult {
  readonly success: boolean
  readonly message: string
  readonly data?: {
    readonly id: string
    readonly orgId: string
    readonly budgetUsd: string
  }
}

/**
 * Creates or updates an organization's alert budget.
 */
export class SetBudgetService {
  constructor(private readonly alertConfigRepo: IAlertConfigRepository) {}

  async execute(orgId: string, budgetUsd: string): Promise<SetBudgetResult> {
    try {
      const amount = BudgetAmount.create(budgetUsd)
      const existing = await this.alertConfigRepo.findByOrgId(orgId)

      if (existing) {
        const updated = existing.updateBudget(amount.value)
        await this.alertConfigRepo.update(updated)
        return {
          success: true,
          message: 'Alert budget updated',
          data: {
            id: updated.id,
            orgId: updated.orgId,
            budgetUsd: updated.budgetUsd,
          },
        }
      }

      const created = AlertConfig.create(crypto.randomUUID(), orgId, amount.value)
      await this.alertConfigRepo.save(created)

      return {
        success: true,
        message: 'Alert budget created',
        data: {
          id: created.id,
          orgId: created.orgId,
          budgetUsd: created.budgetUsd,
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Invalid budget'
      return { success: false, message }
    }
  }
}
