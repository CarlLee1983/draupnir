import { beforeAll } from 'bun:test'
import type { Subprocess } from 'bun'

const TEST_PORT = process.env.TEST_API_PORT ?? '31991'
const BASE_URL = process.env.API_BASE_URL || `http://localhost:${TEST_PORT}`
let serverProcess: Subprocess | null = null
let started = false
let cleanupRegistered = false

export function getBaseURL(): string {
	return BASE_URL
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
		throw new Error(
			'外部環境測試尚未就緒。需要先實作測試租戶隔離與 cleanup 機制。',
		)
	}

	beforeAll(async () => {
		if (started) {
			await waitForReady(`${BASE_URL}/health`, 5_000)
			return
		}
		started = true
		registerProcessCleanup()
		// 避免 3001 被本機開發伺服器佔用時，測試誤連舊行程
		Bun.spawnSync(['/bin/sh', '-c', `lsof -ti :${TEST_PORT} | xargs kill -9 2>/dev/null || true`])
		serverProcess = Bun.spawn(['bun', 'run', 'src/index.ts'], {
			env: { ...process.env, PORT: TEST_PORT, ORM: 'memory' },
			stdout: 'ignore',
			stderr: 'pipe',
			cwd: process.cwd(),
		})
		await waitForReady(`${BASE_URL}/health`, 15_000)
	})
}

async function waitForReady(url: string, timeoutMs: number): Promise<void> {
	const start = Date.now()
	while (Date.now() - start < timeoutMs) {
		try {
			const res = await fetch(url)
			if (res.ok) return
		} catch {
			// Server not ready yet
		}
		await Bun.sleep(200)
	}
	throw new Error(`Server failed to start within ${timeoutMs}ms at ${url}`)
}
