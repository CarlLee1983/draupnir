/**
 * Playwright 配置
 *
 * E2E 測試配置：
 * - 自動啟動應用伺服器（port 3001）
 * - ORM 使用 memory（無需資料庫清理）
 * - 每次測試伺服器重啟時自動清空資料
 */

import { defineConfig } from '@playwright/test'

export default defineConfig({
	testDir: 'e2e',
	testMatch: '**/*.e2e.ts',
	timeout: 30_000,
	use: {
		baseURL: 'http://localhost:3001',
		httpCredentials: undefined,
	},
	webServer: {
		command:
			'bun run build:frontend && PORT=3001 ORM=memory SERVE_VITE_BUILD=true bun run src/index.ts',
		port: 3001,
		reuseExistingServer: false,
		stdout: 'ignore',
		stderr: 'pipe',
	},
	reporter: 'html',
})
