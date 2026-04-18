# User Story 補足實作計畫（SA 回填）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 為 Draupnir v1 已實作的 14 個業務模組補上以使用者視角撰寫的 User Story 集合，作為新成員 onboarding 的首要閱讀材料。

**Architecture:** Pilot-first 產出。先以 ApiKey 模組做樣板，審完模板後按 5+2 批次滾動展開。每個模組產出一份 `user-stories.md`（含 Coverage map），加一份跨模組頂層索引 `user-stories-index.md`、一份統一的 `personas.md`。格式為「一句 story + 代碼連結 + 2~3 條商業規則」。

**Tech Stack:** Markdown、git、grep/glob、手動審閱。無程式碼、無自動化工具。

**Spec Reference:** `docs/superpowers/specs/2026-04-18-user-stories-backfill-design.md`

---

## 檔案結構總覽

**新建檔案**：
- `docs/draupnir/specs/personas.md` — 5 張人物卡（分 Stage 0 / 1.4 / 2.2 補齊）
- `docs/draupnir/specs/user-stories-index.md` — 三表索引（按模組 / Actor / Epic）
- `docs/draupnir/specs/1-authentication/user-stories.md` — Auth + Profile
- `docs/draupnir/specs/2-user-organization/user-stories.md` — Organization
- `docs/draupnir/specs/3-api-keys/user-stories.md` — ApiKey + AppApiKey + AppModule
- `docs/draupnir/specs/4-credit-billing/user-stories.md` — Contract + Credit + Dashboard + Reports + Alerts
- `docs/draupnir/specs/7-developer-api/README.md` — 新分區說明
- `docs/draupnir/specs/7-developer-api/user-stories.md` — SdkApi + CliApi + DevPortal

**修改檔案**：
- `docs/draupnir/specs/README.md` — 新增 7-developer-api 分區到導覽
- `.github/PULL_REQUEST_TEMPLATE.md` — 新建（目前不存在），加入 story 同步 checklist

---

## Task 總覽

| Task | 目的 | 預估 story 數 | Gate |
|---|---|---|---|
| **Task 0** | Pilot: ApiKey 模組 + 3 張主 persona + 索引骨架 | 8~12 | ✅ 使用者審閱確認模板 |
| **Task 1** | Auth + Profile | ~10 | — |
| **Task 2** | Organization | ~8 | — |
| **Task 3** | Contract + Credit | ~12 | — |
| **Task 4** | Dashboard + Reports + Bifrost Sync persona | ~10 | — |
| **Task 5** | Alerts | ~5 | — |
| **Task 6** | AppApiKey + AppModule | ~8 | — |
| **Task 7** | SdkApi + CliApi + DevPortal + SDK Client persona + 新分區 | ~8 | — |
| **Task 8** | PR Template + README 導覽更新 | — | — |

**總計**：~60~80 story、~8 回合。

---

## Task 0：Pilot — ApiKey 模組 + 主 Persona + 索引骨架

**目的**：鎖定模板（story 格式、顆粒度、coverage map 寫法），作為後續展開的唯一基準。

**Files:**
- Create: `docs/draupnir/specs/personas.md`
- Create: `docs/draupnir/specs/user-stories-index.md`
- Create: `docs/draupnir/specs/3-api-keys/user-stories.md`

### 參考資訊（此模組的代碼掃描結果）

Controllers：
- `src/Modules/ApiKey/Presentation/Controllers/ApiKeyController.ts`

Application Services（user-facing 入口）：
- `CreateApiKeyService.execute()`
- `AssignApiKeyService.execute()`
- `RevokeApiKeyService.execute()`
- `SetKeyPermissionsService.execute()`
- `UpdateApiKeyBudgetService.execute()`
- `UpdateKeyLabelService.execute()`
- `ListApiKeysService.execute()`

Internal（不寫 story，列入 coverage map 備註）：
- `SumQuotaAllocatedForOrgService`（被 Credit/Contract 內部聚合呼叫）

---

### Step 1：掃描 ApiKey 模組入口、列出候選 story

- [ ] 開三個檔案交叉讀：
  - `src/Modules/ApiKey/Presentation/Routes/apikey.routes.ts`
  - `src/Modules/ApiKey/Presentation/Controllers/ApiKeyController.ts`
  - 上述各 Application Service 的 `execute()` 簽名與回傳
- [ ] 草擬 **9~12 則** story 候選清單（不寫內文，只寫一句話 + actor）。必須至少覆蓋：
  - Manager 發 key（create）
  - Manager 指派 key 給 member（assign）
  - Manager 改 key label（updateLabel）
  - Manager 改 key 權限 scope（setPermissions）
  - Manager 改 key 額度（updateBudget）
  - Manager 撤銷 key（revoke）
  - Manager 列出 org 全部 key（list）
  - Member 列出指派給自己的 key（list with filter）
  - Cloud Admin 跨 org 查 key（若實作中 admin 會走相同 service）
  - Bifrost 鏡像失敗時使用者看到什麼（edge case）

