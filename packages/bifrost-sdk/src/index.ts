/**
 * Bifrost SDK — TypeScript client library for Bifrost AI Gateway.
 *
 * Provides Virtual Key management, log queries, model listings, and more.
 * Features built-in exponential backoff retries and type-safe error handling.
 *
 * @example
 * ```ts
 * import { BifrostClient, createBifrostClientConfig } from '@cmg/bifrost-sdk'
 *
 * const config = createBifrostClientConfig({ baseUrl: 'https://gateway.example.com' })
 * const client = new BifrostClient(config)
 * const keys = await client.listVirtualKeys()
 * ```
 *
 * @packageDocumentation
 */

export { BifrostClient } from './BifrostClient'
export { createBifrostClientConfig, type BifrostClientConfig } from './BifrostClientConfig'
export { BifrostApiError, isBifrostApiError } from './errors'
export { withRetry, type RetryOptions } from './retry'
export type {
  BifrostBudget,
  BifrostRateLimit,
  BifrostProviderConfig,
  BifrostMcpConfig,
  BifrostVirtualKey,
  CreateVirtualKeyRequest,
  UpdateVirtualKeyRequest,
  VirtualKeyResponse,
  VirtualKeyListResponse,
  BifrostLogEntry,
  BifrostLogsQuery,
  BifrostLogsResponse,
  BifrostLogsStats,
  BifrostModel,
  BifrostModelsQuery,
  BifrostModelsResponse,
} from './types'
