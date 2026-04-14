# Routes 驗證完整指南

本指南涵蓋了如何在任何項目中應用相同的 routes 驗證方法論。

## 目錄

1. [驗證方法論](#驗證方法論)
2. [快速開始](#快速開始)
3. [完整實施步驟](#完整實施步驟)
4. [工具和腳本](#工具和腳本)
5. [最佳實踐](#最佳實踐)
6. [故障排除](#故障排除)

---

## 驗證方法論

### 三層驗證框架

```
┌─────────────────────────────────────┐
│  靜態代碼分析 (Static Analysis)      │
│  - 檢查路由定義                      │
│  - 驗證 Controller 映射              │
│  - 確認中間件應用                    │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  動態連接測試 (Connectivity Tests)   │
│  - 發送實際 HTTP 請求                │
│  - 驗證路由存在（無 404）            │
│  - 驗證中間件應用正確                │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  自動化驗證套件 (Automation Suite)   │
│  - CI/CD 集成                        │
│  - 持續驗證                          │
│  - 缺陷早期發現                      │
└─────────────────────────────────────┘
```

---

## 快速開始

### 5 分鐘快速驗證

如果你已有一個運行中的 API 項目：

```bash
# 1. 複製驗證工具到你的項目
cp -r docs/routes-verification-tools ./

# 2. 運行快速驗證
npm run test:routes-quick

# 3. 查看結果
# ✅ 所有 routes 存在
# ✅ 所有連接正常
```

### 完整驗證流程

```bash
# 1. 分析路由結構
npm run routes:analyze

# 2. 生成驗證報告
npm run routes:report

# 3. 運行自動化測試
npm run test:routes

# 4. 檢查 CI 結果
npm run test:routes:ci
```

---

## 完整實施步驟

### 步驟 1: 準備路由掃描工具

創建 `scripts/routes-analyzer.ts`：

```typescript
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

interface RouteInfo {
  method: string
  path: string
  controller: string
  middleware: string[]
  validation?: string
}

export function analyzeRoutes(modulesDir: string): RouteInfo[] {
  const routes: RouteInfo[] = []
  const modules = readdirSync(modulesDir)

  for (const module of modules) {
    const routesDir = join(modulesDir, module, 'Presentation/Routes')
    
    try {
      const routeFiles = readdirSync(routesDir).filter(f => f.endsWith('.ts'))
      
      for (const file of routeFiles) {
        const content = readFileSync(join(routesDir, file), 'utf-8')
        // 使用正則表達式提取路由信息
        // router.get('/path', [middleware], (ctx) => controller.method(ctx))
        // ... 解析邏輯
      }
    } catch {
      // 模組沒有路由定義
    }
  }

  return routes
}

// 執行分析
const routes = analyzeRoutes('src/Modules')
console.log(`發現 ${routes.length} 個 routes`)
```

### 步驟 2: 建立驗證報告生成器

創建 `scripts/routes-report-generator.ts`：

```typescript
import { writeFileSync } from 'fs'
import { analyzeRoutes } from './routes-analyzer'

interface Report {
  timestamp: string
  totalRoutes: number
  byModule: Record<string, number>
  byMethod: Record<string, number>
  middlewareUsage: Record<string, number>
  details: string
}

export function generateReport(): Report {
  const routes = analyzeRoutes('src/Modules')
  
  const report: Report = {
    timestamp: new Date().toISOString(),
    totalRoutes: routes.length,
    byModule: {},
    byMethod: {},
    middlewareUsage: {},
    details: generateMarkdown(routes),
  }

  // 統計數據
  for (const route of routes) {
    report.byMethod[route.method] = (report.byMethod[route.method] || 0) + 1
    for (const mw of route.middleware) {
      report.middlewareUsage[mw] = (report.middlewareUsage[mw] || 0) + 1
    }
  }

  return report
}

function generateMarkdown(routes: any[]): string {
  // 生成 markdown 格式報告
  let md = '# Routes 驗證報告\n\n'
  md += `生成時間: ${new Date().toISOString()}\n\n`
  
  // ... 詳細的報告內容
  
  return md
}

// 執行並保存
const report = generateReport()
writeFileSync('ROUTES_REPORT.md', report.details, 'utf-8')
console.log(`報告已生成: ROUTES_REPORT.md`)
```

### 步驟 3: 創建自動化測試模板

創建 `tests/routes-verification.test.ts.template`：

```typescript
import { describe, it, expect, beforeAll } from 'bun:test'
import { TestClient } from './lib/test-client'
import { setupTestServer, getBaseURL } from './lib/test-server'

setupTestServer()

let client: TestClient

beforeAll(() => {
  client = new TestClient(getBaseURL())
})

/**
 * 自動生成的測試用例
 * 
 * 驗證每個 route 都存在且連接正常
 * 測試標準：請求不返回 404 就代表路由存在
 */
describe('Routes Existence Verification', () => {
  // 以下由 routes-test-generator.ts 自動生成
  {{GENERATED_TESTS}}
})
```

### 步驟 4: 自動生成測試用例

創建 `scripts/routes-test-generator.ts`：

```typescript
import { readFileSync, writeFileSync } from 'fs'
import { analyzeRoutes } from './routes-analyzer'

export function generateTestCases(): string {
  const routes = analyzeRoutes('src/Modules')
  let tests = ''

  for (const route of routes) {
    const testName = `${route.method.toUpperCase()} ${route.path} 應該存在`
    const methodName = route.method.toLowerCase()
    
    tests += `
  it('${testName}', async () => {
    const response = await client.${methodName}('${route.path}')
    expect(response.status).not.toBe(404)
  })
`
  }

  return tests
}

// 執行生成
const template = readFileSync('tests/routes-verification.test.ts.template', 'utf-8')
const testCode = template.replace('{{GENERATED_TESTS}}', generateTestCases())
writeFileSync('tests/Feature/routes-verification.test.ts', testCode, 'utf-8')

console.log('✅ 測試用例已生成')
```

### 步驟 5: 配置 Package.json 命令

```json
{
  "scripts": {
    "routes:analyze": "bun scripts/routes-analyzer.ts",
    "routes:report": "bun scripts/routes-report-generator.ts",
    "routes:generate-tests": "bun scripts/routes-test-generator.ts",
    "test:routes": "bun test tests/Feature/routes-verification.test.ts",
    "test:routes:quick": "bun test tests/Feature/routes-verification.test.ts --timeout 60000",
    "test:routes:ci": "bun test tests/Feature/routes-verification.test.ts --bail",
    "verify:routes": "npm run routes:analyze && npm run routes:report && npm run test:routes"
  }
}
```

---

## 工具和腳本

### 路由分析工具

**用途**: 掃描所有路由定義，提取路由信息

```bash
bun scripts/routes-analyzer.ts
```

**輸出**:
```json
{
  "totalRoutes": 68,
  "routes": [
    {
      "method": "GET",
      "path": "/api/users",
      "controller": "UserController.list",
      "middleware": ["requireAuth", "createRoleMiddleware('admin')"],
      "validation": null
    }
  ]
}
```

### 報告生成工具

**用途**: 生成易讀的驗證報告

```bash
bun scripts/routes-report-generator.ts
```

**輸出**: `ROUTES_REPORT.md`

包含:
- 按模組分類的路由列表
- 按 HTTP 方法分類的統計
- 中間件使用情況
- 驗證規則應用情況

### 測試生成工具

**用途**: 自動生成驗證測試用例

```bash
bun scripts/routes-test-generator.ts
```

**輸出**: `tests/Feature/routes-verification.test.ts`

包含:
- 每個 route 的存在驗證
- 認證/授權驗證
- 中間件應用驗證

---

## 最佳實踐

### 1. 定期運行驗證

```bash
# 開發時：每次修改路由後
npm run test:routes

# 提交前：完整驗證
npm run verify:routes

# CI/CD：自動驗證
npm run test:routes:ci
```

### 2. 新增 Route 的檢查清單

```markdown
- [ ] 路由定義在 Presentation/Routes/*.routes.ts
- [ ] Controller 方法已實現
- [ ] 必要的中間件已應用
- [ ] 輸入驗證 Schema 已定義
- [ ] 測試用例已生成
- [ ] routes:report 已通過
- [ ] test:routes 已通過
```

### 3. 文件組織結構

```
project/
├── src/
│   └── Modules/
│       └── ModuleName/
│           └── Presentation/
│               └── Routes/
│                   └── moduleName.routes.ts
├── scripts/
│   ├── routes-analyzer.ts          # 路由分析
│   ├── routes-report-generator.ts  # 報告生成
│   └── routes-test-generator.ts    # 測試生成
├── tests/
│   ├── Feature/
│   │   └── routes-verification.test.ts  # 自動生成
│   └── lib/
│       └── test-client.ts               # HTTP 客戶端
├── docs/
│   └── ROUTES_VERIFICATION_GUIDE.md    # 本指南
└── package.json
```

### 4. 中間件檢查清單

驗證時確保檢查：

```typescript
// ✅ 認證中間件
[requireAuth()]  // 檢查是否存在

// ✅ 角色授權
[createRoleMiddleware('admin')]  // 檢查角色

// ✅ 模組訪問控制
[createModuleAccessMiddleware('module_name')]

// ✅ 組織上下文
[requireOrganizationContext()]

// ✅ 驗證規則
[CreateUserRequest]  // Zod Schema
```

### 5. CI/CD 集成

GitHub Actions 示例：

```yaml
# .github/workflows/routes-verification.yml
name: Routes Verification

on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      
      - name: 分析路由結構
        run: bun scripts/routes-analyzer.ts
      
      - name: 生成驗證報告
        run: bun scripts/routes-report-generator.ts
      
      - name: 生成測試用例
        run: bun scripts/routes-test-generator.ts
      
      - name: 運行 Routes 驗證
        run: bun test:routes:ci
      
      - name: 上傳報告
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: routes-report
          path: ROUTES_REPORT.md
```

---

## 故障排除

### 問題：無法掃描路由

**原因**: 路由文件位置不符

**解決**:
```typescript
// 檢查實際位置
const routesPaths = [
  'src/Modules/*/Presentation/Routes/*.ts',
  'src/Routes/*.ts',
  'app/Routes/*.ts',
]
```

### 問題：測試返回 404

**原因**: 路由未正確註冊

**檢查**:
1. 路由定義文件是否存在
2. 路由函數是否在主文件調用
3. HTTP 方法是否正確
4. 路由路徑是否正確

### 問題：中間件未應用

**原因**: 中間件順序或註冊錯誤

**檢查**:
```typescript
// ✅ 正確順序
router.get('/api/users', [auth, roleCheck], handler)

// ❌ 錯誤：middleware 必須是數組
router.get('/api/users', auth, handler)
```

### 問題：驗證 Schema 失效

**原因**: Schema 導入錯誤或定義不符

**檢查**:
```typescript
// ✅ 正確
import { CreateUserRequest } from '../Requests'
router.post('/api/users', CreateUserRequest, handler)

// ❌ 錯誤：未導入
router.post('/api/users', [CreateUserRequest], handler)
```

---

## 完整工作流範例

### 第一次設置

```bash
# 1. 複製工具
cp -r draupnir/scripts ./
cp -r draupnir/tests/lib ./tests/

# 2. 分析現有 routes
bun scripts/routes-analyzer.ts

# 3. 生成報告
bun scripts/routes-report-generator.ts

# 4. 生成測試
bun scripts/routes-test-generator.ts

# 5. 運行驗證
bun test:routes

# ✅ 完成
```

### 日常開發流程

```bash
# 修改路由後
npm run test:routes

# 提交前
npm run verify:routes

# 被 PR 拒絕時
npm run routes:report  # 檢查報告找出問題
npm run routes:analyze # 詳細分析
```

### 故障排查流程

```bash
# 1. 查看詳細報告
npm run routes:report

# 2. 分析路由結構
bun scripts/routes-analyzer.ts --verbose

# 3. 運行單個測試
bun test tests/Feature/routes-verification.test.ts --grep "GET /api/users"

# 4. 檢查特定模組
bun scripts/routes-analyzer.ts --module=UserModule
```

---

## 性能優化

### 快速驗證（推薦用於開發）

```bash
# 只驗證路由存在，不檢查認證
bun test:routes:quick
```

### 完整驗證（推薦用於 CI）

```bash
# 完整的各項檢查
bun test:routes
```

### 並行運行

```bash
# 同時運行多個測試套件
bun test tests/Feature/routes-verification.test.ts & \
bun test tests/Feature/other-tests.test.ts
```

---

## 維護清單

### 每週

- [ ] 運行 `npm run verify:routes`
- [ ] 檢查新增 routes 是否通過驗證
- [ ] 查看 CI 報告

### 每月

- [ ] 更新路由分析工具
- [ ] 檢查中間件應用趨勢
- [ ] 清理未使用的 routes

### 每季度

- [ ] 重新審視驗證框架
- [ ] 優化測試性能
- [ ] 更新文檔

---

## 相關資源

- [本項目的驗證報告](../ROUTES_VERIFICATION.md)
- [詳細的 Routes 列表](../tests/routes-validation.report.md)
- [測試用例](../tests/Feature/routes-existence.e2e.ts)

---

## 總結

這套驗證框架可應用於任何 Node.js/Bun API 項目，能夠：

✅ 自動掃描和分析所有路由  
✅ 生成詳細驗證報告  
✅ 自動生成驗證測試用例  
✅ 集成到 CI/CD 管道  
✅ 持續監控路由完整性  

遵循本指南，你可以在任何項目中快速建立類似的驗證機制。