### Step 2：寫 `docs/draupnir/specs/personas.md`（三張主 persona）

- [ ] 建立檔案，開頭加這段：

```markdown
# Draupnir Personas

> 本文件列出 Draupnir 系統中的人物與非人類 actor，供 User Stories 與 onboarding 閱讀使用。
> **對標代碼日期**：2026-04-18（commit `<sha>`，建立本文件時的 HEAD）。
```

- [ ] 寫 3 張 persona 卡：**Cloud Admin**、**Org Manager**、**Org Member**。每張含五個欄位：「是誰 / 關切的事 / 不關切 / 會碰到哪些模組 / 代表性 Story」。

**Cloud Admin 範本**（其他兩張仿此）：

```markdown
## 👤 Cloud Admin

**是誰**
Draupnir 平台的總管理員（內部運維 / 客戶成功團隊）。全站唯一能跨 org 操作的角色。

**關切的事**
- 平台整體的健康、用量、異常
- 幫客戶組織（org）建立初始合約與額度
- 介入處理客戶投訴 / 手動調降

**不關切**
- 單一 org 內部的 member 分工
- 單把 key 的細節（除非出問題）

**會碰到哪些模組**
Contract、Organization（provisioning）、Credit（手動調整）、Alerts（全站視角）、Dashboard（管理員視圖）

**代表性 Story**
US-APIKEY-xxx（待 Stage 1 後補）
```

- [ ] **Bifrost Sync Job** 與 **SDK Client** 兩張卡留到 Task 4 / Task 7 再補；此刻只在檔尾放註解 `<!-- TODO(stage-1.4): Bifrost Sync Job -->`、`<!-- TODO(stage-2.2): SDK Client -->` 標記。

### Step 3：寫 `docs/draupnir/specs/3-api-keys/user-stories.md`

- [ ] 建立檔案，開頭加 staleness 警告：

```markdown
# API Key 使用者故事（ApiKey / AppApiKey / AppModule）

> 本文件對標代碼日期：2026-04-18（commit `<sha>`）。
> 若你看到的代碼與此文件明顯不一致，請提 issue 或直接 PR 修正。

## 範圍
- 本檔覆蓋：ApiKey 模組（本批）
- **下批補**：AppApiKey、AppModule（Task 6）

---
```

- [ ] 依 Step 1 清單寫出 **8~12 則 story**，每則嚴格遵守 template：

```markdown
### US-APIKEY-003 | Manager 指派 Key 給成員

**As** an Org Manager
**I want to** assign one of my org's API keys to a specific member
**so that** the usage under that key is attributed to the member and respects their quota.

**Related**
- Module: `src/Modules/ApiKey`
- Entry: `AssignApiKeyService.execute()` → `src/Modules/ApiKey/Application/Services/AssignApiKeyService.ts`
- Route: `POST /api/organizations/:orgId/api-keys/:keyId/assign`

**Key rules**
- Manager 只能指派自己 org 的 key、且只能指派給同 org 的成員
- 一把 key 同時只能對應一位 member；重派會覆蓋前一個指派
- 指派後 Bifrost 的 virtual key 會跟著 rotate permissions
```

**寫 story 時的檢查**：
- ✅ As / I want to / so that 三段都有，**so that 是商業價值**（不是技術結果）
- ✅ Related 只列**一個** Service method + 對應 HTTP route（若有）
- ✅ Key rules **≤ 3 條**、寫商業規則不寫實作細節
- ❌ 不加 Given/When/Then
- ❌ 不加 story points / priority

### Step 4：在檔尾加 Coverage map

- [ ] 列出 ApiKey 模組所有 service/controller methods，每個配 story ID 或備註：

```markdown
---

## Coverage map

| Service / Controller method | Story ID | 備註 |
|---|---|---|
| CreateApiKeyService.execute | US-APIKEY-001 | Manager 建立 key |
| AssignApiKeyService.execute | US-APIKEY-003 | Manager 指派 key |
| RevokeApiKeyService.execute | US-APIKEY-005 | Manager 撤銷 key |
| SetKeyPermissionsService.execute | US-APIKEY-004 | Manager 改 key scope |
| UpdateApiKeyBudgetService.execute | US-APIKEY-006 | Manager 改 key 額度 |
| UpdateKeyLabelService.execute | US-APIKEY-002 | Manager 改 key label |
| ListApiKeysService.execute | US-APIKEY-007, US-APIKEY-008 | Manager/Member 分別列出 |
| ApiKeyController.* | — | 全部路由由 Controller 轉呼叫 Service |
| SumQuotaAllocatedForOrgService | — | 內部聚合，被 Contract/Credit 呼叫，無獨立 user 旅程 |
```

