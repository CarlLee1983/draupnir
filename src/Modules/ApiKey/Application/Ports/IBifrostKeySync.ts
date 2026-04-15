import type { KeyBudgetResetPeriod } from '../DTOs/ApiKeyDTO'
import type { KeyScope } from '../../Domain/ValueObjects/KeyScope'

export interface CreateVirtualKeyResult {
  gatewayKeyId: string
  gatewayKeyValue: string
}

export interface CreateVirtualKeyOptions {
  readonly budget?: { readonly maxLimit: number; readonly resetDuration: KeyBudgetResetPeriod }
}

export interface IBifrostKeySync {
  createVirtualKey(
    label: string,
    orgId: string,
    options?: CreateVirtualKeyOptions,
  ): Promise<CreateVirtualKeyResult>
  syncPermissions(gatewayKeyId: string, scope: KeyScope): Promise<void>
  updateVirtualKeyBudget(
    gatewayKeyId: string,
    budget: { maxLimit: number; resetDuration: KeyBudgetResetPeriod },
  ): Promise<void>
  deactivateVirtualKey(gatewayKeyId: string): Promise<void>
  deleteVirtualKey(gatewayKeyId: string): Promise<void>
}
