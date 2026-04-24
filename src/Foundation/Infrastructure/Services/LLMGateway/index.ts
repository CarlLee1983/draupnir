/**
 * Public API surface for the LLMGateway abstraction layer.
 *
 * @remarks
 * Provides a gateway-neutral interface for managing virtual keys and tracking usage.
 * MockGatewayClient is exported for testing purposes only.
 */

export type { GatewayErrorCode } from './errors'
export { GatewayError } from './errors'
export type { ILLMGatewayClient } from './ILLMGatewayClient'
export { MockGatewayClient } from './implementations/MockGatewayClient'
export type {
  BudgetUpdate,
  CreateKeyRequest,
  CreateTeamRequest,
  KeyResponse,
  LogEntry,
  ProviderConfigUpdate,
  RateLimitUpdate,
  TeamResponse,
  UpdateKeyRequest,
  UsageQuery,
  UsageStats,
} from './types'
