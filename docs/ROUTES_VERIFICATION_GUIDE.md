# Routes 驗證完整指南 (v1.2)

本指南涵蓋了如何在任何項目中應用相同的 routes 驗證方法論，並以 Draupnir 專案作為實作參考。

> **最後更新**：2026-04-25  
> **適用環境**：Bun 1.3.10+ / Node.js 18.x+

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
│  - 檢查路由定義 (Regex 掃描)          │
│  - 驗證 Controller 映射              │
│  - 確認中間件應用                    │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  動態連接測試 (Connectivity Tests)   │
│  - 發送實際 HTTP 請求 (Feature e2e)  │
│  - 驗證路由存在（無 404）            │
│  - 驗證中間件應用正確 (認證/授權)      │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  自動化驗證套件 (Automation Suite)   │
│  - CI/CD 集成 (routes-check job)     │
│  - 持續驗證 (PR 門檻)                │
│  - 缺陷早期發現                      │
└─────────────────────────────────────┘
```

---

## 快速開始

### 5 分鐘快速驗證 (Draupnir 項目)

如果你正在開發 Draupnir 項目：

```bash
# 1. 運行靜態分析
bun scripts/routes-analyzer.ts

# 2. 運行動態驗證 (自動起服並測試)
bun run test:feature

# 3. 查看分析結果
cat routes-analysis.json
```

### 複製到其他項目

```bash
# 1. 複製核心工具
cp scripts/routes-analyzer.ts your-project/scripts/
cp tests/Feature/lib/test-client.ts your-project/tests/Feature/lib/
cp tests/Feature/routes-existence.e2e.ts your-project/tests/Feature/

# 2. 修改 package.json
# 參照「配置 Package.json 命令」章節
```

---

## 完整實施步驟

### 步驟 1: 準備路由掃描工具

創建 `scripts/routes-analyzer.ts`。此工具使用正則表達式掃描路由定義：

```typescript
import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

// ... 核心邏輯：掃描 src/Modules/*/Presentation/Routes/*.routes.ts
// 匹配 router.get('/path', [middleware], handler)
```

> **實作參考**：查看 [scripts/routes-analyzer.ts](../scripts/routes-analyzer.ts) 以獲取完整的 Regex 匹配邏輯。

### 步驟 2: 建立 HTTP 驗證客戶端

在 `tests/Feature/lib/test-client.ts` 建立一個輕量級的 Fetch 包裝器，用於發送測試請求。

### 步驟 3: 編寫存在性測試 (Existence Test)

創建 `tests/Feature/routes-existence.e2e.ts`。其核心原則是：**只要請求不返回 404，就代表該路由在路由表中已正確註冊。**

```typescript
it('GET /api/users 應該存在', async () => {
  const response = await client.get('/api/users')
  expect(response.status).not.toBe(404)
})
```

### 步驟 4: 自動化測試編排 (Orchestration)

在 Draupnir 中，我們使用 `scripts/test-feature.ts` 來處理：
1. 背景啟動 API 服務 (通常使用 `ORM=memory`)。
2. 等待服務就緒。
3. 執行 `bun test`。
4. 測試完成後自動關閉服務。

### 步驟 5: 配置 Package.json 命令

```json
{
  "scripts": {
    "routes:analyze": "bun scripts/routes-analyzer.ts",
    "test:feature": "bun scripts/test-feature.ts",
    "verify:routes": "bun scripts/routes-analyzer.ts && bun run test:feature"
  }
}
```

---

## 工具和腳本

### 路由分析工具 (`routes-analyzer.ts`)

**用途**: 靜態掃描所有路由定義，提取路由信息並生成 JSON 報告。

```bash
bun scripts/routes-analyzer.ts
```

**輸出**: `routes-analysis.json`

### Feature 測試編排器 (`test-feature.ts`)

**用途**: 自動化「啟服 -> 測試 -> 停服」流程，確保測試環境一致性。

```bash
bun run test:feature
```

---

## 最佳實踐

### 1. 定期運行驗證

- **開發時**：每次修改路由定義後，運行 `bun scripts/routes-analyzer.ts` 檢查是否有漏掃或寫法不規範。
- **提交前**：運行 `bun run test:feature` 確保所有端點皆連通。
- **CI/CD**：在 GitHub Actions 中集成 `routes-check` job。

### 2. 新增 Route 的檢查清單

- [ ] 路由定義在 `Presentation/Routes/*.routes.ts`
- [ ] 寫法符合 `router.method('/path', [middleware], handler)` 規範 (以便分析器掃描)
- [ ] 必要的中間件 (Auth, Role) 已應用
- [ ] 在 `tests/Feature/routes-existence.e2e.ts` 補上對應的 `it` 用例
- [ ] `verify:routes` 通過

### 3. 文件組織結構 (DDD 建議)

```
src/Modules/ModuleName/
└── Presentation/Routes/
    └── moduleName.routes.ts
```

---

## 故障排除

### 問題：分析器找不到新路由

**原因**: 寫法不符合 Regex 匹配規則（例如：中間件沒用數組包裹，或 handler 換行書寫）。

**解決**: 
1. 修正路由定義寫法以符合標準。
2. 或擴充 `scripts/routes-analyzer.ts` 中的 `patterns` 數組。

### 問題：測試返回 404

**原因**: 
1. 路由未在 `index.ts` 或 `wiring/` 中註冊。
2. `API_BASE_URL` 指向錯誤。
3. 服務未成功啟動。

---

## 相關資源

- [📊 最新驗證報告](../ROUTES_VERIFICATION.md)
- [導航索引](./README_ROUTES_VERIFICATION.md)
- [快速開始](./ROUTES_VERIFICATION_QUICKSTART.md)
