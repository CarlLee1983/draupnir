# Routes 驗證可復用方法論

> 此文檔說明如何在其他項目中完整復用 Draupnir 的 routes 驗證方法論

## 核心成果

在 Draupnir 中，routes 驗證由 **`scripts/routes-analyzer.ts`**（靜態 regex）與 **`tests/Feature/routes-*.e2e.ts`**（動態 HTTP）組成；快照數字見 [ROUTES_VERIFICATION.md](./ROUTES_VERIFICATION.md) 與 [docs/README_ROUTES_VERIFICATION.md](./docs/README_ROUTES_VERIFICATION.md)（2026-04-13 同步）。

本文檔將此經驗整理為一套**完全可復用的方法論**，可應用於任何 Node.js/Bun API 項目。

## 📦 可復用資產清單

### 1. 代碼工具

| 工具 | 位置 | 用途 | 復用難度 |
|------|------|------|--------|
| Routes Analyzer | `scripts/routes-analyzer.ts` | 掃描並分析所有路由 | ⭐ 易 |
| TestClient 擴展 | `tests/Feature/lib/test-client.ts` | 支持所有 HTTP 方法的測試客戶端 | ⭐ 易 |
| Feature 測試編排 | `scripts/test-feature.ts` | 起服並設定 `API_BASE_URL`（Draupnir） | ⭐ 易 |
| Routes Test Template | `tests/Feature/routes-existence.e2e.ts` | 快速路由存在性驗證 | ⭐ 易 |
| Connectivity Test | `tests/Feature/routes-connectivity.e2e.ts` | 認證與授權行為驗證 | ⭐⭐ 中等 |

### 2. 文檔資源

| 資源 | 位置 | 用途 | 適用性 |
|------|------|------|-------|
| 完整實施指南 | `docs/ROUTES_VERIFICATION_GUIDE.md` | 詳細的步驟和最佳實踐 | 通用 |
| 快速開始指南 | `docs/ROUTES_VERIFICATION_QUICKSTART.md` | 30 秒快速上手 | 通用 |
| 工具包說明 | `docs/ROUTES_VERIFICATION_TOOLKIT.md` | 工具功能和集成方式 | 通用 |
| 驗證報告範例 | `ROUTES_VERIFICATION.md` | 報告格式範例 | 參考 |

### 3. 驗證報告

| 報告 | 內容 | 用途 |
|------|------|------|
| ROUTES_VERIFICATION.md | 完整驗證摘要 | 了解驗證結果和格式 |
| tests/routes-validation.report.md | 詳細路由清單 | 參考報告結構 |
| routes-analysis.json | 分析結果（自動生成） | 機器可讀的結果 |

### 4. 方法論記錄

| 記錄 | 位置 | 內容 |
|------|------|------|
| 體系導航 | [docs/README_ROUTES_VERIFICATION.md](./docs/README_ROUTES_VERIFICATION.md) | 檔案樹、命令、CI、統計權威索引 |

## 🎯 應用步驟（新項目）

### 方案 A: 快速應用（推薦，5 分鐘）

```bash
# 1. 複製必要文件
cp draupnir/scripts/routes-analyzer.ts your-project/scripts/
cp draupnir/scripts/test-feature.ts your-project/scripts/
cp draupnir/tests/Feature/lib/test-client.ts your-project/tests/Feature/lib/
cp draupnir/tests/Feature/lib/test-server.ts your-project/tests/Feature/lib/
cp draupnir/tests/Feature/routes-existence.e2e.ts your-project/tests/Feature/
# （可選）連通性測試：cp draupnir/tests/Feature/routes-connectivity.e2e.ts ...

# 2. 配置 package.json
cat >> your-project/package.json << 'EOF'
{
  "scripts": {
    "routes:analyze": "bun scripts/routes-analyzer.ts",
    "test:feature": "bun scripts/test-feature.ts",
    "verify:routes": "bun scripts/routes-analyzer.ts && bun run test:feature"
  }
}
EOF

# 3. 運行驗證
cd your-project
bun run verify:routes

# ✅ 完成！
```

### 方案 B: 完整應用（包含所有功能，15 分鐘）

1. **複製所有工具**
   ```bash
   cp -r draupnir/scripts your-project/
   cp -r draupnir/tests/Feature your-project/tests/
   ```

2. **複製文檔**
   ```bash
   cp -r draupnir/docs your-project/
   cp draupnir/ROUTES_VERIFICATION.md your-project/docs/
   ```

