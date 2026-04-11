import { beforeAll } from 'bun:test'

const READY_TIMEOUT_MS = 90_000

function getRequiredBaseURL(): string {
  const baseURL = process.env.API_BASE_URL
  if (!baseURL) {
    throw new Error(
      'API_BASE_URL is required for feature tests. Run them through bun run test:feature.',
    )
  }
  return baseURL
}

export function getBaseURL(): string {
  return getRequiredBaseURL()
}

export function setupTestServer(): void {
  setupTestServerFor('default')
}

export function setupTestServerFor(_scope: string): void {
  beforeAll(
    async () => {
      await waitForReady(`${getRequiredBaseURL()}/health`, READY_TIMEOUT_MS)
    },
    { timeout: READY_TIMEOUT_MS },
  )
}

async function waitForReady(url: string, timeoutMs: number): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      // Server not ready yet.
    }
    await Bun.sleep(200)
  }

  throw new Error(`Feature test server did not become ready: ${url}`)
}