**原則**：**允許 —**，但必須有備註。漏列才是 bug。

### Step 5：寫 `docs/draupnir/specs/user-stories-index.md`（骨架 + ApiKey 內容）

- [ ] 建立檔案，放三張表的 header 與 ApiKey 該列的資料，其他 row 留 `<!-- TODO(stage-X.Y) -->` 標記。

```markdown
# Draupnir User Stories 索引

> 本索引提供三種檢視：依模組、依 Actor、依業務旅程（Epic）。
> **對標代碼日期**：2026-04-18（commit `<sha>`）。

## 1. 依模組查找（主表）

| ID | Story | Actor | 模組 | 分區檔案 |
|---|---|---|---|---|
| US-APIKEY-001 | Manager 建立 API Key | Org Manager | ApiKey | [3-api-keys](./3-api-keys/user-stories.md#us-apikey-001) |
| ... | ... | ... | ... | ... |

<!-- TODO(task-1~7): 其他模組 -->

## 2. 依 Actor 查找

| Actor | Story IDs |
|---|---|
| Cloud Admin | <!-- TODO --> |
| Org Manager | US-APIKEY-001, US-APIKEY-002, ... |
| Org Member | US-APIKEY-007, US-APIKEY-008 |
| Bifrost Sync Job | <!-- TODO(task-4) --> |
| SDK Client | <!-- TODO(task-7) --> |

## 3. 依業務旅程（Epic）查找

| Epic | Story 序列 |
|---|---|
| API Key 生命週期 | US-APIKEY-001 → 003 → 004 → 006 → 005 |
| 額度發放到扣款 | <!-- TODO(task-3, 4) --> |
| 使用者註冊到打 API | <!-- TODO(task-1, 2, 7) --> |
```

### Step 6：本地驗證

- [ ] 開 `3-api-keys/user-stories.md`，隨機挑 2 則 story，把 Related 的檔案路徑貼到終端機用 `cat`/編輯器打開，確認**路徑正確、method 存在**。
- [ ] 檢查 Coverage map 是否列到**每一個** Application Service 和 Controller method（可用下列指令交叉比對）：

```bash
# 列出所有 service execute 方法
grep -rn "async execute(" src/Modules/ApiKey/Application/Services/

# 列出所有 controller public method
grep -n "async [a-z]" src/Modules/ApiKey/Presentation/Controllers/ApiKeyController.ts
```

Expected：輸出的每個 method 都應出現在 Coverage map 左欄。

### Step 7：Commit

- [ ] 把三個新檔加入 staging：

```bash
git add docs/draupnir/specs/personas.md
git add docs/draupnir/specs/user-stories-index.md
git add docs/draupnir/specs/3-api-keys/user-stories.md
```

- [ ] Commit：

```bash
git commit -m "$(cat <<'EOF'
docs: [spec] 新增 User Story pilot — ApiKey 模組 + 主 persona + 索引骨架

Stage 0 pilot：為 SA onboarding 補上 ApiKey 模組 user-stories、
personas（Admin/Manager/Member 三張主卡）、跨模組索引骨架。
其他模組、Bifrost Sync / SDK Client persona 留後續批次滾動展開。

- docs/draupnir/specs/personas.md: 3 張主 persona
- docs/draupnir/specs/user-stories-index.md: 三表索引（主表/Actor/Epic）
- docs/draupnir/specs/3-api-keys/user-stories.md: 8~12 則 ApiKey story + Coverage map

Ref: docs/superpowers/specs/2026-04-18-user-stories-backfill-design.md
EOF
)"
```

### Step 8：🛑 Pilot Gate — 等使用者審閱

- [ ] **停下來，請使用者審閱 Pilot 成果。**

回報給使用者的訊息（範本）：

> Pilot 完成、commit 了 `<sha>`。請審閱：
> 1. Story 模板是否需要調整？（欄位、寫法、Key rules 顆粒度）
> 2. Persona 的「不關切」欄位有用嗎？
> 3. Coverage map 允許 `—` 並附備註，這樣夠清楚嗎？
> 4. 索引骨架的三張表（模組/Actor/Epic）你覺得夠用嗎？
>
> 若要改，**只在 ApiKey 這一份**改定案，再進 Task 1。確認 OK 我就繼續。

