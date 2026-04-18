# API Key 使用者故事（ApiKey / AppApiKey / AppModule）

> 本文件對標代碼日期：2026-04-18（commit `f767eea`）。
> 若你看到的代碼與此文件明顯不一致，請提 issue 或直接 PR 修正。

## 範圍

- 本檔覆蓋：**ApiKey 模組**（Pilot）+ **AppApiKey 模組**（Task 6）+ **AppModule 模組**（Task 6）
- 三個模組放在同一份是因為都跟 "Key / Access 範疇" 有關——但 ApiKey 是 end-user 使用的 model call key，AppApiKey 是 application-level long-lived key，AppModule 則是功能模組訂閱與存取檢查

## 相關 personas

閱讀本頁前請先看 [../personas.md](../personas.md)：
- **Org Manager** — 發 key / 指派 / 撤銷的主角
- **Org Member** — 接收指派、使用 key 的使用者
- **Cloud Admin** — 跨 org 可見（Admin 視圖覆蓋範圍待補）

---

### US-APIKEY-001 | Manager 建立 API Key

**As** an Org Manager
**I want to** create a new API key under my organization (optionally with a per-key budget cap and assignee)
**so that** my team can access AI models through Draupnir while I control spending and attribution.

**Related**
- Module: `src/Modules/ApiKey`
- Entry: `CreateApiKeyService.execute()` → `src/Modules/ApiKey/Application/Services/CreateApiKeyService.ts`
- Manager Page: `ManagerApiKeyCreatePage.store()` → `src/Website/Manager/Pages/ManagerApiKeyCreatePage.ts`
- Route: `POST /manager/api-keys` (Inertia form post)

**Key rules**
- 建立時若給 `budgetMaxLimit`，必須同時給 `budgetResetPeriod`（`7d` 或 `30d`）；此值即為 Bifrost virtual key 的 spend cap
- 新 key 的 raw value 只在建立當下回傳一次（`newKeyValue`），之後存庫只留 hash
- Bifrost virtual key 建立失敗會觸發 Draupnir 側的 rollback（刪除本地 pending key），不留孤兒

---

### US-APIKEY-002 | Manager 修改 Key Label

**As** an Org Manager
**I want to** rename an existing API key's label
**so that** I can keep the key list readable as the team grows and purposes change.

**Related**
- Module: `src/Modules/ApiKey`
- Entry: `UpdateKeyLabelService.execute()` → `src/Modules/ApiKey/Application/Services/UpdateKeyLabelService.ts`
- Controller: `ApiKeyController.updateLabel()` → `src/Modules/ApiKey/Presentation/Controllers/ApiKeyController.ts`
- Route: `PATCH /api/keys/:keyId/label`

**Key rules**
- Manager 只能改自己 org 的 key 的 label（跨 org 操作回 `KEY_NOT_FOUND`）
- Label 只影響顯示，不影響 Bifrost 側行為；無需同步 gateway

---

### US-APIKEY-003 | Manager 指派 Key 給成員

**As** an Org Manager
**I want to** assign one of my org's API keys to a specific member (or unassign it)
**so that** usage under that key is attributed to the member and the member can see it in their portal.

**Related**
- Module: `src/Modules/ApiKey`
- Entry: `AssignApiKeyService.execute()` → `src/Modules/ApiKey/Application/Services/AssignApiKeyService.ts`
- Manager Page: `ManagerApiKeysPage.assign()` → `src/Website/Manager/Pages/ManagerApiKeysPage.ts`
- Route: `POST /manager/api-keys/:keyId/assign` (Inertia)

**Key rules**
- Manager 只能指派自己 org 的 key、且只能指派給同 org 的 member（v1 不接受指派給其他 Manager）
- 一把 key 同時只能對應一位 member；重派會覆寫前一位
- `assigneeUserId = null` 表示取消指派

---

### US-APIKEY-004 | Manager 修改 Key 的權限範圍

**As** an Org Manager
**I want to** change what models an API key can use and its rate limits (RPM / TPM)
**so that** I can tighten or relax a key's scope as the team's usage pattern evolves.

**Related**
- Module: `src/Modules/ApiKey`
- Entry: `SetKeyPermissionsService.execute()` → `src/Modules/ApiKey/Application/Services/SetKeyPermissionsService.ts`
- Controller: `ApiKeyController.setPermissions()` → `src/Modules/ApiKey/Presentation/Controllers/ApiKeyController.ts`
- Route: `PUT /api/keys/:keyId/permissions`

