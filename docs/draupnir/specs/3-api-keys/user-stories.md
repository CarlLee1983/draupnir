# API Key 使用者故事（ApiKey / AppApiKey / AppModule）

> 本文件對標代碼日期：2026-04-18（commit `f767eea`）。
> 若你看到的代碼與此文件明顯不一致，請提 issue 或直接 PR 修正。

## 範圍

- 本檔覆蓋：**ApiKey 模組**（本批 Pilot）
- **下批補**：AppApiKey、AppModule（Task 6）

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

## Coverage map

覆蓋所有 ApiKey 模組的 Application Service 與 Presentation 入口。欄位意義：
- **Story ID**：對應本頁的 story；`—` 表示「目前沒有獨立 user story」，備註須說明原因
- **備註**：為什麼沒 story（內部服務 / 尚未 wire / 歸併到其他 story 等）

### Application Services

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

### 已知覆蓋缺口

- **Cloud Admin 跨 org 查 key**：目前 `ListApiKeysService` 的授權由 `OrgAuthorizationHelper.requireOrgMembership` 閘管，Admin 跨 org 存取路徑尚未以獨立 story 記錄。等 Admin Dashboard 覆蓋全面後由後續 Task 補寫
- **UpdateApiKeyBudget Presentation wiring**：如上表備註
