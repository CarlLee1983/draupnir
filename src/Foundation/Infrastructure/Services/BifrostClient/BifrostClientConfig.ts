export interface BifrostClientConfig {
  readonly baseUrl: string
  readonly masterKey: string
  readonly timeoutMs: number
  readonly maxRetries: number
  readonly retryBaseDelayMs: number
}

export function createBifrostClientConfig(overrides?: Partial<BifrostClientConfig>): BifrostClientConfig {
  const baseUrl = overrides?.baseUrl ?? process.env.BIFROST_API_URL
  const masterKey = overrides?.masterKey ?? process.env.BIFROST_MASTER_KEY

  if (!baseUrl) {
    throw new Error('BIFROST_API_URL is required. Set it in .env or pass baseUrl in config.')
  }

  if (!masterKey) {
    throw new Error('BIFROST_MASTER_KEY is required. Set it in .env or pass masterKey in config.')
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    masterKey,
    timeoutMs: overrides?.timeoutMs ?? 30_000,
    maxRetries: overrides?.maxRetries ?? 3,
    retryBaseDelayMs: overrides?.retryBaseDelayMs ?? 500,
  }
}