**Key rules**
- 改權限會即時同步到 Bifrost 的 virtual key scope（`syncPermissions`）
- `rateLimitRpm` / `rateLimitTpm` 傳 `null` 表示解除該限制
- `allowedModels` 為空陣列表示允許所有 org 合約包含的模型

---

### US-APIKEY-005 | Manager 撤銷 Key

**As** an Org Manager
**I want to** revoke an API key
**so that** I can immediately stop an exposed or unused key from incurring cost.

**Related**
- Module: `src/Modules/ApiKey`
- Entry: `RevokeApiKeyService.execute()` → `src/Modules/ApiKey/Application/Services/RevokeApiKeyService.ts`
- Manager Page: `ManagerApiKeysPage.revoke()` → `src/Website/Manager/Pages/ManagerApiKeysPage.ts`
- Controller: `ApiKeyController.revoke()` → `src/Modules/ApiKey/Presentation/Controllers/ApiKeyController.ts`
- Routes: `POST /manager/api-keys/:keyId/revoke`（Inertia）、`POST /api/keys/:keyId/revoke`（REST）

**Key rules**
- 撤銷是單向動作，不可逆（需重新建立）
- Draupnir 本地狀態改為 `revoked` 後會通知 Bifrost `deactivateVirtualKey`，之後任何帶此 key 的請求都會在 gateway 側被拒
- 撤銷僅限同 org 的 Manager；非 Manager 或跨 org 操作回權限錯誤

---

### US-APIKEY-006 | Manager 列出組織內全部 Key

**As** an Org Manager
**I want to** see every API key belonging to my organization with their status, assignee, and usage
**so that** I can audit who has access and identify unused or risky keys.

**Related**
- Module: `src/Modules/ApiKey`
- Entry: `ListApiKeysService.execute()` → `src/Modules/ApiKey/Application/Services/ListApiKeysService.ts`
- Manager Page: `ManagerApiKeysPage.handle()` → `src/Website/Manager/Pages/ManagerApiKeysPage.ts`
- Controller: `ApiKeyController.list()` → `src/Modules/ApiKey/Presentation/Controllers/ApiKeyController.ts`
- Routes: `GET /manager/api-keys`（Inertia）、`GET /api/organizations/:orgId/keys`（REST）

**Key rules**
- 呼叫者必須是該 org 的成員，否則回 `NOT_ORG_MEMBER`
- 預設 page=1、limit=20；Manager Portal 內部以 limit=100 一次抓完顯示
- 列出時 key raw value **不回傳**（只回 hash 後的顯示值 + metadata）

---

### US-APIKEY-007 | Member 列出自己持有的 Key

**As** an Org Member
**I want to** see only the API keys that have been assigned to me
**so that** I can copy the key I need and track its usage without seeing others' keys.

**Related**
- Module: `src/Modules/ApiKey`
- Entry: `ListApiKeysService.execute(..., filter: { assignedMemberId })` → `src/Modules/ApiKey/Application/Services/ListApiKeysService.ts`
- Member Page: `MemberApiKeysPage` → `src/Website/Member/Pages/MemberApiKeysPage.ts`

**Key rules**
- Member 視圖強制帶入 `assignedMemberId = callerUserId` 過濾，保證只看到指派給自己的
- 同一個 ListApiKeysService 服務被 Manager 與 Member 兩種視圖共用，差別在呼叫時是否帶 filter
- Member 看不到其他成員的 key，也看不到 revoked 狀態外的額外 admin metadata

---

### US-APIKEY-008 | 系統在 Bifrost 鏡像失敗時自動 Rollback（Edge case）

**As** the Draupnir system (on behalf of a Manager)
**I want to** automatically delete the local API key record when Bifrost virtual key creation or permission sync fails
**so that** the Manager never sees a half-created key that can't actually call models.

**Related**
- Module: `src/Modules/ApiKey`
- Entry: `CreateApiKeyService.execute()` rollback block → `src/Modules/ApiKey/Application/Services/CreateApiKeyService.ts`
- Port: `IBifrostKeySync.deleteVirtualKey()` → `src/Modules/ApiKey/Application/Ports/IBifrostKeySync.ts`

