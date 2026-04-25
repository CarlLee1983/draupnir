# Routes 驗證工具包 (可復用)

## 📦 工具包內容

本工具包包含一整套可復用的 API routes 驗證解決方案，已在 Draupnir 項目中驗證，可應用於任何 Node.js/Bun API 項目。

### 核心組件

```
routes-verification-toolkit/
├── scripts/
│   ├── routes-analyzer.ts              # 路由掃描和分析工具
│   └── test-feature.ts                 # （Draupnir）起服並跑 Feature e2e
├── tests/
│   └── Feature/
│       ├── lib/
│       │   └── test-client.ts          # HTTP 客戶端
│       ├── routes-existence.e2e.ts     # 快速存在性驗證
│       └── routes-connectivity.e2e.ts  # 連通性／認證行為
├── docs/
│   ├── ROUTES_VERIFICATION_GUIDE.md    # 完整實施指南
│   ├── ROUTES_VERIFICATION_QUICKSTART.md # 快速開始指南
│   └── ROUTES_VERIFICATION.md          # 驗證報告範例
└── package.json                        # 預配置的命令
```

## 🚀 快速使用

### 單項目中使用

```bash
# 1. 複製工具到你的項目
cp -r routes-verification-toolkit/scripts ./
cp -r routes-verification-toolkit/tests/Feature ./tests/

# 2. 配置 package.json（Bun / Node 依專案而定）

# 3. 運行驗證（需 API 或自建 test-feature 編排）
bun run verify:routes
```

### 多項目中復用

```bash
# 1. 安裝為全局工具
npm install -g @draupnir/routes-verification-toolkit

# 2. 在任何項目中使用
routes-verify analyze
routes-verify test
routes-verify report
```

## 📋 工具功能清單

### ✅ Routes Analyzer
掃描並分析所有 API routes

**輸入**: 項目路由文件結構  
**輸出**: JSON 分析報告、控制台統計  
**耗時**: ~0.5 秒  

```bash
bun scripts/routes-analyzer.ts
```

**輸出示例**:
```json
{
  "totalRoutes": 51,
  "byMethod": { "get": 16, "post": 21, "put": 5, "patch": 5, "delete": 4 },
  "byModule": { "Organization": 14, "AppModule": 6, ... },
  "routes": [
    {
      "module": "Organization",
      "method": "GET",
      "path": "/api/organizations",
      "middleware": ["requireAuth", "createRoleMiddleware"],
      "hasValidation": false
    }
  ]
}
```

### ✅ Routes Existence Test
驗證所有 routes 都存在且能連接

**覆蓋**: 所有 routes  
**驗證方式**: HTTP 請求，確認無 404  
**耗時**: ~1.8 秒  

```bash
API_BASE_URL=http://127.0.0.1:3000 bun test ./tests/Feature/routes-existence.e2e.ts
# 或 Draupnir：bun run test:feature
```

**預期結果**：以控制台為準（2026-04-25：existence 檔約 49 個 `it`）。

### ✅ Routes Connectivity Test
詳細驗證認證、授權、中間件

**覆蓋**: 認證檢查、角色驗證、中間件應用  
**驗證方式**: 發送請求並檢查返回狀態碼  
**耗時**: ~2.0 秒  

```bash
API_BASE_URL=http://127.0.0.1:3000 bun test ./tests/Feature/routes-connectivity.e2e.ts
```

### ✅ 路由列表報告（人工／半自動）

**格式**: Markdown  
**內容**: 按模組分類的路由列表（範例：[tests/routes-validation.report.md](../tests/routes-validation.report.md)）  

Draupnir 未內建 `routes:report` 腳本；可搭配 `routes-analysis.json` 或手動維護上述檔案。

## 🔧 配置方式

### package.json 預配置命令

```json
{
  "scripts": {
    "routes:analyze": "bun scripts/routes-analyzer.ts",
    "test:feature": "bun scripts/test-feature.ts",
    "verify:routes": "bun scripts/routes-analyzer.ts && bun run test:feature"
  }
}
```

### 環境變數支持

```bash
# 指定掃描目錄
ROUTES_DIR=src/routes bun scripts/routes-analyzer.ts

# 指定輸出格式
OUTPUT_FORMAT=json bun scripts/routes-analyzer.ts

# CI 模式（示例：對照 .github/workflows/ci.yml 的 routes-check）
bun scripts/routes-analyzer.ts
```

## 📊 支持的項目結構

### DDD 架構 (推薦)

```
src/
├── Modules/
│   ├── User/
│   │   └── Presentation/Routes/user.routes.ts
│   ├── Organization/
│   │   └── Presentation/Routes/organization.routes.ts
│   └── ...
```

### MVC 架構

```
app/
├── Http/
│   └── Routes/
│       ├── users.ts
│       ├── organizations.ts
│       └── ...
```

### 功能分組架構

```
src/
├── routes/
│   ├── users.ts
│   ├── organizations.ts
│   └── ...
```

**自定義支持**: 修改 `routes-analyzer.ts` 中的掃描路徑

## 🎯 應用場景

