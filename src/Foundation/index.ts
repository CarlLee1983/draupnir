/**
 * Public API for the Foundation module.
 *
 * @remarks
 * This module provides core infrastructure services shared across the application,
 * including LLM gateway integration, mailing, and background processing.
 */

export type { BifrostClientConfig } from '@draupnir/bifrost-sdk'
export {
  BifrostApiError,
  BifrostClient,
  createBifrostClientConfig,
  isBifrostApiError,
} from '@draupnir/bifrost-sdk'
export { FoundationServiceProvider } from './Infrastructure/Providers/FoundationServiceProvider'
