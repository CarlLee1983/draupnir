# 合約與額度使用者故事（Contract + Credit）

> 本文件對標代碼日期：2026-04-18（commit `9da786f`）。
> 若你看到的代碼與此文件明顯不一致，請提 issue 或直接 PR 修正。

## 範圍

- 本檔覆蓋（本批 Task 3）：**Contract 模組** + **Credit 模組**
- **下批補**（Task 4）：Dashboard + Reports（本檔會附加章節）
- **再下批補**（Task 5）：Alerts（本檔會再附加章節）
- 計畫刻意把這四個模組放同一份檔——它們共同構成「額度發放 → 使用 → 監控 → 告警」的商業閉環

## 相關 personas

閱讀前請先看 [../personas.md](../personas.md)：
- **Cloud Admin** — 建合約、調 quota、手動加值 / 退款
- **Org Manager / Org Member** — 只能讀自己 org 的餘額 / 交易歷史
- **System（自動化）** — 扣款、凍結 / 解凍 key、處理合約到期

---

## Contract

### US-CONTRACT-001 | Cloud Admin 建立新 Contract

**As** a Cloud Admin
**I want to** create a new contract with a quota cap, validity window, and target binding
**so that** an org has a formal spending envelope before they can allocate budgets to API keys.

**Related**
- Module: `src/Modules/Contract`
- Entry: `CreateContractService.execute()` → `src/Modules/Contract/Application/Services/CreateContractService.ts`
- Controller: `ContractController.create()` → `src/Modules/Contract/Presentation/Controllers/ContractController.ts`
- Routes：`POST /api/contracts`（REST admin）、`POST /admin/contracts`（Admin Portal Inertia）

**Key rules**
- 只有 Cloud Admin 可建立 Contract（route 強制 `createRoleMiddleware('admin')`）
- Contract 有 `target_type / target_id`（目前主要綁 `org`）、`quota_cap`、生效期間；建立時為 `pending` 狀態，需另外 activate
- Quota cap 即 org 所有 API key 的 `quotaAllocated` 總和上限，硬擋（見 US-CONTRACT-004）

---

### US-CONTRACT-002 | Cloud Admin 啟用 / 修改 / 續約 / 終止 Contract

**As** a Cloud Admin
**I want to** activate, update, renew, and terminate a contract through its lifecycle
**so that** I can reflect the customer's billing changes without creating new contracts for every tweak.

**Related**
- Module: `src/Modules/Contract`
- Entries：
  - `ActivateContractService.execute()` → `src/Modules/Contract/Application/Services/ActivateContractService.ts`
  - `UpdateContractService.execute()` → 同目錄
  - `RenewContractService.execute()` → 同目錄
  - `TerminateContractService.execute()` → 同目錄
  - `GetContractDetailService.execute()`（讀取詳細） → 同目錄
- Controller: `ContractController.activate()` / `update()` / `renew()` / `terminate()` / `getDetail()`
- Routes：
  - REST（全部 admin）：`POST /api/contracts/:contractId/activate`、`PUT /api/contracts/:contractId`、`POST /api/contracts/:contractId/renew`、`POST /api/contracts/:contractId/terminate`、`GET /api/contracts/:contractId`
  - Admin Portal：`GET /admin/contracts/:id`（詳細頁）、`POST /admin/contracts/:id/action`（lifecycle 動作）

**Key rules**
- Activate：將 `pending` contract 轉為 `active`；同一 org 同一時間允許多張 active contract 的規則在合約設計中已定義（見 [credit-system-design.md](./credit-system-design.md)）
- Renew：延長 `end_date`，可選更新 `quota_cap`；舊 contract 不會消失——保留做歷史
- Terminate：提前結束合約；發 `ContractTerminated` 領域事件供下游清理
- Update：一般欄位（描述、metadata）；變更 `quota_cap` 的專用路徑走 US-CONTRACT-004

---

### US-CONTRACT-003 | Cloud Admin 將 Contract 指派給 Org

**As** a Cloud Admin
**I want to** bind an existing contract to a specific organization (or re-target it if created without a target)
**so that** the quota and validity apply to the right customer.

**Related**
- Module: `src/Modules/Contract`
- Entry: `AssignContractService.execute()` → `src/Modules/Contract/Application/Services/AssignContractService.ts`
- Controller: `ContractController.assign()`
- Route: `POST /api/contracts/:contractId/assign`

**Key rules**
- 僅 admin 可指派；指派後 contract 的 `target_type = 'org'`、`target_id = orgId`
- 已指派的 contract 再指派會視規則允許或拒絕（避免 org 之間額度錯置）

---

### US-CONTRACT-004 | Cloud Admin 調整 Contract 的 Quota Cap（含按比例縮減）