### 開發時使用

```bash
bun scripts/routes-analyzer.ts
bun run test:feature
```

### 提交時使用

```bash
# 完整驗證（在提交前）
bun run verify:routes
```

### CI/CD 集成

```bash
# 參考 Draupnir .github/workflows/ci.yml — routes-check job
bun run test:feature
```

## 🔌 集成示例

### GitHub Actions

```yaml
# .github/workflows/routes-verify.yml
name: Routes Verification

on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      
      - name: Install
        run: bun install
      
      - name: Analyze Routes
        run: bun run routes:analyze
      
      - name: Verify Routes
        run: bun run test:routes:ci
      
      - name: Upload Report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: routes-report
          path: |
            routes-analysis.json
            ROUTES_REPORT.md
```

### Pre-commit Hook

```bash
#!/bin/bash
# .husky/pre-commit

echo "🔍 驗證 routes..."
bun run verify:routes

if [ $? -ne 0 ]; then
  echo "❌ Routes 驗證失敗"
  exit 1
fi

echo "✅ Routes 驗證通過"
```

### Husky Setup

```bash
npx husky install
npx husky add .husky/pre-commit "bun run verify:routes"
```

## 📈 性能指標

| 操作 | 耗時 | 說明 |
|------|------|------|
| 分析（約 50+ routes，regex） | ~0.5s | 快速掃描 |
| existence e2e（約 49 `it`） | 數秒級 | 依啟服時間 |
| connectivity e2e（約 52 `it`） | 數秒級 | 依啟服時間 |
| 報告生成 | 視工具而定 | Markdown |

## 🛠️ 可擴展性

### 添加自定義驗證規則

```typescript
// 在 routes-analyzer.ts 中
const customRules = {
  '/api/admin/*': ['requireAdmin'],
  '/api/organizations/:id/*': ['requireOrganizationContext'],
}

function validateAgainstRules(route) {
  // 自定義驗證邏輯
}
```

### 集成 OpenAPI 驗證

```typescript
// 與 OpenAPI 規范對比
import { loadOpenAPI } from 'swagger-parser'

const spec = await loadOpenAPI('openapi.yaml')
const specRoutes = extractRoutesFromSpec(spec)
const codeRoutes = analyzeRoutes('src/Modules')

const missing = findMissingRoutes(specRoutes, codeRoutes)
const undocumented = findUndocumentedRoutes(codeRoutes, specRoutes)
```

### 性能基準測試

```typescript
// 添加性能測試
async function benchmarkRoute(method, path) {
  const start = Date.now()
  const response = await client.request(method, path)
  return Date.now() - start
}
```

## 📚 文檔

| 文檔 | 用途 |
|------|------|
| [快速開始](./ROUTES_VERIFICATION_QUICKSTART.md) | 30 秒上手 |
| [完整指南](./ROUTES_VERIFICATION_GUIDE.md) | 詳細實施步驟 |
| [驗證報告](../ROUTES_VERIFICATION.md) | Draupnir 範例報告 |

## ✨ 特色功能

✅ **全自動化** - 無需手動編寫測試，自動掃描生成  
✅ **多框架支持** - 適用於任何 Node.js API 框架  
✅ **詳細報告** - 生成易讀的 Markdown 報告  
✅ **CI/CD 友好** - 一鍵集成到任何 CI/CD 系統  
✅ **零依賴** - 僅使用標準庫，無第三方依賴  
✅ **快速執行** - 靜態分析極快；HTTP e2e 視環境而定  
✅ **可擴展** - 支持自定義規則 and 驗證  

## 🐛 故障排除

### 路由未被檢測到

檢查路由定義格式：
```typescript
// ✅ 支持的格式
router.get('/path', [middleware], (ctx) => controller.method(ctx))
router.post('/path', Schema, (ctx) => controller.method(ctx))

// ❌ 不支持的格式
router.get('/path', handler)  // 無中間件
const routes = { GET: { '/path': handler } }  // JSON 定義
```

### 測試超時

增加超時時間：
```bash
bun test ./tests/Feature/routes-existence.e2e.ts --timeout 120000
```

### 認證測試失敗

確保 TestClient 支持你的認證方式：
```typescript
// 在 test-client.ts 中擴展
async request(operation, options) {
  // 添加你的認證邏輯
}
```

## 📞 支持與反饋

- 📖 查看 [完整指南](./ROUTES_VERIFICATION_GUIDE.md)
- 🔍 檢查 [故障排除](./ROUTES_VERIFICATION_GUIDE.md#故障排除)
- 💬 提交 Issue 或 PR

## 📄 許可證

MIT License - 可自由復用和修改

## 🙏 致謝

本工具包基於 Draupnir 項目的實際驗證經驗開發。

---

**版本**: v1.2  
**最後更新**: 2026-04-25  
**已驗證於**: 
- Draupnir（分析器約 51 條匹配；Feature e2e 見 [README_ROUTES_VERIFICATION.md](./README_ROUTES_VERIFICATION.md)）
- Bun 1.3.10+
- Node.js 18.x+
