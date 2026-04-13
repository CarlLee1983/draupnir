#!/usr/bin/env bun
/**
 * SPIKE NOTES（2026-04-13）
 * 1. gravito-core container 枚舉 API：`@gravito/core` v3.0.1 的 `Container` 只有 `bind` / `singleton` / `scoped` / `instance` / `make` / `has` / `flush` / `forget`，
 *    沒有公開的 `listBindings()`、`getTokens()`、`keys()` 或同等迭代 API；但 boot 後的 `core.container` 內部確實有私有的 `bindings` Map。
 *    → 實作路線：runtime-first（先從 `core.container.bindings` 讀出真實 token，再用 static-regex 當後備）
 * 2. Bun coverageThreshold 行為（bun 1.3.10）：`bun test --coverage` 的 `coverageThreshold = 0.8` 是 aggregate gate，
 *    不是 per-file gate；單一檔案低於 80% 但整體達標時，仍會 exit 0。
 *    → 備案：維持 Bun 原生 threshold，不需額外 aggregate 腳本
 * 3. Orbit CLI config：Atlas 的預設 `autoConfigure()` 在腳本情境下可能因相對路徑載入失敗而回退到 `DB_*` 環境變數；未發現 `ORBIT_CONFIG_PATH` 旗標。
 *    → migration-drift 使用：`DB.autoConfigure(join(process.cwd(), 'config/database.ts'))`，避免回退到錯誤的環境預設。
 */

import { readdirSync } from 'node:fs'
import { defineConfig, PlanetCore } from '@gravito/core'
import { SchemaCache, ZodValidator } from '@gravito/impulse'
import { OrbitPrism } from '@gravito/prism'
import { buildConfig } from '../config/index'
import { createGravitoServiceProvider } from '../src/Shared/Infrastructure/Framework/GravitoServiceProviderAdapter'
import { FoundationServiceProvider } from '../src/Foundation/Infrastructure/Providers/FoundationServiceProvider'
import { ApiKeyServiceProvider } from '../src/Modules/ApiKey/Infrastructure/Providers/ApiKeyServiceProvider'
import { AppApiKeyServiceProvider } from '../src/Modules/AppApiKey'
import { AppModuleServiceProvider } from '../src/Modules/AppModule/Infrastructure/Providers/AppModuleServiceProvider'
import { AuthServiceProvider } from '../src/Modules/Auth/Infrastructure/Providers/AuthServiceProvider'
import { CliApiServiceProvider } from '../src/Modules/CliApi/Infrastructure/Providers/CliApiServiceProvider'
import { ContractServiceProvider } from '../src/Modules/Contract/Infrastructure/Providers/ContractServiceProvider'
import { CreditServiceProvider } from '../src/Modules/Credit/Infrastructure/Providers/CreditServiceProvider'
import { DashboardServiceProvider } from '../src/Modules/Dashboard/Infrastructure/Providers/DashboardServiceProvider'
import { AlertsServiceProvider } from '../src/Modules/Alerts/Infrastructure/Providers/AlertsServiceProvider'
import { ReportsServiceProvider } from '../src/Modules/Reports/Infrastructure/Providers/ReportsServiceProvider'
import { DevPortalServiceProvider } from '../src/Modules/DevPortal/Infrastructure/Providers/DevPortalServiceProvider'
import { HealthServiceProvider } from '../src/Modules/Health/Infrastructure/Providers/HealthServiceProvider'
import { OrganizationServiceProvider } from '../src/Modules/Organization/Infrastructure/Providers/OrganizationServiceProvider'
import { ProfileServiceProvider } from '../src/Modules/Profile/Infrastructure/Providers/ProfileServiceProvider'
import { SdkApiServiceProvider } from '../src/Modules/SdkApi/Infrastructure/Providers/SdkApiServiceProvider'
import { PagesServiceProvider } from '../src/Pages/Infrastructure/Providers/PagesServiceProvider'
import { joinPath } from '../src/Pages/routing/pathUtils'
import { warmInertiaService } from '../src/Pages/routing/inertiaFactory'
import { setCurrentDatabaseAccess } from '../src/wiring/CurrentDatabaseAccess'
import { DatabaseAccessBuilder } from '../src/wiring/DatabaseAccessBuilder'
import { getCurrentORM } from '../src/wiring/RepositoryFactory'
import { initializeRegistry } from '../src/wiring/RepositoryRegistry'

type FailureCategory = 'missing' | 'circular' | 'factory-failed'

interface AuditFailure {
  token: string
  category: FailureCategory
  message: string
}

const REGISTER_PATTERN = /\b(?:container|core\.container)\.(?:bind|singleton|scoped|instance)\(\s*['"`]([^'"`]+)['"`]/g
const INLINE_PATTERN = /\b(?:container|core\.container)\.singletonInline\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`]/g
const SKIP_DIRS = new Set(['__tests__', 'tests', 'dist', 'node_modules', '.planning'])

function walkTsFiles(rootDir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(rootDir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue
    const fullPath = joinPath(rootDir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkTsFiles(fullPath))
      continue
    }
    if (!entry.name.endsWith('.ts') || entry.name.endsWith('.d.ts')) continue
    files.push(fullPath)
  }
  return files
}

