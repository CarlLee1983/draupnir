/** Connection and behavior settings for the Bifrost client. */
export interface BifrostClientConfig {
  /** Base URL for the Bifrost Gateway management API. */
  readonly baseUrl: string
  /** Master key used for Bearer authentication on the management API. */
  readonly masterKey: string
  /** Per-request timeout in milliseconds; default 30,000. */
  readonly timeoutMs: number
  /** Maximum number of retries; default 3. */
  readonly maxRetries: number
  /** Base backoff delay for retries in milliseconds; default 500. */
  readonly retryBaseDelayMs: number
  /** Base URL for the proxy endpoint (AI requests forwarded via the Gateway); defaults to `baseUrl`. */
  readonly proxyBaseUrl: string
}

/**
 * Builds a {@link BifrostClientConfig}, filling defaults from environment variables where applicable.
 *
 * Values in `overrides` take precedence, then environment variables:
 * - `BIFROST_API_URL` → `baseUrl`
 * - `BIFROST_MASTER_KEY` → `masterKey`
 *
 * @param overrides - Partial overrides; omitted fields use env vars or built-in defaults
 * @returns A complete client configuration
 * @throws When neither `baseUrl` nor env provides a URL, or neither `masterKey` nor env provides a key
 *
 * @example
 * ```ts
 * // From environment (set BIFROST_API_URL and BIFROST_MASTER_KEY)
 * const config = createBifrostClientConfig()
 *
 * // Explicit values
 * const config = createBifrostClientConfig({
 *   baseUrl: 'https://gateway.example.com',
 *   masterKey: 'sk-xxx',
 *   timeoutMs: 60_000,
 * })
 * ```
 */
export function createBifrostClientConfig(
  overrides?: Partial<BifrostClientConfig>,
): BifrostClientConfig {
  const baseUrl = overrides?.baseUrl ?? process.env.BIFROST_API_URL
  const masterKey = overrides?.masterKey ?? process.env.BIFROST_MASTER_KEY

  if (!baseUrl) {
    throw new Error('BIFROST_API_URL is required. Set it in .env or pass baseUrl in config.')
  }

  if (!masterKey) {
    throw new Error('BIFROST_MASTER_KEY is required. Set it in .env or pass masterKey in config.')
  }

  const cleanBaseUrl = baseUrl.replace(/\/+$/, '')

  return {
    baseUrl: cleanBaseUrl,
    masterKey,
    timeoutMs: overrides?.timeoutMs ?? 30_000,
    maxRetries: overrides?.maxRetries ?? 3,
    retryBaseDelayMs: overrides?.retryBaseDelayMs ?? 500,
    proxyBaseUrl: overrides?.proxyBaseUrl ?? cleanBaseUrl,
  }
}
