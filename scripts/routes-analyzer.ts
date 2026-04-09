/**
 * Routes 分析工具
 *
 * 用途：掃描所有路由定義，提取並統計路由信息
 * 使用：bun scripts/routes-analyzer.ts
 *
 * 輸出：
 * - 控制台輸出統計信息
 * - 生成 routes-analysis.json
 */

import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

interface RouteInfo {
  module: string
  file: string
  method: string
  path: string
  controller?: string
  middleware: string[]
  hasValidation: boolean
}

interface AnalysisResult {
  timestamp: string
  totalRoutes: number
  byModule: Record<string, number>
  byMethod: Record<string, number>
  middlewareUsage: Record<string, number>
  routes: RouteInfo[]
  summary: string
}

function analyzeRoutes(modulesDir: string): RouteInfo[] {
  const routes: RouteInfo[] = []

  try {
    const modules = readdirSync(modulesDir)

    for (const module of modules) {
      const routesDir = join(modulesDir, module, 'Presentation/Routes')

      try {
        const routeFiles = readdirSync(routesDir)
          .filter(f => f.endsWith('.routes.ts') || f.endsWith('.routes.js'))

        for (const file of routeFiles) {
          const content = readFileSync(join(routesDir, file), 'utf-8')
          const extracted = extractRoutes(content, module, file)
          routes.push(...extracted)
        }
      } catch {
        // 模組沒有路由目錄，跳過
      }
    }
  } catch (error) {
    console.error(`❌ 無法讀取模組目錄: ${modulesDir}`)
    process.exit(1)
  }

  return routes
}

function extractRoutes(content: string, module: string, file: string): RouteInfo[] {
  const routes: RouteInfo[] = []

  // 匹配路由定義模式
  // router.get('/path', [middleware], (ctx) => controller.method(ctx))
  // router.post('/path', Schema, (ctx) => controller.method(ctx))
  const patterns = [
    /router\.(get|post|put|patch|delete|head)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(\[[^\]]*\]|[^,]+)\s*,\s*(\w+\.\w+|\w+)\s*\(/gm,
    /router\.(get|post|put|patch|delete|head)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*(\[[^\]]*\]|\(ctx\)|async \(ctx\))/gm,
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      const method = match[1]
      const path = match[2]
      const middlewareStr = match[3] || '[]'

      const route: RouteInfo = {
        module,
        file,
        method,
        path,
        middleware: extractMiddleware(middlewareStr),
        hasValidation: hasValidationSchema(middlewareStr),
      }

      // 檢查是否已存在
      if (!routes.some(r => r.method === route.method && r.path === route.path)) {
        routes.push(route)
      }
    }
  }

  return routes
}

function extractMiddleware(middlewareStr: string): string[] {
  const middleware: string[] = []

  // 移除括號和空格
  const clean = middlewareStr
    .replace(/[\[\]]/g, '')
    .split(',')
    .map(m => m.trim())
    .filter(m => m && m !== '(ctx)' && m !== 'async (ctx)')

  for (const item of clean) {
    // 提取函數名稱
    const match = item.match(/(\w+)\s*\(/)
    if (match) {
      middleware.push(match[1])
    } else if (item.match(/\w+/)) {
      middleware.push(item)
    }
  }

  return middleware
}

function hasValidationSchema(middlewareStr: string): boolean {
  // 檢查是否有 Zod Schema 或驗證相關的 imports
  return /Request|Schema|Validator|Validation/.test(middlewareStr)
}

function generateSummary(routes: RouteInfo[]): string {
  const byMethod: Record<string, number> = {}
  const byModule: Record<string, number> = {}
  const middleware: Record<string, number> = {}

  for (const route of routes) {
    byMethod[route.method] = (byMethod[route.method] || 0) + 1
    byModule[route.module] = (byModule[route.module] || 0) + 1

    for (const mw of route.middleware) {
      middleware[mw] = (middleware[mw] || 0) + 1
    }
  }

  let summary = `
╔════════════════════════════════════════╗
║        Routes 分析報告                  ║
╠════════════════════════════════════════╣
║ 總 Routes 數: ${String(routes.length).padStart(24)} ║
╚════════════════════════════════════════╝

📊 按 HTTP 方法分類:
${Object.entries(byMethod)
  .map(([method, count]) => `  ${method.toUpperCase().padEnd(6)} ${count}`)
  .join('\n')}

📦 按模組分類:
${Object.entries(byModule)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([module, count]) => `  ${module.padEnd(20)} ${count}`)
  .join('\n')}

🔗 中間件使用情況:
${Object.entries(middleware)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([mw, count]) => `  ${mw.padEnd(30)} ${count}`)
  .join('\n')}

✅ 分析完成
`
  return summary
}

// 主程序
const modulesDir = join(import.meta.dir, '../src/Modules')
console.log(`🔍 正在分析路由: ${modulesDir}\n`)

const routes = analyzeRoutes(modulesDir)

// 按模組和方法排序
routes.sort((a, b) => {
  if (a.module !== b.module) return a.module.localeCompare(b.module)
  return a.method.localeCompare(b.method)
})

// 統計
const byMethod: Record<string, number> = {}
const byModule: Record<string, number> = {}
const middleware: Record<string, number> = {}

for (const route of routes) {
  byMethod[route.method] = (byMethod[route.method] || 0) + 1
  byModule[route.module] = (byModule[route.module] || 0) + 1

  for (const mw of route.middleware) {
    middleware[mw] = (middleware[mw] || 0) + 1
  }
}

// 生成結果
const result: AnalysisResult = {
  timestamp: new Date().toISOString(),
  totalRoutes: routes.length,
  byModule,
  byMethod,
  middlewareUsage: middleware,
  routes,
  summary: generateSummary(routes),
}

// 輸出摘要
console.log(result.summary)

// 保存詳細結果
writeFileSync(
  join(import.meta.dir, '../routes-analysis.json'),
  JSON.stringify(result, null, 2)
)

console.log('💾 詳細分析已保存至: routes-analysis.json')