**Key rules**
- 若 Bifrost `createVirtualKey` 成功但後續 `syncPermissions` 失敗，會嘗試 `deleteVirtualKey` 做 best-effort rollback
- 若 Draupnir 本地 persist 失敗，同樣嘗試 rollback Bifrost 側的 virtual key
- Rollback 失敗不再 throw（`.catch(() => {})`）——避免把主錯誤吞掉，但會記 log 讓運維追查

---

## AppApiKey

AppApiKey 與 ApiKey 的差異：
- **ApiKey** = end-user 使用的 AI model call key，Manager 發給 Member、帶 budget、走 Bifrost
- **AppApiKey** = application-level long-lived key，由**任何 org member** 發，給內部 App（例：SDK Client、CI 流水線）使用，有 scope 與 rotation policy

### US-APPKEY-001 | Org 成員發 / 列 App-Key

**As** any Org member (with `app_api_keys` module access)
**I want to** issue a new application-level API key and list the org's existing ones
**so that** an internal application or service can authenticate to Draupnir on its own credentials.

**Related**
- Module: `src/Modules/AppApiKey`
- Entries：
  - `IssueAppKeyService.execute()` → `src/Modules/AppApiKey/Application/Services/IssueAppKeyService.ts`
  - `ListAppKeysService.execute()` → 同目錄
- Controller: `AppApiKeyController.issue()` / `list()` → `src/Modules/AppApiKey/Presentation/Controllers/AppApiKeyController.ts`
- Routes：`POST /api/organizations/:orgId/app-keys`、`GET /api/organizations/:orgId/app-keys`（皆 `requireAuth + createModuleAccessMiddleware('app_api_keys')`）

**Key rules**
- Issue 只要求 `requireOrgMembership`——**任何** org member（不限 Manager）都能發 App-Key；若要收斂請在 Presentation 端加 role middleware
- 新 key 的 rawKey 只在 issue 回應回傳一次，之後存庫只有 hash（同 ApiKey 的 pattern）
- 發 App-Key 會同步建立對應的 Bifrost virtual key（`IAppKeyBifrostSync`），失敗與 ApiKey 類似做 rollback 嘗試
- App-Key 綁定 `BoundModules`（哪些 module 可用）、`AppKeyScope`（允許的 model 等）、`KeyRotationPolicy`（多久須輪替）

---

### US-APPKEY-002 | Org 成員 Rotate / Revoke App-Key

**As** any Org member
**I want to** rotate the secret of an existing App-Key or revoke it entirely
**so that** compromised or retired keys can be replaced without service disruption (rotate) or blocked immediately (revoke).

**Related**
- Module: `src/Modules/AppApiKey`
- Entries：
  - `RotateAppKeyService.execute()` → `src/Modules/AppApiKey/Application/Services/RotateAppKeyService.ts`
  - `RevokeAppKeyService.execute()` → 同目錄
- Controller: `AppApiKeyController.rotate()` / `revoke()`
- Routes：`POST /api/app-keys/:keyId/rotate`、`POST /api/app-keys/:keyId/revoke`（皆 `requireAuth`；服務內部還會 `requireOrgMembership`）

**Key rules**
- Rotate 產生新 rawKey（**只回一次**），舊 key 隨即作廢；中間有短暫雙效期可由 rotation policy 控制（依 `KeyRotationPolicy`）
- Revoke 單向不可逆；Draupnir 標 `revoked`，Bifrost 同步停用 virtual key
- 同一 org 的成員都能 rotate / revoke 該 org 的任何 App-Key（v1 刻意簡化；若要收緊需改 service authz）

---

### US-APPKEY-003 | Org 成員修改 App-Key 的 Scope

**As** any Org member
**I want to** update the scope (allowed models, modules, rate limits) of an existing App-Key
**so that** I can narrow or widen what the app can do as requirements change.

**Related**
- Module: `src/Modules/AppApiKey`
- Entry: `SetAppKeyScopeService.execute()` → `src/Modules/AppApiKey/Application/Services/SetAppKeyScopeService.ts`
- Controller: `AppApiKeyController.setScope()`
- Route: `PUT /api/app-keys/:keyId/scope`

**Key rules**
- Scope 變更會即時同步到 Bifrost（透過 `IAppKeyBifrostSync`）
- 空或不合法的 scope 會被 `AppKeyScope` value object 拒絕在進入持久層之前
- 變更 `BoundModules` 時只能綁已登錄的 module（見 US-APPMODULE-001）

