import { beforeAll } from 'bun:test'
import type { Subprocess } from 'bun'

const DEFAULT_TEST_PORT = '31991'
let testPort = process.env.TEST_API_PORT ?? DEFAULT_TEST_PORT
let serverProcess: Subprocess | null = null
let started = false
let cleanupRegistered = false

export function getBaseURL(): string {
  return process.env.API_BASE_URL || `http://localhost:${testPort}`
}

function registerProcessCleanup(): void {
  if (cleanupRegistered) return
  cleanupRegistered = true
  process.on('beforeExit', () => {
    serverProcess?.kill()
    serverProcess = null
    started = false
  })
}

/**
 * Spawns the app once for the whole test process; child is killed on beforeExit.
 */
export function setupTestServer(): void {
  if (process.env.API_BASE_URL) {
    throw new Error('外部環境測試尚未就緒。需要先實作測試租戶隔離與 cleanup 機制。')
  }

  beforeAll(
    async () => {
      if (started) {
        await waitForReady(`${getBaseURL()}/health`, 60_000)
        return
      }
      started = true
      registerProcessCleanup()
      const candidatePorts = process.env.TEST_API_PORT
        ? [process.env.TEST_API_PORT]
        : await buildCandidatePorts()

      let lastError: string | null = null
      for (const candidate of candidatePorts) {
        testPort = candidate
        // 先清掉殘留的測試伺服器，避免舊行程佔住不同的 port
        Bun.spawnSync(['/bin/sh', '-c', `pkill -f 'bun run src/index.ts' 2>/dev/null || true`])
        // 再保險地清掉目前測試 port 的殘留 listener
        Bun.spawnSync([
          '/bin/sh',
          '-c',
          `lsof -ti :${testPort} | xargs kill -9 2>/dev/null || true`,
        ])
        await Bun.sleep(1000)

        serverProcess = Bun.spawn(['bun', 'run', 'src/index.ts'], {
          env: { ...process.env, PORT: testPort, ORM: 'memory' },
          stdout: 'inherit',
          stderr: 'inherit',
          cwd: process.cwd(),
        })

        const ready = await waitForReady(
          `${getBaseURL()}/health`,
          20_000,
          () => serverProcess?.exitCode !== null,
        )
        if (ready) {
          return
        }

        lastError = `port ${testPort} did not become ready`
        serverProcess?.kill()
        serverProcess = null
      }

      throw new Error(
        `Server failed to start after trying ports: ${candidatePorts.join(', ')}. ${lastError ?? ''}`,
      )
    },
    { timeout: 90_000 },
  )
}

async function waitForReady(
  url: string,
  timeoutMs: number,
  isDead?: () => boolean,
): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (isDead?.()) return false
    try {
      const res = await fetch(url)
      if (res.ok) return true
    } catch {
      // Server not ready yet
    }
    await Bun.sleep(200)
  }
  return false
}

async function buildCandidatePorts(): Promise<string[]> {
  const ports: string[] = []
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const candidate = String(30000 + Math.floor(Math.random() * 20000))
    const probe = Bun.spawnSync(['lsof', '-ti', `:${candidate}`], {
      stdout: 'pipe',
      stderr: 'ignore',
    })
    if (probe.exitCode !== 0 || probe.stdout.length === 0) {
      ports.push(candidate)
    }
  }
  if (ports.length === 0) {
    ports.push(DEFAULT_TEST_PORT)
  }
  return ports
}
