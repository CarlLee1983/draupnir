import { FormRequest, z } from '@gravito/impulse'
import Decimal from 'decimal.js'

const positiveDecimalString = z.string().refine(
  (value) => {
    try {
      return new Decimal(value).gt(0)
    } catch {
      return false
    }
  },
  {
    message: 'budgetUsd must be a positive decimal string',
  },
)

export class SetBudgetRequest extends FormRequest {
  schema = z.object({
    budgetUsd: positiveDecimalString,
  })
}

export type SetBudgetInput = z.infer<SetBudgetRequest['schema']>