**As** a Cloud Admin
**I want to** raise or lower a contract's `quota_cap` with a safe reshuffle of downstream key budgets
**so that** if I lower the cap below the current total allocation, keys shrink proportionally instead of blocking the change.

**Related**
- Module: `src/Modules/Contract`
- Entry: `AdjustContractQuotaService.execute()` → `src/Modules/Contract/Application/Services/AdjustContractQuotaService.ts`
- Admin Portal Page: `AdminContractDetailPage` → `src/Website/Admin/Pages/AdminContractDetailPage.ts`
- Route：`POST /admin/contracts/:id/quota`（Admin Portal Inertia）
- 延伸設計：[contract-quota-allocation-spec.md](../2026-04-16-contract-quota-allocation-spec.md) §5.3

**Key rules**
- `newCap >= sumAllocated`：只改 contract 上限、不動 key
- `newCap < sumAllocated`：按比例縮各 key 的 `quotaAllocated`，最後一把 key 補尾差確保 Σ = newCap
- 縮減中觸及底限（key quota = 0）的視為「硬擋」——該 key 會回報在 `hardBlockedKeyIds`、之後發的請求額度耗盡
- 呼叫者必須是 admin，非 admin 直接回 `FORBIDDEN`

---

### US-CONTRACT-005 | 系統定期處理 Contract 到期 / 即將到期

**As** the Draupnir system (cron job)
**I want to** notify orgs whose contracts expire within 7 days and mark contracts that have already expired
**so that** customers get advance warning and expired contracts stop granting quota.

**Related**
- Module: `src/Modules/Contract`
- Entry: `HandleContractExpiryService.execute()` → `src/Modules/Contract/Application/Services/HandleContractExpiryService.ts`
- Controller: `ContractController.handleExpiry()`
- Route: `POST /api/contracts/handle-expiry`（REST admin；由外部 scheduler 呼叫）

**Key rules**
- 一次掃兩類：7 天內到期的 `ContractExpiring`，與已到期的 `ContractExpired`
- 對前者只 dispatch 事件（交給 Alerts 模組發通知），不改 contract 狀態
- 對後者把 contract 標成 `expired` 並 dispatch 事件；下游（Credit / ApiKey）可消費事件做清理
- 手動觸發 `POST /api/contracts/handle-expiry` 主要用於測試或補救；production 由 scheduler 執行

---

### US-CONTRACT-006 | Cloud Admin / Manager 查看 Contract 列表與詳細

**As** a Cloud Admin (or Org Manager reading own orgs)
**I want to** list contracts (all orgs for admin, own org for manager) and drill into contract details
**so that** I can audit quota usage and customer billing state.

**Related**
- Module: `src/Modules/Contract`
- Entries：
  - `ListAdminContractsService.execute()`（admin：跨 org）→ `src/Modules/Contract/Application/Services/ListAdminContractsService.ts`
  - `ListContractsService.execute()`（org 面：自己的 contract）→ 同目錄
  - `GetContractDetailService.execute()` → 同目錄（US-CONTRACT-002 也會呼叫，共用）
- Controller: `ContractController.list()` / `getDetail()`
- Routes：
  - REST：`GET /api/contracts`（admin）、`GET /api/contracts/:contractId`（admin）
  - Admin Portal：`GET /admin/contracts`、`GET /admin/contracts/:id`
  - Manager Portal 的 contract 入口目前透過 `/member/contracts` 共用 Member 視圖（見下段 "已知缺口"）

**Key rules**
- ListAdmin：回所有 contract；ListContracts（org-scope）回該 org 擁有或指派到的
- `GetActiveOrgContractQuotaService`（內部 helper）：被 ManagerApiKeyCreatePage 等呼叫以取得「當前 active contract 的 quota_cap」，用於額度預檢（見 US-APIKEY-001 Key rules）

---

## Credit

### US-CREDIT-001 | Cloud Admin 手動為 Org 加值 / 退款 Credit

**As** a Cloud Admin
**I want to** top up an org's credit balance or record a refund (both increase the balance)
**so that** I can handle customer payments, promotional credits, and billing corrections.

**Related**
- Module: `src/Modules/Credit`
- Entries：
  - `TopUpCreditService.execute()` → `src/Modules/Credit/Application/Services/TopUpCreditService.ts`
  - `RefundCreditService.execute()` → 同目錄
- Controller: `CreditController.topUp()` / `refund()`
- Routes：
  - REST：`POST /api/organizations/:orgId/credits/topup`、`POST /api/organizations/:orgId/credits/refund`（皆 `createRoleMiddleware('admin')`）

**Key rules**
- TopUp 與 Refund 都會**增加**餘額，差異在交易類型（`TransactionType`）——用於稽核與報表分類
- 所有變動建立對應的 `CreditTransaction` 紀錄；若 `CreditAccount` 不存在會自動建立
- TopUp 成功後 dispatch `CreditToppedUp` 事件；若之前有 key 因餘額不足被凍結，`HandleCreditToppedUpService` 會自動解凍（見 US-CREDIT-006）