---

### US-APPKEY-004 | Org 成員查 App-Key 使用量

**As** any Org member
**I want to** see how much a specific App-Key has used (requests, tokens, cost)
**so that** I can attribute usage to the right application and spot anomalies.

**Related**
- Module: `src/Modules/AppApiKey`
- Entry: `GetAppKeyUsageService.execute()` → `src/Modules/AppApiKey/Application/Services/GetAppKeyUsageService.ts`
- Controller: `AppApiKeyController.getUsage()`
- Route: `GET /api/app-keys/:keyId/usage`

**Key rules**
- 資料來源同 Dashboard：聚合自 `usage_records`（Bifrost Sync 產生）
- 支援時間範圍過濾；預設最近 30 天
- 需是 key 所屬 org 的 member；跨 org 查回 403

---

## AppModule

AppModule 管理「平台的功能模組」（如 `dashboard`、`api_keys`、`alerts`、`app_api_keys` 等），以及哪些 org 訂閱了哪些模組。`createModuleAccessMiddleware('<module>')` 在各 route 前面把關，底層呼叫 `CheckModuleAccessService` 驗證。

### US-APPMODULE-001 | Cloud Admin 註冊新 Module

**As** a Cloud Admin
**I want to** register a new functional module on the platform
**so that** orgs can subscribe to it and routes using `createModuleAccessMiddleware('<name>')` can gate on it.

**Related**
- Module: `src/Modules/AppModule`
- Entry: `RegisterModuleService.execute()` → `src/Modules/AppModule/Application/Services/RegisterModuleService.ts`
- Controller: `AppModuleController.register()` → `src/Modules/AppModule/Presentation/Controllers/AppModuleController.ts`
- Route: `POST /api/modules`（`createRoleMiddleware('admin')`）
- Admin Portal: `GET /admin/modules`、`POST /admin/modules`（Inertia）

**Key rules**
- Admin-only route；非 admin 回 403
- Module `name` 必須唯一；重複 name 拒
- Module 一旦啟用，所有使用該名稱的 `createModuleAccessMiddleware` 立即生效

---

### US-APPMODULE-002 | Cloud Admin 讓 Org 訂閱 / 取消訂閱 Module

**As** a Cloud Admin
**I want to** subscribe an org to a module (or revoke an existing subscription)
**so that** customers get exactly the features their contract includes.

**Related**
- Module: `src/Modules/AppModule`
- Entries：
  - `SubscribeModuleService.execute()` → `src/Modules/AppModule/Application/Services/SubscribeModuleService.ts`
  - `UnsubscribeModuleService.execute()` → 同目錄
  - `ListOrgSubscriptionsService.execute()`（查 org 目前訂閱）→ 同目錄
- Controller: `AppModuleController.subscribe()` / `unsubscribe()` / `listOrgSubscriptions()`
- Routes：
  - `POST /api/organizations/:orgId/modules/subscribe`（admin）
  - `DELETE /api/organizations/:orgId/modules/:moduleId`（admin）
  - `GET /api/organizations/:orgId/modules`（任何已驗證呼叫者——通常 portal 用來檢查）

**Key rules**
- 新訂閱會 dispatch `ModuleSubscribed` 領域事件，下游可做 provisioning 或通知
- 同一 org 對同一 module 同時只能有一筆 active 訂閱；重複訂閱被擋
- 取消訂閱是 soft-revoke（保留歷史紀錄）；使用者下次請求走 `CheckModuleAccessService` 時才會被拒

---

### US-APPMODULE-003 | 任何已驗證使用者列出 / 查看 Modules

**As** any authenticated user (or even unauthenticated caller — route is public)
**I want to** list available modules or read a single module's detail
**so that** UI can show module catalog, onboarding tools can pick a starting bundle, etc.

**Related**
- Module: `src/Modules/AppModule`
- Entries：
  - `ListModulesService.execute()` → `src/Modules/AppModule/Application/Services/ListModulesService.ts`
  - `GetModuleDetailService.execute()` → 同目錄
- Controller: `AppModuleController.listModules()` / `getDetail()`
- Routes：`GET /api/modules`、`GET /api/modules/:moduleId`（皆 **無 auth middleware**——刻意公開）

