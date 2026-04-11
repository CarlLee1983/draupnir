/**
 * Test fixtures and utilities for Device Flow E2E tests
 */

export const TEST_USER = {
  id: 'test-user-001',
  email: 'cli-test@draupnir.local',
  role: 'user',
  password: 'test-password-123',
}

export const TEST_LLM_REQUEST = {
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello from CLI!' }],
  stream: false,
}

export const TEST_LLM_RESPONSE = {
  success: true,
  message: 'Request proxied successfully.',
  data: {
    choices: [{ role: 'assistant', content: 'Hello from the LLM!' }],
  },
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Poll with exponential backoff
 */
export async function pollWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    initialDelayMs?: number
    maxDelayMs?: number
  } = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? 10
  const initialDelayMs = options.initialDelayMs ?? 500
  const maxDelayMs = options.maxDelayMs ?? 5000

  let lastError: Error | null = null
  let delayMs = initialDelayMs

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (i < maxRetries - 1) {
        await sleep(delayMs)
        delayMs = Math.min(delayMs * 1.5, maxDelayMs)
      }
    }
  }

  throw new Error(`Poll failed after ${maxRetries} retries: ${lastError?.message}`)
}

/**
 * Validate device code format (UUID v4)
 */
export function isValidDeviceCode(code: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code)
}

/**
 * Validate user code format (8 alphanumeric uppercase)
 */
export function isValidUserCode(code: string): boolean {
  return /^[A-Z0-9]{8}$/.test(code)
}

/**
 * Validate JWT token format
 */
export function isValidJWTToken(token: string): boolean {
  const parts = token.split('.')
  return parts.length === 3 && parts.every((part) => part.length > 0)
}
