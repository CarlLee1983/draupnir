# Draupnir 依賴優化 - 待辦事項清單

**更新日期** 2026-04-23  
**項目** NPM 依賴替換和 Bun 原生 API 遷移  
**狀態** 進行中（核心遷移與防回退已落地；#5 / #8 / 部分文檔與發布項仍待辦）  

---

## 📊 項目概覽

```
完成度（概估）：7/12 全完成 + 2/12 部分 + 3/12 未開始
├─ 全完成: #1–#3 開發、#4 報告、#6 文獻評估、#10 腳本+CI+文檔、#12 本表
├─ 部分: #9（INDEX / QUICKREF / SNIPPETS / REPORT 等，見 Task #9） 
├─ 部分: #11（本地 tag `bun-optimization-complete`；原草案的 CHANGELOG 專節、GitHub Release 仍缺）
├─ 阻斷/待辦: #5 權限與受限密碼學檔案
├─ 中期: #8 Bun 生態監控（文件與執行節律）
└─ 長期: #7 readFileSync 全異步化（觸發條件式）

預期投入時間: 13.5 小時（歷史估時；剩餘以當前排程為準）
```

---

## ✅ 已完成的工作

### Task #1: 第一階段 - UUID 和 Crypto API 替換
**完成日期** 2026-04-10  
**提交** dc06ccb, 31f2f2b  
**狀態** ✅ COMPLETED  

**成果**
- [x] 移除 npm `uuid` 套件，4 個檔案改用 `crypto.randomUUID()`
- [x] 替換 8 個檔案中的 `createHash()` 為 `crypto.subtle.digest()`
- [x] 所有 createHash 調用轉換為 async
- [x] 測試通過：46/46 ✅
- [x] 構建成功：1.80 MB ✅

**負責人** Claude Code  
**關鍵檔案**
- Auth 模組（3 個）
- Organization 模組（2 個）
- CliApi 模組（2 個）
- Shared 模組（1 個）

---

### Task #2: 第二階段 - 路徑依賴優化
**完成日期** 2026-04-10  
**提交** 845ff08  
**狀態** ✅ COMPLETED  

**成果**
- [x] 移除 `import { resolve } from 'node:path'`
- [x] 實現 `joinPath()` 和 `normalizePath()`
- [x] 保留 `readFileSync()` 同步操作（評估結果：無性能影響）
- [x] 測試通過 ✅
- [x] 構建成功 ✅

**決策**
```
readFileSync 保留理由：
- 應用啟動時只執行 1 次
- 轉換為 async 會增加複雜性
- 無性能瓶頸
- 評估時機：Q4 2026+（如果成為性能瓶頸）
```

**負責人** Claude Code  
**關鍵檔案**
- `src/Pages/page-routes.ts`
- `src/Pages/ViteTagHelper.ts`

---

### Task #3: 第三階段 - 後續評估
**狀態** ✅ COMPLETED（評估階段）

**成果**
- [x] 評估 jsonwebtoken 遷移
- [x] 識別受限制的檔案
- [x] 記錄所有決策理由

**決策** 暫不遷移，中期評估

---

## 🔴 立即優先（本周內）

### Task #4: 撰寫執行報告
**優先級** 🔴 立即  
**預期時間** 2 小時  
**狀態** ✅ IN PROGRESS → COMPLETED  
**負責人** Claude Code  
**截止日期** 2026-04-10（本週五）

**任務描述**
將完成的依賴替換工作撰寫成正式的執行報告文檔

**交付物**
- [x] `docs/DEPENDENCY_OPTIMIZATION_REPORT.md` - 完整執行報告
- [x] 包含執行時間、參與者、版本信息
- [x] 詳細列出每個階段的完成情況
- [x] 包含代碼提交記錄
- [x] 包含測試驗證結果
- [x] 性能對比分析

**驗收標準**
- [x] 報告包含所有必要信息
- [x] 格式清晰，易於理解
- [x] 包含決策理由
- [x] 附錄包含代碼片段

