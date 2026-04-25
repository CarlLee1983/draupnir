# Bun 依賴優化項目 - 文檔索引

**項目名稱** Draupnir NPM 依賴優化和 Bun 原生 API 遷移  
**項目執行日期** 2026-04-10  
**索引最後更新** 2026-04-26  
**狀態** 核心開發完成，防回退機制落地，進入維護與評估階段  
**版本** 1.1.0（更新受限檔案優化與 JOSE 評估成果）  

---

## 📌 項目簡述

Draupnir 項目系統性地替換不必要的 npm 依賴和 Node.js 內建模組，改用 Bun 原生 API，旨在提升啟動速度、縮小 bundle 並增強類型安全。

### 核心成果

✅ **移除 1 個 NPM 依賴** - `uuid`（改用 `crypto.randomUUID()`）  
✅ **優化 10 個模組** - 密碼學 API 遷移至 Web Crypto / Bun 原生 API  
✅ **移除 Node 依賴** - `node:path`（改用內建處理邏輯）  
✅ **防回退機制** - 落地 Git Hooks 與 CI 腳本，禁止引入已棄用依賴  
✅ **穩定性驗證** - 全專案 1255/1255 測試通過，構建成功  

---

## 📚 文檔導航

### 按用途分類

#### 🎯 我想快速了解發生了什麼
→ **[DEPENDENCY_OPTIMIZATION_QUICKREF.md](DEPENDENCY_OPTIMIZATION_QUICKREF.md)**
- ⏱️ 5-10 分鐘閱讀
- 一句話總結
- 關鍵統計數據
- 代碼片段預覽

#### 📖 我想了解完整的技術細節
→ **[DEPENDENCY_OPTIMIZATION_REPORT.md](DEPENDENCY_OPTIMIZATION_REPORT.md)**
- ⏱️ 20-30 分鐘閱讀
- 詳細的執行摘要與三階段工作說明
- 決策記錄和理由
- 包含最新的 `PasswordHasher` 與 `WebhookSecret` 優化細節

#### ✅ 我要追蹤項目進度與待辦
→ **[DEPENDENCY_OPTIMIZATION_TODO.md](DEPENDENCY_OPTIMIZATION_TODO.md)**
- ⏱️ 10 分鐘查閱
- 12 個結構化任務的實時狀態
- 包含已完成的權限申請與受限檔案處理

#### 🧪 我要查看特定庫的遷移評估
→ **[JOSE_MIGRATION_EVALUATION.md](JOSE_MIGRATION_EVALUATION.md)**
- 評估從 `jsonwebtoken` 遷移至 `jose` 的可行性
- 包含遷移策略、觸發條件與 Playbook

#### 💻 我要使用代碼片段或遷移檢查
→ **[DEPENDENCY_OPTIMIZATION_SNIPPETS.md](DEPENDENCY_OPTIMIZATION_SNIPPETS.md)**
- 3 個可復用的代碼片段
- 詳細的遷移檢查清單（UUID、Crypto、Path）

---

### 按讀者分類

#### 👨💼 項目經理 / 業務決策者
**核心要點**
- ✅ 核心工作已完成 85%+（10/12 任務已落地）
- 🎯 無技術風險；`PasswordHasher` 與 `Webhook` 關鍵路徑已完成優化並驗證
- 📊 性能穩定，維護成本降低
- ⏱️ 剩餘工作主要為長期監控與特定條件下的異步化評估

#### 👨💻 後端開發者
**核心要點**
- 🛡️ **防回退**：本地已安裝 Pre-commit Hook，CI 會檢查禁用匯入（見 `banned-imports.md`）
- 💡 新功能開發請優先參考 `SNIPPETS` 中的 Web Crypto 實法
- 🗝️ 密碼學操作已改為 `async`，請注意調用鏈的非同步處理

