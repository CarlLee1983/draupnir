import type { KeyBudgetResetPeriod } from '../DTOs/ApiKeyDTO'
import type { KeyScope } from '../../Domain/ValueObjects/KeyScope'

/**
 * Return value from {@link IBifrostKeySync.createVirtualKey}: stable gateway identifier and the secret value
 * (Bearer token material) shown once to the caller.
 */
export interface CreateVirtualKeyResult {
  gatewayKeyId: string
  gatewayKeyValue: string
}

/**
 * Optional knobs passed to Bifrost when provisioning a virtual key.
 *
 * @remarks When `budget` is set, `maxLimit` pairs with `resetDuration` (`7d` | `30d`) for spend-cap windows.
 */
export interface CreateVirtualKeyOptions {
  readonly budget?: { readonly maxLimit: number; readonly resetDuration: KeyBudgetResetPeriod }
}

/**
 * Application port: outbound operations against the Bifrost gateway for org API keys (virtual keys).
 * Implementations live in infrastructure; callers use this interface from application services.
 */
export interface IBifrostKeySync {
  /**
   * Registers a new virtual key scoped to an organization.
   *
   * @param label - Value sent as the gateway key `name` (here the Draupnir aggregate id; may also be a human label at other call sites)
   * @param orgId - Owning organization id
   * @param options - Optional budget window for gateway-side spend limits
   * @returns Gateway id and one-time secret value
   */
  createVirtualKey(
    label: string,
    orgId: string,
    options?: CreateVirtualKeyOptions,
  ): Promise<CreateVirtualKeyResult>

  /**
   * Pushes model allow-list and/or RPM/TPM limits from {@link KeyScope} to the gateway key.
   *
   * @param gatewayKeyId - Bifrost virtual key id
   * @param scope - Domain scope to materialize as gateway permissions
   */
  syncPermissions(gatewayKeyId: string, scope: KeyScope): Promise<void>

  /**
   * Updates an existing virtual key’s spend cap and reset cadence in the gateway.
   *
   * @param gatewayKeyId - Bifrost virtual key id
   * @param budget - New cap and reset window (`7d` | `30d`)
   */
  updateVirtualKeyBudget(
    gatewayKeyId: string,
    budget: { maxLimit: number; resetDuration: KeyBudgetResetPeriod },
  ): Promise<void>

  /**
   * Soft-disables the virtual key at the gateway (e.g. suspension) without deleting metadata semantics in Draupnir.
   *
   * @param gatewayKeyId - Bifrost virtual key id
   */
  deactivateVirtualKey(gatewayKeyId: string): Promise<void>

  /**
   * Permanently removes the virtual key from the gateway (used for rollback or hard revoke paths).
   *
   * @param gatewayKeyId - Bifrost virtual key id
   */
  deleteVirtualKey(gatewayKeyId: string): Promise<void>
}