**備註** ✅ 已完成

---

### Task #10: 建立自動化檢查（防止回退）
**優先級** 🔴 立即  
**預期時間** 2-3 小時  
**狀態** ✅ COMPLETED（實作路徑與初版草案不同，見下）  
**負責人** 已落地於 repo（腳本 + CI + 文檔）  
**完成** 2026-04-10 起陸續併入  

**任務描述**
防止未來在代碼中引入已棄用的依賴或模組

**實際交付物（與原草案差異）**
- [x] **Pre-commit Hook**（非 Husky）：`scripts/setup-hooks.sh` 安裝至 **`.git/hooks/pre-commit`**，呼叫 `scripts/check-commit.sh`。
- [x] **禁用 import 檢查**：`scripts/check-banned-imports.sh` — 阻擋 `uuid`、`node:path`、非白名單的 `node:crypto` 新增行；`node:crypto` 白名單含 `PasswordHasher.ts`、`WebhookSecret.ts`（及 `scripts/gen-hash.ts`）；**警告** `readFileSync` 新增使用。
- [x] **提交入口與 i18n**：`check-commit.sh` 同時執行 banned-imports 與 `bun scripts/check-i18n-locales.ts`。
- [x] **CI**：`.github/workflows/ci.yml` 的 `unit-coverage` job 執行 **`bun run check:commit`**（針對變更差異檢查），**未**新增獨立 `dependency-check.yml`；專案一般靜態分析採 **Biome**，**未**加入 ESLint `no-restricted-imports`（以 shell 實作取代）。
- [x] **文檔** `docs/banned-imports.md` — 禁止清單、例外、替代方案、Hook 說明。

**驗收標準**
- [x] Pre-commit 路徑可執行（`bun run check:commit` 與本機 `setup:hooks`）
- [x] 禁用 import 規則在 CI 上對 PR 變更生效
- [x] 文檔完整

**可選後續增強**（非阻塞）
- [ ] 專屬 workflow：`npm audit` 或 `bun audit` 定期／PR 掃描（與本項 import 防回退分屬不同面向）
- [ ] 若未來導入 ESLint 或 Biome 支援等價「禁止匯入」規則，可雙軌遷移後逐步淘汰 grep

**依賴關係** 無

---

## 🟡 計畫中（本月內）

### Task #5: 申請編輯權限 & 優化受限制檔案
**優先級** 🟡 中  
**預期時間** 待審批 + 2-3 小時執行  
**狀態** ⏳ PENDING (Blocked)  
**負責人** [待指定]  
**關鍵路徑** ⚠️ 阻塞任務  
**截止日期** 待權限批准  

**任務描述**
申請編輯權限，優化無法編輯的加密相關檔案

**受限制檔案**
1. `src/Modules/Auth/Infrastructure/Services/PasswordHasher.ts`
2. `src/Modules/DevPortal/Domain/ValueObjects/WebhookSecret.ts`

**待辦步驟**
- [ ] 第 1 步：聯繫系統管理員/項目主管，申請編輯權限
- [ ] 第 2 步：確認權限已授予
- [x] 第 3 步：PasswordHasher.ts 優化（`src/Modules/Auth/Infrastructure/Services/PasswordHasher.ts`；2026-04-23 確認）
  - [x] 替換 `randomBytes(16)` → `globalThis.crypto.getRandomValues()`（16 bytes → hex，格式與舊版相容）
  - [x] 評估 `scryptSync` → 採用 async `scrypt`（`promisify`）；`crypto.subtle` **不支援 scrypt**，故未採用
  - [x] 保留 `timingSafeEqual`
  - [x] 最小化 `node:crypto`：已移除 `randomBytes`；**仍**匯入 `scrypt` + `timingSafeEqual`（Web 標準無等價 scrypt，與既有雜湊格式相容之必要）
  - [x] 測試：已執行 `bun test src/Modules/Auth/__tests__/PasswordHasher.test.ts` 及相關 Auth 測試通過；全專案 `bun run test` 仍有既有未通過用例（與本步驟無關）
  - [x] 提交代碼

