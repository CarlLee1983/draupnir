import type { ScenarioRunner } from '../runner'
import { type ApplyUsageChargesOptions, applyUsageChargesStep } from './applyUsageCharges'
import { type UserDeductsCreditOptions, userDeductsCreditStep } from './userDeductsCredit'
import { type UserRefundsCreditOptions, userRefundsCreditStep } from './userRefundsCredit'
import { type UserTopsUpCreditOptions, userTopsUpCreditStep } from './userTopsUpCredit'

export interface WhenNamespace {
  userTopsUpCredit(opts: UserTopsUpCreditOptions): ScenarioRunner
  userDeductsCredit(opts: UserDeductsCreditOptions): ScenarioRunner
  userRefundsCredit(opts: UserRefundsCreditOptions): ScenarioRunner
  applyUsageCharges(opts: ApplyUsageChargesOptions): ScenarioRunner
}

export function defineWhen(builder: ScenarioRunner): WhenNamespace {
  return {
    userTopsUpCredit: (opts) => userTopsUpCreditStep(builder, opts),
    userDeductsCredit: (opts) => userDeductsCreditStep(builder, opts),
    userRefundsCredit: (opts) => userRefundsCreditStep(builder, opts),
    applyUsageCharges: (opts) => applyUsageChargesStep(builder, opts),
  }
}