#### 🏗️ 技術架構師 / 技術主管
**核心要點**
- ⚖️ **JOSE 決策**：目前維持現狀，已建立 `JOSE_MIGRATION_EVALUATION.md` 作為技術儲備
- 🔒 **安全性**：`PasswordHasher` 已移除 `randomBytes`，僅保留無法替代的 `scrypt` 與 `timingSafeEqual`
- 📈 **架構一致性**：所有模組均已對齊 Bun 執行環境標準

#### 🧪 QA / 測試工程師
**核心要點**
- 🧪 **覆蓋率**：全專案 1255 測試為基準
- 🔍 **監控**：關注加密操作的邊界情況
- 🛠️ **工具**：可使用 `bun run check:commit` 手動驗證變更合規性

---

## 📊 信息速查表

### 關鍵提交記錄（新增）
| 提交哈希 | 標題 | 說明 |
|---------|------|------|
| fca16da | refactor(auth): PasswordHasher 優化 | 遷移至 getRandomValues 與 async scrypt |
| 2a74c74 | refactor(foundation): WebhookSecret 優化 | 遷移至 Web Crypto API (HMAC) |
| c7c061b | tooling(scripts): 強化 CI 與 Hooks | 落地自動化防回退檢查 |

### 修改檔案分佈（最新）
```
Auth 模組：6 個檔案 (新增 PasswordHasher.ts)
Organization 模組：5 個檔案
Foundation 模組：1 個檔案 (WebhookSecret.ts)
CliApi 模組：2 個檔案
Pages/Shared 模組：3 個檔案
工具與文檔：10+ 個檔案
```

### 關鍵指標
| 指標 | 值 |
|------|-----|
| npm 依賴減少 | 1（uuid） |
| node 內建依賴減少 | 2（node:path, node:crypto 減量） |
| 單元測試通過數 | 1255 / 1255 (2026-04-26) |
| 防回退機制狀態 | ✅ 已啟動 (Pre-commit & CI) |

---

## ⚠️ 重要提示

### 權限與受限檔案（已解決）
- 2026-04-23 已完成 `PasswordHasher.ts` 與 `WebhookSecret.ts` 的優化。
- 密碼雜湊仍保持與舊數據相容。
- Webhook 驗證已轉換為非同步 Web Crypto API。

### 防回退機制
- 任何試圖引入 `uuid` 或 `node:path` 的變更將被 Git Hook 攔截。
- `node:crypto` 的使用受白名單限制（僅限 `scrypt` / `timingSafeEqual` 等必要 API）。

---

## 🎯 後續步驟

### 短期（優先級 🔴）
- [ ] 推送遠端 Git 標籤 `bun-optimization-complete` (Task #11)
- [ ] 完善 CHANGELOG.md 中的 Bun 優化條目

### 近期（優先級 🟡）
- [ ] 啟動 Bun 生態監控計畫 (Task #8 - 2026-05-01 開始)
- [ ] 增量更新知識庫 (Task #9)

### 中期（優先級 🔵）
- [ ] 2026-06-30 重審 JOSE 遷移 (Task #6 複查)

### 長期（優先級 🟢）
- [ ] 評估啟動階段 readFileSync 的全異步化 (Task #7)

---

## 📋 文檔清單 (新增 JOSE 評估)

| 文檔 | 用途 | 狀態 |
|------|------|------|
| **REPORT.md** | 完整技術報告 | ✅ 更新 |
| **TODO.md** | 任務追蹤 | ✅ 更新 |
| **QUICKREF.md** | 快速參考 | ✅ 穩定 |
| **SNIPPETS.md** | 代碼片段與檢查清單 | ✅ 穩定 |
| **JOSE_MIGRATION_EVALUATION.md** | JOSE 遷移深度評估 | ✅ 新增 |
| **banned-imports.md** | 禁用清單與規則說明 | ✅ 新增 |
| **INDEX.md** | 本索引文檔 | ✅ 更新 |

---

**文檔版本** 1.1.0  
**索引最後更新** 2026-04-26  
**狀態** 核心任務已達成，進入維護模式。