- [ ] 第 4 步：WebhookSecret.ts 優化
  - [ ] 替換 `createHmac()` → `crypto.subtle.sign('HMAC', ...)`
  - [ ] 替換 `randomBytes(32)` → `crypto.getRandomValues()`
  - [ ] 保留 `timingSafeEqual`
  - [ ] 移除 `import { ... } from 'node:crypto'`
  - [ ] 執行相關測試
  - [ ] 提交代碼

- [ ] 第 5 步：驗證
  - [ ] `bun run build` 成功
  - [ ] `bun run typecheck` 通過
  - [ ] 所有測試通過
  - [ ] 提交審查

**驗收標準**
- [ ] 兩個檔案**盡減** `node:crypto`；**例外（已實作）**：`PasswordHasher` 因 scrypt 與常時比對，仍匯入 `scrypt` + `timingSafeEqual`（非 `subtle` 可取代）
- [ ] 在可遷移範圍內，其餘加密操作轉為 Bun / Web Crypto API
- [ ] 100% 測試通過
- [ ] 代碼可合併

**風險等級** 🔴 高（密碼和簽名邏輯）  
**測試要求** 100% 必須通過，不可有迴歸

**備註**
- 密碼驗證是關鍵路徑，需嚴格測試
- Webhook 簽名驗證需確保相容性
- 現有密碼雜湊必須仍可驗證
- **PasswordHasher**（第 3 子步驟 2026-04-23）：已採用 `getRandomValues` 與 async `scrypt`；`node:crypto` 減至 `scrypt` + `timingSafeEqual` 兩符號（見同檔案註解與測試）

---

### Task #6: 評估 jsonwebtoken 到 jose 的遷移可行性
**優先級** 🟡 中
**預期時間** 2-3 小時
**狀態** ✅ COMPLETED（文獻評估）
**負責人** Claude Code
**完成日期** 2026-04-10
**決策文檔** [`JOSE_MIGRATION_EVALUATION.md`](./JOSE_MIGRATION_EVALUATION.md)

**任務描述**
中期優化：評估是否遷移至 jose 庫，以進一步減少 npm 依賴

**執行方式** 選項 A — 純文獻評估（未改動程式碼）

**完成項目**
- [x] 步驟 1：研究 jose 庫（API、Bun 相容性、維護狀態）
- [x] 步驟 2：評估遷移成本（10 檔案影響範圍盤點）
- [x] 步驟 3：性能差異評估（結論：無明顯差異）
- [x] 步驟 4：相容性分析（RFC 7519，零停機遷移可行）
- [x] 步驟 5：決策文檔 `docs/JOSE_MIGRATION_EVALUATION.md`

**決策標準對照**
- [x] 性能提升 > 10% 或無下降 — ✅ 無差異
- [x] 代碼複雜度不增加 — ⚠️ 勉強（async 化微增）
- [x] Bun 完全相容 — ✅ 官方 tier-1 支援
- [ ] 所有測試通過 — ⏳ 未執行遷移，待觸發條件達成時驗證

**結論**
> **暫不遷移** — jsonwebtoken 穩定運作，無商業迫切性。
> 文獻評估產出完整 playbook，觸發條件達成時可直接執行。

**觸發重啟條件**（任一達成即重啟）
1. jsonwebtoken 出現 CVE 或停止維護
2. 需要 RS256/ES256/JWKS/OIDC/JWE 支援
3. JWT 操作確認為效能瓶頸
4. 進行全面 dependency audit

**下次重新檢視** 2026-06-30（Q2 中期評估）

---

