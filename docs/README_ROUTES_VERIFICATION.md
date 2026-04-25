# Routes 驗證完整體系導航

> 本項目已建立一套完整的、可復用的 API routes 驗證方法論和工具包。本文檔是導航索引。  
> **與程式庫同步**：2026-04-25（檔名、路徑、`bun test` 用法、統計數字與 CI 對齊）。

## 📚 文檔導航

### 🎯 根據需求選擇

#### 「我想快速在現有項目中使用」
👉 [ROUTES_VERIFICATION_QUICKSTART.md](./ROUTES_VERIFICATION_QUICKSTART.md) (5 分鐘)

#### 「我想深入了解完整的實施步驟」
👉 [ROUTES_VERIFICATION_GUIDE.md](./ROUTES_VERIFICATION_GUIDE.md) (詳細指南)

#### 「我想了解工具的功能和用途」
👉 [ROUTES_VERIFICATION_TOOLKIT.md](./ROUTES_VERIFICATION_TOOLKIT.md) (工具說明)

#### 「我想了解這套方法論如何應用到其他項目」
👉 [../REUSABLE_METHODOLOGY.md](../REUSABLE_METHODOLOGY.md) (可復用方法論)

---

## 🗂️ 文件結構

```
Draupnir Project/
│
├── 📖 REUSABLE_METHODOLOGY.md
│   └── 如何在其他項目中應用此方法論
│
├── 📊 ROUTES_VERIFICATION.md
│   └── 驗證結果報告和統計
│
├── docs/
│   ├── README_ROUTES_VERIFICATION.md (本文檔)
│   ├── ROUTES_VERIFICATION_QUICKSTART.md
│   │   └── 30 秒快速上手
│   ├── ROUTES_VERIFICATION_GUIDE.md
│   │   └── 完整實施指南
│   └── ROUTES_VERIFICATION_TOOLKIT.md
│       └── 工具包功能說明
│
├── scripts/
│   └── routes-analyzer.ts
│       └── 路由掃描分析工具（可復用）
│
├── tests/
│   ├── Feature/
│   │   ├── routes-existence.e2e.ts
│   │   │   └── 快速存在性驗證（需執行中 API + `API_BASE_URL`）
│   │   ├── routes-connectivity.e2e.ts
│   │   │   └── 連通性／認證行為驗證
│   │   └── lib/
│   │       ├── test-client.ts    ← HTTP 客戶端
│   │       └── test-server.ts    ← 與 `scripts/test-feature.ts` 搭配
│   └── routes-validation.report.md
│       └── 人工維護之路由列表（可能與分析器數字不同步，請以工具輸出為準）
│
├── routes-analysis.json          ← `routes-analyzer.ts` 產出（執行後寫入 repo 根目錄）
│
└── .github/workflows/ci.yml
    └── `routes-check` job（memory ORM 起服 + existence e2e）
```

---

## 🚀 快速開始 (5 分鐘)

### 在 Draupnir 倉庫內（推薦）

靜態掃描與動態驗證分開執行：

```bash
# 1) 靜態：掃描 Presentation/Routes（輸出 routes-analysis.json）
bun scripts/routes-analyzer.ts

# 2) 動態：自動起 memory ORM 服務並跑完 tests/Feature/*.e2e.ts（含兩份 routes 測試）
bun run test:feature
```

若已有本機服務在跑，可只跑 e2e（**必須**設定 `API_BASE_URL`；檔名須帶路徑前綴 `./`，否則 Bun 不會當成檔案）：

```bash
export API_BASE_URL=http://127.0.0.1:3000
bun test ./tests/Feature/routes-existence.e2e.ts
bun test ./tests/Feature/routes-connectivity.e2e.ts
```

對應腳本見根目錄 `package.json`：`test:feature`、`test:feature:server`、`test:feature:existing`。

### 複製到其他專案時

```bash
cp scripts/routes-analyzer.ts your-project/scripts/
cp tests/Feature/lib/test-client.ts your-project/tests/Feature/lib/
cp tests/Feature/routes-existence.e2e.ts your-project/tests/Feature/
# 依專案調整 import 路徑與啟服方式
```

### 可選：package.json 腳本示例（Bun）

```json
{
  "scripts": {
    "routes:analyze": "bun scripts/routes-analyzer.ts",
    "test:feature": "bun scripts/test-feature.ts",
    "verify:routes": "bun scripts/routes-analyzer.ts && bun run test:feature"
  }
}
```

（`verify:routes` 會跑**全部** Feature e2e；若只想跑 routes 兩檔，請用 `API_BASE_URL` + 兩條 `bun test ./tests/Feature/routes-*.e2e.ts`。）

### 📊 預期結果（靜態分析）

```
🔍 正在分析路由: .../src/Modules

╔════════════════════════════════════════╗
║ 總 Routes 數:                       51 ║   ← regex 抽取，可能低於實際註冊數
╚════════════════════════════════════════╝

💾 詳細分析已保存至: routes-analysis.json
```