---

### US-CREDIT-002 | Manager / Member 查看 Org Credit 餘額

**As** an Org Manager or Member
**I want to** see my org's current credit balance
**so that** I know whether the org still has room to spend and when to request a top-up.

**Related**
- Module: `src/Modules/Credit`
- Entry: `GetBalanceService.execute()` → `src/Modules/Credit/Application/Services/GetBalanceService.ts`
- Controller: `CreditController.getBalance()`
- Route: `GET /api/organizations/:orgId/credits/balance`（`requireAuth` + `createModuleAccessMiddleware('credit')`）

**Key rules**
- 呼叫者須是該 org 的 member（透過 module access middleware 檢查 org 成員身份）
- 若 org 還沒有 `CreditAccount`，回預設 `balance = 0`
- 回傳的餘額字串保留精度（Balance value object 以字串表達避免浮點精度丟失）

---

### US-CREDIT-003 | Manager / Member 查看 Credit 交易歷史

**As** an Org Manager or Member
**I want to** list the recent credit transactions (top-ups, refunds, deductions)
**so that** I can reconcile spending, audit deductions, and answer colleagues' questions about changes.

**Related**
- Module: `src/Modules/Credit`
- Entry: `GetTransactionHistoryService.execute()` → `src/Modules/Credit/Application/Services/GetTransactionHistoryService.ts`
- Controller: `CreditController.getTransactions()`
- Route: `GET /api/organizations/:orgId/credits/transactions`

**Key rules**
- 同樣需 org 成員身份；非成員拒
- 支援 pagination（page、limit）；預設由新到舊排序
- 同一筆交易可透過 `referenceType / referenceId` 串回 ApiKey、Bifrost sync log 等來源

---

### US-CREDIT-004 | 系統依 Bifrost Sync 結果扣款

**As** the Draupnir system (on behalf of incoming usage records)
**I want to** deduct credit from an org's balance whenever a usage record is ingested
**so that** the org's remaining balance always reflects actual spending on AI calls.

**Related**
- Module: `src/Modules/Credit`
- Entry: `DeductCreditService.execute()` → `src/Modules/Credit/Application/Services/DeductCreditService.ts`
- 呼叫端：Dashboard 模組（Bifrost Sync 路徑）——詳細交接屬 Task 4 的 US-DASHBOARD-xxx
- Route: 無獨立 REST 入口；純事件觸發 / 內部呼叫

**Key rules**
- 扣款必扣足量（`applyDeduction`）；若扣到 0 或負值，dispatch `BalanceDepleted` 事件觸發 key 凍結（見 US-CREDIT-005）
- 扣款同樣建 `CreditTransaction`，`referenceType` 指向來源（通常是 `usage_record`、`referenceId` 是該筆 usage 的 id）
- 連續扣款必須保持交易原子性（DB transaction）——避免半扣款狀態

---

### US-CREDIT-005 | 系統在餘額用完時自動凍結 Org 的 Active Keys

**As** the Draupnir system (reacting to `BalanceDepleted` event)
**I want to** immediately reduce every active API key's rate limit to 0 via Bifrost
**so that** no further spending happens once the org runs out of credit.

**Related**
- Module: `src/Modules/Credit`
- Entry: `HandleBalanceDepletedService.execute(orgId)` → `src/Modules/Credit/Application/Services/HandleBalanceDepletedService.ts`
- 觸發：`BalanceDepleted` domain event
- 下游：`ILLMGatewayClient.updateKey()`（把 Bifrost virtual key rate limit 設為 0）

**Key rules**
- 找出 org 下所有 `active` 狀態的 key，逐一 suspend（標註原因 `CREDIT_DEPLETED`，保存 pre-freeze rate limit 以便解凍時還原）
- 單把 key 失敗（Bifrost 不回、更新失敗）不中斷流程，計入 `failed`、繼續其他 key
- 回傳 `{ processed, failed }` 供 caller / 運維觀察整體成功率

---

### US-CREDIT-006 | 系統在充值後自動解凍被凍結的 Keys

**As** the Draupnir system (reacting to `CreditToppedUp` event)
**I want to** restore rate limits on keys that were previously frozen due to depleted credit
**so that** once the org tops up, their keys immediately regain service without manual re-enable.

**Related**
- Module: `src/Modules/Credit`
- Entry: `HandleCreditToppedUpService.execute(orgId)` → `src/Modules/Credit/Application/Services/HandleCreditToppedUpService.ts`
- 觸發：`CreditToppedUp` domain event（由 TopUpCreditService 發出）
- 下游：`ILLMGatewayClient.updateKey()`（恢復 rate limit 到凍結前值）