若使用者回饋要改：
- [ ] 在 ApiKey `user-stories.md` + `personas.md` + `user-stories-index.md` 三份檔案執行修改
- [ ] 修改後 commit：`docs: [spec] 調整 Pilot 模板依 review feedback`
- [ ] 再次回報等待確認

若使用者 OK：進入 Task 1。

---

## Task 1：Auth + Profile

**目的**：補認證與個人檔案兩個模組的 story，加入主索引。

**Files:**
- Create: `docs/draupnir/specs/1-authentication/user-stories.md`
- Modify: `docs/draupnir/specs/user-stories-index.md`

### Step 1：掃描入口

- [ ] 執行下列指令、列出候選 story：

```bash
ls src/Modules/Auth/Application/Services/
ls src/Modules/Auth/Presentation/Controllers/
ls src/Modules/Profile/Application/Services/
ls src/Modules/Profile/Presentation/Controllers/
```

- [ ] 草擬 **~10 則** story 候選。必須覆蓋：
  - 使用者註冊（email/password + Google OAuth 若存在）
  - 使用者登入
  - 使用者登出
  - 忘記密碼流程（request reset → confirm）
  - 改密碼
  - Email 驗證流程
  - 取得 / 更新個人資料
  - 切換語系偏好
  - 登入 token 失效 / rotate 的場景（例如建立 org 後 rotate — 參照 commit `8ef1e97`）

### Step 2：寫 `docs/draupnir/specs/1-authentication/user-stories.md`

- [ ] 建立檔案、套用與 Task 0 Step 3 相同的 header 格式（staleness 警告、範圍說明）
- [ ] 寫 ~10 則 story，ID 用 `US-AUTH-NNN`（Profile 模組共用此 prefix；若 story 數差距大可分 `US-PROFILE-NNN`）
- [ ] 寫 Coverage map，覆蓋 Auth + Profile 所有 service / controller method

### Step 3：更新索引

- [ ] 編輯 `docs/draupnir/specs/user-stories-index.md`：
  - 主表插入 AUTH/PROFILE 的 story 列（ID 字典順序）
  - Actor 表更新（Cloud Admin 跨 org 管理員、使用者自己 = Org Manager/Member 共用 login 流程）
  - Epic 表更新「使用者註冊到打 API」epic 的前段：`US-AUTH-001 → AUTH-003 → ORG-001 ...`（ORG 部分 Task 2 才補）

### Step 4：本地驗證

- [ ] 隨機挑 2 則 story 檢查代碼路徑是否存在
- [ ] 用 grep 交叉比對 Coverage map：

```bash
grep -rn "async execute(" src/Modules/Auth/Application/Services/
grep -rn "async execute(" src/Modules/Profile/Application/Services/
```

Expected：每個 method 在 Coverage map 都有列。

### Step 5：Commit

```bash
git add docs/draupnir/specs/1-authentication/user-stories.md
git add docs/draupnir/specs/user-stories-index.md
git commit -m "docs: [spec] 新增 Auth + Profile user stories"
```

### Step 6：🛑 回報

- [ ] 告訴使用者 Task 1 完成、等下一步確認。

---

## Task 2：Organization

**Files:**
- Create: `docs/draupnir/specs/2-user-organization/user-stories.md`
- Modify: `docs/draupnir/specs/user-stories-index.md`

### Step 1：掃描入口

- [ ] 執行：

```bash
ls src/Modules/Organization/Application/Services/
ls src/Modules/Organization/Presentation/Controllers/
```

- [ ] 草擬 **~8 則** story 候選。必須覆蓋：
  - Cloud Admin 建立 org（provisioning，含 Bifrost Team 綁定）
  - Org Manager 邀請 member
  - Member 接受邀請 / 拒絕邀請
  - Member 離開 org
  - Manager 移除 member
  - Manager 變更 member 角色
  - 查看 org 詳細
  - 列出 org 成員

### Step 2：寫 `user-stories.md`

- [ ] 建立檔案、套用 header
- [ ] 寫 ~8 則 story，ID `US-ORG-NNN`
- [ ] 寫 Coverage map

### Step 3：更新索引

- [ ] 主表、Actor 表、Epic 表三張都要更新
- [ ] Epic「使用者註冊到打 API」此刻可以連接到 `US-AUTH-... → US-ORG-001 → US-ORG-002 → ...`（後段 ApiKey 已存在）

### Step 4：驗證 + Commit

```bash
grep -rn "async execute(" src/Modules/Organization/Application/Services/
```

```bash
git add docs/draupnir/specs/2-user-organization/user-stories.md
git add docs/draupnir/specs/user-stories-index.md
git commit -m "docs: [spec] 新增 Organization user stories"
```

### Step 5：🛑 回報

---

## Task 3：Contract + Credit