動態測試通過與否以 `bun run test:feature`（或上述單檔命令）控制台為準。

---

## 📖 詳細文檔說明

### 1. [ROUTES_VERIFICATION_QUICKSTART.md](./ROUTES_VERIFICATION_QUICKSTART.md)
**適合**: 想快速開始的人  
**內容**: 
- 30 秒快速上手
- 項目結構調整（Fastify/Express）
- 常見問題解決
- 高級用法示例

**閱讀時間**: 10 分鐘

### 2. [ROUTES_VERIFICATION_GUIDE.md](./ROUTES_VERIFICATION_GUIDE.md)
**適合**: 想深入了解的人  
**內容**:
- 完整實施步驟（5 步驟）
- 三層驗證框架詳解
- 中間件檢查清單
- CI/CD 集成示例
- 故障排除指南
- 性能優化

**閱讀時間**: 30 分鐘

### 3. [ROUTES_VERIFICATION_TOOLKIT.md](./ROUTES_VERIFICATION_TOOLKIT.md)
**適合**: 想了解工具功能的人  
**內容**:
- 工具包內容清單
- 各工具功能詳解
- 支持的項目結構
- 擴展和集成示例
- 性能指標

**閱讀時間**: 20 分鐘

### 4. [../REUSABLE_METHODOLOGY.md](../REUSABLE_METHODOLOGY.md)
**適合**: 想在其他項目應用的人  
**內容**:
- 可復用資產清單
- 應用步驟（方案 A/B）
- 項目特定調整
- 驗證清單
- 投資回報分析

**閱讀時間**: 15 分鐘

---

## 🎯 應用場景

### 開發時使用
```bash
bun scripts/routes-analyzer.ts          # 改路由後先看靜態掃描
bun run test:feature                    # 或對已起服環境 + API_BASE_URL 單跑 e2e
```

### 提交前驗證
```bash
bun scripts/routes-analyzer.ts && bun run test:feature
```

### CI/CD 集成
GitHub Actions 已內建 **`routes-check`**（`.github/workflows/ci.yml`）：以 `ORM=memory` 起 `src/index.ts`，再對 `routes-existence.e2e.ts` 執行 `bun test`。其他 CI 可仿照該 job 的環境變數與命令。

---

## 📊 驗證結果

### Draupnir 項目（2026-04-25 與工具對齊）

| 項目 | 數量 | 說明 |
|------|------|------|
| **`src/Modules` 頂層模組** | 15 | 含無路由之模組 |
| **分析器掃到之有路由模組** | 10 | 見 `routes-analysis.json` 的 `byModule` |
| **Routes 數（`routes-analyzer` regex）** | 51 | 與 `router.get/post/...` 寫法強相關，漏掃時請擴充 `scripts/routes-analyzer.ts` |
| **存在性 e2e 用例** | 49 | `routes-existence.e2e.ts` |
| **連通性 e2e 用例** | 52 | `routes-connectivity.e2e.ts` |

### 驗證詳情
- 📋 [完整驗證報告](../ROUTES_VERIFICATION.md)（與本導航同步維護）
- 📊 [詳細路由列表](../tests/routes-validation.report.md)
- 📈 [分析結果](../routes-analysis.json)（執行 `bun scripts/routes-analyzer.ts` 後生成）

---

## 🛠️ 核心工具

### Routes Analyzer
**用途**: 掃描並分析所有路由定義  
**命令**: `bun scripts/routes-analyzer.ts`  
**輸出**: 統計信息 + routes-analysis.json  
**耗時**: ~0.5 秒  

### Routes Existence Test
**用途**: 以「非 404」粗驗路由是否存在  
**命令**: `API_BASE_URL=... bun test ./tests/Feature/routes-existence.e2e.ts`（或 `bun run test:feature`）  
**覆蓋**: 49 個 `it` 用例（2026-04-25）  
**耗時**: 視啟服與網路而定（通常數秒級）  

### Routes Connectivity Test
**用途**: 驗證認證、授權、公開／保護行為等  
**命令**: `API_BASE_URL=... bun test ./tests/Feature/routes-connectivity.e2e.ts`（或 `bun run test:feature`）  
**覆蓋**: 52 個 `it` 用例（2026-04-25）  
**耗時**: 同上  

---

## 💡 最佳實踐

### 1. 定期運行驗證
```bash
# 開發時：每次修改路由後
bun scripts/routes-analyzer.ts
bun run test:feature

# 提交前：靜態 + 全 Feature e2e
bun scripts/routes-analyzer.ts && bun run test:feature

# CI：對照 .github/workflows/ci.yml 的 routes-check
```

### 2. 新增 Route 檢查清單
- [ ] 在 Presentation/Routes 定義
- [ ] Controller 方法已實現
- [ ] 必要的中間件已應用
- [ ] 輸入驗證 Schema 已定義
- [ ] `bun scripts/routes-analyzer.ts` 與 `bun run test:feature`（或補齊之 e2e）通過

