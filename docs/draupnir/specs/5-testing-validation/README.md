# 5. 測試與驗證框架

> 自動化測試設計、表單驗證、規格驅動測試

## 📄 文檔清單

### [API 功能性測試設計規格](./api-functional-testing.md)

**目標**：建立 Spec-driven 的自動化 API 功能性測試框架

**核心決策**：
- 執行環境：本地 MemoryDB（外部環境待隔離）
- 測試生成：完全自動生成，spec 驅動，零人工介入
- 狀態依賴：獨立 endpoint 測試 + 流程鏈測試
- 測試框架：Bun test（與現有單元測試統一）
- 觸發時機：動態讀取 OpenAPI spec
- Spec 作為唯一 Source of Truth

**包含內容**：

| 項目 | 說明 |
|------|------|
| **Spec Walker** | 自動掃描 OpenAPI.yaml，對每個 endpoint 生成測試 |
| **Happy Path** | 正確請求 → 預期狀態碼 |
| **Schema 驗證** | Response 結構符合 spec 定義 |
| **Auth Gate** | 無 token 回 401（有 security 時） |
| **必填欄位檢查** | 缺漏必填欄位 → 400 |
| **Flow Runner** | x-test-flows 流程鏈測試（跨步驟資料傳遞） |

**架構**：
```
openapi.yaml (唯一 source of truth)
    ├── paths/* → Spec Walker → 自動產生 endpoint tests
    └── x-test-flows/* → Flow Runner → 自動產生 flow tests
```

---

### [@gravito/impulse FormRequest 驗證整合設計](./impulse-validation.md)

**目標**：統一驗證層，將散落在 Controller 中的手動 Zod 驗證遷移至 @gravito/impulse FormRequest

**核心決策**：
- 遷移策略：一次性遷移所有模組（Auth、User、Organization、Credit）
- 整合方式：直接路由掛載，利用 `core.router` 原生 FormRequest 支援
- 錯誤狀態碼：422 Unprocessable Entity（取代 400）

**包含內容**：

| 項目 | 說明 |
|------|------|
| **FormRequest 類別** | 每個請求一個 class，內嵌 Zod schema |
| **Router 支援** | IModuleRouter 擴展 FormRequest overloads |
| **Controller 簡化** | 移除所有 safeParse 樣板，改用 `ctx.get('validated')` |
| **路由參數驗證** | 保留在 Controller，FormRequest 負責 body/query |
| **Namespace** | 遷移路由參數 schema 至 `Requests/params.ts` |

**架構改動**：
```typescript
// Before
async login(ctx: IHttpContext) {
  const body = ctx.getJsonBody()
  const validation = LoginSchema.safeParse(body)
  if (!validation.success) {
    return ctx.json({ success: false, ... }, 400)
  }
  // ...
}

// After
async login(ctx: IHttpContext) {
  const data = ctx.get('validated')  // FormRequest 自動驗證
  // ...
}
```

---

### [驗收測試層（Acceptance Layer）](./acceptance-layer.md)

**目標**：在單元測試與 Playwright E2E 之間建立「真實 DI wiring + 真實 SQLite + 真實 DomainEventDispatcher」的切片，以業務情境組織 spec，覆蓋跨模組 saga 與 DI 綁定。

**核心決策**：
- 分兩層：Use Case（Given-When-Then DSL）+ API Contract（樸素 describe/it）
- Per-worker SQLite tmp file + 真實 Atlas migrations（非 memory adapter）
- 外部 port（clock / gateway / scheduler / queue）可 rebind 為 fakes；Domain / Repository / Event dispatcher 絕對不 mock
- 對應設計文件：[`docs/superpowers/specs/2026-04-24-ddd-acceptance-testing-design.md`](../../../superpowers/specs/2026-04-24-ddd-acceptance-testing-design.md)

**實作 PR**：
- PR-1：harness + `IClock` 基礎建設
- PR-2：Credit pilot（9 支 Use Case + 3 endpoint × 3 場景的 API Contract）
- PR-3：舊 integration 測試清理、方法論文件、`check` 與 CI 整合

**涵蓋範圍**：目前 Credit 模組（pilot）；後續模組見 [`acceptance-layer.md`](./acceptance-layer.md) §9 推廣路線。

---

## 🏗️ 實現狀態

### ✅ 表單驗證整合 — 已完成

- ✅ IModuleRouter 介面擴展，支援 FormRequest overloads
- ✅ GravitoModuleRouter 偵測 FormRequest class
- ✅ 所有模組 Validators/ 遷移為 Requests/
- ✅ Controller 簡化，移除 safeParse 樣板
- ✅ 統一錯誤狀態碼 422

**相關文件位置**：
```
src/Modules/*/Requests/
├── LoginRequest.ts
├── RegisterRequest.ts
├── UpdateProfileRequest.ts
├── CreateOrganizationRequest.ts
├── TopUpCreditRequest.ts
├── params.ts (路由參數 schema)
└── index.ts (barrel export)
```