**Files:**
- Create: `docs/draupnir/specs/4-credit-billing/user-stories.md`
- Modify: `docs/draupnir/specs/user-stories-index.md`

### Step 1：掃描入口

```bash
ls src/Modules/Contract/Application/Services/
ls src/Modules/Contract/Presentation/Controllers/
ls src/Modules/Credit/Application/Services/
ls src/Modules/Credit/Presentation/Controllers/
```

- [ ] 草擬 **~12 則** story。必須覆蓋：
  - Cloud Admin 建立 / 調整 contract（合約上限）
  - Cloud Admin 調降 contract（先吸未分配再按比例縮 — 參照 `docs/draupnir/specs/2026-04-16-contract-quota-allocation-spec.md`）
  - Manager 依 slack 重配 key 額度
  - Cloud Admin 手動為 org 加值 credit
  - Cloud Admin 手動扣除 credit
  - Member / Manager 查看 org credit 餘額
  - 系統扣款（Bifrost sync 後扣 credit）
  - 餘額不足自動凍結 key（`HandleBalanceDepletedService`）
  - 充值後自動解凍（`HandleCreditToppedUpService`）
  - 合約到期處理（`HandleContractExpiryService`）
  - Contract 硬擋（quota 分配超出 contract 上限時）
  - Credit transaction 歷史查詢

### Step 2：寫 `user-stories.md`

- [ ] 建立檔案、套用 header
- [ ] 寫 ~12 則 story，ID 分 `US-CONTRACT-NNN` 與 `US-CREDIT-NNN`
- [ ] **本檔後續還會併入 Dashboard/Reports/Alerts**（Task 4/5）；開檔時範圍說明寫明「本批為 Contract + Credit，Dashboard/Reports/Alerts 下批補入」
- [ ] 寫 Coverage map（本批只列 Contract + Credit）

### Step 3：更新索引

- [ ] 主表插入 CONTRACT / CREDIT
- [ ] Epic「額度發放到扣款」可以連起來：`US-CONTRACT-001 → US-CREDIT-001 → US-CREDIT-007（扣款） → US-CREDIT-008（凍結）`

### Step 4：驗證 + Commit

```bash
grep -rn "async execute(" src/Modules/Contract/Application/Services/ src/Modules/Credit/Application/Services/
```

```bash
git add docs/draupnir/specs/4-credit-billing/user-stories.md
git add docs/draupnir/specs/user-stories-index.md
git commit -m "docs: [spec] 新增 Contract + Credit user stories"
```

### Step 5：🛑 回報

---

## Task 4：Dashboard + Reports + Bifrost Sync Persona

**Files:**
- Modify: `docs/draupnir/specs/4-credit-billing/user-stories.md`（附加 Dashboard + Reports 章節）
- Modify: `docs/draupnir/specs/personas.md`（補 Bifrost Sync Job 卡）
- Modify: `docs/draupnir/specs/user-stories-index.md`

### Step 1：掃描入口

```bash
ls src/Modules/Dashboard/Application/Services/
ls src/Modules/Dashboard/Presentation/Controllers/
ls src/Modules/Reports/Application/Services/
ls src/Modules/Reports/Presentation/Controllers/
```

- [ ] 草擬 **~10 則** story。必須覆蓋：
  - Manager / Member 看 Dashboard 摘要（`GetDashboardSummaryService`）
  - 看 KPI（`GetKpiSummaryService`）
  - 看 usage chart（時間序列）
  - 看 per-key cost（成本分解）
  - 看模型比較
  - 看 cost trends
  - **Bifrost Sync Job** cron 拉 logs 寫 `usage_records`（系統 actor）
  - Manager 設定排程 report
  - 系統發送 report email（`SendReportEmailService`）
  - Manager 查看歷史 reports

### Step 2：附加到 `4-credit-billing/user-stories.md`

- [ ] 在檔案既有內容後附加 Dashboard + Reports 章節：

```markdown
---

## Dashboard 與 Reports

（Task 4 補入）

### US-DASHBOARD-001 | ...
...
```

- [ ] **Coverage map 要合併更新**（所有 Contract/Credit/Dashboard/Reports methods 都在同一張 Coverage map）

### Step 3：補 Bifrost Sync Job persona 卡

- [ ] 開 `docs/draupnir/specs/personas.md`，把 `<!-- TODO(stage-1.4): Bifrost Sync Job -->` 替換成完整卡片：