**Key rules**
- 只解凍 `status = suspended` 且 `suspendReason = CREDIT_DEPLETED` 的 key；其他 suspend 原因（人工 revoke 等）不碰
- 還原時使用凍結前記錄的 `preFreezeRateLimit`；若 pre-freeze 為 `null`（之前沒設限），用預設值補
- Suspend 與 resume 是對稱動作，中間 pre-freeze 狀態存在 key entity 上

---

## Coverage map

### Contract 模組 Application Services

| Service method | Story ID | 備註 |
|---|---|---|
| `CreateContractService.execute` | US-CONTRACT-001 | 建立 |
| `UpdateContractService.execute` | US-CONTRACT-002 | 修改欄位 |
| `ActivateContractService.execute` | US-CONTRACT-002 | 啟用 |
| `TerminateContractService.execute` | US-CONTRACT-002 | 終止 |
| `RenewContractService.execute` | US-CONTRACT-002 | 續約 |
| `AssignContractService.execute` | US-CONTRACT-003 | 指派給 org |
| `AdjustContractQuotaService.execute` | US-CONTRACT-004 | 調整 quota_cap（含按比例縮減）|
| `HandleContractExpiryService.execute` | US-CONTRACT-005 | 到期處理（cron）|
| `ListAdminContractsService.execute` | US-CONTRACT-006 | Admin 列所有 |
| `ListContractsService.execute` | US-CONTRACT-006 | Org 列自己的 |
| `GetContractDetailService.execute` | US-CONTRACT-002, US-CONTRACT-006 | 詳細 |
| `GetActiveOrgContractQuotaService.execute` | — | 內部 helper：被 ApiKey 建立流程（ManagerApiKeyCreatePage）與相關 dashboard 呼叫，無獨立 user 旅程 |

### Credit 模組 Application Services

| Service method | Story ID | 備註 |
|---|---|---|
| `TopUpCreditService.execute` | US-CREDIT-001 | Admin 加值 |
| `RefundCreditService.execute` | US-CREDIT-001 | Admin 退款（亦為加回）|
| `DeductCreditService.execute` | US-CREDIT-004 | 系統扣款 |
| `GetBalanceService.execute` | US-CREDIT-002 | 讀餘額 |
| `GetTransactionHistoryService.execute` | US-CREDIT-003 | 交易歷史 |
| `HandleBalanceDepletedService.execute` | US-CREDIT-005 | 餘額用盡 → 凍結 key |
| `HandleCreditToppedUpService.execute` | US-CREDIT-006 | 充值 → 解凍 key |

### Presentation 入口

| Entry | Story ID | 備註 |
|---|---|---|
| `ContractController.create` | US-CONTRACT-001 | REST admin |
| `ContractController.activate` | US-CONTRACT-002 | REST admin |
| `ContractController.update` | US-CONTRACT-002 | REST admin |
| `ContractController.renew` | US-CONTRACT-002 | REST admin |
| `ContractController.terminate` | US-CONTRACT-002 | REST admin |
| `ContractController.getDetail` | US-CONTRACT-002, US-CONTRACT-006 | REST admin |
| `ContractController.list` | US-CONTRACT-006 | REST admin |
| `ContractController.assign` | US-CONTRACT-003 | REST admin |
| `ContractController.handleExpiry` | US-CONTRACT-005 | REST admin（cron 入口）|
| `CreditController.getBalance` | US-CREDIT-002 | REST |
| `CreditController.getTransactions` | US-CREDIT-003 | REST |
| `CreditController.topUp` | US-CREDIT-001 | REST admin |
| `CreditController.refund` | US-CREDIT-001 | REST admin |
| Admin Portal：`/admin/contracts`、`/admin/contracts/create`、`/admin/contracts/:id`、`/admin/contracts/:id/action`、`/admin/contracts/:id/quota` | US-CONTRACT-001~006 | Inertia，為 Cloud Admin 日常入口 |

### 已知覆蓋缺口

- **Manager 依 slack 重配 key 額度（slack-based reallocation）**：計畫提到的這個使用情境需要 `UpdateApiKeyBudgetService` 接上 Presentation（見 [ApiKey Coverage map](../3-api-keys/user-stories.md#coverage-map)）；目前只能刪 key 重發。Task 6 會檢視是否能擴充 ApiKey story
- **Manager 查看 org 自己的 contract 詳細**：目前 `/member/contracts` 共用 Member 視圖，沒有獨立 Manager Contract 詳細頁；待後續補強
- **手動扣除 credit（非自動、非退款）**：Admin 目前無法直接扣款餘額，只能透過重算 refund 的負向——v1 視為刻意限制
- **逾期未扣款的 backfill**：若 Bifrost sync 長時間中斷導致 usage 堆積，補扣流程沒有獨立 story；靠 Dashboard Sync（US-DASHBOARD-xxx、Task 4）重跑
