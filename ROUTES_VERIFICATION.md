# Routes 驗證完整報告

## 執行摘要

本文件記錄 Draupnir 專案中 **routes 靜態掃描**與 **HTTP Feature e2e** 的驗證方式與快照數字。

- **最後同步**：2026-04-13  
- **導航與命令（權威）**：[docs/README_ROUTES_VERIFICATION.md](docs/README_ROUTES_VERIFICATION.md)  
- **方法**：`scripts/routes-analyzer.ts`（regex 抽取）+ `tests/Feature/routes-*.e2e.ts`（需執行中 API）

> 下方表格為某次執行之快照。請以 **`bun scripts/routes-analyzer.ts` 產生的 `routes-analysis.json`** 與 **`bun run test:feature`** 控制台輸出為準。

---

## 靜態分析（routes-analyzer）

### 路由定義位置

```
src/Modules/*/Presentation/Routes/*.routes.ts
src/wiring/index.ts
src/routes.ts
```

### 2026-04-13 快照（來自 `routes-analysis.json`）

| 項目 | 數值 |
|------|------|
| **總匹配路由** | 43 |
| **掃描到路由檔的模組數** | 10 |

**按模組（`byModule`）**

| 模組 | Routes |
|------|--------|
| Organization | 12 |
| AppModule | 6 |
| CliApi | 6 |
| Profile | 5 |
| AppApiKey | 4 |
| ApiKey | 3 |
| Auth | 2 |
| Credit | 2 |
| Health | 2 |
| DevPortal | 1 |
| **總計** | **43** |

**按 HTTP 方法（`byMethod`）**

| 方法 | 數量 |
|------|------|
| POST | 17 |
| GET | 14 |
| PUT | 4 |
| PATCH | 5 |
| DELETE | 3 |
| **總計** | **43** |

分析器只匹配特定 `router.get/post/...` 字面樣式；若註冊寫法不同，數字可能**低於**實際路由。人類可讀的完整列表見 [tests/routes-validation.report.md](tests/routes-validation.report.md)（可能與掃描結果不完全一致，請以程式與 e2e 為準）。

---

## 動態測試（Feature e2e）

### 測試檔

| 檔案 | 用途 | `it` 用例數（2026-04-13） |
|------|------|---------------------------|
| [tests/Feature/routes-existence.e2e.ts](tests/Feature/routes-existence.e2e.ts) | 非 404 存在性 | 49 |
| [tests/Feature/routes-connectivity.e2e.ts](tests/Feature/routes-connectivity.e2e.ts) | 認證／授權行為 | 52 |

### 執行方式

```bash
# 推薦：自動起 memory ORM 服務並跑全部 tests/Feature/*.e2e.ts
bun run test:feature

# 或：本機已有 API（必須設定 API_BASE_URL；路徑需加 ./ 否則 Bun 不視為檔案）
export API_BASE_URL=http://127.0.0.1:3000
bun test ./tests/Feature/routes-existence.e2e.ts
bun test ./tests/Feature/routes-connectivity.e2e.ts
```

編排腳本：[scripts/test-feature.ts](scripts/test-feature.ts)。

### CI

[.github/workflows/ci.yml](.github/workflows/ci.yml) 的 **`routes-check`** job：背景啟動 `ORM=memory` 的 `src/index.ts`，於臨時目錄執行 `bun test ./Feature/routes-existence.e2e.ts`（見 workflow 內文）。目前 **未** 在該 job 內呼叫 `routes-analyzer.ts`。

---

## 維護檢查清單

- [ ] 變更路由後執行 `bun scripts/routes-analyzer.ts` 並檢視 `routes-analysis.json`
- [ ] 執行 `bun run test:feature`（或僅 routes 兩檔 + `API_BASE_URL`）
- [ ] 必要時更新 [tests/routes-validation.report.md](tests/routes-validation.report.md)
- [ ] 若路由宣告格式變更，考慮擴充 [scripts/routes-analyzer.ts](scripts/routes-analyzer.ts) 的 regex

---

## 沿革

本檔曾記載 **68 routes / 72 tests** 與檔名 `routes-existence.test.ts`；專案已改為 **`*.e2e.ts`**、`test:feature` 與上表統計。舊數字僅供歷史參考。

---

**一併維護**：[docs/README_ROUTES_VERIFICATION.md](docs/README_ROUTES_VERIFICATION.md)