### Task #9: 建立 Bun 依賴替換知識庫
**優先級** 🟡 中  
**預期時間** 3-4 小時（初版已併入 docs；可選擇是否再拆專屬目錄）  
**狀態** 🟡 部分完成（內容已寫在 `docs/DEPENDENCY_OPTIMIZATION_*.md`，非初版目錄結構）  
**負責人** 已併入 repo 文檔集  
**截止日期** 可關閉或改為「增量維護」  

**任務描述**
文檔化 Bun NPM 依賴替換的最佳實踐，供團隊參考

**已落地（實際路徑）**
- [x] 索引與導航：`docs/DEPENDENCY_OPTIMIZATION_INDEX.md`
- [x] 快速參考：`docs/DEPENDENCY_OPTIMIZATION_QUICKREF.md`
- [x] 完整報告 / 遷移脈絡：`docs/DEPENDENCY_OPTIMIZATION_REPORT.md`
- [x] 可複用片段與遷移檢查：`docs/DEPENDENCY_OPTIMIZATION_SNIPPETS.md`
- [x] 禁用匯入規則：`docs/banned-imports.md`（與 `scripts/check-banned-imports.sh` 一致）

**初版草案中尚未建立的獨立檔案**（可選，低優先）
1. `docs/guides/bun-npm-replacement.md` — 內容多已涵蓋於 QUICKREF / REPORT
2. `docs/cases/draupnir-optimization.md` — 內容多已涵蓋於 REPORT
3. `docs/guidelines/when-to-migrate.md` — 見 REPORT 決策段與 JOSE 評估
4. `docs/snippets/*.ts` — 片段以 `DEPENDENCY_OPTIMIZATION_SNIPPETS.md` 內聯代碼為主；未拆獨立 `.ts` 檔

**質量標準**（針對已併入文檔集）
- [x] 文檔可讀、有示例與決策依據（以 INDEX/REPORT 為準持續維護）
- [ ] 若產品化要求「單一 guides/ 目錄」，可再從上列檔案摘出重發布

---

### Task #11: 建立 Git 標籤和里程碑
**優先級** 🟡 中  
**預期時間** 0.5 小時（剩餘主要為遠端發布與變更日誌）  
**狀態** 🟡 部分完成（本地有語意化 tag；**未**驗證遠端 / Release）  
**負責人** [待補]  
**截止日期** 彈性  

**任務描述**
記錄本次優化的完成點，建立版本里程碑

**實際狀態**
- [x] **Git 標籤（本地）**：`bun-optimization-complete`（`git tag -l` 可見）
- [ ] **草案中的標籤** `v1.0.0-bun-optimized`：未在 repo 中採用；若需與語意化版本對齊，可另議命名
- [ ] **push 到 origin**：需維護者在有權遠端執行
- [ ] **GitHub Release 頁面**（內容草案見舊版 TODO 列表）
- [ ] **GitHub Milestone**（內部流程）
- [ ] **package.json** 本專案當前版本為 `0.1.0`；**未**因本優化而 bump
- [ ] **CHANGELOG.md**：當前僅有 `[0.0.1.0] - 2026-04-11` 等條目，**未**含「1.0.0-bun-optimized」專段；若需可追溯敘述，可補一則 *Added* / *Changed* 子項（非技術阻斷）

**驗收標準**（可分期）
- [x] 至少有本地標記可指向優化完成節點
- [ ] 遠端 tag + Release + CHANGELOG 專段（團隊決定是否要做）

---

## 🔵 中期評估（Q2-Q3 2026）

### 複查節點：jsonwebtoken / jose（與「計畫中」區塊的 Task #6 同一主題）

文獻評估 **已完成**（見上方 **Task #6: 評估 jsonwebtoken 到 jose 的遷移可行性** 與 `docs/JOSE_MIGRATION_EVALUATION.md`）。下表週期意在 **屆時重審**（CVE、需求變更、Bun 生態），**不是**「評估工作尚未做」。

**建議重審** 2026-06-30 / 觸發條件同 Task #6「觸發重啟條件」。

