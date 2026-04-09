# Routes 驗證快速開始（其他項目適用）

## 30 秒快速上手

如果你有一個 Node.js/Bun API 項目，想快速驗證所有 routes 都存在且連接正常：

### 步驟 1: 複製工具

```bash
# 從 Draupnir 項目複製驗證工具
cp draupnir/scripts/routes-analyzer.ts your-project/scripts/
cp draupnir/tests/lib/test-client.ts your-project/tests/lib/
cp draupnir/tests/Feature/routes-existence.test.ts your-project/tests/Feature/
```

### 步驟 2: 安裝依賴（如需）

```bash
# Bun（推薦）
# 無需額外依賴

# npm/yarn
npm install --save-dev @types/bun
```

### 步驟 3: 配置 package.json

```json
{
  "scripts": {
    "routes:analyze": "bun scripts/routes-analyzer.ts",
    "test:routes": "bun test tests/Feature/routes-existence.test.ts",
    "verify:routes": "npm run routes:analyze && npm run test:routes"
  }
}
```

### 步驟 4: 運行驗證

```bash
npm run verify:routes
```

## 預期輸出

```
🔍 正在分析路由: src/Modules

╔════════════════════════════════════════╗
║        Routes 分析報告                  ║
╠════════════════════════════════════════╣
║ 總 Routes 數:                        68 ║
╚════════════════════════════════════════╝

📊 按 HTTP 方法分類:
  GET    25
  POST   32
  PUT     3
  PATCH   5
  DELETE  3

📦 按模組分類:
  Organization           12
  Contract                9
  ...

✅ 分析完成
💾 詳細分析已保存至: routes-analysis.json

✅ 72 pass
Ran 72 tests across 1 file. [1.81s]
```

## 常見的項目結構調整

### Fastify 項目

```typescript
// 如果使用 Fastify，修改 test-client.ts
// 更改請求方式以匹配你的服務器

// 原本：
const res = await fetch(url, { method, headers, body })

// Fastify 可能需要：
const res = await app.inject({
  method,
  url,
  headers,
  payload: body
})
```

### Express 項目

```typescript
// 使用 supertest 代替 fetch
import request from 'supertest'
import app from '../app'

export class TestClient {
  async get(path: string) {
    const res = await request(app).get(path)
    return { status: res.status, json: res.body }
  }
  
  async post(path: string, body: unknown) {
    const res = await request(app).post(path).send(body)
    return { status: res.status, json: res.body }
  }
}
```

### Django/Flask 項目

```python
# 使用 pytest
import pytest
from django.test import Client

def test_route_exists():
    client = Client()
    response = client.get('/api/users')
    assert response.status_code != 404
```

## 高級用法

### 1. 只分析特定模組

```bash
bun scripts/routes-analyzer.ts --module=UserModule
```

### 2. 生成 OpenAPI 兼容報告

```typescript
// 修改 routes-analyzer.ts 以輸出 OpenAPI 格式
const openapi = {
  paths: {}
}

for (const route of routes) {
  openapi.paths[route.path] ??= {}
  openapi.paths[route.path][route.method] = {
    operationId: `${route.method}-${route.path}`,
    middleware: route.middleware,
    security: route.middleware.includes('requireAuth') ? ['bearerAuth'] : [],
  }
}
```

### 3. 集成到 CI/CD

#### GitHub Actions

```yaml
name: Routes Verification

on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: oven-sh/setup-bun@v1
      
      - name: Analyze Routes
        run: bun scripts/routes-analyzer.ts
      
      - name: Verify Routes
        run: bun test:routes
      
      - name: Upload Report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: routes-analysis
          path: routes-analysis.json
```

#### GitLab CI

```yaml
verify_routes:
  image: node:20
  script:
    - bun run routes:analyze
    - bun run test:routes
  artifacts:
    paths:
      - routes-analysis.json
    expire_in: 1 week
```

## 自定義驗證規則

### 添加自定義中間件檢查

```typescript
// 在 routes-analyzer.ts 中
const customMiddlewareRules = {
  '/api/admin': ['requireAuth', 'requireAdmin'],
  '/api/organizations/:id': ['requireAuth', 'requireOrganizationContext'],
}

function validateMiddleware(route: RouteInfo) {
  const required = customMiddlewareRules[route.path]
  if (!required) return true
  
  return required.every(mw => route.middleware.includes(mw))
}
```

### 添加響應格式檢查

```typescript
// 在驗證測試中
it('should return consistent response format', async () => {
  const response = await client.get('/api/users')
  
  // 驗證格式
  expect(response.json).toHaveProperty('success')
  expect(response.json).toHaveProperty('data')
  expect(response.json).toHaveProperty('error') // 如果失敗
})
```

## 疑難排解

### 問題：找不到路由

**可能原因**:
1. 路由文件位置不符合預期結構
2. 路由定義格式不標準
3. 路由檔案未被掃描

**解決**:
```typescript
// 檢查實際的路由定義位置
console.log(readdirSync('src/routes')) // 查看實際結構
console.log(readdirSync('app/http/routes'))

// 修改掃描路徑
const possiblePaths = [
  'src/Modules/*/Presentation/Routes',
  'src/routes',
  'app/routes',
  'routes',
]
```

### 問題：測試超時

**可能原因**: 服務器啟動過慢

**解決**:
```typescript
// 增加超時時間
setupTestServer({ timeout: 120000 }) // 120 秒

// 或者在 package.json 中
{
  "scripts": {
    "test:routes": "bun test tests/Feature/routes-existence.test.ts --timeout 120000"
  }
}
```

### 問題：認證相關路由測試失敗

**可能原因**: TestClient 不支持你的認證方式

**解決**:
```typescript
// 擴展 TestClient 支持你的認證方式

class TestClient {
  async requestWithAuth(path: string, token: string) {
    return this.request({ method: 'get', path }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        // 或其他認證方式
        'X-API-Key': token,
      }
    })
  }
}
```

## 下一步

完成基本驗證後，考慮：

1. **E2E 測試**
   ```bash
   bun test tests/E2E/
   ```

2. **性能測試**
   ```bash
   bun run benchmark:routes
   ```

3. **文檔生成**
   ```bash
   bun run docs:generate-api
   ```

4. **安全審計**
   ```bash
   bun run audit:routes
   ```

## 相關資源

- 📖 [完整實施指南](./ROUTES_VERIFICATION_GUIDE.md)
- 📊 [驗證報告](../ROUTES_VERIFICATION.md)
- 🔧 [工具源碼](../scripts/routes-analyzer.ts)
- ✅ [Draupnir 範例項目](../)

## 成功指標

✅ 完成此快速開始後，你應該能夠：
- [ ] 掃描所有 API routes
- [ ] 生成驗證報告
- [ ] 運行自動化驗證測試
- [ ] 在 CI/CD 中集成驗證
- [ ] 快速定位 route 問題

---

**提示**: 如果遇到問題，參考 [完整實施指南](./ROUTES_VERIFICATION_GUIDE.md) 的 [故障排除章節](./ROUTES_VERIFICATION_GUIDE.md#故障排除)
