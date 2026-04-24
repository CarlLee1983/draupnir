/** Connection and behavior settings for the Bifrost client. */
export interface BifrostClientConfig {
  /** Base URL for the Bifrost Gateway management API. */
  readonly baseUrl: string
  /**
   * Master key for Bearer authentication on the management API.
   * Omit when the gateway does not require auth (e.g. open local governance).
   */
  readonly masterKey?: string
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
 * - `BIFROST_MASTER_KEY` → `masterKey` (optional; empty or unset means no Bearer header)
 *
 * @param overrides - Partial overrides; omitted fields use env vars or built-in defaults
 * @returns A complete client configuration
 * @throws When neither `baseUrl` nor env provides a URL
 *
 * @example
 * ```ts
 * // From environment (set BIFROST_API_URL; BIFROST_MASTER_KEY optional)
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
  const rawMasterKey = overrides?.masterKey ?? process.env.BIFROST_MASTER_KEY
  const masterKey =
    typeof rawMasterKey === 'string' && rawMasterKey.trim() !== '' ? rawMasterKey.trim() : undefined

  if (!baseUrl) {
    throw new Error('BIFROST_API_URL is required. Set it in .env or pass baseUrl in config.')
  }

  const cleanBaseUrl = baseUrl.replace(/\/+$/, '')

  return {
    baseUrl: cleanBaseUrl,
    ...(masterKey !== undefined ? { masterKey } : {}),
    timeoutMs: overrides?.timeoutMs ?? 30_000,
    maxRetries: overrides?.maxRetries ?? 3,
    retryBaseDelayMs: overrides?.retryBaseDelayMs ?? 500,
    proxyBaseUrl: overrides?.proxyBaseUrl ?? cleanBaseUrl,
  }
}