---

### Task #8: 建立 Bun 生態監控計畫
**優先級** 🔵 中期  
**預期時間** 1 小時建立 + 持續監控  
**狀態** 📋 PENDING  
**負責人** [技術主管]  
**開始日期** 2026-05-01  

**任務描述**
建立定期監控機制，追蹤 Bun 和相關庫的發展

**監控對象**
1. 官方 Bun JWT 實現
   - [ ] 監控 Bun GitHub Issues/Discussions
   - [ ] 訂閱發布說明
   - [ ] 評估何時可遷移

2. Bun 原生加密 API 增強
   - [ ] scrypt 同步支持
   - [ ] HMAC 增強
   - [ ] 更多 Web Crypto 支持

3. jose 庫成熟度
   - [ ] 更新頻率
   - [ ] 性能優化
   - [ ] Bun 適配

**執行計畫**
- [ ] 月度檢查：Bun 發布說明（第一個週五）
- [ ] 季度評估：GitHub 趨勢（月初）
- [ ] 年度決策：升級或方案調整（1月）

**追蹤渠道**
- GitHub: https://github.com/oven-sh/bun/releases
- GitHub: https://github.com/panva/jose/releases
- Discord: Bun #help-and-questions 頻道
- 訂閱郵件清單

**記錄位置**
- `docs/monitoring/bun-ecosystem-tracking.md` - 更新記錄
- 每次更新時添加日期和發現

**評估週期**
- [ ] 2026-06-30：中期評估（Q2）
- [ ] 2026-12-31：年度決策（Q4）

---

## 🟢 長期評估（Q4 2026+）

### Task #7: 評估 readFileSync 完全轉換
**優先級** 🟢 長期  
**預期時間** 2-3 小時  
**狀態** 📋 PENDING  
**評估條件** 應用啟動成為性能瓶頸時  
**預計評估時間** Q4 2026+  

**任務描述**
未來可考慮將應用啟動初始化轉為完全異步

**評估條件**
- [ ] 應用啟動時間成為可測量的瓶頸
- [ ] 需要多個異步初始化操作
- [ ] Bun 提供更優雅的同步文件 API
- [ ] 團隊願意接受複雜性提升

**如需轉換**
- [ ] 修改 `registerPageRoutes()` 為 async
- [ ] 修改 `createInertiaService()` 為 async
- [ ] 修改 `loadViteManifest()` 為 async
- [ ] 修改 `ViteTagHelper.loadManifest()` 為 async
- [ ] 更新所有調用點

**預期工作量** 2-3 小時  
**風險等級** 🟡 中等（涉及應用啟動邏輯）  

**決策標準**
- [ ] 啟動時間改善 > 5%
- [ ] 無副作用
- [ ] 所有測試通過

**備註** 當前保留同步實現，無性能問題

---

## 📊 Task #12: 待辦事項追蹤總表（本文檔）
**優先級** 📊 持續  
**狀態** ✅ 已建立  
**負責人** 項目管理  
**更新頻率** 每周或有重大變化時  

**用途** 單一真實來源，追蹤所有待辦事項

---

## 📈 進度追蹤表