```markdown
## 🤖 Bifrost Sync Job

**是誰**
定時 cron 任務（預設 `*/5 * * * *`），由 Scheduler 觸發，代表「系統自己」執行的背景工作。

**關切的事**
- 從 Bifrost Gateway 拉取最新的 usage logs
- 寫入 `usage_records`、推進 `sync_cursors`
- 失敗的 log 寫入 `quarantined_logs`、不影響 cursor 前進

**不關切**
- 使用者請求路徑（非 user-facing）
- 業務規則驗證（log 來什麼拉什麼）

**會碰到哪些模組**
Dashboard（BifrostSyncService）、Credit（扣款事件消費）

**代表性 Story**
US-DASHBOARD-007（Bifrost Sync 拉 logs）、US-CREDIT-007（log → credit 扣款）
```

### Step 4：更新索引

- [ ] 主表插入 DASHBOARD / REPORTS
- [ ] Actor 表更新 Bifrost Sync Job 列
- [ ] Epic「額度發放到扣款」加入尾段：`... → US-DASHBOARD-007（Bifrost Sync） → US-CREDIT-007`

### Step 5：驗證 + Commit

```bash
grep -rn "async execute(" src/Modules/Dashboard/Application/Services/ src/Modules/Reports/Application/Services/
```

```bash
git add docs/draupnir/specs/4-credit-billing/user-stories.md
git add docs/draupnir/specs/personas.md
git add docs/draupnir/specs/user-stories-index.md
git commit -m "docs: [spec] 新增 Dashboard + Reports user stories 與 Bifrost Sync persona"
```

### Step 6：🛑 回報

---

## Task 5：Alerts

**Files:**
- Modify: `docs/draupnir/specs/4-credit-billing/user-stories.md`（再附加 Alerts 章節）
- Modify: `docs/draupnir/specs/user-stories-index.md`

### Step 1：掃描入口

```bash
ls src/Modules/Alerts/Application/Services/
ls src/Modules/Alerts/Presentation/Controllers/
```

- [ ] 草擬 **~5 則** story。必須覆蓋：
  - Manager / Admin 設定 alert config（條件、收件人）
  - 列出 alert configs
  - 修改 / 刪除 alert config
  - 系統觸發 alert event（例：餘額 < 閾值）
  - 系統送出 alert delivery（email / webhook）

### Step 2：附加到 `4-credit-billing/user-stories.md`

- [ ] 在檔案末尾加 Alerts 章節（合併到同一份 user-stories.md）
- [ ] Coverage map 再度合併更新（加入 Alerts methods）

**檢查**：若檔案此時長度 > 400 行，考慮建議後續 Task 拆為獨立 `alerts/user-stories.md`（這次先維持一份）。

### Step 3：更新索引

- [ ] 主表插入 ALERTS
- [ ] Epic 表可考慮加新 epic「告警生命週期」：`US-ALERTS-001 → ALERTS-004 → ALERTS-005`

### Step 4：驗證 + Commit

```bash
grep -rn "async execute(" src/Modules/Alerts/Application/Services/
```

```bash
git add docs/draupnir/specs/4-credit-billing/user-stories.md
git add docs/draupnir/specs/user-stories-index.md
git commit -m "docs: [spec] 新增 Alerts user stories"
```

### Step 5：🛑 回報 — Stage 1 全部完成

告訴使用者：**Stage 1 五批完成**，主幹模組（Auth/Profile/Organization/Contract/Credit/Dashboard/Reports/Alerts）user story 覆蓋率已達成。準備進 Stage 2（AppApiKey / SdkApi 等週邊整合）。

---

## Task 6：AppApiKey + AppModule

**Files:**
- Modify: `docs/draupnir/specs/3-api-keys/user-stories.md`（附加 AppApiKey + AppModule 章節）
- Modify: `docs/draupnir/specs/user-stories-index.md`

### Step 1：掃描入口

```bash
ls src/Modules/AppApiKey/Application/Services/
ls src/Modules/AppApiKey/Presentation/Controllers/
ls src/Modules/AppModule/Application/Services/
ls src/Modules/AppModule/Presentation/Controllers/
```

- [ ] 草擬 **~8 則** story。焦點：AppApiKey（應用層級 key）與 AppModule（模組訂閱）的關係。必須覆蓋：
  - Cloud Admin 建立 application（app）
  - Cloud Admin 為 app 發 app-key（system-level key）
  - 列出 app 的 modules
  - Org 訂閱 module（`module_subscriptions`）
  - 取消訂閱
  - App 驗證請求來源
  - App-key 生命週期（撤銷、rotate）

### Step 2：附加到 `3-api-keys/user-stories.md`

- [ ] 在既有 ApiKey 章節後加 AppApiKey + AppModule 章節
- [ ] Coverage map 合併更新

### Step 3：更新索引

- [ ] 主表插入 APPKEY / APPMODULE

### Step 4：驗證 + Commit