### ✅ 驗收測試層（Acceptance Layer）— 已完成 Credit pilot

- ✅ PR-1：harness（TestApp / TestClock / ManualScheduler / ManualQueue / migrate / truncate / scenario runner 骨架）
- ✅ PR-2：Credit pilot specs（9 支 Use Case + 1 支 API Contract × 3 endpoints × 3 場景）+ DSL helpers
- ✅ PR-3：舊 CreditEventFlow integration 刪除、方法論文件、`bun run check` 串接 `test:acceptance`、CI acceptance job

詳細規範與貢獻者指南 → [`acceptance-layer.md`](./acceptance-layer.md)

**相關目錄**：
```
tests/Acceptance/
├── UseCases/Credit/           # pilot
├── ApiContract/               # pilot
└── support/                   # harness + DSL helpers
```

### 🟡 API 功能性測試框架 — 待實現

- ⏳ Spec Walker 實現
- ⏳ 自動 Test Case 生成
- ⏳ Flow Runner 實現
- ⏳ CI/CD 整合

**計劃實現**：
```
tests/Feature/
├── api-spec.test.ts          # Spec Walker：endpoint 獨立測試
├── api-flows.test.ts         # Flow Runner：流程鏈測試
└── lib/
    ├── spec-parser.ts        # OpenAPI YAML 解析
    ├── schema-validator.ts   # AJV response schema 驗證
    ├── request-builder.ts    # 合法/非法 request 生成
    ├── test-client.ts        # HTTP fetch 封裝
    ├── test-server.ts        # Server 啟動/停止
    ├── flow-parser.ts        # x-test-flows 解析
    └── jsonpath.ts           # JSONPath 點號路徑
```

---

## 🧪 驗收標準

### 表單驗證整合 ✅

- [x] 所有 Controller 移除手動 safeParse
- [x] 所有路由支援 FormRequest 掛載
- [x] 錯誤狀態碼統一為 422
- [x] 驗證錯誤訊息清晰
- [x] 測試覆蓋率 ≥80%

### API 功能性測試框架 🟡

- [ ] Spec Walker 正常運作
- [ ] 每個 endpoint 自動生成 4 種 test cases
- [ ] Flow Runner 支援多步驟流程鏈
- [ ] Test Cases 涵蓋所有 API path
- [ ] CI 流程集成，PR 時自動運行

---

## 📌 設計考量

### 為什麼狀態碼 422 而不是 400？

| 狀態碼 | 語義 | 用途 |
|--------|------|------|
| **400** | Bad Request | 請求格式錯誤（JSON 無效、Content-Type 錯誤） |
| **422** | Unprocessable Entity | 請求格式有效，但語義驗證失敗（欄位格式、業務規則） |

採用 422 能更精確地區分錯誤類型，便於前端差異化處理。

### 為什麼 Spec Walker + Flow Runner？

| 方法 | 優勢 | 劣勢 |
|------|------|------|
| **Spec Walker** | ✅ 完全自動、零人工、覆蓋 100% endpoint | 無法測試複雜業務邏輯 |
| **Flow Runner** | ✅ 測試真實業務流程、跨步驟驗證 | 需人工編寫 flow 定義 |
| **兩者結合** | ✅ 互補，覆蓋完整場景 | — |

### 為什麼動態讀取 OpenAPI？

**優勢**：
- OpenAPI 是 source of truth
- spec 一旦更新，測試自動更新
- 零 drift 風險
- 無須手工維護 test cases

**劣勢**：
- 依賴 OpenAPI 的完整性與準確性
- 複雜 spec 邏輯難以表示

### 為什麼 Bun test 而不用 Jest / Vitest？

- 統一測試框架（與現有單元測試一致）
- Bun 原生支援，無額外依賴
- 執行速度快
- TypeScript 支援完善

---

## 🔗 相關文檔與工具

### 相關規格
- **工作計劃** → [0-planning](../0-planning/)
- **架構評審** → [6-architecture](../6-architecture/)

### OpenAPI 文件位置
```
docs/openapi.yaml  # 需補充：
  - 所有 path 的 response schema
  - x-test-flows 流程定義（可選擴展）
```

### 測試執行命令
```bash
# 單元測試
bun test

# 包含 API 功能性測試（待實現）
bun test Feature/

# 特定流程測試
bun test Feature/api-flows.test.ts
```

---

## 🚀 後續與擴展

### V1.1 計劃
- Spec Walker 實現與集成
- 基礎 flow tests 編寫（關鍵業務流程）
- CI 流程集成

### V1.2+ 可能擴展
- Performance 測試（endpoint 響應時間）
- Load 測試（並發負載）
- Security 測試（SQL injection、XSS 等）
- Contract Testing（與 Bifrost 的契約測試）

---

**狀態**：✅ 表單驗證完成 / 🟡 API 功能性測試框架待實現 / ✅ 驗收測試層 Credit pilot 完成
**最後更新**：2026-04-25