| # | 任務 | 優先級 | 狀態 | 完成度 | 預期時間 | 負責人 | 截止日 |
|---|------|--------|------|--------|----------|--------|--------|
| 1 | UUID 和 Crypto 替換 | - | ✅ | 100% | 完成 | Claude | 2026-04-10 |
| 2 | 路徑依賴優化 | - | ✅ | 100% | 完成 | Claude | 2026-04-10 |
| 3 | 後續評估 | - | ✅ | 100% | 完成 | Claude | 2026-04-10 |
| 4 | 執行報告 | 🔴 | ✅ | 100% | 2h | Claude | 2026-04-10 |
| 10 | 自動化檢查 | 🔴 | ✅ | 100% | 2-3h | 腳本+CI | 2026-04 |
| 5 | 權限申請 & 受限檔案 | 🟡 | ⏳ | 0% | 待批准 | [待指定] | TBD |
| 6 | Jose 遷移評估 | 🟡 | ✅ | 100% | 1h | Claude | 2026-04-10 |
| 9 | 知識庫建立 | 🟡 | 🟡 | 約 75% | 3-4h | 文檔已併入 | 增量 |
| 11 | Git 標籤里程碑 | 🟡 | 🟡 | 部分 | 0.5h | 本地 tag | 遠端待定 |
| 8 | Bun 監控計畫 | 🔵 | 📋 | 0% | 1h | [技術主管] | 2026-05-01 |
| 7 | ReadFileSync 轉換 | 🟢 | 📋 | 0% | 2-3h | [待指定] | Q4 2026+ |
| 12 | 待辦總表 | 📊 | ✅ | 100% | 持續 | 項目管理 | 持續 |

**圖例**
- ✅ COMPLETED（已完成）
- 🟡 部分完成（內容已併入或僅部分交付物就緒）
- 📋 PENDING（待執行）
- ⏳ BLOCKED（被阻塞）
- 🔴 立即優先（本周）
- 🟡 計畫中（本月）
- 🔵 中期（Q2-Q3）
- 🟢 長期（Q4+）
- 📊 持續

---

## 🔗 相關文檔

| 文檔 | 位置 | 用途 |
|------|------|------|
| **執行報告** | `docs/DEPENDENCY_OPTIMIZATION_REPORT.md` | 完整的技術報告 |
| **待辦清單** | `docs/DEPENDENCY_OPTIMIZATION_TODO.md` | 本文檔 |
| **禁用 imports** | `docs/banned-imports.md` | 自動化防回退規則（Task #10 產出）|
| **Jose 評估** | `docs/JOSE_MIGRATION_EVALUATION.md` | 決策文檔（Task #6 產出）|
| **快速參考** | `docs/DEPENDENCY_OPTIMIZATION_QUICKREF.md` | Task #9 內容載體之一 |
| **文檔索引** | `docs/DEPENDENCY_OPTIMIZATION_INDEX.md` | 導航與讀者路徑 |
| **可複用片段** | `docs/DEPENDENCY_OPTIMIZATION_SNIPPETS.md` | 取代原 `docs/snippets/*.ts` 草案 |
| **案例／深度** | `docs/DEPENDENCY_OPTIMIZATION_REPORT.md` | 等同原「案例研究」定位 |
| **Git 標籤** | `bun-optimization-complete` | Task #11 本地標記；遠端可選 |

---

## 🎯 成功標準

完成所有項目的定義（依 2026-04-23 實況盤點）：

- [x] 所有開發工作完成（#1–#3）✅
- [x] 立即優先任務 #4、#10（報告 + 防回退腳本與 CI）✅
- [ ] 計畫中／阻塞：#5 未解；#6 文獻評估已完成、遷移本體未做；#9 以 **DEPENDENCY_OPTIMIZATION_*** 文檔集**達可用水準**；#11 **遠端 Release/CHANGELOG 專段** 仍屬團隊可選
- [ ] 中期任務按節律進行（#8 監控計畫文件與執行）⏳
- [ ] 長期任務觸發時再評估（#7）⏳
- [x] 核心文檔可讀且互相鏈接（INDEX / REPORT / QUICKREF / SNIPPETS / banned-imports）
- [x] 例行驗證以 CI 為準（`bun run typecheck` / `lint` / `check:commit` / 測試作業，見 `ci.yml`）
- [x] 主線 CI 已包含 `check:commit`（禁用 import 防回退）
- [ ] 可選：遠端語意化 tag、GitHub Release、CHANGELOG 專節敘述 Bun 優化

---

**最後更新** 2026-04-23  
**維護人** 項目管理團隊  
**狀態** 進行中；與實作不一致處以本表「實際交付物」敘述為準