3. **配置完整 package.json**
   ```json
   {
     "scripts": {
       "routes:analyze": "bun scripts/routes-analyzer.ts",
       "test:feature": "bun scripts/test-feature.ts",
       "verify:routes": "bun scripts/routes-analyzer.ts && bun run test:feature"
     }
   }
   ```

4. **集成到 CI/CD**
   - 參考 [完整指南](./docs/ROUTES_VERIFICATION_GUIDE.md#cicd-集成)
   - 複製相應的 GitHub Actions 或 GitLab CI 配置

5. **運行完整驗證**
   ```bash
   bun run verify:routes
   ```

## 🔧 項目特定調整

### Fastify 項目

修改 `test-client.ts`：
```typescript
// 使用 app.inject() 代替 fetch()
async request(operation, options) {
  const res = await this.app.inject({
    method: operation.method,
    url: operation.path,
    // ...
  })
  return { status: res.statusCode, json: res.json() }
}
```

### Express 項目

使用 supertest：
```typescript
import request from 'supertest'

export class TestClient {
  constructor(private app: Express.Application) {}
  
  async get(path: string) {
    const res = await request(this.app).get(path)
    return { status: res.status, json: res.body }
  }
}
```

### Django/Flask 項目

使用對應框架的測試工具：
```python
# Django
from django.test import Client

def test_routes():
    client = Client()
    response = client.get('/api/users')
    assert response.status_code != 404
```

## 📊 預期結果

應用此方法論後，你應該能夠：

✅ **自動掃描所有 routes**
```bash
$ bun run routes:analyze
🔍 正在分析路由: src/Modules

總 Routes 數: （以你的 routes-analysis.json 為準，Draupnir 快照約 43）
```

✅ **快速驗證所有 routes 存在**
```bash
$ bun run test:feature
✅ （以控制台為準；routes existence 約 49、connectivity 約 52 個 it）
```

✅ **生成詳細驗證報告**
```bash
$ bun run routes:report
✅ 報告已生成: ROUTES_REPORT.md
```

✅ **集成到 CI/CD**
```bash
$ bun run test:feature
✅ Feature e2e 通過（含 routes）
```

## 🚀 高級應用

### 與 OpenAPI 集成

```bash
# 驗證代碼中的 routes 與 OpenAPI 文檔一致
bun scripts/openapi-validator.ts
```

### 性能基準測試

```bash
# 添加性能監控
bun scripts/routes-benchmark.ts
```

### 自動文檔生成

```bash
# 從 routes 自動生成 API 文檔
bun scripts/routes-to-postman.ts
```

## 📋 驗證清單

使用此方法論的新項目應確保：

- [ ] 複製了所有必要文件
- [ ] 配置了 package.json 腳本
- [ ] TestClient 支持你的框架
- [ ] 路由掃描能找到所有 routes
- [ ] 運行 `bun run verify:routes`（或專案等效命令）通過
- [ ] 集成到 CI/CD（推薦）
- [ ] 配置了 pre-commit hook（推薦）
- [ ] 文檔已更新（推薦）

## 💡 最佳實踐

### 1. 定期驗證

```bash
# 開發時：每次修改 routes 後
bun run test:feature

# 提交前：完整驗證
bun run verify:routes

# CI 中：自動驗證（見專案 workflow）
```

### 2. 新增 Route 檢查清單

```markdown
- [ ] 在 Presentation/Routes 中定義
- [ ] Controller 方法已實現
- [ ] 必要的中間件已應用
- [ ] 輸入驗證 Schema 已定義
- [ ] bun run verify:routes 通過
- [ ] 代碼已提交
```

### 3. 文件組織

```
project/
├── src/Modules/ModuleName/Presentation/Routes/
│   └── moduleName.routes.ts
├── scripts/
│   ├── routes-analyzer.ts
│   └── routes-test-generator.ts
├── tests/Feature/
│   ├── lib/test-client.ts
│   ├── routes-existence.e2e.ts
│   └── routes-connectivity.e2e.ts
└── docs/
    └── ROUTES_VERIFICATION_GUIDE.md
```

## 🔄 維護成本

| 任務 | 頻率 | 耗時 | 自動化 |
|------|------|------|-------|
| 運行快速驗證 | 每次提交 | 2s | ✅ |
| 生成完整報告 | 每週 | 3s | ✅ |
| 更新文檔 | 每月 | 15m | ❌ |
| CI 集成 | 一次性 | 30m | ✅ |

## 📈 投資回報

### 前期投資
- 一次性設置：15-30 分鐘
- 文件複製：2-3 分鐘

### 長期收益
- 自動化驗證：每次提交節省 2-5 分鐘
- 早期缺陷發現：節省調試時間 30%+
- 文檔維護：自動生成報告
- 新人上手：清晰的驗證流程

## 🌍 適用於

✅ DDD 架構的 API 項目  
✅ Gravito 框架項目  
✅ Express / Fastify / Hono / Bun HTTP 服務器  
✅ NestJS / AdonisJS / 其他框架  
✅ 任何需要完整路由驗證的 Node.js API  

## 📚 參考資源

### 主要文檔
1. [快速開始](./docs/ROUTES_VERIFICATION_QUICKSTART.md) - 30 秒上手
2. [完整指南](./docs/ROUTES_VERIFICATION_GUIDE.md) - 詳細實施
3. [工具包說明](./docs/ROUTES_VERIFICATION_TOOLKIT.md) - 工具功能

### 實際範例
- [驗證報告](./ROUTES_VERIFICATION.md) - 完整的驗證結果
- [路由列表](./tests/routes-validation.report.md) - 詳細的路由清單
- [源碼](./scripts/routes-analyzer.ts) - 工具源代碼

### 體系導航
- [README_ROUTES_VERIFICATION.md](./docs/README_ROUTES_VERIFICATION.md) — 命令、CI、檔案樹

## 🎓 學習路徑

```
1. 閱讀本文檔 (5 min)
     ↓
2. 快速開始指南 (5 min)
     ↓
3. 複製工具並運行 (5 min)
     ↓
4. 查看完整指南了解細節 (20 min)
     ↓
5. 集成到 CI/CD (15 min)
     ↓
✅ 完成
```

## 🔗 文件關係圖

```
REUSABLE_METHODOLOGY.md (本文檔)
    ├── 快速開始
    │   └── docs/ROUTES_VERIFICATION_QUICKSTART.md
    ├── 完整指南
    │   └── docs/ROUTES_VERIFICATION_GUIDE.md
    ├── 工具說明
    │   └── docs/ROUTES_VERIFICATION_TOOLKIT.md
    ├── 代碼工具
    │   ├── scripts/routes-analyzer.ts
    │   ├── scripts/test-feature.ts
    │   ├── tests/Feature/lib/test-client.ts
    │   └── tests/Feature/routes-*.e2e.ts
    ├── 驗證報告
    │   ├── ROUTES_VERIFICATION.md
    │   ├── tests/routes-validation.report.md
    │   └── routes-analysis.json（執行分析器後）
    └── 體系導航
        └── docs/README_ROUTES_VERIFICATION.md
```

## ❓ 常見問題

**Q: 能否用於舊項目？**  
A: 可以。適應步驟 1-2，然後應用工具。

**Q: 支持哪些框架？**  
A: 任何 Node.js HTTP 框架。詳見 [框架適配指南](./docs/ROUTES_VERIFICATION_GUIDE.md#框架適配)。

**Q: 需要改動多少現有代碼？**  
A: 無需改動業務代碼。只需複製工具和配置 package.json。

**Q: 如何定制驗證規則？**  
A: 修改 `routes-analyzer.ts` 和測試文件。詳見 [完整指南](./docs/ROUTES_VERIFICATION_GUIDE.md#自定義)。

## 📞 支持

遇到問題？
1. 查看 [故障排除指南](./docs/ROUTES_VERIFICATION_GUIDE.md#故障排除)
2. 檢查 [常見問題](./docs/ROUTES_VERIFICATION_QUICKSTART.md#常見問題)
3. 參考 [驗證報告](./ROUTES_VERIFICATION.md) 了解預期格式

## 📄 版本信息

- **方法論版本**: v1.1
- **工具版本**: 與 Draupnir repo 同步
- **驗證項目**: Draupnir v0.1.0
- **驗證日期**: 2026-04-13
- **驗證結果**: 見 [ROUTES_VERIFICATION.md](./ROUTES_VERIFICATION.md) 快照（分析器 + e2e）

---

## 🎉 總結

此方法論提供了一套完整的、可復用的 API routes 驗證解決方案：

✅ **完全自動化** - 無需手動編寫測試  
✅ **快速高效** - 靜態掃描亞秒級；e2e 視啟服而定  
✅ **易於集成** - 支持任何 CI/CD 系統  
✅ **詳細報告** - 生成易讀的驗證報告  
✅ **框架無關** - 適用於任何 Node.js 框架  
✅ **易於維護** - 最小化定制工作  

立即開始使用！👉 [快速開始指南](./docs/ROUTES_VERIFICATION_QUICKSTART.md)