```bash
grep -rn "async execute(" src/Modules/AppApiKey/Application/Services/ src/Modules/AppModule/Application/Services/
```

```bash
git add docs/draupnir/specs/3-api-keys/user-stories.md
git add docs/draupnir/specs/user-stories-index.md
git commit -m "docs: [spec] 新增 AppApiKey + AppModule user stories"
```

### Step 5：🛑 回報

---

## Task 7：SdkApi + CliApi + DevPortal + SDK Client Persona + 新分區

**Files:**
- Create: `docs/draupnir/specs/7-developer-api/README.md`
- Create: `docs/draupnir/specs/7-developer-api/user-stories.md`
- Modify: `docs/draupnir/specs/personas.md`（補 SDK Client 卡）
- Modify: `docs/draupnir/specs/user-stories-index.md`

### Step 1：建立新分區 `7-developer-api/README.md`

- [ ] 內容：

```markdown
# 7. 開發者 API 分區

本分區覆蓋**面向外部開發者**的 API 層：
- **SdkApi** — 代理 AI 請求至 Bifrost（`POST /v1/chat/completions` 等）
- **CliApi** — CLI 客戶端專用代理（含 Claude Code / Codex 流程）
- **DevPortal** — 開發者入口頁、文件、金鑰自助管理

詳細規格（若存在）與 User Stories：

- **User Stories** — [`user-stories.md`](./user-stories.md)

---

## 相關模組

| 模組 | 角色 |
|---|---|
| SdkApi | OpenAI/Anthropic 相容 API proxy |
| CliApi | CLI 專用 proxy |
| DevPortal | 開發者入口 UI |
```

### Step 2：掃描入口

```bash
ls src/Modules/SdkApi/Application/Services/ src/Modules/SdkApi/Application/UseCases/
ls src/Modules/SdkApi/Presentation/Controllers/
ls src/Modules/CliApi/Application/Services/
ls src/Modules/CliApi/Presentation/Controllers/
ls src/Modules/DevPortal/Application/Services/
ls src/Modules/DevPortal/Presentation/Controllers/
```

- [ ] 草擬 **~8 則** story：
  - **SDK Client** 以 Draupnir key 打 chat completion 請求
  - SDK Client 打 embedding
  - SDK Client 遇到餘額不足 → 收到清楚錯誤
  - SDK Client 的 key 被 revoke → 收到錯誤
  - CLI Client 啟動代理（ProxyCliRequestService）
  - Member 在 DevPortal 頁面查看 / copy key
  - Member 在 DevPortal 列出自己的 key（connect with Task 0 的 US-APIKEY-008）
  - 開發者下載 SDK / 讀文件（若 DevPortal 提供）

### Step 3：寫 `7-developer-api/user-stories.md`

- [ ] 套用 header
- [ ] 寫 ~8 則 story，ID 分 `US-SDK-NNN`、`US-CLI-NNN`、`US-DEV-NNN`
- [ ] Coverage map

### Step 4：補 SDK Client persona 卡

- [ ] 把 `<!-- TODO(stage-2.2): SDK Client -->` 替換為完整卡：

```markdown
## 🔌 SDK Client

**是誰**
外部程式（客戶的系統、CLI 工具、Claude Code / Codex 等），拿著 Draupnir 發的 API key，透過 Draupnir SdkApi / CliApi 呼叫 AI 模型。

**關切的事**
- 能用 OpenAI / Anthropic 相容格式發 request
- 取得正確的 AI 回應
- 遇到錯誤（餘額不足、key revoked、rate limit）能收到清楚訊息

**不關切**
- 背後的 Bifrost 細節、usage sync 流程
- 額度扣款的計算邏輯

**會碰到哪些模組**
SdkApi、CliApi

**代表性 Story**
US-SDK-001（打 chat completion）、US-SDK-003（餘額不足錯誤）、US-CLI-001（啟動 CLI proxy）
```

### Step 5：更新索引

- [ ] 主表插入 SDK / CLI / DEV
- [ ] Actor 表更新 SDK Client 列
- [ ] Epic「使用者註冊到打 API」完成尾段：`... → US-APIKEY-001 → US-SDK-001`

### Step 6：驗證 + Commit

```bash
grep -rn "async execute(" src/Modules/SdkApi/Application/ src/Modules/CliApi/Application/ src/Modules/DevPortal/Application/
```

```bash
git add docs/draupnir/specs/7-developer-api/
git add docs/draupnir/specs/personas.md
git add docs/draupnir/specs/user-stories-index.md
git commit -m "docs: [spec] 新增 SdkApi/CliApi/DevPortal user stories 與 SDK Client persona"
```

### Step 7：🛑 回報

---

## Task 8：PR Template + README 導覽更新