function isBindingSource(file: string): boolean {
  const normalized = file.replaceAll('\\', '/')
  return (
    normalized.endsWith('/src/bootstrap.ts') ||
    (normalized.includes('/src/Modules/') && normalized.includes('/Infrastructure/Providers/') && normalized.endsWith('ServiceProvider.ts')) ||
    (normalized.includes('/src/Pages/Infrastructure/Providers/') && normalized.endsWith('ServiceProvider.ts')) ||
    (normalized.includes('/src/Pages/routing/') && normalized.includes('register') && normalized.endsWith('Bindings.ts'))
  )
}

async function collectStaticTokens(): Promise<string[]> {
  const tokens = new Set<string>()
  for (const file of walkTsFiles(joinPath(process.cwd(), 'src'))) {
    if (!isBindingSource(file)) continue
    const content = await Bun.file(file).text()
    for (const match of content.matchAll(REGISTER_PATTERN)) {
      tokens.add(match[1])
    }
    for (const match of content.matchAll(INLINE_PATTERN)) {
      tokens.add(`${match[1]}:${match[2]}`)
    }
  }
  return [...tokens].sort((a, b) => a.localeCompare(b))
}

function collectRuntimeTokens(container: unknown): string[] {
  if (!container || typeof container !== 'object') return []
  const bindings = (container as { bindings?: Map<unknown, unknown> }).bindings
  if (!(bindings instanceof Map)) return []

  return [...bindings.keys()]
    .filter((token): token is string => typeof token === 'string' && token.length > 0)
    .sort((a, b) => a.localeCompare(b))
}

function classifyFailure(error: unknown): FailureCategory {
  const message = error instanceof Error ? error.message : String(error)
  if (/circular/i.test(message)) return 'circular'
  if (/not found|not bound|unknown service|unknown token|missing binding|no binding/i.test(message)) {
    return 'missing'
  }
  return 'factory-failed'
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

async function main(): Promise<void> {
  SchemaCache.registerValidators([new ZodValidator()])
  initializeRegistry()

  const configObj = buildConfig(3000)
  const db = new DatabaseAccessBuilder(getCurrentORM()).getDatabaseAccess()
  setCurrentDatabaseAccess(db)
  const config = defineConfig({ config: configObj })
  const core = new PlanetCore(config)
  core.container.singleton('database', () => db)

  await core.orbit(new OrbitPrism())

  const modules = [
    new HealthServiceProvider(),
    new FoundationServiceProvider(),
    new ProfileServiceProvider(),
    new AuthServiceProvider(),
    new OrganizationServiceProvider(),
    new ApiKeyServiceProvider(),
    new DashboardServiceProvider(),
    new AlertsServiceProvider(),
    new ReportsServiceProvider(),
    new CreditServiceProvider(),
    new ContractServiceProvider(),
    new AppModuleServiceProvider(),
    new AppApiKeyServiceProvider(),
    new DevPortalServiceProvider(),
    new SdkApiServiceProvider(),
    new CliApiServiceProvider(),
    new PagesServiceProvider(),
  ]

  for (const module of modules) {
    createGravitoServiceProvider(module).register(core.container)
  }

  await warmInertiaService()

  const runtimeTokens = collectRuntimeTokens(core.container)
  const tokens = runtimeTokens.length > 0 ? runtimeTokens : await collectStaticTokens()

  if (tokens.length === 0) {
    throw new Error('No DI tokens were discovered from src/**/*.ts')
  }

  console.log(
    runtimeTokens.length > 0
      ? `🔎 DI audit discovered ${tokens.length} runtime container bindings`
      : `🔎 DI audit fell back to static discovery and found ${tokens.length} tokens`,
  )

  const failures: AuditFailure[] = []

  try {
    for (const token of tokens) {
      try {
        const resolved = core.container.make(token)
        if (resolved == null) {
          throw new Error(`token "${token}" resolved to ${String(resolved)}`)
        }
      } catch (error) {
        failures.push({
          token,
          category: classifyFailure(error),
          message: formatError(error),
        })
      }
    }
  } finally {
    await core.shutdown()
  }

  if (failures.length > 0) {
    console.error('\n❌ DI audit failed')
    const grouped = new Map<FailureCategory, AuditFailure[]>()
    for (const failure of failures) {
      const bucket = grouped.get(failure.category) ?? []
      bucket.push(failure)
      grouped.set(failure.category, bucket)
    }

    for (const category of ['missing', 'circular', 'factory-failed'] as const) {
      const items = grouped.get(category)
      if (!items || items.length === 0) continue
      console.error(`\n[${category}] ${items.length}`)
      for (const item of items) {
        console.error(`- ${item.token}: ${item.message}`)
      }
    }

    process.exitCode = 1
    return
  }

  console.log(`\n✅ DI audit passed — ${tokens.length} tokens resolved`)
}

main().catch((error) => {
  console.error('❌ DI audit crashed')
  console.error(formatError(error))
  process.exit(1)
})
