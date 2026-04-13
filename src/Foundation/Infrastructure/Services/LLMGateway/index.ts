/**
 * Public API surface for the LLMGateway abstraction layer.
 *
 * @remarks
 * MockGatewayClient is exported from this barrel for discoverability.
 * However, runtime src/ code MUST NOT import MockGatewayClient — tests only.
 * Enforced by CI grep check: grep -r "MockGatewayClient" src/ --include="*.ts"
 * must return zero matches in non-test files (files outside __tests__/).
 */

export type { GatewayErrorCode } from './errors'
export { GatewayError } from './errors'
export type { ILLMGatewayClient } from './ILLMGatewayClient'
export { MockGatewayClient } from './implementations/MockGatewayClient'
export type {
  CreateKeyRequest,
  KeyResponse,
  LogEntry,
  ProviderConfigUpdate,
  RateLimitUpdate,
  UpdateKeyRequest,
  UsageQuery,
  UsageStats,
} from './types'