**目的**：收尾——讓維護機制生效、把新分區接到總 README。

**Files:**
- Create: `.github/PULL_REQUEST_TEMPLATE.md`
- Modify: `docs/draupnir/specs/README.md`

### Step 1：新建 `.github/PULL_REQUEST_TEMPLATE.md`

- [ ] 內容（從頭建立，目前檔案不存在）：

```markdown
## 變更摘要

<!-- 簡述本 PR 做了什麼、為什麼 -->

## 變更類型

- [ ] 新功能 (feat)
- [ ] 修 bug (fix)
- [ ] 重構 (refactor)
- [ ] 文件 (docs)
- [ ] 測試 (test)
- [ ] 其他

## Checklist

- [ ] 測試通過（`bun test`）
- [ ] 類型檢查通過（`bun run typecheck`）
- [ ] Lint 通過（`bun run lint`）
- [ ] 若本次**新增 Controller / Service 入口**，或**改變某個 User Story 的關鍵規則**，已更新對應模組的 `docs/draupnir/specs/**/user-stories.md`
- [ ] 若涉及 UI 變更，有執行視覺驗證（截圖 / 錄影）

## 相關 Issues / Stories

<!-- 例：Closes #123、Ref US-APIKEY-003 -->
```

### Step 2：更新 `docs/draupnir/specs/README.md`

- [ ] 在「📋 目錄結構」底下加一段 §7：

```markdown
### [7. 開發者 API](./7-developer-api/)
**面向外部開發者的 API 層（SDK / CLI / DevPortal）**

- SdkApi、CliApi、DevPortal 模組的 User Stories
- **相關模組**：SdkApi、CliApi、DevPortal

```

- [ ] 在「🗂️ 模組對應表」加一列：

```markdown
| 7. 開發者 API | SdkApi, CliApi, DevPortal | ✅ 完成 | [7-developer-api](./7-developer-api/) |
```

- [ ] 在最上方（「📋 目錄結構」之前）加一段 User Stories 專屬導覽：

```markdown
## 🎭 User Stories

**新人 onboarding 首先讀這個**：
- [**Personas**](./personas.md) — 五類使用者 / 非人類 actor 的人物卡
- [**User Stories 索引**](./user-stories-index.md) — 三張表檢視（依模組 / 依 Actor / 依 Epic）
- 各模組 Story 位於該分區 `user-stories.md`（例：[3-api-keys/user-stories.md](./3-api-keys/user-stories.md)）
```

### Step 3：Commit

```bash
git add .github/PULL_REQUEST_TEMPLATE.md
git add docs/draupnir/specs/README.md
git commit -m "docs: [spec] 加入 PR template 與 User Stories 總導覽"
```

### Step 4：🛑 全部完成 — 最終回報

告訴使用者：
- 全部 Stage 0 / 1 / 2 完成
- 預估 ~60~80 story 覆蓋 14 個模組
- 新人可從 `docs/draupnir/specs/README.md` 的 User Stories 區進入
- 維護機制：staleness 警告（每檔檔頭）+ PR checklist

建議下一步：找一位**未參與本次 SA 補足**的同事試讀，看是否達成 § 1 的 success criteria 三題測試。

---

## Self-Review

**Spec 覆蓋對照**：
| Spec 章節 | 對應 Task |
|---|---|
| §1 目標與成功條件 | Task 0 Step 8 回報、Task 8 Step 4 |
| §2 Story Template | Task 0 Step 3（定義）、Task 1~7 Step 2（每次套用） |
| §3 資料夾結構 | Task 0（核心）、Task 7 Step 1（新增 7-developer-api）、Task 8 Step 2（更新 README）|
| §4 Personas | Task 0 Step 2（主 3 張）、Task 4 Step 3（Bifrost）、Task 7 Step 4（SDK Client）|
| §5 Pilot + Stage 1 + Stage 2 | Task 0~7 分別實作 |
| §6 Coverage map + Staleness + PR checklist | 每 Task Step 4 加 Coverage、Task 0/1/3/7 header 加 staleness、Task 8 Step 1 加 PR checklist |
| §7 已知風險 | Task 0 Step 8 的 Pilot Gate 是最大緩解點 |

**一致性檢查**：
- ✅ 所有 story ID 規則一致（`US-<MODULE>-NNN`）
- ✅ 所有新檔 header 格式一致（staleness 警告 + 範圍說明）
- ✅ 所有 Coverage map 欄位一致（method / story ID / 備註）
- ✅ 所有 Task commit 訊息前綴一致（`docs: [spec]`）
- ✅ Persona 卡片五欄位一致（是誰 / 關切 / 不關切 / 會碰模組 / 代表 Story）