### 3. 文件組織
```
src/Modules/ModuleName/
└── Presentation/Routes/
    └── moduleName.routes.ts
```

---

## 🔄 集成到 CI/CD

### GitHub Actions（本倉庫現狀）
**`.github/workflows/ci.yml`** 的 **`routes-check`**：複製 `tests/Feature` 至臨時目錄、以 `PORT=3001 ORM=memory` 背景啟動 `bun run src/index.ts`，再執行  
`API_BASE_URL=http://127.0.0.1:3001 bun test ./Feature/routes-existence.e2e.ts`（工作目錄為該臨時目錄）。  
目前 **未** 在 CI 內呼叫 `routes-analyzer.ts`；若要在流水線做靜態掃描，可另加一步 `bun scripts/routes-analyzer.ts`。

### GitLab CI / 其他
```yaml
verify_routes:
  script:
    - bun scripts/routes-analyzer.ts
    - bun run test:feature
```

### Pre-commit Hook（可選）
```bash
# .husky/pre-commit（需本機可起服或使用現有 API_BASE_URL）
bun scripts/routes-analyzer.ts && bun run test:feature
```

---

## 📈 投資與收益

### 一次性投資
- 複製工具: 2-3 分鐘
- 配置命令: 2-3 分鐘
- 首次運行: 2-3 分鐘
- **總計**: 5-10 分鐘

### 長期收益
- 自動化驗證: 每次提交節省 2-5 分鐘
- 早期缺陷發現: 節省調試時間 30%+
- 自動報告生成: 節省文檔時間
- 新人上手: 清晰的驗證流程

---

## ✅ 驗證清單

使用此體系時確保：

- [ ] 已閱讀本導航文檔
- [ ] 已複製所有必要工具
- [ ] 已配置 package.json 命令
- [ ] 已成功運行 `bun scripts/routes-analyzer.ts` 與 `bun run test:feature`（或等效命令）
- [ ] 已集成到 CI/CD（可選）
- [ ] 已配置 pre-commit hook（可選）
- [ ] 已更新項目文檔（可選）

---

## 🆘 需要幫助？

### 快速問題？
👉 [ROUTES_VERIFICATION_QUICKSTART.md - 常見問題](./ROUTES_VERIFICATION_QUICKSTART.md#常見問題)

### 詳細問題？
👉 [ROUTES_VERIFICATION_GUIDE.md - 故障排除](./ROUTES_VERIFICATION_GUIDE.md#故障排除)

### 其他項目適用？
👉 [REUSABLE_METHODOLOGY.md](../REUSABLE_METHODOLOGY.md)

---

## 📚 相關資源

### 文檔
- [快速開始](./ROUTES_VERIFICATION_QUICKSTART.md)
- [完整指南](./ROUTES_VERIFICATION_GUIDE.md)
- [工具說明](./ROUTES_VERIFICATION_TOOLKIT.md)
- [可復用方法論](../REUSABLE_METHODOLOGY.md)

### 代碼
- [路由分析工具](../scripts/routes-analyzer.ts)
- [Feature 測試編排](../scripts/test-feature.ts)
- [存在性 e2e](../tests/Feature/routes-existence.e2e.ts)
- [連通性 e2e](../tests/Feature/routes-connectivity.e2e.ts)
- [HTTP 客戶端](../tests/Feature/lib/test-client.ts)

### 報告
- [驗證報告](../ROUTES_VERIFICATION.md)
- [路由列表](../tests/routes-validation.report.md)
- [分析結果](../routes-analysis.json)

---

## 🎓 學習路徑

```
初級用戶:
1. 本導航 (5 min) ← 你在這裡
2. 快速開始 (5 min)
3. 複製工具並運行 (5 min)
✅ 完成

中級用戶:
1. 本導航 (5 min)
2. 完整指南 (20 min)
3. 實施和集成 (15 min)
4. 自定義配置 (10 min)
✅ 完成

高級用戶:
1. 本導航 (5 min)
2. 工具包說明 (15 min)
3. 可復用方法論 (15 min)
4. 擴展和優化 (30 min)
✅ 完成
```

---

## 📄 版本信息

- **體系版本**: v1.2（與 Draupnir 檔名／Bun 行為對齊）
- **最後更新**: 2026-04-25
- **已驗證於**: Draupnir v0.2.0
- **快照**: 分析器 **51** 條路由匹配；e2e **49 + 52** 用例（見上文表格）

---

## 🎉 下一步

1. **選擇你的文檔**: 根據上面的需求選擇合適的文檔
2. **開始應用**: 遵循相應的指南
3. **運行驗證**: 執行 `bun scripts/routes-analyzer.ts` 與 `bun run test:feature`（或依專案自訂之 `verify:routes`）
4. **查看結果**: 檢查控制台和生成的報告

準備好了嗎？👉 [快速開始指南](./ROUTES_VERIFICATION_QUICKSTART.md)

---

**有任何問題 or 建議？** 查看相應的文檔或參考 [故障排除指南](./ROUTES_VERIFICATION_GUIDE.md#故障排除)。