**Key rules**
- Module catalog 是公開資料，不含任何 org-specific 資料
- 回傳欄位：`id`、`name`、`description`、`status`；不含內部 config
- 若 module 被停用（`status = inactive`），仍會出現在 list（讓 UI 可提示 "不再提供"）

---

### US-APPMODULE-004 | 系統檢查 Org 對 Module 的存取權（Middleware 驗證）+ 初始 Provisioning

**As** the Draupnir system
**I want to** enforce module-based access control on relevant routes and provision default modules for new orgs so they start with a working baseline
**so that** paywalls match contract, and every new org can immediately use core features.

**Related**
- Module: `src/Modules/AppModule`
- Entries：
  - `CheckModuleAccessService.execute(orgId, moduleName)` → `src/Modules/AppModule/Application/Services/CheckModuleAccessService.ts`（被 `createModuleAccessMiddleware` 呼叫）
  - `ProvisionOrganizationDefaultsService.execute()` → 同目錄（被 `CreateOrganizationService` 呼叫，見 US-ORG-001）
  - `EnsureCoreAppModulesService.execute()` → 同目錄（系統啟動時確保核心 module 在 DB 內）
- Middleware: `createModuleAccessMiddleware('<module-name>')` 遍布於 ApiKey、AppApiKey、Credit、Dashboard 等 routes
- 領域互動：`ContractEnforcementService.checkModuleAccess` — 訂閱 + contract 兩層閘門

**Key rules**
- `CheckModuleAccess` 需同時滿足 "module active" + "org 有有效訂閱" + "contract 允許"；任一失敗即拒
- `ProvisionOrganizationDefaults` 在建 org 時自動塞入「核心模組」的訂閱（依 org creation flow 決定）
- `EnsureCoreAppModules` 在服務啟動時 upsert 核心 module（例如 `dashboard`、`api_keys`），保證新部署環境也有基本資料

---

## Coverage map

覆蓋 ApiKey / AppApiKey / AppModule 三個模組的 Application Service 與 Presentation 入口。欄位意義：
- **Story ID**：對應本頁的 story；`—` 表示「目前沒有獨立 user story」，備註須說明原因
- **備註**：為什麼沒 story（內部服務 / 尚未 wire / 歸併到其他 story 等）

### ApiKey 模組 Application Services

| Service method | Story ID | 備註 |
|---|---|---|
| `CreateApiKeyService.execute` | US-APIKEY-001, US-APIKEY-008 | 建立 + rollback edge case |
| `AssignApiKeyService.execute` | US-APIKEY-003 | 指派 / 取消指派 |
| `RevokeApiKeyService.execute` | US-APIKEY-005 | 撤銷 |
| `SetKeyPermissionsService.execute` | US-APIKEY-004 | 改權限 scope |
| `UpdateKeyLabelService.execute` | US-APIKEY-002 | 改 label |
| `ListApiKeysService.execute` | US-APIKEY-006, US-APIKEY-007 | Manager / Member 兩種視圖共用 |
| `UpdateApiKeyBudgetService.execute` | — | ⚠️ Service 已實作（含 Bifrost budget sync），但 Presentation 層尚未 wire；目前 budget 只能在 create 時設（US-APIKEY-001）。待 Manager Portal UI 補上後新增 story |
| `SumQuotaAllocatedForOrgService.execute` | — | 內部聚合，被 `ManagerApiKeyCreatePage` 與 Credit/Contract 模組呼叫以計算可用額度，無獨立 user 旅程 |

### AppApiKey 模組 Application Services

| Service method | Story ID | 備註 |
|---|---|---|
| `IssueAppKeyService.execute` | US-APPKEY-001 | 發 App-Key |
| `ListAppKeysService.execute` | US-APPKEY-001 | 列 org 的 App-Keys |
| `RotateAppKeyService.execute` | US-APPKEY-002 | Rotate secret |
| `RevokeAppKeyService.execute` | US-APPKEY-002 | Revoke |
| `SetAppKeyScopeService.execute` | US-APPKEY-003 | 改 scope / BoundModules |
| `GetAppKeyUsageService.execute` | US-APPKEY-004 | 使用量查詢 |

### AppModule 模組 Application Services

| Service method | Story ID | 備註 |
|---|---|---|
| `RegisterModuleService.execute` | US-APPMODULE-001 | Admin 註冊 module |
| `ListModulesService.execute` | US-APPMODULE-003 | Module 公開 catalog |
| `GetModuleDetailService.execute` | US-APPMODULE-003 | Module 詳細 |
| `SubscribeModuleService.execute` | US-APPMODULE-002 | Admin 訂閱 |
| `UnsubscribeModuleService.execute` | US-APPMODULE-002 | Admin 取消訂閱 |
| `ListOrgSubscriptionsService.execute` | US-APPMODULE-002 | 查 org 訂閱 |
| `CheckModuleAccessService.execute` | US-APPMODULE-004 | Middleware 驗證 |
| `ProvisionOrganizationDefaultsService.execute` | US-APPMODULE-004 | 建 org 時 provisioning（被 US-ORG-001 呼叫）|
| `EnsureCoreAppModulesService.execute` | US-APPMODULE-004 | 啟動時確保核心 module |

### Presentation 入口

| Entry | Story ID | 備註 |
|---|---|---|
| `ApiKeyController.create` | US-APIKEY-001 | REST 入口（目前主要由 Manager Portal 走 Inertia） |
| `ApiKeyController.list` | US-APIKEY-006, US-APIKEY-007 | REST 入口 |
| `ApiKeyController.revoke` | US-APIKEY-005 | REST 入口 |
| `ApiKeyController.updateLabel` | US-APIKEY-002 | REST 入口 |
| `ApiKeyController.setPermissions` | US-APIKEY-004 | REST 入口 |
| `ManagerApiKeysPage.handle` | US-APIKEY-006 | Inertia：列表頁 |
| `ManagerApiKeysPage.assign` | US-APIKEY-003 | Inertia：指派 |
| `ManagerApiKeysPage.revoke` | US-APIKEY-005 | Inertia：撤銷 |
| `ManagerApiKeyCreatePage.handle` | US-APIKEY-001 | Inertia：建立表單頁 |
| `ManagerApiKeyCreatePage.store` | US-APIKEY-001 | Inertia：建立 + 可選指派 + 額度預檢 |
| `MemberApiKeysPage`（Member Portal） | US-APIKEY-007 | Inertia：Member 看自己的 key |
| `AppApiKeyController.issue` | US-APPKEY-001 | REST |
| `AppApiKeyController.list` | US-APPKEY-001 | REST |
| `AppApiKeyController.rotate` | US-APPKEY-002 | REST |
| `AppApiKeyController.revoke` | US-APPKEY-002 | REST |
| `AppApiKeyController.setScope` | US-APPKEY-003 | REST |
| `AppApiKeyController.getUsage` | US-APPKEY-004 | REST |
| `AppModuleController.register` | US-APPMODULE-001 | REST（admin）|
| `AppModuleController.listModules` | US-APPMODULE-003 | REST（public）|
| `AppModuleController.getDetail` | US-APPMODULE-003 | REST（public）|
| `AppModuleController.subscribe` | US-APPMODULE-002 | REST（admin）|
| `AppModuleController.unsubscribe` | US-APPMODULE-002 | REST（admin）|
| `AppModuleController.listOrgSubscriptions` | US-APPMODULE-002 | REST |
| `createModuleAccessMiddleware('<module>')` | US-APPMODULE-004 | Middleware factory，遍布所有需驗證 module 權限的 route |
| Admin Portal：`/admin/modules`、`/admin/modules/create` | US-APPMODULE-001 | Inertia |

### 已知覆蓋缺口

- **Cloud Admin 跨 org 查 key**：目前 `ListApiKeysService` 的授權由 `OrgAuthorizationHelper.requireOrgMembership` 閘管，Admin 跨 org 存取路徑尚未以獨立 story 記錄。等 Admin Dashboard 覆蓋全面後由後續 Task 補寫
- **UpdateApiKeyBudget Presentation wiring**：如上表備註
- **AppApiKey 的 Manager/Admin 身份收斂**：目前 issue / rotate / revoke / scope 都只需 `requireOrgMembership`；若未來要區分「誰能發 App-Key」，需先加 Presentation 或 Service 端的角色閘門
- **AppModule disable 後既有 subscriptions 的行為**：目前 module 若 `status=inactive`，`CheckModuleAccessService` 會在入 contract 層前拒；但既有訂閱紀錄未被動標記，靠 runtime 拒就好
