# Manager / Member 雙 Portal 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立獨立 `/manager/*` portal、引入 API Key 指派機制（`assigned_member_id`）、將 `/member/*` 限縮為被動查看，並把登入導向與 Org 建立邊界與 v1 單組織假設對齊。

**Architecture:**
1. ApiKey aggregate 新增 `assignedMemberId`（DB：`assigned_member_id`，可 NULL）；新增指派 / 取消指派 domain 行為與 Application service；Repository 擴充三個查詢點。
2. 新增 `src/Website/Manager/` slice（keys / bindings / routes / middleware / pages），與 Admin slice 同構；`HttpKernel.groups.manager()` 套用 `requireManager` middleware。
3. Member slice 移除 create / revoke / budget 路由與頁面；`MemberApiKeysPage` 只列「assigned_member_id = 當前使用者」的 key。
4. `LoginPage` 與 `GoogleOAuthCallbackPage` 將 `manager` 角色導向 `/manager/dashboard`。
5. `CreateOrganizationService` 拒絕「已具任何組織 membership」的 MEMBER 建立新組織（v1 單組織假設）。
6. `RemoveMemberService` 在移除 membership 時，把該成員在該組織下被指派的 key 之 `assigned_member_id` 設為 NULL。

**Tech Stack:** TypeScript strict、Bun test、@gravito/atlas migrations DSL、Inertia.js + React、shadcn/ui、Tailwind、Zod（validation，既有）。

**Spec:** `docs/superpowers/specs/2026-04-16-manager-member-portal-design.md`

---

## Scope Note（給執行者）

本計畫覆蓋單一功能（Manager / Member 雙 portal），但規模較大。三階段依賴：
- **A–C（資料模型與後端不變式）**：可獨立交付並透過單元測試驗證。
- **D–L（Manager portal 建置）**：依賴 A–C 完成。
- **M–N（Member 限縮與整合）**：依賴 D–L 完成（Member 限縮後管理者需要有去處）。

若需拆分為多個 PR，以 A–C / D–L / M–N 為邊界拆解是安全的。**在同一會話內連續執行時，按階段順序完成即可。**

---

## File Structure

**新增（Backend）**
- `database/migrations/2026_04_16_000002_add_assigned_member_id_to_api_keys.ts`
- `src/Modules/ApiKey/Application/Services/AssignApiKeyService.ts`
- `src/Modules/ApiKey/Application/DTOs/AssignApiKeyDTO.ts`（若 DTO 集中管理則併入 `ApiKeyDTO.ts`，見任務）
- `src/Modules/ApiKey/__tests__/AssignApiKeyService.test.ts`
- `src/Website/Manager/keys.ts`
- `src/Website/Manager/middleware/requireManager.ts`
- `src/Website/Manager/bindings/registerManagerBindings.ts`
- `src/Website/Manager/routes/registerManagerRoutes.ts`
- `src/Website/Manager/Pages/ManagerDashboardPage.ts`
- `src/Website/Manager/Pages/ManagerOrganizationPage.ts`
- `src/Website/Manager/Pages/ManagerMembersPage.ts`
- `src/Website/Manager/Pages/ManagerApiKeysPage.ts`
- `src/Website/Manager/Pages/ManagerApiKeyCreatePage.ts`
- `src/Website/Manager/Pages/ManagerApiKeyRevokeHandler.ts`
- `src/Website/Manager/Pages/ManagerSettingsPage.ts`
- `src/Website/__tests__/Manager/requireManager.test.ts`
- `src/Website/__tests__/Manager/ManagerDashboardPage.test.ts`
- `src/Website/__tests__/Manager/ManagerOrganizationPage.test.ts`
- `src/Website/__tests__/Manager/ManagerMembersPage.test.ts`
- `src/Website/__tests__/Manager/ManagerApiKeysPage.test.ts`
- `src/Website/__tests__/Manager/ManagerApiKeyCreatePage.test.ts`
- `src/Website/__tests__/Manager/ManagerSettingsPage.test.ts`

**新增（Frontend）**
- `resources/js/layouts/ManagerLayout.tsx`
- `resources/js/Pages/Manager/Dashboard/Index.tsx`
- `resources/js/Pages/Manager/Organization/Index.tsx`
- `resources/js/Pages/Manager/Members/Index.tsx`
- `resources/js/Pages/Manager/ApiKeys/Index.tsx`
- `resources/js/Pages/Manager/ApiKeys/Create.tsx`
- `resources/js/Pages/Manager/Settings/Index.tsx`

**修改（Backend）**
- `src/Modules/ApiKey/Domain/Aggregates/ApiKey.ts` — 加入 `assignedMemberId`、`assignTo()`、`unassign()`
- `src/Modules/ApiKey/Domain/Repositories/IApiKeyRepository.ts` — 加入 `findByOrgAndAssignedMember()`、`countByOrgAndAssignedMember()`、`clearAssignmentsForMember()`
- `src/Modules/ApiKey/Infrastructure/Repositories/ApiKeyRepository.ts` — 實作三個新方法
- `src/Modules/ApiKey/Infrastructure/Mappers/ApiKeyMapper.ts` — 寫入 `assigned_member_id`、`quota_allocated`
- `src/Modules/ApiKey/Application/Services/ListApiKeysService.ts` — 支援 `assignedMemberId` 過濾
- `src/Modules/ApiKey/Application/DTOs/ApiKeyDTO.ts` — DTO 增加 `assignedMemberId`、List 參數支援 filter
- `src/Modules/ApiKey/Infrastructure/Providers/ApiKeyServiceProvider.ts` — 註冊 `AssignApiKeyService`
- `src/Modules/Organization/Application/Services/CreateOrganizationService.ts` — 拒絕已具任何 membership 的 MEMBER
- `src/Modules/Organization/Application/Services/RemoveMemberService.ts` — 清除該成員在該組織下被指派的 key
- `src/Modules/Organization/__tests__/CreateOrganizationService.test.ts`
- `src/Modules/Organization/__tests__/RemoveMemberService.test.ts`
- `src/Website/Http/HttpKernel.ts` — 新增 `groups.manager()`
- `src/Website/Http/Inertia/withInertiaPage.ts` — 新增 `withManagerInertiaPageHandler`
- `src/Website/bootstrap/registerWebsiteRoutes.ts` — 註冊 `registerManagerRoutes`
- `src/Website/bootstrap/registerWebsiteBindings.ts` — 註冊 `registerManagerBindings`
- `src/Website/Auth/Pages/LoginPage.ts` — manager → `/manager/dashboard`
- `src/Website/Auth/Pages/GoogleOAuthCallbackPage.ts` — manager → `/manager/dashboard`
- `src/Website/Member/keys.ts` — 刪除 `apiKeyCreate` / `apiKeyBudget` / `apiKeyRevoke`
- `src/Website/Member/bindings/registerMemberBindings.ts` — 移除三項 binding
- `src/Website/Member/routes/registerMemberRoutes.ts` — 移除三項路由
- `src/Website/Member/Pages/MemberApiKeysPage.ts` — 依 `assigned_member_id` 過濾
- `src/Website/__tests__/Member/MemberApiKeysPage.test.ts` — 更新測試
- `src/Website/__tests__/Auth/LoginPage.test.ts` — 加 manager redirect 測試
- `src/Website/__tests__/Auth/GoogleOAuthCallbackPage.test.ts` — 加 manager redirect 測試

**修改（Frontend）**
- `resources/js/layouts/MemberLayout.tsx` — 移除 Alerts 導航
- `resources/js/Pages/Member/ApiKeys/Index.tsx` — 移除建立 / 撤銷 / 調整配額入口
- `resources/js/Pages/Member/ApiKeys/columns.tsx` — 保留複製 / 檢視用量；移除操作
- `resources/js/Pages/Member/Dashboard/Index.tsx` — 僅在「無任何組織」時顯示建立組織卡片（現行已是 `hasOrganization`，校正文案）

**刪除**
- `src/Website/Member/Pages/MemberApiKeyCreatePage.ts`
- `src/Website/Member/Pages/MemberApiKeyBudgetPage.ts`
- `src/Website/Member/Pages/MemberApiKeyRevokeHandler.ts`
- `resources/js/Pages/Member/ApiKeys/Create.tsx`
- `resources/js/Pages/Member/ApiKeys/Budget.tsx`
- 相應 `src/Website/__tests__/Member/MemberApiKey{Create,Budget,Revoke}*.test.ts`（若存在則一併刪除）

---

## 命名與型別約定

- DB 欄位：snake_case（`assigned_member_id`）；Aggregate 屬性：camelCase（`assignedMemberId`）。
- 新 domain 方法：`assignTo(memberUserId: string)`、`unassign()`。
- Service 名稱固定：`AssignApiKeyService`（不是 `AssignKey…` 或 `KeyAssignmentService`）。
- Page 類別固定：`ManagerDashboardPage` / `ManagerOrganizationPage` / `ManagerMembersPage` / `ManagerApiKeysPage` / `ManagerApiKeyCreatePage` / `ManagerApiKeyRevokeHandler` / `ManagerSettingsPage`。
- DI binding keys 命名：`MANAGER_PAGE_KEYS.dashboard` 等（對齊 Member/Admin slice 的命名慣例）。
- 路由命名（`name` 欄位）：`pages.manager.dashboard` / `pages.manager.organization` / `pages.manager.members.index` / `pages.manager.members.invite` / `pages.manager.members.remove` / `pages.manager.apiKeys.index` / `pages.manager.apiKeys.create` / `pages.manager.apiKeys.store` / `pages.manager.apiKeys.assign` / `pages.manager.apiKeys.revoke` / `pages.manager.settings` / `pages.manager.settings.update`。

---

## Phase A — API Key 指派資料模型（Data & Domain）

### Task A1: Migration — 新增 `assigned_member_id` 欄位

**Files:**
- Create: `database/migrations/2026_04_16_000002_add_assigned_member_id_to_api_keys.ts`

- [ ] **Step 1: 新增 migration 檔**

```typescript
/**
 * Migration: api_keys 新增 assigned_member_id 欄位（可視度指派 → user_id）
 *
 * 值為 NULL 代表未指派。指派 FK 僅到 users(id)；跨組織一致性由應用層驗證（IApiKeyRepository 與 AssignApiKeyService）。
 * user 被實體刪除時應 set NULL，避免殘留指向已刪除 user。
 */

import { type Migration, Schema } from '@gravito/atlas'

export default class AddAssignedMemberIdToApiKeys implements Migration {
  async up(): Promise<void> {
    await Schema.table('api_keys', (table) => {
      table.string('assigned_member_id').nullable()
      table.index('assigned_member_id')
    })
  }

  async down(): Promise<void> {
    await Schema.table('api_keys', (table) => {
      table.dropIndex('assigned_member_id')
      table.dropColumn('assigned_member_id')
    })
  }
}
```

- [ ] **Step 2: 跑 migration，確認欄位建立成功**

Run: `bun run migrate`
Expected: 看到 `AddAssignedMemberIdToApiKeys` migration 成功執行、無錯誤。

- [ ] **Step 3: Commit**

```bash
git add database/migrations/2026_04_16_000002_add_assigned_member_id_to_api_keys.ts
git commit -m "feat: [api-key] 新增 assigned_member_id 欄位 migration"
```

---

### Task A2: `ApiKey` aggregate 加入 `assignedMemberId` 與指派行為

**Files:**
- Modify: `src/Modules/ApiKey/Domain/Aggregates/ApiKey.ts`

- [ ] **Step 1: 先寫失敗測試**

Create: `src/Modules/ApiKey/__tests__/ApiKey.assignment.test.ts`

```typescript
import { describe, expect, test } from 'bun:test'
import { ApiKey } from '../Domain/Aggregates/ApiKey'

function makeKey(): ApiKey {
  return ApiKey.create({
    id: 'k-1',
    orgId: 'org-1',
    createdByUserId: 'mgr-1',
    label: 'test',
    gatewayKeyId: 'gw-1',
    keyHash: 'h'.repeat(64),
  })
}

describe('ApiKey assignment', () => {
  test('new key 沒有指派', () => {
    expect(makeKey().assignedMemberId).toBe(null)
  })

  test('assignTo 設定指派對象', () => {
    const k = makeKey().assignTo('user-42')
    expect(k.assignedMemberId).toBe('user-42')
  })

  test('assignTo 空字串拒絕', () => {
    expect(() => makeKey().assignTo('')).toThrow()
  })

  test('unassign 清除指派', () => {
    const k = makeKey().assignTo('user-42').unassign()
    expect(k.assignedMemberId).toBe(null)
  })

  test('revoked key 禁止 assignTo', () => {
    const k = makeKey().activate().revoke()
    expect(() => k.assignTo('user-42')).toThrow()
  })

  test('fromDatabase 讀入 assigned_member_id', () => {
    const row = {
      id: 'k-1', org_id: 'org-1', created_by_user_id: 'mgr-1',
      label: 'x', key_hash: 'h', bifrost_virtual_key_id: 'gw',
      status: 'active', scope: JSON.stringify({ allowedModels: [], rateLimit: { rpm: null, tpm: null } }),
      quota_allocated: 0, suspension_reason: null, pre_freeze_rate_limit: null,
      suspended_at: null, expires_at: null, revoked_at: null,
      created_at: '2026-04-16T00:00:00Z', updated_at: '2026-04-16T00:00:00Z',
      assigned_member_id: 'user-99',
    }
    const k = ApiKey.fromDatabase(row)
    expect(k.assignedMemberId).toBe('user-99')
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `bun test src/Modules/ApiKey/__tests__/ApiKey.assignment.test.ts`
Expected: 全部失敗（`assignedMemberId` property 不存在、`assignTo` / `unassign` 不存在）。

- [ ] **Step 3: 更新 `ApiKey` aggregate**

在 `src/Modules/ApiKey/Domain/Aggregates/ApiKey.ts` 做下列修改：

1. `ApiKeyProps` 介面尾端加入 `readonly assignedMemberId: string | null`（放在 `updatedAt` 之前亦可；排序不影響正確性，為了可讀性放在 `quotaAllocated` 後面）。
2. `static create(params)` 回傳的物件最後加一欄 `assignedMemberId: null`。
3. `static fromDatabase(row)` 最後加一欄：
   ```typescript
   assignedMemberId: (row.assigned_member_id as string | null) ?? null,
   ```
4. 新增兩個方法（放在 `adjustQuotaAllocated` 之後）：

```typescript
  /** 將 key 指派給某位組織成員（僅 Manager 呼叫；跨組織驗證由 Application layer 負責）。 */
  assignTo(memberUserId: string): ApiKey {
    if (!memberUserId || memberUserId.trim() === '') {
      throw new Error('assignTo: memberUserId cannot be empty')
    }
    if (this.props.status.isRevoked()) {
      throw new Error('Cannot assign a revoked key')
    }
    return new ApiKey({
      ...this.props,
      assignedMemberId: memberUserId,
      updatedAt: new Date(),
    })
  }

  /** 取消指派。 */
  unassign(): ApiKey {
    return new ApiKey({
      ...this.props,
      assignedMemberId: null,
      updatedAt: new Date(),
    })
  }

  /** 目前被指派的 member user_id；NULL 代表未指派。 */
  get assignedMemberId(): string | null {
    return this.props.assignedMemberId
  }
```

- [ ] **Step 4: 執行測試確認全通過**

Run: `bun test src/Modules/ApiKey/__tests__/ApiKey.assignment.test.ts`
Expected: 6 個測試全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/Modules/ApiKey/Domain/Aggregates/ApiKey.ts src/Modules/ApiKey/__tests__/ApiKey.assignment.test.ts
git commit -m "feat: [api-key] ApiKey aggregate 新增 assignedMemberId 與 assignTo/unassign"
```

---

### Task A3: `ApiKeyMapper` 寫入 `assigned_member_id` 與 `quota_allocated`

**Files:**
- Modify: `src/Modules/ApiKey/Infrastructure/Mappers/ApiKeyMapper.ts`
- Test: `src/Modules/ApiKey/__tests__/ApiKeyMapper.test.ts`

> 背景：現行 Mapper 遺漏 `quota_allocated`（domain 有 field 但 mapper 未序列化）。本任務把 `assigned_member_id` 補上時順手修正，讓指派與配額都能正確持久化。

- [ ] **Step 1: 寫失敗測試**

Create: `src/Modules/ApiKey/__tests__/ApiKeyMapper.test.ts`

```typescript
import { describe, expect, test } from 'bun:test'
import { ApiKey } from '../Domain/Aggregates/ApiKey'
import { ApiKeyMapper } from '../Infrastructure/Mappers/ApiKeyMapper'

function makeKey(): ApiKey {
  return ApiKey.create({
    id: 'k-1',
    orgId: 'org-1',
    createdByUserId: 'mgr-1',
    label: 'test',
    gatewayKeyId: 'gw-1',
    keyHash: 'h'.repeat(64),
  })
}

describe('ApiKeyMapper.toDatabaseRow', () => {
  test('未指派時 assigned_member_id 為 null', () => {
    const row = ApiKeyMapper.toDatabaseRow(makeKey())
    expect(row.assigned_member_id).toBe(null)
  })

  test('指派後寫入 assigned_member_id', () => {
    const row = ApiKeyMapper.toDatabaseRow(makeKey().assignTo('user-42'))
    expect(row.assigned_member_id).toBe('user-42')
  })

  test('quota_allocated 預設為 0 並可被調整', () => {
    expect(ApiKeyMapper.toDatabaseRow(makeKey()).quota_allocated).toBe(0)
    const adjusted = makeKey().adjustQuotaAllocated(100)
    expect(ApiKeyMapper.toDatabaseRow(adjusted).quota_allocated).toBe(100)
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `bun test src/Modules/ApiKey/__tests__/ApiKeyMapper.test.ts`
Expected: 三個測試均失敗（`assigned_member_id` / `quota_allocated` 為 undefined）。

- [ ] **Step 3: 更新 `ApiKeyMapper.toDatabaseRow`**

替換整個 method 內容：

```typescript
import type { ApiKey } from '../../Domain/Aggregates/ApiKey'

export class ApiKeyMapper {
  static toDatabaseRow(entity: ApiKey): Record<string, unknown> {
    return {
      id: entity.id,
      org_id: entity.orgId,
      created_by_user_id: entity.createdByUserId,
      label: entity.label,
      key_hash: entity.keyHashValue,
      bifrost_virtual_key_id: entity.gatewayKeyId,
      status: entity.status,
      scope: JSON.stringify(entity.scope.toJSON()),
      quota_allocated: entity.quotaAllocated,
      assigned_member_id: entity.assignedMemberId,
      suspension_reason: entity.suspensionReason,
      pre_freeze_rate_limit: entity.preFreezeRateLimitRaw,
      suspended_at: entity.suspendedAt?.toISOString() ?? null,
      expires_at: entity.expiresAt?.toISOString() ?? null,
      revoked_at: entity.revokedAt?.toISOString() ?? null,
      created_at: entity.createdAt.toISOString(),
      updated_at: entity.updatedAt.toISOString(),
    }
  }
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `bun test src/Modules/ApiKey/__tests__/ApiKeyMapper.test.ts`
Expected: 3/3 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/Modules/ApiKey/Infrastructure/Mappers/ApiKeyMapper.ts src/Modules/ApiKey/__tests__/ApiKeyMapper.test.ts
git commit -m "feat: [api-key] Mapper 序列化 assigned_member_id 與 quota_allocated"
```

---

### Task A4: `IApiKeyRepository` 新增三個方法

**Files:**
- Modify: `src/Modules/ApiKey/Domain/Repositories/IApiKeyRepository.ts`

- [ ] **Step 1: 在 interface 尾端加入三個方法宣告**

在 `withTransaction` 之前加入：

```typescript
  /**
   * 依組織與被指派成員篩選 key。
   * 用於 Member portal 列表與「依 keyId 讀取」的可視度驗證。
   *
   * @param orgId - 使用者所屬組織（必填，避免跨組織洩漏）
   * @param assignedMemberId - 被指派的 user_id
   */
  findByOrgAndAssignedMember(
    orgId: string,
    assignedMemberId: string,
    limit?: number,
    offset?: number,
  ): Promise<ApiKey[]>

  /** 依組織與被指派成員計數（配合分頁）。 */
  countByOrgAndAssignedMember(orgId: string, assignedMemberId: string): Promise<number>

  /**
   * 清除某組織下所有指派給特定成員的 key 之 assigned_member_id（設為 NULL）。
   * 用於「移除組織成員」時保留 key 本身但解除指派（spec §7.3）。
   */
  clearAssignmentsForMember(orgId: string, memberUserId: string): Promise<void>
```

- [ ] **Step 2: 型別檢查通過**

Run: `bun run typecheck` 或 `bunx tsc --noEmit`
Expected: `ApiKeyRepository`（實作類別）會報錯「does not implement ...」。這是預期行為，任務 A5 會處理。

- [ ] **Step 3: Commit（僅介面；延到 A5 實作完再通過全部型別檢查）**

```bash
git add src/Modules/ApiKey/Domain/Repositories/IApiKeyRepository.ts
git commit -m "feat: [api-key] IApiKeyRepository 新增指派相關查詢/清除介面"
```

---

### Task A5: `ApiKeyRepository` 實作三個方法

**Files:**
- Modify: `src/Modules/ApiKey/Infrastructure/Repositories/ApiKeyRepository.ts`

- [ ] **Step 1: 先寫失敗的整合測試**

Create: `src/Modules/ApiKey/__tests__/ApiKeyRepository.assignment.test.ts`

```typescript
import { describe, expect, test, beforeEach } from 'bun:test'
import { ApiKey } from '../Domain/Aggregates/ApiKey'
import { ApiKeyRepository } from '../Infrastructure/Repositories/ApiKeyRepository'
import { getTestDb, resetTestDb } from '@/Shared/__tests__/helpers/testDb'

/**
 * 注意：本測試依賴 @/Shared/__tests__/helpers/testDb 的 in-memory SQLite migration helper。
 * 若專案尚未提供，請先以既有的 ApiKeyRepository.test.ts 為範本建立（本 PR 不新增 helper）。
 * 若 helper 不存在，可將本測試改為 mocked IDatabaseAccess 版本；仍需覆蓋相同行為。
 */

describe('ApiKeyRepository — assignment queries', () => {
  beforeEach(async () => {
    await resetTestDb()
  })

  test('findByOrgAndAssignedMember 只回傳符合 org 與 user 的 key', async () => {
    const db = getTestDb()
    const repo = new ApiKeyRepository(db)

    const makeAndSave = async (id: string, orgId: string, assignTo: string | null) => {
      let k = ApiKey.create({
        id, orgId, createdByUserId: 'mgr', label: id,
        gatewayKeyId: `gw-${id}`, keyHash: id.padEnd(64, 'x'),
      })
      if (assignTo) k = k.assignTo(assignTo)
      await repo.save(k)
    }

    await makeAndSave('k1', 'org-A', 'user-1')
    await makeAndSave('k2', 'org-A', 'user-2')
    await makeAndSave('k3', 'org-B', 'user-1') // 跨 org，不應被撈到
    await makeAndSave('k4', 'org-A', null)     // 未指派

    const rows = await repo.findByOrgAndAssignedMember('org-A', 'user-1')
    expect(rows.map((r) => r.id).sort()).toEqual(['k1'])
  })

  test('countByOrgAndAssignedMember 回傳正確數量', async () => {
    const db = getTestDb()
    const repo = new ApiKeyRepository(db)
    // 與上測試類似資料
    for (const [id, user] of [['k1', 'u1'], ['k2', 'u1'], ['k3', 'u2']] as const) {
      await repo.save(
        ApiKey.create({
          id, orgId: 'org-A', createdByUserId: 'mgr', label: id,
          gatewayKeyId: `gw-${id}`, keyHash: id.padEnd(64, 'x'),
        }).assignTo(user),
      )
    }
    expect(await repo.countByOrgAndAssignedMember('org-A', 'u1')).toBe(2)
    expect(await repo.countByOrgAndAssignedMember('org-A', 'u2')).toBe(1)
  })

  test('clearAssignmentsForMember 把指派欄位設為 NULL，但不刪除 key', async () => {
    const db = getTestDb()
    const repo = new ApiKeyRepository(db)
    await repo.save(
      ApiKey.create({
        id: 'k1', orgId: 'org-A', createdByUserId: 'mgr', label: 'k1',
        gatewayKeyId: 'gw', keyHash: 'x'.repeat(64),
      }).assignTo('user-1'),
    )

    await repo.clearAssignmentsForMember('org-A', 'user-1')

    const still = await repo.findById('k1')
    expect(still).not.toBeNull()
    expect(still!.assignedMemberId).toBe(null)
  })
})
```

> 若 `@/Shared/__tests__/helpers/testDb` 不存在，改為以 `mock()` 包裝 `IDatabaseAccess.table(...)` 並斷言 query chain 呼叫（`where(...)`、`update(...)`）— 見 A6 的 fallback 範例。

- [ ] **Step 2: 執行測試確認失敗**

Run: `bun test src/Modules/ApiKey/__tests__/ApiKeyRepository.assignment.test.ts`
Expected: 方法不存在或回傳錯誤。

- [ ] **Step 3: 在 `ApiKeyRepository` 新增三個實作**

在類別中（`findByBifrostVirtualKeyId` 之後、`withTransaction` 之前）新增：

```typescript
  async findByOrgAndAssignedMember(
    orgId: string,
    assignedMemberId: string,
    limit?: number,
    offset?: number,
  ): Promise<ApiKey[]> {
    let query = this.db
      .table('api_keys')
      .where('org_id', '=', orgId)
      .where('assigned_member_id', '=', assignedMemberId)
      .orderBy('created_at', 'DESC')
    if (offset != null && offset > 0) query = query.offset(offset)
    if (limit != null) query = query.limit(limit)
    const rows = await query.select()
    return rows.map((row) => ApiKey.fromDatabase(row))
  }

  async countByOrgAndAssignedMember(orgId: string, assignedMemberId: string): Promise<number> {
    return this.db
      .table('api_keys')
      .where('org_id', '=', orgId)
      .where('assigned_member_id', '=', assignedMemberId)
      .count()
  }

  async clearAssignmentsForMember(orgId: string, memberUserId: string): Promise<void> {
    await this.db
      .table('api_keys')
      .where('org_id', '=', orgId)
      .where('assigned_member_id', '=', memberUserId)
      .update({ assigned_member_id: null, updated_at: new Date().toISOString() })
  }
```

- [ ] **Step 4: 執行測試確認通過**

Run: `bun test src/Modules/ApiKey/__tests__/ApiKeyRepository.assignment.test.ts` 與 `bun run typecheck`
Expected: 測試全通過、型別檢查無錯誤。

- [ ] **Step 5: Commit**

```bash
git add src/Modules/ApiKey/Infrastructure/Repositories/ApiKeyRepository.ts src/Modules/ApiKey/__tests__/ApiKeyRepository.assignment.test.ts
git commit -m "feat: [api-key] Repository 實作指派相關查詢/清除"
```

---

### Task A6: `ApiKeyDTO.ts` — 對外暴露 `assignedMemberId`

**Files:**
- Modify: `src/Modules/ApiKey/Application/DTOs/ApiKeyDTO.ts`

> 只需擴充 DTO 欄位與 `ApiKeyPresenter.fromEntity` 對應輸出。若既有 DTO 已有 `ApiKeySummary` 型別，在其中加入 `assignedMemberId: string | null`。以下為一般化修改步驟。

- [ ] **Step 1: 讀 DTO 現況，決定要新增的欄位位置**

Run: 檢視 `src/Modules/ApiKey/Application/DTOs/ApiKeyDTO.ts` 找到 `ApiKeyPresenter.fromEntity`。

- [ ] **Step 2: 在 DTO 型別與 presenter 加入 `assignedMemberId`**

修改 Presenter 對應到 entity 的欄位，於所有輸出欄位尾端加入：

```typescript
  assignedMemberId: entity.assignedMemberId,
```

並在對應的 public DTO type（例如 `ApiKeySummary` / `ApiKeyListItem`）加入：

```typescript
  readonly assignedMemberId: string | null
```

- [ ] **Step 3: 型別檢查**

Run: `bun run typecheck`
Expected: 若某些呼叫端缺 `assignedMemberId`，會報錯 — 下一任務修正。若無錯誤代表 DTO 獨立通過。

- [ ] **Step 4: Commit**

```bash
git add src/Modules/ApiKey/Application/DTOs/ApiKeyDTO.ts
git commit -m "feat: [api-key] DTO 對外暴露 assignedMemberId"
```

---

## Phase B — Assignment Service 與 List 過濾

### Task B1: 新增 `AssignApiKeyService`

**Files:**
- Create: `src/Modules/ApiKey/Application/Services/AssignApiKeyService.ts`
- Test: `src/Modules/ApiKey/__tests__/AssignApiKeyService.test.ts`

> 本 service 負責三件事：
> 1. 驗證呼叫者是組織 Manager（透過 `OrgAuthorizationHelper.requireOrgManager`）。
> 2. 驗證 key 屬於該組織（`key.orgId === orgId`）。
> 3. 驗證目標 member 是該組織的有效成員，且角色為 `member`（v1 範圍）；`null` 代表取消指派。
> 4. 呼叫 `ApiKey.assignTo(userId)` 或 `ApiKey.unassign()`，`repo.update(key)`。

- [ ] **Step 1: 寫失敗測試**

```typescript
// src/Modules/ApiKey/__tests__/AssignApiKeyService.test.ts
import { describe, expect, test, mock } from 'bun:test'
import { AssignApiKeyService } from '../Application/Services/AssignApiKeyService'
import { ApiKey } from '../Domain/Aggregates/ApiKey'
import { OrganizationMember } from '@/Modules/Organization/Domain/Entities/OrganizationMember'
import { OrgMemberRole } from '@/Modules/Organization/Domain/ValueObjects/OrgMemberRole'

function makeKey(orgId = 'org-A') {
  return ApiKey.create({
    id: 'k-1', orgId, createdByUserId: 'mgr',
    label: 'L', gatewayKeyId: 'gw', keyHash: 'h'.repeat(64),
  })
}

function memberOf(orgId: string, userId: string, role: 'manager' | 'member') {
  return OrganizationMember.reconstitute({
    id: `m-${userId}`, organizationId: orgId, userId,
    role: new OrgMemberRole(role),
    joinedAt: new Date(), createdAt: new Date(),
  })
}

describe('AssignApiKeyService', () => {
  const okAuth = { authorized: true as const }
  const orgAuth = {
    requireOrgManager: mock(() => Promise.resolve(okAuth)),
  }

  test('指派目標非該組織成員 → INVALID_ASSIGNEE', async () => {
    const key = makeKey('org-A')
    const repo = {
      findById: mock(() => Promise.resolve(key)),
      update: mock(() => Promise.resolve()),
    }
    const memberRepo = {
      findByUserAndOrgId: mock(() => Promise.resolve(null)),
    }
    const svc = new AssignApiKeyService(repo as any, memberRepo as any, orgAuth as any)
    const result = await svc.execute({
      keyId: 'k-1', orgId: 'org-A',
      assigneeUserId: 'u-99',
      callerUserId: 'mgr', callerSystemRole: 'manager',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('INVALID_ASSIGNEE')
  })

  test('指派目標是 manager → INVALID_ASSIGNEE_ROLE（v1 僅接受 member）', async () => {
    const key = makeKey('org-A')
    const repo = {
      findById: mock(() => Promise.resolve(key)),
      update: mock(() => Promise.resolve()),
    }
    const memberRepo = {
      findByUserAndOrgId: mock(() => Promise.resolve(memberOf('org-A', 'u-2', 'manager'))),
    }
    const svc = new AssignApiKeyService(repo as any, memberRepo as any, orgAuth as any)
    const result = await svc.execute({
      keyId: 'k-1', orgId: 'org-A', assigneeUserId: 'u-2',
      callerUserId: 'mgr', callerSystemRole: 'manager',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('INVALID_ASSIGNEE_ROLE')
  })

  test('指派給合法 member → 呼叫 ApiKey.assignTo 與 repo.update', async () => {
    const key = makeKey('org-A')
    const repo = {
      findById: mock(() => Promise.resolve(key)),
      update: mock(() => Promise.resolve()),
    }
    const memberRepo = {
      findByUserAndOrgId: mock(() => Promise.resolve(memberOf('org-A', 'u-7', 'member'))),
    }
    const svc = new AssignApiKeyService(repo as any, memberRepo as any, orgAuth as any)
    const result = await svc.execute({
      keyId: 'k-1', orgId: 'org-A', assigneeUserId: 'u-7',
      callerUserId: 'mgr', callerSystemRole: 'manager',
    })
    expect(result.success).toBe(true)
    expect(repo.update).toHaveBeenCalledTimes(1)
    const saved = (repo.update as any).mock.calls[0][0] as ApiKey
    expect(saved.assignedMemberId).toBe('u-7')
  })

  test('assigneeUserId = null → 取消指派', async () => {
    const key = makeKey('org-A').assignTo('u-7')
    const repo = {
      findById: mock(() => Promise.resolve(key)),
      update: mock(() => Promise.resolve()),
    }
    const memberRepo = { findByUserAndOrgId: mock(() => Promise.resolve(null)) }
    const svc = new AssignApiKeyService(repo as any, memberRepo as any, orgAuth as any)
    const result = await svc.execute({
      keyId: 'k-1', orgId: 'org-A', assigneeUserId: null,
      callerUserId: 'mgr', callerSystemRole: 'manager',
    })
    expect(result.success).toBe(true)
    const saved = (repo.update as any).mock.calls[0][0] as ApiKey
    expect(saved.assignedMemberId).toBe(null)
  })

  test('key 不屬於 orgId → CROSS_ORG_ASSIGNMENT', async () => {
    const key = makeKey('org-B')
    const repo = {
      findById: mock(() => Promise.resolve(key)),
      update: mock(() => Promise.resolve()),
    }
    const memberRepo = {
      findByUserAndOrgId: mock(() => Promise.resolve(memberOf('org-A', 'u-7', 'member'))),
    }
    const svc = new AssignApiKeyService(repo as any, memberRepo as any, orgAuth as any)
    const result = await svc.execute({
      keyId: 'k-1', orgId: 'org-A', assigneeUserId: 'u-7',
      callerUserId: 'mgr', callerSystemRole: 'manager',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('CROSS_ORG_ASSIGNMENT')
  })

  test('呼叫者非 org manager → 拒絕', async () => {
    const deniedAuth = { requireOrgManager: mock(() => Promise.resolve({ authorized: false, error: 'NOT_ORG_MANAGER' })) }
    const repo = { findById: mock(() => Promise.resolve(makeKey())), update: mock(() => Promise.resolve()) }
    const memberRepo = { findByUserAndOrgId: mock(() => Promise.resolve(memberOf('org-A', 'u-7', 'member'))) }
    const svc = new AssignApiKeyService(repo as any, memberRepo as any, deniedAuth as any)
    const result = await svc.execute({
      keyId: 'k-1', orgId: 'org-A', assigneeUserId: 'u-7',
      callerUserId: 'mgr', callerSystemRole: 'member',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_ORG_MANAGER')
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `bun test src/Modules/ApiKey/__tests__/AssignApiKeyService.test.ts`
Expected: `AssignApiKeyService` 不存在 → 匯入失敗。

- [ ] **Step 3: 實作 Service**

```typescript
// src/Modules/ApiKey/Application/Services/AssignApiKeyService.ts
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { IOrganizationMemberRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository'
import type { IApiKeyRepository } from '../../Domain/Repositories/IApiKeyRepository'

export interface AssignApiKeyRequest {
  keyId: string
  orgId: string
  /** `null` = 取消指派 */
  assigneeUserId: string | null
  callerUserId: string
  callerSystemRole: string
}

export interface AssignApiKeyResponse {
  success: boolean
  message: string
  error?: string
}

export class AssignApiKeyService {
  constructor(
    private readonly apiKeyRepository: IApiKeyRepository,
    private readonly memberRepository: IOrganizationMemberRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
  ) {}

  async execute(req: AssignApiKeyRequest): Promise<AssignApiKeyResponse> {
    try {
      const authResult = await this.orgAuth.requireOrgManager(
        req.orgId,
        req.callerUserId,
        req.callerSystemRole,
      )
      if (!authResult.authorized) {
        return { success: false, message: 'Insufficient permissions', error: authResult.error ?? 'NOT_ORG_MANAGER' }
      }

      const key = await this.apiKeyRepository.findById(req.keyId)
      if (!key) {
        return { success: false, message: 'Key not found', error: 'KEY_NOT_FOUND' }
      }
      if (key.orgId !== req.orgId) {
        return { success: false, message: 'Key does not belong to this organization', error: 'CROSS_ORG_ASSIGNMENT' }
      }

      let updated = key
      if (req.assigneeUserId === null) {
        updated = key.unassign()
      } else {
        const member = await this.memberRepository.findByUserAndOrgId(req.assigneeUserId, req.orgId)
        if (!member) {
          return { success: false, message: 'Assignee is not a member of this organization', error: 'INVALID_ASSIGNEE' }
        }
        if (member.role.getValue() !== 'member') {
          return { success: false, message: 'v1 only allows assigning to org members with role=member', error: 'INVALID_ASSIGNEE_ROLE' }
        }
        updated = key.assignTo(req.assigneeUserId)
      }

      await this.apiKeyRepository.update(updated)
      return { success: true, message: 'Assignment updated' }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Assignment failed'
      return { success: false, message, error: message }
    }
  }
}
```

- [ ] **Step 4: 執行測試確認通過**

Run: `bun test src/Modules/ApiKey/__tests__/AssignApiKeyService.test.ts`
Expected: 6/6 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/Modules/ApiKey/Application/Services/AssignApiKeyService.ts src/Modules/ApiKey/__tests__/AssignApiKeyService.test.ts
git commit -m "feat: [api-key] 新增 AssignApiKeyService 指派/取消指派"
```

---

### Task B2: `ApiKeyServiceProvider` 註冊 `AssignApiKeyService`

**Files:**
- Modify: `src/Modules/ApiKey/Infrastructure/Providers/ApiKeyServiceProvider.ts`

- [ ] **Step 1: 在 provider 中加入 binding**

在檔案中找到其他 service binding 區塊（例如 `createApiKeyService`、`listApiKeysService`），以相同風格加入：

```typescript
container.singleton('assignApiKeyService', (c) => {
  return new AssignApiKeyService(
    c.make('apiKeyRepository') as IApiKeyRepository,
    c.make('organizationMemberRepository') as IOrganizationMemberRepository,
    c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
  )
})
```

並在檔頭加入對應 `import`：

```typescript
import { AssignApiKeyService } from '../../Application/Services/AssignApiKeyService'
import type { IOrganizationMemberRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository'
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
```

- [ ] **Step 2: 型別檢查**

Run: `bun run typecheck`
Expected: 無錯誤。

- [ ] **Step 3: Commit**

```bash
git add src/Modules/ApiKey/Infrastructure/Providers/ApiKeyServiceProvider.ts
git commit -m "feat: [api-key] 於 ApiKeyServiceProvider 註冊 AssignApiKeyService"
```

---

### Task B3: `ListApiKeysService` 新增 `assignedMemberId` 過濾

**Files:**
- Modify: `src/Modules/ApiKey/Application/Services/ListApiKeysService.ts`
- Test: `src/Modules/ApiKey/__tests__/ListApiKeysService.assigned.test.ts`

> 目標：不破壞現有簽章（Manager 端沿用 `findByOrgId`）、新增 `assignedMemberId?: string` 參數，當傳入時切換到 `findByOrgAndAssignedMember`。

- [ ] **Step 1: 寫失敗測試**

```typescript
// src/Modules/ApiKey/__tests__/ListApiKeysService.assigned.test.ts
import { describe, expect, test, mock } from 'bun:test'
import { ListApiKeysService } from '../Application/Services/ListApiKeysService'

describe('ListApiKeysService — assignedMemberId filter', () => {
  const orgAuth = { requireOrgMembership: mock(() => Promise.resolve({ authorized: true })) }

  test('未傳 assignedMemberId 時使用 findByOrgId', async () => {
    const repo = {
      findByOrgId: mock(() => Promise.resolve([])),
      findByOrgAndAssignedMember: mock(() => Promise.resolve([])),
      countByOrgId: mock(() => Promise.resolve(0)),
      countByOrgAndAssignedMember: mock(() => Promise.resolve(0)),
    }
    const svc = new ListApiKeysService(repo as any, orgAuth as any)
    await svc.execute('org-A', 'u-1', 'manager')
    expect(repo.findByOrgId).toHaveBeenCalledTimes(1)
    expect(repo.findByOrgAndAssignedMember).not.toHaveBeenCalled()
  })

  test('傳入 assignedMemberId 時使用 findByOrgAndAssignedMember', async () => {
    const repo = {
      findByOrgId: mock(() => Promise.resolve([])),
      findByOrgAndAssignedMember: mock(() => Promise.resolve([])),
      countByOrgId: mock(() => Promise.resolve(0)),
      countByOrgAndAssignedMember: mock(() => Promise.resolve(0)),
    }
    const svc = new ListApiKeysService(repo as any, orgAuth as any)
    await svc.execute('org-A', 'u-1', 'member', 1, 20, { assignedMemberId: 'u-1' })
    expect(repo.findByOrgAndAssignedMember).toHaveBeenCalledTimes(1)
    const args = (repo.findByOrgAndAssignedMember as any).mock.calls[0]
    expect(args[0]).toBe('org-A')
    expect(args[1]).toBe('u-1')
  })
})
```

- [ ] **Step 2: 確認測試失敗**

Run: `bun test src/Modules/ApiKey/__tests__/ListApiKeysService.assigned.test.ts`
Expected: 第二個測試失敗（`findByOrgAndAssignedMember` 未被呼叫）。

- [ ] **Step 3: 更新 `ListApiKeysService.execute` 簽章與邏輯**

```typescript
// src/Modules/ApiKey/Application/Services/ListApiKeysService.ts
import type { OrgAuthorizationHelper } from '@/Modules/Organization/Application/Services/OrgAuthorizationHelper'
import type { IApiKeyRepository } from '../../Domain/Repositories/IApiKeyRepository'
import { ApiKeyPresenter, type ListApiKeysResponse } from '../DTOs/ApiKeyDTO'

export interface ListApiKeysFilter {
  /** 限縮到被指派給某 user 的 key（Member portal 使用）。 */
  assignedMemberId?: string
}

export class ListApiKeysService {
  constructor(
    private readonly apiKeyRepository: IApiKeyRepository,
    private readonly orgAuth: OrgAuthorizationHelper,
  ) {}

  async execute(
    orgId: string,
    callerUserId: string,
    callerSystemRole: string,
    page = 1,
    limit = 20,
    filter?: ListApiKeysFilter,
  ): Promise<ListApiKeysResponse> {
    try {
      const authResult = await this.orgAuth.requireOrgMembership(
        orgId,
        callerUserId,
        callerSystemRole,
      )
      if (!authResult.authorized) {
        return {
          success: false,
          message: 'No permission to access keys for this organization',
          error: authResult.error ?? 'NOT_ORG_MEMBER',
        }
      }

      const offset = (page - 1) * limit
      const useAssignedFilter = typeof filter?.assignedMemberId === 'string' && filter.assignedMemberId.length > 0

      const [keys, total] = await Promise.all([
        useAssignedFilter
          ? this.apiKeyRepository.findByOrgAndAssignedMember(orgId, filter!.assignedMemberId!, limit, offset)
          : this.apiKeyRepository.findByOrgId(orgId, limit, offset),
        useAssignedFilter
          ? this.apiKeyRepository.countByOrgAndAssignedMember(orgId, filter!.assignedMemberId!)
          : this.apiKeyRepository.countByOrgId(orgId),
      ])

      return {
        success: true,
        message: 'Query successful',
        data: {
          keys: keys.map((k) => ApiKeyPresenter.fromEntity(k)),
          meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Query failed'
      return { success: false, message, error: message }
    }
  }
}
```

- [ ] **Step 4: 測試通過**

Run: `bun test src/Modules/ApiKey/__tests__/ListApiKeysService.assigned.test.ts`
Expected: 2/2 PASS。

Run: `bun test src/Modules/ApiKey/__tests__`（全部 ApiKey tests）
Expected: 全部 PASS（確保沒有破壞既有測試）。

- [ ] **Step 5: Commit**

```bash
git add src/Modules/ApiKey/Application/Services/ListApiKeysService.ts src/Modules/ApiKey/__tests__/ListApiKeysService.assigned.test.ts
git commit -m "feat: [api-key] ListApiKeysService 支援 assignedMemberId 過濾"
```

---

### Task B4: Member 依 keyId 讀取須驗 `assignedMemberId`（可視度不變式）

> 背景：Spec §7.1 要求 Member 無法看到未指派給自己的 key，即使知道 keyId 也應 403。目前 Member portal 並無「依 keyId 讀取單把 key」的入口（因為 budget 頁面即將被移除）。保留此不變式由 `MemberApiKeysPage`（列表）過濾即可達成。

- [ ] **Step 1: 於 spec 的規則層級以文件確認**

本任務「無程式碼改動」— 作為明確 note：
因為 M1–M2 將移除 Member 端所有 key 操作入口（create / revoke / budget），不存在依 keyId 讀取的路徑。若未來新增「Member 查看 key 詳細」API，務必加入 `assignedMemberId = auth.userId AND orgId = membership.orgId` 的檢查。

- [ ] **Step 2: 在相關 code 處加 TODO 警示**

在 `src/Modules/ApiKey/Application/Services/ListApiKeysService.ts` 頂端加入：

```typescript
// NOTE (spec §7.1): Member 以 keyId 讀取單把 key 時，必須驗證
//   assigned_member_id = caller.userId AND orgId = caller.membership.orgId
// 未來若新增 GetApiKeyDetail service，務必加入上述檢查。
```

- [ ] **Step 3: Commit**

```bash
git add src/Modules/ApiKey/Application/Services/ListApiKeysService.ts
git commit -m "docs: [api-key] 註記 Member 單把 key 讀取的可視度規則 (spec §7.1)"
```

---

## Phase C — Org 建立邊界與移除成員的 key 解除指派

### Task C1: `CreateOrganizationService` 拒絕已具 membership 的 MEMBER

**Files:**
- Modify: `src/Modules/Organization/Application/Services/CreateOrganizationService.ts`
- Test: `src/Modules/Organization/__tests__/CreateOrganizationService.test.ts`

> 背景：現行 `isOrgManagerInAnyOrg` 僅攔截「已是 Manager」的使用者，但 spec §2 要求「尚未加入任何組織」才可建立。即便僅是 MEMBER 加入某 org，也必須禁止。

- [ ] **Step 1: 在既有 test 檔加入新案例**

於 `src/Modules/Organization/__tests__/CreateOrganizationService.test.ts` 尾端新增：

```typescript
describe('CreateOrganizationService — v1 單組織限制', () => {
  test('已具 member 身份者建立組織應被拒絕', async () => {
    const authRepo = {
      findById: mock(() => Promise.resolve({
        id: 'u-1', email: 'x@y', role: { isAdmin: () => false, isManager: () => false } as any,
      })),
      withTransaction: (tx: any) => ({ ...this, updateRole: mock(() => Promise.resolve()) }),
      updateRole: mock(() => Promise.resolve()),
    }
    const memberRepo = {
      isOrgManagerInAnyOrg: mock(() => Promise.resolve(false)),
      findByUserId: mock(() => Promise.resolve({ organizationId: 'org-existing' })), // 已在某 org
      withTransaction: (tx: any) => ({ save: mock(() => Promise.resolve()) }),
      save: mock(() => Promise.resolve()),
    }
    const orgRepo = {
      findBySlug: mock(() => Promise.resolve(null)),
      withTransaction: (tx: any) => ({ save: mock(() => Promise.resolve()) }),
      save: mock(() => Promise.resolve()),
    }
    const db = { transaction: async (cb: any) => cb({}) }
    const provision = { execute: mock(() => Promise.resolve()) }

    const svc = new CreateOrganizationService(
      orgRepo as any, memberRepo as any, authRepo as any, db as any, provision as any,
    )
    const result = await svc.execute({
      managerUserId: 'u-1',
      name: 'New Org',
      description: '',
      slug: 'new-org',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('ALREADY_HAS_ORGANIZATION')
    expect(memberRepo.save).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 確認測試失敗**

Run: `bun test src/Modules/Organization/__tests__/CreateOrganizationService.test.ts`
Expected: 新增案例失敗（service 尚未做這個檢查；只擋 manager）。

- [ ] **Step 3: 在 `CreateOrganizationService.execute` 加入一般 membership 檢查**

把原本 `const alreadyManager = ... isOrgManagerInAnyOrg(...)` 區塊，替換成更嚴格的 membership 檢查：

```typescript
      // v1 單組織：已具任何 membership（manager 或 member）者禁止建立新組織。
      const existingMembership = await this.memberRepository.findByUserId(request.managerUserId)
      if (existingMembership) {
        return {
          success: false,
          message: 'User already has an organization',
          error: 'ALREADY_HAS_ORGANIZATION',
        }
      }
```

> 保留原本 `isOrgManagerInAnyOrg` 呼叫作為冗餘防線並不必要（`findByUserId` 會涵蓋 manager 情境）；直接取代該段即可。

- [ ] **Step 4: 測試通過**

Run: `bun test src/Modules/Organization/__tests__/CreateOrganizationService.test.ts`
Expected: 全部 PASS（原有案例仍通過）。

- [ ] **Step 5: Commit**

```bash
git add src/Modules/Organization/Application/Services/CreateOrganizationService.ts src/Modules/Organization/__tests__/CreateOrganizationService.test.ts
git commit -m "feat: [organization] 拒絕已具 membership 者建立新組織 (spec §2)"
```

---

### Task C2: `RemoveMemberService` 解除該成員在該組織下被指派的 key

**Files:**
- Modify: `src/Modules/Organization/Application/Services/RemoveMemberService.ts`
- Test: `src/Modules/Organization/__tests__/RemoveMemberService.test.ts`

- [ ] **Step 1: 寫失敗測試**

在既有 test 檔加入：

```typescript
test('移除成員時會清除該組織下被指派給該成員的 key', async () => {
  const memberRepo = {
    findByUserAndOrgId: mock(() => Promise.resolve({
      id: 'm-1', userId: 'u-target', isManager: () => false,
    })),
    withTransaction: (_tx: any) => ({
      countManagersByOrgId: mock(() => Promise.resolve(2)),
      remove: mock(() => Promise.resolve()),
    }),
    countManagersByOrgId: mock(() => Promise.resolve(2)),
    remove: mock(() => Promise.resolve()),
    isOrgManagerInAnyOrg: mock(() => Promise.resolve(false)),
  }
  const authRepo = {
    findById: mock(() => Promise.resolve({ role: { isAdmin: () => false } })),
    updateRole: mock(() => Promise.resolve()),
  }
  const orgAuth = { requireOrgManager: mock(() => Promise.resolve({ authorized: true })) }
  const apiKeyRepo = {
    clearAssignmentsForMember: mock(() => Promise.resolve()),
    withTransaction: (_tx: any) => ({ clearAssignmentsForMember: mock(() => Promise.resolve()) }),
  }
  const db = { transaction: async (cb: any) => cb({}) }

  const svc = new RemoveMemberService(
    memberRepo as any, orgAuth as any, db as any, authRepo as any, apiKeyRepo as any,
  )
  const result = await svc.execute('org-A', 'u-target', 'u-requester', 'manager')
  expect(result.success).toBe(true)
  // 驗證 clearAssignmentsForMember 有被呼叫
  expect(apiKeyRepo.clearAssignmentsForMember).toHaveBeenCalled()
})
```

> 上述 test 假設 `RemoveMemberService` 建構子新增第 5 個參數 `apiKeyRepository: IApiKeyRepository`。下一 step 會實作。

- [ ] **Step 2: 確認測試失敗**

Run: `bun test src/Modules/Organization/__tests__/RemoveMemberService.test.ts`
Expected: 建構子參數錯誤或 `clearAssignmentsForMember` 未被呼叫。

- [ ] **Step 3: 修改 `RemoveMemberService` 建構子與 execute**

```typescript
// src/Modules/Organization/Application/Services/RemoveMemberService.ts
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import { RoleType } from '@/Modules/Auth/Domain/ValueObjects/Role'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IOrganizationMemberRepository } from '../../Domain/Repositories/IOrganizationMemberRepository'
import { OrgMembershipRules } from '../../Domain/Services/OrgMembershipRules'
import type { OrganizationResponse } from '../DTOs/OrganizationDTO'
import type { OrgAuthorizationHelper } from './OrgAuthorizationHelper'

export class RemoveMemberService {
  constructor(
    private memberRepository: IOrganizationMemberRepository,
    private orgAuth: OrgAuthorizationHelper,
    private db: IDatabaseAccess,
    private authRepository: IAuthRepository,
    private apiKeyRepository: IApiKeyRepository,
  ) {}

  async execute(
    orgId: string,
    targetUserId: string,
    requesterId: string,
    requesterSystemRole: string,
  ): Promise<OrganizationResponse> {
    try {
      const authResult = await this.orgAuth.requireOrgManager(orgId, requesterId, requesterSystemRole)
      if (!authResult.authorized) {
        return { success: false, message: 'Insufficient permissions', error: authResult.error }
      }
      if (targetUserId === requesterId) {
        return { success: false, message: 'Cannot remove yourself', error: 'CANNOT_REMOVE_SELF' }
      }
      const member = await this.memberRepository.findByUserAndOrgId(targetUserId, orgId)
      if (!member) {
        return { success: false, message: 'Member not found', error: 'MEMBER_NOT_FOUND' }
      }

      await this.db.transaction(async (tx) => {
        const txMemberRepo = this.memberRepository.withTransaction(tx)
        const txApiKeyRepo = this.apiKeyRepository.withTransaction(tx)

        if (member.isManager()) {
          const managerCount = await txMemberRepo.countManagersByOrgId(orgId)
          OrgMembershipRules.assertNotLastManager(member, managerCount)
        }
        // 先清除指派（key 本身保留）
        await txApiKeyRepo.clearAssignmentsForMember(orgId, targetUserId)
        await txMemberRepo.remove(member.id)
      })

      const targetUser = await this.authRepository.findById(targetUserId)
      if (targetUser && !targetUser.role.isAdmin()) {
        const stillManager = await this.memberRepository.isOrgManagerInAnyOrg(targetUserId)
        if (!stillManager) {
          await this.authRepository.updateRole(targetUserId, RoleType.MEMBER)
        }
      }

      return { success: true, message: 'Member removed successfully' }
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('last manager')) {
        return {
          success: false,
          message: 'Cannot remove the last manager',
          error: 'CANNOT_REMOVE_LAST_MANAGER',
        }
      }
      const message = error instanceof Error ? error.message : 'Remove failed'
      return { success: false, message, error: message }
    }
  }
}
```

- [ ] **Step 4: 更新 DI wiring**

在 `src/Modules/Organization/Infrastructure/Providers/OrganizationServiceProvider.ts` 找到 `removeMemberService` 的 binding，加入新依賴：

```typescript
container.singleton('removeMemberService', (c) => {
  return new RemoveMemberService(
    c.make('organizationMemberRepository') as IOrganizationMemberRepository,
    c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
    c.make('db') as IDatabaseAccess,
    c.make('authRepository') as IAuthRepository,
    c.make('apiKeyRepository') as IApiKeyRepository,
  )
})
```

（檔頭加入相應 `import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'`。）

- [ ] **Step 5: 測試通過 + 型別檢查**

Run: `bun test src/Modules/Organization/__tests__/RemoveMemberService.test.ts && bun run typecheck`
Expected: 全部 PASS、型別無錯。

- [ ] **Step 6: Commit**

```bash
git add src/Modules/Organization/Application/Services/RemoveMemberService.ts src/Modules/Organization/Infrastructure/Providers/OrganizationServiceProvider.ts src/Modules/Organization/__tests__/RemoveMemberService.test.ts
git commit -m "feat: [organization] 移除成員時清除其 assigned keys (spec §7.3)"
```

---

## Phase D — 登入導向 Manager 角色至 `/manager/dashboard`

### Task D1: `LoginPage` 在 `manager` 角色時導向 `/manager/dashboard`

**Files:**
- Modify: `src/Website/Auth/Pages/LoginPage.ts`
- Test: `src/Website/__tests__/Auth/LoginPage.test.ts`

> 現行邏輯在 `LoginPage.store`：
> ```
> const destination = result.data.user.role === 'admin' ? '/admin/dashboard' : '/member/dashboard'
> ```
> 需新增 `manager` 分支。

- [ ] **Step 1: 寫 / 更新失敗測試**

在 `LoginPage.test.ts` 新增：

```typescript
test('manager 登入後導向 /manager/dashboard', async () => {
  const ctx = createMockContext({
    get: (key: string) => (key === 'validated' ? { email: 'm@x', password: 'p' } : undefined),
  })
  const mockLogin = {
    execute: mock(() => Promise.resolve({
      success: true,
      data: {
        accessToken: 'a', refreshToken: 'r',
        user: { id: 'u-1', email: 'm@x', role: 'manager' },
      },
    })),
  }
  const page = new LoginPage({ render: mock() } as any, mockLogin as any)
  const res = await page.store(ctx)
  expect(res.headers.get('location')).toBe('/manager/dashboard')
})
```

- [ ] **Step 2: 確認測試失敗**

Run: `bun test src/Website/__tests__/Auth/LoginPage.test.ts`
Expected: 新 case 失敗（manager 被導向 `/member/dashboard`）。

- [ ] **Step 3: 改 `LoginPage.store`**

替換 destination 計算：

```typescript
const role = result.data.user.role
const destination =
  role === 'admin' ? '/admin/dashboard'
  : role === 'manager' ? '/manager/dashboard'
  : '/member/dashboard'
return ctx.redirect(destination)
```

並同樣修改 `LoginPage.handle`（已登入者重新造訪 `/login`）的 redirect：

```typescript
async handle(ctx: IHttpContext): Promise<Response> {
  const auth = AuthMiddleware.getAuthContext(ctx)
  if (auth) {
    const dest =
      auth.role === 'admin' ? '/admin/dashboard'
      : auth.role === 'manager' ? '/manager/dashboard'
      : '/member/dashboard'
    return ctx.redirect(dest)
  }
  return this.inertia.render(ctx, 'Auth/Login', { lastEmail: undefined })
}
```

- [ ] **Step 4: 測試通過**

Run: `bun test src/Website/__tests__/Auth/LoginPage.test.ts`
Expected: 全部 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/Website/Auth/Pages/LoginPage.ts src/Website/__tests__/Auth/LoginPage.test.ts
git commit -m "feat: [auth] manager 登入導向 /manager/dashboard"
```

---

### Task D2: `GoogleOAuthCallbackPage` 同步調整

**Files:**
- Modify: `src/Website/Auth/Pages/GoogleOAuthCallbackPage.ts`
- Test: `src/Website/__tests__/Auth/GoogleOAuthCallbackPage.test.ts`

- [ ] **Step 1: 寫失敗測試**

在既有 test 加入：

```typescript
test('manager 透過 Google OAuth 登入後導向 /manager/dashboard', async () => {
  // ...沿用原本測試的 mock 結構，將 role 改為 'manager'
  // expect(ctx.redirect).toHaveBeenCalledWith('/manager/dashboard', 302)
})
```

- [ ] **Step 2: 改 destination 計算**

找到檔案內：
```typescript
const destination = result.role === 'admin' ? '/admin/dashboard' : '/member/dashboard'
```
替換為：
```typescript
const destination =
  result.role === 'admin' ? '/admin/dashboard'
  : result.role === 'manager' ? '/manager/dashboard'
  : '/member/dashboard'
```

- [ ] **Step 3: 測試通過 + Commit**

Run: `bun test src/Website/__tests__/Auth/GoogleOAuthCallbackPage.test.ts`

```bash
git add src/Website/Auth/Pages/GoogleOAuthCallbackPage.ts src/Website/__tests__/Auth/GoogleOAuthCallbackPage.test.ts
git commit -m "feat: [auth] Google OAuth manager 登入導向 /manager/dashboard"
```

---

### Task D3: Email 驗證完成頁沿用既有 `redirectUrl`（無須改）

> 背景：`EmailVerificationService.execute` 回傳固定 `redirectUrl: '/member/dashboard'`。對 manager 角色而言，註冊流程中「建立組織後」才升級為 manager，因此在 email 驗證那一刻使用者仍為 MEMBER — 導向 `/member/dashboard` 正確（頁面會依 `hasOrganization` 顯示建立組織卡片）。因此本任務**無程式碼變更**，僅確認行為。

- [ ] **Step 1: 手動 trace**

閱讀 `src/Modules/Auth/Application/Services/EmailVerificationService.ts` 與 `src/Website/Auth/Pages/EmailVerificationPage.ts`，確認 email 驗證完成僅回 `/member/dashboard`。**不做變更**。

- [ ] **Step 2: Commit（略過；無變更）**

---

## Phase E — Manager Portal 基礎建設（slice / middleware / kernel / routes / bindings）

### Task E1: `src/Website/Manager/keys.ts`

**Files:**
- Create: `src/Website/Manager/keys.ts`

- [ ] **Step 1: 建立檔案**

```typescript
/**
 * String tokens for `container.make(...)` when resolving manager Inertia page singletons.
 *
 * 每個 value 必須在 registerManagerBindings 註冊 singleton，並在 registerManagerRoutes 被引用。
 */
export const MANAGER_PAGE_KEYS = {
  dashboard: 'page.manager.dashboard',
  organization: 'page.manager.organization',
  members: 'page.manager.members',
  apiKeys: 'page.manager.apiKeys',
  apiKeyCreate: 'page.manager.apiKeyCreate',
  apiKeyRevoke: 'page.manager.apiKeyRevoke',
  settings: 'page.manager.settings',
} as const

export type ManagerPageBindingKey = (typeof MANAGER_PAGE_KEYS)[keyof typeof MANAGER_PAGE_KEYS]
```

- [ ] **Step 2: Commit**

```bash
git add src/Website/Manager/keys.ts
git commit -m "feat: [manager-portal] 新增 MANAGER_PAGE_KEYS"
```

---

### Task E2: `requireManager` middleware

**Files:**
- Create: `src/Website/Manager/middleware/requireManager.ts`
- Test: `src/Website/__tests__/Manager/requireManager.test.ts`

> 與 `requireAdmin` 對稱。需要驗證：
> 1. 已登入（否則 redirect `/login`）
> 2. role === 'manager'（其餘角色：admin → redirect `/admin/dashboard`；member → redirect `/member/dashboard`）
> 3. **不**在 middleware 層驗證 `organization_id`；改由 page handler 查 `findByUserId` 後：
>    - 無 membership → redirect `/member/dashboard`（空白引導頁會顯示建立組織卡片）
>    - 有 membership 但 role 不是 manager → 不可能（系統不變式）；保守起見 redirect `/member/dashboard`
>
> 理由：middleware 會同時套用給 GET 與 POST；若 middleware 把 org missing 直接 redirect，POST handler 會回非 JSON/non-Inertia response，破壞 Inertia 導航。pagination handler 自行處理較安全（`/member/alerts` 就是此前例）。

- [ ] **Step 1: 寫失敗測試**

```typescript
// src/Website/__tests__/Manager/requireManager.test.ts
import { describe, expect, test } from 'bun:test'
import { requireManager } from '../../Manager/middleware/requireManager'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

function makeCtx(auth: any, redirects: { calls: any[] }): IHttpContext {
  const store = new Map<string, unknown>()
  if (auth) store.set('auth', auth)
  return {
    get: (k: string) => store.get(k),
    set: (k: string, v: unknown) => { store.set(k, v) },
    getHeader: () => undefined, getParam: () => undefined,
    getPathname: () => '/manager/dashboard', getQuery: () => undefined,
    params: {}, query: {}, headers: {},
    redirect: (url: string, status?: number) => {
      redirects.calls.push({ url, status })
      return new Response(null, { status: status ?? 302, headers: { location: url } })
    },
    json: (d: any) => Response.json(d),
    text: (s: string) => new Response(s),
    getBodyText: async () => '', getJsonBody: async <T>() => ({} as T), getBody: async <T>() => ({} as T),
    getMethod: () => 'GET', getCookie: () => undefined, setCookie: () => {},
  } as unknown as IHttpContext
}

describe('requireManager', () => {
  test('未登入 → redirect /login', () => {
    const redirects = { calls: [] }
    const ctx = makeCtx(null, redirects)
    const r = requireManager(ctx)
    expect(r.ok).toBe(false)
    expect(redirects.calls[0]!.url).toBe('/login')
  })

  test('admin → redirect /admin/dashboard', () => {
    const redirects = { calls: [] }
    const ctx = makeCtx({ userId: 'a', email: 'a', role: 'admin' }, redirects)
    const r = requireManager(ctx)
    expect(r.ok).toBe(false)
    expect(redirects.calls[0]!.url).toBe('/admin/dashboard')
  })

  test('member → redirect /member/dashboard', () => {
    const redirects = { calls: [] }
    const ctx = makeCtx({ userId: 'm', email: 'm', role: 'member' }, redirects)
    const r = requireManager(ctx)
    expect(r.ok).toBe(false)
    expect(redirects.calls[0]!.url).toBe('/member/dashboard')
  })

  test('manager → ok', () => {
    const redirects = { calls: [] }
    const ctx = makeCtx({ userId: 'mg', email: 'mg', role: 'manager' }, redirects)
    const r = requireManager(ctx)
    expect(r.ok).toBe(true)
    expect(r.auth?.role).toBe('manager')
  })
})
```

- [ ] **Step 2: 執行確認失敗**

Run: `bun test src/Website/__tests__/Manager/requireManager.test.ts`
Expected: 檔案不存在 → 匯入失敗。

- [ ] **Step 3: 實作 middleware**

```typescript
// src/Website/Manager/middleware/requireManager.ts
import { type AuthContext, AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

/** Result of {@link requireManager}. */
export interface ManagerAuthResult {
  ok: boolean
  auth?: AuthContext
  response?: Response
}

/**
 * 要求呼叫者 role = 'manager'。
 *
 * - 未登入：redirect `/login`
 * - admin：redirect `/admin/dashboard`
 * - member：redirect `/member/dashboard`
 * - manager：`{ ok: true, auth }`，由 page handler 自行確認 `organization_id`
 *   （見 spec §2「manager 但無有效 org」的異常狀態處理）。
 */
export function requireManager(ctx: IHttpContext): ManagerAuthResult {
  const auth = AuthMiddleware.getAuthContext(ctx)
  if (!auth) {
    return { ok: false, response: ctx.redirect('/login') }
  }
  if (auth.role === 'admin') {
    return { ok: false, response: ctx.redirect('/admin/dashboard') }
  }
  if (auth.role !== 'manager') {
    return { ok: false, response: ctx.redirect('/member/dashboard') }
  }
  return { ok: true, auth }
}
```

- [ ] **Step 4: 測試通過**

Run: `bun test src/Website/__tests__/Manager/requireManager.test.ts`
Expected: 4/4 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/Website/Manager/middleware/requireManager.ts src/Website/__tests__/Manager/requireManager.test.ts
git commit -m "feat: [manager-portal] 新增 requireManager middleware"
```

---

### Task E3: `HttpKernel.groups.manager()`

**Files:**
- Modify: `src/Website/Http/HttpKernel.ts`

- [ ] **Step 1: 在檔頭 import `requireManager`**

```typescript
import { requireManager } from '@/Website/Manager/middleware/requireManager'
```

- [ ] **Step 2: 新增內部 wrapper function**

在既有 `requireMemberMiddleware` 函式之後加入：

```typescript
function requireManagerMiddleware(): Middleware {
  return async (ctx, next) => {
    const r = requireManager(ctx)
    return r.ok ? next() : r.response!
  }
}
```

- [ ] **Step 3: 在 `groups` 加入 `manager`**

在 `groups.member` 之後加入：

```typescript
    /** Manager 區域：web 基底 + manager role 驗證 */
    manager: (): Middleware[] => [
      ...webBase(),
      requireManagerMiddleware(),
      pendingCookiesMiddleware(),
    ],
```

- [ ] **Step 4: 型別檢查**

Run: `bun run typecheck`
Expected: 無錯誤。

- [ ] **Step 5: Commit**

```bash
git add src/Website/Http/HttpKernel.ts
git commit -m "feat: [manager-portal] HttpKernel.groups.manager"
```

---

### Task E4: `withManagerInertiaPageHandler`

**Files:**
- Modify: `src/Website/Http/Inertia/withInertiaPage.ts`

- [ ] **Step 1: 新增 wrapper function**

在 `withMemberInertiaPageHandler` 之後加入：

```typescript
/**
 * Manager 區域 wrapper。
 * Chain：attachJwt → attachWebCsrf → injectSharedData → requireManager → applyPendingCookies → handler
 */
export function withManagerInertiaPageHandler(
  handler: (ctx: IHttpContext) => Promise<Response>,
): RouteHandler {
  return composePageHandler(HttpKernel.groups.manager(), handler)
}
```

- [ ] **Step 2: 型別檢查 + Commit**

```bash
git add src/Website/Http/Inertia/withInertiaPage.ts
git commit -m "feat: [manager-portal] withManagerInertiaPageHandler wrapper"
```

---

### Task E5: Skeleton `registerManagerBindings`

**Files:**
- Create: `src/Website/Manager/bindings/registerManagerBindings.ts`

- [ ] **Step 1: 建立 skeleton（各 page 於對應 Phase 加入 binding）**

```typescript
/**
 * Registers manager Inertia page classes as container singletons.
 * 每個 page 的 binding 會在該 page 的實作任務中新增。
 */
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'

export function registerManagerBindings(_container: IContainer): void {
  // 後續在 Phase F–K 各任務中新增每個 page 的 binding。
}
```

- [ ] **Step 2: Commit**

```bash
git add src/Website/Manager/bindings/registerManagerBindings.ts
git commit -m "feat: [manager-portal] registerManagerBindings skeleton"
```

---

### Task E6: Skeleton `registerManagerRoutes`

**Files:**
- Create: `src/Website/Manager/routes/registerManagerRoutes.ts`

- [ ] **Step 1: 建立 skeleton（路由列表於對應 Phase 填入）**

```typescript
/**
 * Manager Area Routes — 每個路由對應 DI container 中的 page singleton。
 * 個別路由於 Phase F–K 填入。
 */
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type {
  IModuleRouter,
  ModuleRouteOptions,
  RouteHandler,
} from '@/Shared/Presentation/IModuleRouter'

import { bindPageAction } from '@/Website/Http/Routing/bindPageAction'
import { withManagerInertiaPageHandler } from '@/Website/Http/Inertia/withInertiaPage'
import type { ManagerPageBindingKey } from '../keys'
import { MANAGER_PAGE_KEYS } from '../keys'

type InertiaHandler = (ctx: IHttpContext) => Promise<Response>

type ManagerPageInstance = {
  handle(ctx: IHttpContext): Promise<Response>
  store?(ctx: IHttpContext): Promise<Response>
  update?(ctx: IHttpContext): Promise<Response>
  invite?(ctx: IHttpContext): Promise<Response>
  remove?(ctx: IHttpContext): Promise<Response>
  assign?(ctx: IHttpContext): Promise<Response>
  revoke?(ctx: IHttpContext): Promise<Response>
}

export type ManagerRouteDef = {
  readonly method: 'get' | 'post' | 'put' | 'delete'
  readonly path: string
  readonly page: ManagerPageBindingKey
  readonly action: keyof ManagerPageInstance & string
  readonly name?: string
}

/** 路由定義由各 Phase（F–K）填入。 */
const MANAGER_PAGE_ROUTES: readonly ManagerRouteDef[] = [
  // 填入順序：dashboard, organization, members, apiKeys, apiKeyCreate, apiKeyRevoke, settings
]

function registerManagerHttpRoute(
  router: IModuleRouter,
  method: ManagerRouteDef['method'],
  path: string,
  handler: RouteHandler,
  routeOptions?: ModuleRouteOptions,
): void {
  if (method === 'get') router.get(path, handler, routeOptions)
  else if (method === 'post') router.post(path, handler, routeOptions)
  else if (method === 'put') router.put(path, handler, routeOptions)
  else router.delete(path, handler, routeOptions)
}

export function registerManagerRoutes(router: IModuleRouter, container: IContainer): void {
  for (const { method, path, page, action, name } of MANAGER_PAGE_ROUTES) {
    const inner = bindPageAction(container, page, action) as InertiaHandler
    const opts = name !== undefined ? { name } : undefined
    registerManagerHttpRoute(router, method, path, withManagerInertiaPageHandler(inner), opts)
  }
}
```

> 假設 `IModuleRouter` 有 `delete` method；若沒有，請看 `src/Shared/Presentation/IModuleRouter.ts` 實際 API，改用對應 method（例如 `router.method('DELETE', path, ...)`）。在實作 members 移除路由時以 POST 加 `/remove` 亦可（見 Task H2）。為了與 Organization API（`DELETE /api/organizations/:id/members/:userId`）解耦，本 portal 內 form submit 一律用 `POST`。

修正：將 `ManagerRouteDef['method']` 縮為 `'get' | 'post' | 'put'`，移除 `delete`：

```typescript
export type ManagerRouteDef = {
  readonly method: 'get' | 'post' | 'put'
  readonly path: string
  readonly page: ManagerPageBindingKey
  readonly action: keyof ManagerPageInstance & string
  readonly name?: string
}

function registerManagerHttpRoute(
  router: Pick<IModuleRouter, 'get' | 'post' | 'put'>,
  method: 'get' | 'post' | 'put',
  path: string,
  handler: RouteHandler,
  routeOptions?: ModuleRouteOptions,
): void {
  if (method === 'get') router.get(path, handler, routeOptions)
  else if (method === 'post') router.post(path, handler, routeOptions)
  else router.put(path, handler, routeOptions)
}

export function registerManagerRoutes(
  router: Pick<IModuleRouter, 'get' | 'post' | 'put'>,
  container: IContainer,
): void {
  for (const { method, path, page, action, name } of MANAGER_PAGE_ROUTES) {
    const inner = bindPageAction(container, page, action) as InertiaHandler
    const opts = name !== undefined ? { name } : undefined
    registerManagerHttpRoute(router, method, path, withManagerInertiaPageHandler(inner), opts)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/Website/Manager/routes/registerManagerRoutes.ts
git commit -m "feat: [manager-portal] registerManagerRoutes skeleton"
```

---

### Task E7: 在 bootstrap 註冊 Manager bindings 與 routes

**Files:**
- Modify: `src/Website/bootstrap/registerWebsiteBindings.ts`
- Modify: `src/Website/bootstrap/registerWebsiteRoutes.ts`

- [ ] **Step 1: `registerWebsiteBindings.ts` 加入 `registerManagerBindings`**

```typescript
import { registerManagerBindings } from '@/Website/Manager/bindings/registerManagerBindings'
// ...
export function registerWebsiteBindings(container: IContainer): void {
  const { inertiaService } = PAGE_CONTAINER_KEYS
  container.singleton(inertiaService, () => getInertiaServiceSingleton())
  registerAuthBindings(container)
  registerAdminBindings(container)
  registerManagerBindings(container) // ← 新增
  registerMemberBindings(container)
}
```

- [ ] **Step 2: `registerWebsiteRoutes.ts` 加入 `registerManagerRoutes`**

```typescript
import { registerManagerRoutes } from '@/Website/Manager/routes/registerManagerRoutes'
// ...
const WEBSITE_ROUTE_REGISTRATIONS: readonly WebsiteRouteRegistration[] = [
  { register: registerAuthRoutes },
  { register: registerAdminRoutes },
  { register: registerManagerRoutes }, // ← 新增
  { register: registerMemberRoutes },
  { register: (r) => registerStaticAssets(r) },
]
```

- [ ] **Step 3: 型別檢查 + build smoke**

Run: `bun run typecheck`
Expected: 無錯誤。

Run: `bun run dev`（啟動 dev server 片刻後 Ctrl+C）
Expected: 伺服器啟動無錯。

- [ ] **Step 4: Commit**

```bash
git add src/Website/bootstrap/registerWebsiteBindings.ts src/Website/bootstrap/registerWebsiteRoutes.ts
git commit -m "feat: [manager-portal] bootstrap 註冊 manager slice"
```

---

## Phase F — Manager Dashboard

### Task F1: `ManagerDashboardPage` backend + test

**Files:**
- Create: `src/Website/Manager/Pages/ManagerDashboardPage.ts`
- Create: `src/Website/__tests__/Manager/ManagerDashboardPage.test.ts`

> Dashboard 顯示：組織用量總覽、合約配額（已配發／未分配／合約上限）、各 key 用量排行簡表。v1 可先只聚合既有 service：`GetBalanceService`（餘額）、`ListApiKeysService`（key list 統計 `quotaAllocated` 總和）。

- [ ] **Step 1: 寫失敗測試**

```typescript
// src/Website/__tests__/Manager/ManagerDashboardPage.test.ts
import { describe, expect, mock, test } from 'bun:test'
import { loadMessages } from '@/Shared/Infrastructure/I18n'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { ManagerDashboardPage } from '../../Manager/Pages/ManagerDashboardPage'

function makeCtx(): IHttpContext {
  const store = new Map<string, unknown>()
  const auth = { userId: 'mgr-1', email: 'm@x', role: 'manager' }
  store.set('auth', auth)
  store.set('inertia:shared', {
    locale: 'en', messages: loadMessages('en'),
    auth: { user: { id: auth.userId, email: auth.email, role: auth.role } },
    currentOrgId: null, flash: {},
  })
  return {
    get: <T>(k: string) => store.get(k) as T | undefined,
    set: (k: string, v: unknown) => { store.set(k, v) },
    getPathname: () => '/manager/dashboard',
    getQuery: () => undefined, getHeader: () => undefined, getParam: () => undefined,
    getMethod: () => 'GET', getCookie: () => undefined, setCookie: () => {},
    json: (d: any) => Response.json(d), text: (s: string) => new Response(s),
    redirect: (u: string) => Response.redirect(u, 302),
    getBodyText: async () => '', getJsonBody: async <T>() => ({} as T), getBody: async <T>() => ({} as T),
    params: {}, query: {}, headers: {},
  } as unknown as IHttpContext
}

function mkInertia() {
  const captured: { lastCall: { component: string; props: any } | null } = { lastCall: null }
  return {
    inertia: {
      render: (_c: IHttpContext, component: string, props: any) => {
        captured.lastCall = { component, props }
        return new Response(JSON.stringify({ component, props }))
      },
    } as any,
    captured,
  }
}

describe('ManagerDashboardPage', () => {
  test('無 membership → 導向 /member/dashboard', async () => {
    const ctx = makeCtx()
    const { inertia } = mkInertia()
    const memberRepo = { findByUserId: mock(() => Promise.resolve(null)) }
    const page = new ManagerDashboardPage(
      inertia,
      { execute: mock() } as any, // balance
      { execute: mock() } as any, // listKeys
      memberRepo as any,
    )
    const res = await page.handle(ctx)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/member/dashboard')
  })

  test('有 membership → 渲染 Manager/Dashboard/Index 並注入 orgId', async () => {
    const ctx = makeCtx()
    const { inertia, captured } = mkInertia()
    const memberRepo = {
      findByUserId: mock(() => Promise.resolve({ organizationId: 'org-A', userId: 'mgr-1' })),
    }
    const balance = { execute: mock(() => Promise.resolve({ success: true, data: { balance: '100', lowBalanceThreshold: '10', status: 'ok' } })) }
    const listKeys = {
      execute: mock(() => Promise.resolve({
        success: true,
        data: {
          keys: [
            { id: 'k1', label: 'Prod', quotaAllocated: 50, usageCurrent: 10, assignedMemberId: 'u-1' },
          ],
          meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
        },
      })),
    }
    const page = new ManagerDashboardPage(inertia, balance as any, listKeys as any, memberRepo as any)
    await page.handle(ctx)
    expect(captured.lastCall?.component).toBe('Manager/Dashboard/Index')
    expect(captured.lastCall?.props.orgId).toBe('org-A')
    expect(captured.lastCall?.props.balance?.balance).toBe('100')
    expect(captured.lastCall?.props.keys?.length).toBe(1)
  })
})
```

- [ ] **Step 2: 確認測試失敗**

Run: `bun test src/Website/__tests__/Manager/ManagerDashboardPage.test.ts`
Expected: 匯入錯誤。

- [ ] **Step 3: 實作 Page**

```typescript
// src/Website/Manager/Pages/ManagerDashboardPage.ts
import type { GetBalanceService } from '@/Modules/Credit/Application/Services/GetBalanceService'
import type { ListApiKeysService } from '@/Modules/ApiKey/Application/Services/ListApiKeysService'
import type { IOrganizationMemberRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'

/**
 * Path: `/manager/dashboard`
 * React Page: `Manager/Dashboard/Index`
 *
 * Spec §2 異常狀態：manager 無有效 org → redirect /member/dashboard（無組織的空白引導頁）
 */
export class ManagerDashboardPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly balanceService: GetBalanceService,
    private readonly listApiKeysService: ListApiKeysService,
    private readonly memberRepository: IOrganizationMemberRepository,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const membership = await this.memberRepository.findByUserId(auth.userId)
    if (!membership) {
      return ctx.redirect('/member/dashboard')
    }
    const orgId = membership.organizationId

    const [balanceResult, listResult] = await Promise.all([
      this.balanceService.execute(orgId, auth.userId, auth.role),
      this.listApiKeysService.execute(orgId, auth.userId, auth.role, 1, 100),
    ])

    return this.inertia.render(ctx, 'Manager/Dashboard/Index', {
      orgId,
      balance: balanceResult.success ? (balanceResult.data ?? null) : null,
      keys: listResult.success ? (listResult.data?.keys ?? []) : [],
      error: balanceResult.success && listResult.success ? null : { key: 'manager.dashboard.loadFailed' },
    })
  }
}
```

- [ ] **Step 4: 測試通過**

Run: `bun test src/Website/__tests__/Manager/ManagerDashboardPage.test.ts`
Expected: 2/2 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/Website/Manager/Pages/ManagerDashboardPage.ts src/Website/__tests__/Manager/ManagerDashboardPage.test.ts
git commit -m "feat: [manager-portal] ManagerDashboardPage"
```

---

### Task F2: 註冊 Dashboard binding 與路由

**Files:**
- Modify: `src/Website/Manager/bindings/registerManagerBindings.ts`
- Modify: `src/Website/Manager/routes/registerManagerRoutes.ts`

- [ ] **Step 1: 在 bindings 加入**

```typescript
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { PAGE_CONTAINER_KEYS } from '@/Website/Http/Inertia/createInertiaRequestHandler'
import type { GetBalanceService } from '@/Modules/Credit/Application/Services/GetBalanceService'
import type { ListApiKeysService } from '@/Modules/ApiKey/Application/Services/ListApiKeysService'
import type { IOrganizationMemberRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository'
import { ManagerDashboardPage } from '../Pages/ManagerDashboardPage'
import { MANAGER_PAGE_KEYS } from '../keys'

export function registerManagerBindings(container: IContainer): void {
  const i = PAGE_CONTAINER_KEYS.inertiaService
  const k = MANAGER_PAGE_KEYS

  container.singleton(k.dashboard, (c) => {
    return new ManagerDashboardPage(
      c.make(i) as InertiaService,
      c.make('getBalanceService') as GetBalanceService,
      c.make('listApiKeysService') as ListApiKeysService,
      c.make('organizationMemberRepository') as IOrganizationMemberRepository,
    )
  })

  // Task G2–K2 會補齊其他 page 的 binding
}
```

- [ ] **Step 2: 在 `MANAGER_PAGE_ROUTES` 加一列**

```typescript
const MANAGER_PAGE_ROUTES: readonly ManagerRouteDef[] = [
  {
    method: 'get',
    path: '/manager/dashboard',
    page: MANAGER_PAGE_KEYS.dashboard,
    action: 'handle',
    name: 'pages.manager.dashboard',
  },
]
```

- [ ] **Step 3: 型別檢查 + 手動 smoke**

Run: `bun run typecheck && bun run dev`
Expected: 無錯誤；瀏覽器開 `/manager/dashboard` 以 manager 帳號登入可看到 Inertia 請求命中（前端元件尚未存在會顯示白頁 / 報錯 — F3 會補）。

- [ ] **Step 4: Commit**

```bash
git add src/Website/Manager/bindings/registerManagerBindings.ts src/Website/Manager/routes/registerManagerRoutes.ts
git commit -m "feat: [manager-portal] 註冊 Dashboard binding 與路由"
```

---

### Task F3: React 頁面 `Manager/Dashboard/Index.tsx`

**Files:**
- Create: `resources/js/Pages/Manager/Dashboard/Index.tsx`

- [ ] **Step 1: 建立最小可用頁面**

```tsx
import { Head } from '@inertiajs/react'
import { ManagerLayout } from '@/layouts/ManagerLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface KeyRow {
  id: string
  label: string
  quotaAllocated: number
  usageCurrent?: number
  assignedMemberId: string | null
}
interface Balance {
  balance: string
  lowBalanceThreshold: string
  status: string
}

interface Props {
  orgId: string | null
  balance: Balance | null
  keys: KeyRow[]
  error: { key: string } | null
}

export default function ManagerDashboardIndex({ orgId, balance, keys, error }: Props) {
  const allocated = keys.reduce((s, k) => s + (k.quotaAllocated || 0), 0)

  return (
    <ManagerLayout>
      <Head title="Manager Dashboard" />
      <div className="grid gap-4 p-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>組織餘額</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{balance?.balance ?? '-'}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>已配發配額</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{allocated}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>API Keys 數量</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{keys.length}</CardContent>
        </Card>
      </div>

      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle>各 Key 用量</CardTitle>
            <CardDescription>Top 10 使用中的 key</CardDescription>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Label</th>
                  <th className="text-right py-2">配額</th>
                  <th className="text-right py-2">用量</th>
                  <th className="text-left py-2">指派</th>
                </tr>
              </thead>
              <tbody>
                {keys.slice(0, 10).map((k) => (
                  <tr key={k.id} className="border-b">
                    <td className="py-2">{k.label}</td>
                    <td className="text-right">{k.quotaAllocated}</td>
                    <td className="text-right">{k.usageCurrent ?? '-'}</td>
                    <td>{k.assignedMemberId ?? '未指派'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        {error && <p className="text-sm text-red-500 mt-2">載入失敗</p>}
        {!orgId && <p className="text-sm text-muted-foreground mt-2">尚未加入任何組織</p>}
      </div>
    </ManagerLayout>
  )
}
```

> `ManagerLayout` 將在 Task L1 建立。若先實作此 page，可暫時改用 `MemberLayout` 以維持可 render，L1 完成後再把 layout import 改回 `ManagerLayout`。建議依序執行（E → F → … → L）即可一次到位。

- [ ] **Step 2: Commit（Layout 可能暫缺；此 page 會在 L2 一併通過型別檢查）**

```bash
git add resources/js/Pages/Manager/Dashboard/Index.tsx
git commit -m "feat: [manager-portal] Dashboard Inertia page"
```

---

## Phase G — Manager 組織設定頁

### Task G1: `ManagerOrganizationPage` backend + test

**Files:**
- Create: `src/Website/Manager/Pages/ManagerOrganizationPage.ts`
- Create: `src/Website/__tests__/Manager/ManagerOrganizationPage.test.ts`

> 顯示：組織名稱、描述、合約資訊（唯讀）。
> 寫入：更新組織名稱 / 描述（`UpdateOrganizationService`）。
> 合約資訊來源：`ListContractsService.execute(orgId, auth.userId, auth.role)` 取 active 合約。

- [ ] **Step 1: 寫失敗測試**

```typescript
// src/Website/__tests__/Manager/ManagerOrganizationPage.test.ts
import { describe, expect, mock, test } from 'bun:test'
import { loadMessages } from '@/Shared/Infrastructure/I18n'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { ManagerOrganizationPage } from '../../Manager/Pages/ManagerOrganizationPage'

function makeCtx(overrides: Partial<IHttpContext> = {}): IHttpContext {
  const store = new Map<string, unknown>()
  const auth = { userId: 'mgr-1', email: 'm@x', role: 'manager' }
  store.set('auth', auth)
  store.set('inertia:shared', {
    locale: 'en', messages: loadMessages('en'),
    auth: { user: { id: auth.userId, email: auth.email, role: auth.role } },
    currentOrgId: null, flash: {},
  })
  return {
    get: <T>(k: string) => store.get(k) as T | undefined,
    set: (k: string, v: unknown) => { store.set(k, v) },
    getPathname: () => '/manager/organization',
    getQuery: () => undefined, getHeader: () => undefined, getParam: () => undefined,
    getMethod: () => 'GET', getCookie: () => undefined, setCookie: () => {},
    json: (d: any, s?: number) => Response.json(d, { status: s ?? 200 }),
    text: (s: string) => new Response(s),
    redirect: (u: string) => Response.redirect(u, 302),
    getBodyText: async () => '', getJsonBody: async <T>() => ({} as T), getBody: async <T>() => ({} as T),
    params: {}, query: {}, headers: {},
    ...overrides,
  } as unknown as IHttpContext
}

function mkInertia() {
  const captured: { lastCall: any } = { lastCall: null }
  return {
    inertia: {
      render: (_c: IHttpContext, component: string, props: any) => {
        captured.lastCall = { component, props }
        return new Response(JSON.stringify({ component, props }))
      },
    } as any,
    captured,
  }
}

describe('ManagerOrganizationPage', () => {
  test('handle: 無 membership → redirect /member/dashboard', async () => {
    const { inertia } = mkInertia()
    const page = new ManagerOrganizationPage(
      inertia,
      { execute: mock() } as any, // getOrg
      { execute: mock() } as any, // listContracts
      { execute: mock() } as any, // updateOrg
      { findByUserId: mock(() => Promise.resolve(null)) } as any,
    )
    const res = await page.handle(makeCtx())
    expect(res.status).toBe(302)
  })

  test('handle: 有 membership 渲染 Manager/Organization/Index', async () => {
    const { inertia, captured } = mkInertia()
    const page = new ManagerOrganizationPage(
      inertia,
      { execute: mock(() => Promise.resolve({ success: true, data: { id: 'org-A', name: 'Org', description: 'D', slug: 'o' } })) } as any,
      { execute: mock(() => Promise.resolve({ success: true, data: { contracts: [{ id: 'c1', status: 'active', terms: { creditQuota: 1000 } }] } })) } as any,
      { execute: mock() } as any,
      { findByUserId: mock(() => Promise.resolve({ organizationId: 'org-A' })) } as any,
    )
    await page.handle(makeCtx())
    expect(captured.lastCall.component).toBe('Manager/Organization/Index')
    expect(captured.lastCall.props.organization.id).toBe('org-A')
    expect(captured.lastCall.props.contracts.length).toBe(1)
  })

  test('update: 更新名稱後重導回 /manager/organization', async () => {
    const { inertia } = mkInertia()
    const updateSvc = { execute: mock(() => Promise.resolve({ success: true, data: { id: 'org-A' } })) }
    const ctx = makeCtx({
      get: <T>(k: string) => {
        if (k === 'validated') return { name: 'NewName', description: 'nd' } as any
        if (k === 'auth') return { userId: 'mgr-1', email: 'm', role: 'manager' } as any
        return undefined as any
      },
    })
    const page = new ManagerOrganizationPage(
      inertia,
      { execute: mock() } as any,
      { execute: mock() } as any,
      updateSvc as any,
      { findByUserId: mock(() => Promise.resolve({ organizationId: 'org-A' })) } as any,
    )
    const res = await page.update(ctx)
    expect(res.headers.get('location')).toBe('/manager/organization')
    expect(updateSvc.execute).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 確認失敗**

Run: `bun test src/Website/__tests__/Manager/ManagerOrganizationPage.test.ts`

- [ ] **Step 3: 實作 Page**

```typescript
// src/Website/Manager/Pages/ManagerOrganizationPage.ts
import type { GetOrganizationService } from '@/Modules/Organization/Application/Services/GetOrganizationService'
import type { ListContractsService } from '@/Modules/Contract/Application/Services/ListContractsService'
import type { UpdateOrganizationService } from '@/Modules/Organization/Application/Services/UpdateOrganizationService'
import type { IOrganizationMemberRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'

export class ManagerOrganizationPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly getOrganizationService: GetOrganizationService,
    private readonly listContractsService: ListContractsService,
    private readonly updateOrganizationService: UpdateOrganizationService,
    private readonly memberRepository: IOrganizationMemberRepository,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const membership = await this.memberRepository.findByUserId(auth.userId)
    if (!membership) return ctx.redirect('/member/dashboard')

    const orgId = membership.organizationId
    const [org, contracts] = await Promise.all([
      this.getOrganizationService.execute(orgId, auth.userId, auth.role),
      this.listContractsService.execute(orgId, auth.userId, auth.role),
    ])

    return this.inertia.render(ctx, 'Manager/Organization/Index', {
      orgId,
      organization: org.success ? org.data : null,
      contracts: contracts.success ? (contracts.data?.contracts ?? []) : [],
      error: org.success && contracts.success ? null : { key: 'manager.organization.loadFailed' },
    })
  }

  async update(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const membership = await this.memberRepository.findByUserId(auth.userId)
    if (!membership) return ctx.redirect('/member/dashboard')

    const body = ctx.get('validated') as { name?: string; description?: string } | undefined
    const result = await this.updateOrganizationService.execute(
      membership.organizationId,
      { name: body?.name ?? '', description: body?.description ?? '' },
      auth.userId,
      auth.role,
    )
    // 為保持 Inertia 導航一致，成功與否皆 redirect 回同頁（錯誤以 flash 訊息處理由後續 PR 實作）
    if (!result.success) {
      ctx.set('__pending_flash__', { key: 'manager.organization.updateFailed' })
    }
    return ctx.redirect('/manager/organization')
  }
}
```

> 若 `ListContractsService.execute` 簽章與 `execute(orgId, userId, role)` 不符，請改為對應簽章。實際檢視 `src/Modules/Contract/Application/Services/ListContractsService.ts`；若它只吃 `orgId`，去掉後兩個參數。

- [ ] **Step 4: 測試通過**

Run: `bun test src/Website/__tests__/Manager/ManagerOrganizationPage.test.ts`
Expected: 3/3 PASS。

- [ ] **Step 5: Commit**

```bash
git add src/Website/Manager/Pages/ManagerOrganizationPage.ts src/Website/__tests__/Manager/ManagerOrganizationPage.test.ts
git commit -m "feat: [manager-portal] ManagerOrganizationPage"
```

---

### Task G2: 註冊 Organization binding 與路由

**Files:**
- Modify: `src/Website/Manager/bindings/registerManagerBindings.ts`
- Modify: `src/Website/Manager/routes/registerManagerRoutes.ts`

- [ ] **Step 1: binding**

在 `registerManagerBindings` 中新增：

```typescript
import type { GetOrganizationService } from '@/Modules/Organization/Application/Services/GetOrganizationService'
import type { ListContractsService } from '@/Modules/Contract/Application/Services/ListContractsService'
import type { UpdateOrganizationService } from '@/Modules/Organization/Application/Services/UpdateOrganizationService'
import { ManagerOrganizationPage } from '../Pages/ManagerOrganizationPage'

container.singleton(k.organization, (c) => {
  return new ManagerOrganizationPage(
    c.make(i) as InertiaService,
    c.make('getOrganizationService') as GetOrganizationService,
    c.make('listContractsService') as ListContractsService,
    c.make('updateOrganizationService') as UpdateOrganizationService,
    c.make('organizationMemberRepository') as IOrganizationMemberRepository,
  )
})
```

- [ ] **Step 2: 路由**

```typescript
{ method: 'get', path: '/manager/organization', page: MANAGER_PAGE_KEYS.organization, action: 'handle', name: 'pages.manager.organization' },
{ method: 'put', path: '/manager/organization', page: MANAGER_PAGE_KEYS.organization, action: 'update', name: 'pages.manager.organization.update' },
```

- [ ] **Step 3: 型別檢查 + Commit**

```bash
git add src/Website/Manager/bindings/registerManagerBindings.ts src/Website/Manager/routes/registerManagerRoutes.ts
git commit -m "feat: [manager-portal] Organization binding + routes"
```

---

### Task G3: React 頁面 `Manager/Organization/Index.tsx`

**Files:**
- Create: `resources/js/Pages/Manager/Organization/Index.tsx`

- [ ] **Step 1: 建立頁面**

```tsx
import { useState } from 'react'
import { Head, router } from '@inertiajs/react'
import { ManagerLayout } from '@/layouts/ManagerLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

interface Organization {
  id: string
  name: string
  description: string
  slug: string
}
interface Contract {
  id: string
  status: string
  terms: { creditQuota?: number; startDate?: string; endDate?: string }
}
interface Props {
  organization: Organization | null
  contracts: Contract[]
  error: { key: string } | null
}

export default function ManagerOrganizationIndex({ organization, contracts, error }: Props) {
  const [name, setName] = useState(organization?.name ?? '')
  const [description, setDescription] = useState(organization?.description ?? '')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    router.put('/manager/organization', { name, description })
  }

  return (
    <ManagerLayout>
      <Head title="組織設定" />
      <div className="p-4 grid gap-4">
        <Card>
          <CardHeader><CardTitle>組織資訊</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-3 max-w-md">
              <div>
                <label className="text-sm">組織名稱</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm">描述</label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <Button type="submit">儲存</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>合約（唯讀）</CardTitle></CardHeader>
          <CardContent>
            {contracts.length === 0 ? (
              <p className="text-sm text-muted-foreground">尚無合約</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="border-b"><th className="text-left py-2">狀態</th><th className="text-right">配額</th><th className="text-left">有效期</th></tr></thead>
                <tbody>
                  {contracts.map((c) => (
                    <tr key={c.id} className="border-b">
                      <td>{c.status}</td>
                      <td className="text-right">{c.terms.creditQuota ?? '-'}</td>
                      <td>{c.terms.startDate ?? '-'} ~ {c.terms.endDate ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
        {error && <p className="text-sm text-red-500">載入失敗</p>}
      </div>
    </ManagerLayout>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/Pages/Manager/Organization/Index.tsx
git commit -m "feat: [manager-portal] Organization Inertia page"
```

---

## Phase H — Manager 成員管理

### Task H1: `ManagerMembersPage` backend + test

**Files:**
- Create: `src/Website/Manager/Pages/ManagerMembersPage.ts`
- Create: `src/Website/__tests__/Manager/ManagerMembersPage.test.ts`

> 功能：列出成員（含其被指派 key 名稱）、產生邀請連結、移除成員。
> 資料來源：`ListMembersService`（成員清單）、`InviteMemberService`（產生邀請）、`RemoveMemberService`（移除；已在 C2 加入 key 解除指派邏輯）、`ApiKeyRepository.findByOrgId`（取用 key 對照表）。

- [ ] **Step 1: 寫失敗測試**

```typescript
// src/Website/__tests__/Manager/ManagerMembersPage.test.ts
import { describe, expect, mock, test } from 'bun:test'
import { loadMessages } from '@/Shared/Infrastructure/I18n'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { ManagerMembersPage } from '../../Manager/Pages/ManagerMembersPage'

function makeCtx(overrides: Partial<IHttpContext> = {}): IHttpContext {
  const store = new Map<string, unknown>()
  const auth = { userId: 'mgr-1', email: 'm@x', role: 'manager' }
  store.set('auth', auth)
  store.set('inertia:shared', {
    locale: 'en', messages: loadMessages('en'),
    auth: { user: { id: auth.userId, email: auth.email, role: auth.role } },
    currentOrgId: null, flash: {},
  })
  return {
    get: <T>(k: string) => store.get(k) as T | undefined,
    set: (k: string, v: unknown) => { store.set(k, v) },
    getPathname: () => '/manager/members',
    getParam: () => undefined, getQuery: () => undefined, getHeader: () => undefined,
    getMethod: () => 'GET', getCookie: () => undefined, setCookie: () => {},
    json: (d: any, s?: number) => Response.json(d, { status: s ?? 200 }),
    text: (s: string) => new Response(s),
    redirect: (u: string) => Response.redirect(u, 302),
    getBodyText: async () => '', getJsonBody: async <T>() => ({} as T), getBody: async <T>() => ({} as T),
    params: {}, query: {}, headers: {},
    ...overrides,
  } as unknown as IHttpContext
}

function mkInertia() {
  const captured: { lastCall: any } = { lastCall: null }
  return {
    inertia: {
      render: (_c: IHttpContext, component: string, props: any) => {
        captured.lastCall = { component, props }
        return new Response(JSON.stringify({ component, props }))
      },
    } as any,
    captured,
  }
}

describe('ManagerMembersPage', () => {
  test('handle: 渲染成員列表且附上指派 key 名稱對應', async () => {
    const { inertia, captured } = mkInertia()
    const page = new ManagerMembersPage(
      inertia,
      { execute: mock(() => Promise.resolve({ success: true, data: {
        members: [
          { userId: 'u-1', email: 'a@x', displayName: 'A', joinedAt: '2026-01-01' },
          { userId: 'u-2', email: 'b@x', displayName: 'B', joinedAt: '2026-01-02' },
        ],
      } })) } as any,
      { execute: mock() } as any, // invite
      { execute: mock() } as any, // remove
      { findByOrgId: mock(() => Promise.resolve([
        { id: 'k-1', label: 'Prod', assignedMemberId: 'u-1' } as any,
      ])) } as any,
      { findByUserId: mock(() => Promise.resolve({ organizationId: 'org-A' })) } as any,
    )
    await page.handle(makeCtx())
    expect(captured.lastCall.component).toBe('Manager/Members/Index')
    expect(captured.lastCall.props.members[0].assignedKeys).toEqual(['Prod'])
    expect(captured.lastCall.props.members[1].assignedKeys).toEqual([])
  })

  test('invite: 成功後 redirect /manager/members', async () => {
    const { inertia } = mkInertia()
    const inviteSvc = { execute: mock(() => Promise.resolve({ success: true, data: { token: 'T', expiresAt: 'X' } })) }
    const ctx = makeCtx({
      get: <T>(k: string) => (k === 'validated' ? ({ email: 'new@x' } as any) : (k === 'auth' ? ({ userId: 'mgr-1', email: 'm', role: 'manager' } as any) : undefined)),
    })
    const page = new ManagerMembersPage(
      inertia,
      { execute: mock() } as any,
      inviteSvc as any,
      { execute: mock() } as any,
      { findByOrgId: mock(() => Promise.resolve([])) } as any,
      { findByUserId: mock(() => Promise.resolve({ organizationId: 'org-A' })) } as any,
    )
    const res = await page.invite(ctx)
    expect(res.headers.get('location')).toBe('/manager/members')
    expect(inviteSvc.execute).toHaveBeenCalled()
  })

  test('remove: 取 userId 參數並呼叫 RemoveMemberService', async () => {
    const { inertia } = mkInertia()
    const removeSvc = { execute: mock(() => Promise.resolve({ success: true })) }
    const ctx = makeCtx({
      getParam: (k: string) => (k === 'userId' ? 'u-2' : undefined),
    })
    const page = new ManagerMembersPage(
      inertia,
      { execute: mock() } as any,
      { execute: mock() } as any,
      removeSvc as any,
      { findByOrgId: mock(() => Promise.resolve([])) } as any,
      { findByUserId: mock(() => Promise.resolve({ organizationId: 'org-A' })) } as any,
    )
    const res = await page.remove(ctx)
    expect(res.headers.get('location')).toBe('/manager/members')
    expect((removeSvc.execute as any).mock.calls[0][0]).toBe('org-A') // orgId
    expect((removeSvc.execute as any).mock.calls[0][1]).toBe('u-2')   // targetUserId
  })
})
```

- [ ] **Step 2: 確認失敗**

Run: `bun test src/Website/__tests__/Manager/ManagerMembersPage.test.ts`

- [ ] **Step 3: 實作 Page**

```typescript
// src/Website/Manager/Pages/ManagerMembersPage.ts
import type { InviteMemberService } from '@/Modules/Organization/Application/Services/InviteMemberService'
import type { ListMembersService } from '@/Modules/Organization/Application/Services/ListMembersService'
import type { RemoveMemberService } from '@/Modules/Organization/Application/Services/RemoveMemberService'
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import type { IOrganizationMemberRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'

interface MemberRow {
  userId: string
  email: string
  displayName: string | null
  joinedAt: string
  assignedKeys: string[]
}

export class ManagerMembersPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly listMembersService: ListMembersService,
    private readonly inviteMemberService: InviteMemberService,
    private readonly removeMemberService: RemoveMemberService,
    private readonly apiKeyRepository: IApiKeyRepository,
    private readonly memberRepository: IOrganizationMemberRepository,
  ) {}

  private async resolveOrgId(ctx: IHttpContext): Promise<{ orgId: string } | { redirect: Response }> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const membership = await this.memberRepository.findByUserId(auth.userId)
    if (!membership) return { redirect: ctx.redirect('/member/dashboard') }
    return { orgId: membership.organizationId }
  }

  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const resolve = await this.resolveOrgId(ctx)
    if ('redirect' in resolve) return resolve.redirect
    const { orgId } = resolve

    const [listResult, keys] = await Promise.all([
      this.listMembersService.execute(orgId, auth.userId, auth.role),
      this.apiKeyRepository.findByOrgId(orgId),
    ])

    const assignedByUser = new Map<string, string[]>()
    for (const k of keys) {
      if (k.assignedMemberId) {
        const arr = assignedByUser.get(k.assignedMemberId) ?? []
        arr.push(k.label)
        assignedByUser.set(k.assignedMemberId, arr)
      }
    }

    const members: MemberRow[] = listResult.success
      ? (listResult.data?.members ?? []).map((m: any) => ({
          userId: m.userId,
          email: m.email,
          displayName: m.displayName ?? null,
          joinedAt: m.joinedAt,
          assignedKeys: assignedByUser.get(m.userId) ?? [],
        }))
      : []

    return this.inertia.render(ctx, 'Manager/Members/Index', {
      orgId,
      members,
      error: listResult.success ? null : { key: 'manager.members.loadFailed' },
    })
  }

  async invite(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const resolve = await this.resolveOrgId(ctx)
    if ('redirect' in resolve) return resolve.redirect
    const body = ctx.get('validated') as { email?: string; role?: string } | undefined
    await this.inviteMemberService.execute(
      resolve.orgId,
      auth.userId,
      auth.role,
      { email: body?.email ?? '', role: body?.role ?? 'member' },
    )
    return ctx.redirect('/manager/members')
  }

  async remove(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const resolve = await this.resolveOrgId(ctx)
    if ('redirect' in resolve) return resolve.redirect
    const targetUserId = ctx.getParam('userId') ?? ''
    await this.removeMemberService.execute(resolve.orgId, targetUserId, auth.userId, auth.role)
    return ctx.redirect('/manager/members')
  }
}
```

> 注意：`listMembersService.execute` 需回傳 member 的 `email` 與 `displayName`。若現行 DTO 未包含，後續可於 `ListMembersService` 補；此處假定已有該欄位。

- [ ] **Step 4: 測試通過 + Commit**

Run: `bun test src/Website/__tests__/Manager/ManagerMembersPage.test.ts`

```bash
git add src/Website/Manager/Pages/ManagerMembersPage.ts src/Website/__tests__/Manager/ManagerMembersPage.test.ts
git commit -m "feat: [manager-portal] ManagerMembersPage"
```

---

### Task H2: Members binding + routes

**Files:**
- Modify: `src/Website/Manager/bindings/registerManagerBindings.ts`
- Modify: `src/Website/Manager/routes/registerManagerRoutes.ts`

- [ ] **Step 1: binding**

```typescript
import type { ListMembersService } from '@/Modules/Organization/Application/Services/ListMembersService'
import type { InviteMemberService } from '@/Modules/Organization/Application/Services/InviteMemberService'
import type { RemoveMemberService } from '@/Modules/Organization/Application/Services/RemoveMemberService'
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
import { ManagerMembersPage } from '../Pages/ManagerMembersPage'

container.singleton(k.members, (c) => new ManagerMembersPage(
  c.make(i) as InertiaService,
  c.make('listMembersService') as ListMembersService,
  c.make('inviteMemberService') as InviteMemberService,
  c.make('removeMemberService') as RemoveMemberService,
  c.make('apiKeyRepository') as IApiKeyRepository,
  c.make('organizationMemberRepository') as IOrganizationMemberRepository,
))
```

- [ ] **Step 2: 路由**

```typescript
{ method: 'get',  path: '/manager/members',                    page: MANAGER_PAGE_KEYS.members, action: 'handle', name: 'pages.manager.members.index' },
{ method: 'post', path: '/manager/members/invite',             page: MANAGER_PAGE_KEYS.members, action: 'invite', name: 'pages.manager.members.invite' },
{ method: 'post', path: '/manager/members/:userId/remove',     page: MANAGER_PAGE_KEYS.members, action: 'remove', name: 'pages.manager.members.remove' },
```

- [ ] **Step 3: 型別檢查 + Commit**

```bash
git add src/Website/Manager/bindings/registerManagerBindings.ts src/Website/Manager/routes/registerManagerRoutes.ts
git commit -m "feat: [manager-portal] Members binding + routes"
```

---

### Task H3: React 頁面 `Manager/Members/Index.tsx`

**Files:**
- Create: `resources/js/Pages/Manager/Members/Index.tsx`

- [ ] **Step 1: 建立頁面**

```tsx
import { useState } from 'react'
import { Head, router } from '@inertiajs/react'
import { ManagerLayout } from '@/layouts/ManagerLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface MemberRow {
  userId: string
  email: string
  displayName: string | null
  joinedAt: string
  assignedKeys: string[]
}
interface Props {
  members: MemberRow[]
  error: { key: string } | null
}

export default function ManagerMembersIndex({ members, error }: Props) {
  const [email, setEmail] = useState('')

  const invite = (e: React.FormEvent) => {
    e.preventDefault()
    router.post('/manager/members/invite', { email, role: 'member' }, { onSuccess: () => setEmail('') })
  }
  const remove = (userId: string) => {
    if (!confirm('確定移除該成員？其被指派的 key 會解除指派（key 保留）')) return
    router.post(`/manager/members/${userId}/remove`)
  }

  return (
    <ManagerLayout>
      <Head title="成員管理" />
      <div className="p-4 grid gap-4">
        <Card>
          <CardHeader><CardTitle>邀請成員</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={invite} className="flex gap-2 max-w-md">
              <Input placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Button type="submit">產生邀請</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>現有成員</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="text-left py-2">Email</th><th className="text-left">姓名</th><th className="text-left">加入日期</th><th className="text-left">被指派 Keys</th><th className="text-right">操作</th></tr></thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.userId} className="border-b">
                    <td>{m.email}</td>
                    <td>{m.displayName ?? '-'}</td>
                    <td>{m.joinedAt}</td>
                    <td>{m.assignedKeys.length === 0 ? '-' : m.assignedKeys.join(', ')}</td>
                    <td className="text-right"><Button variant="outline" size="sm" onClick={() => remove(m.userId)}>移除</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        {error && <p className="text-sm text-red-500">載入失敗</p>}
      </div>
    </ManagerLayout>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/Pages/Manager/Members/Index.tsx
git commit -m "feat: [manager-portal] Members Inertia page"
```

---

## Phase I — Manager API Keys 列表 + 指派切換

### Task I1: `ManagerApiKeysPage` backend + test

**Files:**
- Create: `src/Website/Manager/Pages/ManagerApiKeysPage.ts`
- Create: `src/Website/__tests__/Manager/ManagerApiKeysPage.test.ts`

> 提供：列表（欄位：label / quotaAllocated / usage（若有）/ resetPeriod / assignedMemberId）、「指派切換」POST action、「撤銷」POST action（後者沿用 `RevokeApiKeyService`）。
> 下拉內容（可指派成員）需要同頁取得成員清單：複用 `ListMembersService` 並過濾 role=member。

- [ ] **Step 1: 寫失敗測試**

```typescript
// src/Website/__tests__/Manager/ManagerApiKeysPage.test.ts
import { describe, expect, mock, test } from 'bun:test'
import { loadMessages } from '@/Shared/Infrastructure/I18n'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { ManagerApiKeysPage } from '../../Manager/Pages/ManagerApiKeysPage'

function makeCtx(overrides: Partial<IHttpContext> = {}): IHttpContext {
  const store = new Map<string, unknown>()
  const auth = { userId: 'mgr-1', email: 'm@x', role: 'manager' }
  store.set('auth', auth)
  store.set('inertia:shared', {
    locale: 'en', messages: loadMessages('en'),
    auth: { user: { id: auth.userId, email: auth.email, role: auth.role } },
    currentOrgId: null, flash: {},
  })
  return {
    get: <T>(k: string) => store.get(k) as T | undefined,
    set: (k: string, v: unknown) => { store.set(k, v) },
    getPathname: () => '/manager/api-keys',
    getParam: () => undefined, getQuery: () => undefined, getHeader: () => undefined,
    getMethod: () => 'GET', getCookie: () => undefined, setCookie: () => {},
    json: (d: any, s?: number) => Response.json(d, { status: s ?? 200 }),
    text: (s: string) => new Response(s),
    redirect: (u: string) => Response.redirect(u, 302),
    getBodyText: async () => '', getJsonBody: async <T>() => ({} as T), getBody: async <T>() => ({} as T),
    params: {}, query: {}, headers: {},
    ...overrides,
  } as unknown as IHttpContext
}

function mkInertia() {
  const captured: { lastCall: any } = { lastCall: null }
  return {
    inertia: {
      render: (_c: IHttpContext, component: string, props: any) => {
        captured.lastCall = { component, props }
        return new Response(JSON.stringify({ component, props }))
      },
    } as any,
    captured,
  }
}

describe('ManagerApiKeysPage', () => {
  test('handle: 渲染 Manager/ApiKeys/Index 並帶入 keys + 成員下拉選項', async () => {
    const { inertia, captured } = mkInertia()
    const listKeys = { execute: mock(() => Promise.resolve({ success: true, data: {
      keys: [
        { id: 'k-1', label: 'Prod', quotaAllocated: 100, status: 'active', assignedMemberId: 'u-2' },
      ],
      meta: { total: 1, page: 1, limit: 100, totalPages: 1 },
    } })) }
    const listMembers = { execute: mock(() => Promise.resolve({ success: true, data: {
      members: [
        { userId: 'u-2', email: 'b@x', role: 'member', displayName: 'B' },
        { userId: 'mgr-1', email: 'm@x', role: 'manager', displayName: 'M' },
      ],
    } })) }
    const page = new ManagerApiKeysPage(
      inertia, listKeys as any, listMembers as any,
      { execute: mock() } as any, // assign
      { execute: mock() } as any, // revoke
      { findByUserId: mock(() => Promise.resolve({ organizationId: 'org-A' })) } as any,
    )
    await page.handle(makeCtx())
    expect(captured.lastCall.component).toBe('Manager/ApiKeys/Index')
    expect(captured.lastCall.props.keys.length).toBe(1)
    // v1：只列 role=member 的成員可被指派
    expect(captured.lastCall.props.assignees.map((a: any) => a.userId)).toEqual(['u-2'])
  })

  test('assign: POST 呼叫 AssignApiKeyService，null 代表取消指派', async () => {
    const assign = { execute: mock(() => Promise.resolve({ success: true })) }
    const ctx = makeCtx({
      getParam: (k: string) => (k === 'keyId' ? 'k-1' : undefined),
      get: <T>(k: string) => (k === 'validated' ? ({ assigneeUserId: null } as any) : (k === 'auth' ? ({ userId: 'mgr-1', email: 'm', role: 'manager' } as any) : undefined)),
    })
    const { inertia } = mkInertia()
    const page = new ManagerApiKeysPage(
      inertia,
      { execute: mock() } as any,
      { execute: mock() } as any,
      assign as any,
      { execute: mock() } as any,
      { findByUserId: mock(() => Promise.resolve({ organizationId: 'org-A' })) } as any,
    )
    const res = await page.assign(ctx)
    expect(res.headers.get('location')).toBe('/manager/api-keys')
    const args = (assign.execute as any).mock.calls[0][0]
    expect(args.orgId).toBe('org-A')
    expect(args.keyId).toBe('k-1')
    expect(args.assigneeUserId).toBe(null)
  })

  test('revoke: POST 呼叫 RevokeApiKeyService', async () => {
    const revoke = { execute: mock(() => Promise.resolve({ success: true })) }
    const ctx = makeCtx({ getParam: (k: string) => (k === 'keyId' ? 'k-1' : undefined) })
    const { inertia } = mkInertia()
    const page = new ManagerApiKeysPage(
      inertia,
      { execute: mock() } as any,
      { execute: mock() } as any,
      { execute: mock() } as any,
      revoke as any,
      { findByUserId: mock(() => Promise.resolve({ organizationId: 'org-A' })) } as any,
    )
    const res = await page.revoke(ctx)
    expect(res.headers.get('location')).toBe('/manager/api-keys')
    expect(revoke.execute).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 確認失敗**

Run: `bun test src/Website/__tests__/Manager/ManagerApiKeysPage.test.ts`

- [ ] **Step 3: 實作 Page**

```typescript
// src/Website/Manager/Pages/ManagerApiKeysPage.ts
import type { AssignApiKeyService } from '@/Modules/ApiKey/Application/Services/AssignApiKeyService'
import type { ListApiKeysService } from '@/Modules/ApiKey/Application/Services/ListApiKeysService'
import type { RevokeApiKeyService } from '@/Modules/ApiKey/Application/Services/RevokeApiKeyService'
import type { ListMembersService } from '@/Modules/Organization/Application/Services/ListMembersService'
import type { IOrganizationMemberRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'

export class ManagerApiKeysPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly listApiKeysService: ListApiKeysService,
    private readonly listMembersService: ListMembersService,
    private readonly assignApiKeyService: AssignApiKeyService,
    private readonly revokeApiKeyService: RevokeApiKeyService,
    private readonly memberRepository: IOrganizationMemberRepository,
  ) {}

  private async resolveOrgId(ctx: IHttpContext): Promise<{ orgId: string } | { redirect: Response }> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const m = await this.memberRepository.findByUserId(auth.userId)
    if (!m) return { redirect: ctx.redirect('/member/dashboard') }
    return { orgId: m.organizationId }
  }

  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const r = await this.resolveOrgId(ctx)
    if ('redirect' in r) return r.redirect

    const [list, members] = await Promise.all([
      this.listApiKeysService.execute(r.orgId, auth.userId, auth.role, 1, 100),
      this.listMembersService.execute(r.orgId, auth.userId, auth.role),
    ])

    const assignees = members.success
      ? (members.data?.members ?? [])
          .filter((m: any) => m.role === 'member')
          .map((m: any) => ({ userId: m.userId, email: m.email, displayName: m.displayName ?? null }))
      : []

    return this.inertia.render(ctx, 'Manager/ApiKeys/Index', {
      orgId: r.orgId,
      keys: list.success ? (list.data?.keys ?? []) : [],
      assignees,
      error: list.success && members.success ? null : { key: 'manager.apiKeys.loadFailed' },
    })
  }

  async assign(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const r = await this.resolveOrgId(ctx)
    if ('redirect' in r) return r.redirect
    const keyId = ctx.getParam('keyId') ?? ''
    const body = ctx.get('validated') as { assigneeUserId?: string | null } | undefined
    await this.assignApiKeyService.execute({
      keyId,
      orgId: r.orgId,
      assigneeUserId: body?.assigneeUserId ?? null,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
    })
    return ctx.redirect('/manager/api-keys')
  }

  async revoke(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const r = await this.resolveOrgId(ctx)
    if ('redirect' in r) return r.redirect
    const keyId = ctx.getParam('keyId') ?? ''
    await this.revokeApiKeyService.execute({
      keyId,
      orgId: r.orgId,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
    })
    return ctx.redirect('/manager/api-keys')
  }
}
```

> 若 `RevokeApiKeyService.execute` 簽章非 `{ keyId, orgId, callerUserId, callerSystemRole }`，以對應簽章代入。先檢視 `src/Modules/ApiKey/Application/Services/RevokeApiKeyService.ts`，對齊參數順序。

- [ ] **Step 4: 測試通過 + Commit**

Run: `bun test src/Website/__tests__/Manager/ManagerApiKeysPage.test.ts`

```bash
git add src/Website/Manager/Pages/ManagerApiKeysPage.ts src/Website/__tests__/Manager/ManagerApiKeysPage.test.ts
git commit -m "feat: [manager-portal] ManagerApiKeysPage (list + assign + revoke)"
```

---

### Task I2: ApiKeys list binding + routes

**Files:**
- Modify: `src/Website/Manager/bindings/registerManagerBindings.ts`
- Modify: `src/Website/Manager/routes/registerManagerRoutes.ts`

- [ ] **Step 1: binding**

```typescript
import type { ListApiKeysService } from '@/Modules/ApiKey/Application/Services/ListApiKeysService'
import type { AssignApiKeyService } from '@/Modules/ApiKey/Application/Services/AssignApiKeyService'
import type { RevokeApiKeyService } from '@/Modules/ApiKey/Application/Services/RevokeApiKeyService'
import type { ListMembersService } from '@/Modules/Organization/Application/Services/ListMembersService'
import { ManagerApiKeysPage } from '../Pages/ManagerApiKeysPage'

container.singleton(k.apiKeys, (c) => new ManagerApiKeysPage(
  c.make(i) as InertiaService,
  c.make('listApiKeysService') as ListApiKeysService,
  c.make('listMembersService') as ListMembersService,
  c.make('assignApiKeyService') as AssignApiKeyService,
  c.make('revokeApiKeyService') as RevokeApiKeyService,
  c.make('organizationMemberRepository') as IOrganizationMemberRepository,
))
```

- [ ] **Step 2: 路由**

```typescript
{ method: 'get',  path: '/manager/api-keys',                page: MANAGER_PAGE_KEYS.apiKeys, action: 'handle', name: 'pages.manager.apiKeys.index' },
{ method: 'post', path: '/manager/api-keys/:keyId/assign',  page: MANAGER_PAGE_KEYS.apiKeys, action: 'assign', name: 'pages.manager.apiKeys.assign' },
{ method: 'post', path: '/manager/api-keys/:keyId/revoke',  page: MANAGER_PAGE_KEYS.apiKeys, action: 'revoke', name: 'pages.manager.apiKeys.revoke' },
```

- [ ] **Step 3: Commit**

```bash
git add src/Website/Manager/bindings/registerManagerBindings.ts src/Website/Manager/routes/registerManagerRoutes.ts
git commit -m "feat: [manager-portal] ApiKeys list/assign/revoke routes"
```

---

### Task I3: React 頁面 `Manager/ApiKeys/Index.tsx`

**Files:**
- Create: `resources/js/Pages/Manager/ApiKeys/Index.tsx`

- [ ] **Step 1: 建立頁面（含指派下拉 + 撤銷按鈕）**

```tsx
import { Head, Link, router } from '@inertiajs/react'
import { ManagerLayout } from '@/layouts/ManagerLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface KeyRow {
  id: string
  label: string
  quotaAllocated: number
  status: string
  assignedMemberId: string | null
}
interface Assignee {
  userId: string
  email: string
  displayName: string | null
}
interface Props {
  keys: KeyRow[]
  assignees: Assignee[]
  error: { key: string } | null
}

export default function ManagerApiKeysIndex({ keys, assignees, error }: Props) {
  const revoke = (id: string) => {
    if (!confirm('撤銷後此 key 將失效，確定執行？')) return
    router.post(`/manager/api-keys/${id}/revoke`)
  }
  const onAssignChange = (keyId: string, value: string) => {
    const assigneeUserId = value === '' ? null : value
    router.post(`/manager/api-keys/${keyId}/assign`, { assigneeUserId })
  }

  return (
    <ManagerLayout>
      <Head title="API Keys" />
      <div className="p-4 grid gap-4">
        <div className="flex justify-end">
          <Link href="/manager/api-keys/create"><Button>建立 Key</Button></Link>
        </div>
        <Card>
          <CardHeader><CardTitle>API Keys</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="text-left py-2">名稱</th><th className="text-right">配額</th><th className="text-left">狀態</th><th className="text-left">指派對象</th><th className="text-right">操作</th></tr></thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id} className="border-b">
                    <td>{k.label}</td>
                    <td className="text-right">{k.quotaAllocated}</td>
                    <td>{k.status}</td>
                    <td>
                      <select
                        className="border rounded px-2 py-1 bg-background"
                        value={k.assignedMemberId ?? ''}
                        onChange={(e) => onAssignChange(k.id, e.target.value)}
                        disabled={k.status === 'revoked'}
                      >
                        <option value="">未指派</option>
                        {assignees.map((a) => (
                          <option key={a.userId} value={a.userId}>{a.displayName ?? a.email}</option>
                        ))}
                      </select>
                    </td>
                    <td className="text-right">
                      <Button variant="outline" size="sm" onClick={() => revoke(k.id)} disabled={k.status === 'revoked'}>撤銷</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        {error && <p className="text-sm text-red-500">載入失敗</p>}
      </div>
    </ManagerLayout>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/Pages/Manager/ApiKeys/Index.tsx
git commit -m "feat: [manager-portal] ApiKeys Inertia page (list + assign + revoke)"
```

---

## Phase J — Manager 建立 API Key

### Task J1: `ManagerApiKeyCreatePage` backend + test

**Files:**
- Create: `src/Website/Manager/Pages/ManagerApiKeyCreatePage.ts`
- Create: `src/Website/__tests__/Manager/ManagerApiKeyCreatePage.test.ts`

> 表單欄位：label、quotaAllocated、budgetResetPeriod（7d/30d）、assigneeUserId（optional）。
> 提交流程：1) `CreateApiKeyService.execute` 建立；2) 若 `assigneeUserId` 非空 → `AssignApiKeyService.execute`；3) 若有 quota → 以 `UpdateApiKeyBudgetService` 設定（或 CreateApiKeyService 已原生支援，則合併）。

- [ ] **Step 1: 寫失敗測試**

```typescript
// src/Website/__tests__/Manager/ManagerApiKeyCreatePage.test.ts
import { describe, expect, mock, test } from 'bun:test'
import { loadMessages } from '@/Shared/Infrastructure/I18n'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { ManagerApiKeyCreatePage } from '../../Manager/Pages/ManagerApiKeyCreatePage'

function makeCtx(body?: any, overrides: Partial<IHttpContext> = {}): IHttpContext {
  const store = new Map<string, unknown>()
  const auth = { userId: 'mgr-1', email: 'm@x', role: 'manager' }
  store.set('auth', auth)
  if (body) store.set('validated', body)
  store.set('inertia:shared', {
    locale: 'en', messages: loadMessages('en'),
    auth: { user: { id: auth.userId, email: auth.email, role: auth.role } },
    currentOrgId: null, flash: {},
  })
  return {
    get: <T>(k: string) => store.get(k) as T | undefined,
    set: (k: string, v: unknown) => { store.set(k, v) },
    getPathname: () => '/manager/api-keys/create',
    getParam: () => undefined, getQuery: () => undefined, getHeader: () => undefined,
    getMethod: () => 'GET', getCookie: () => undefined, setCookie: () => {},
    json: (d: any, s?: number) => Response.json(d, { status: s ?? 200 }),
    text: (s: string) => new Response(s),
    redirect: (u: string) => Response.redirect(u, 302),
    getBodyText: async () => '', getJsonBody: async <T>() => ({} as T), getBody: async <T>() => ({} as T),
    params: {}, query: {}, headers: {},
    ...overrides,
  } as unknown as IHttpContext
}

describe('ManagerApiKeyCreatePage', () => {
  test('handle 渲染 Create 頁', async () => {
    const captured: { lastCall: any } = { lastCall: null }
    const inertia = { render: (_c: IHttpContext, component: string, props: any) => { captured.lastCall = { component, props }; return new Response(JSON.stringify({})) } } as any
    const page = new ManagerApiKeyCreatePage(
      inertia,
      { execute: mock() } as any, // createSvc
      { execute: mock() } as any, // assignSvc
      { execute: mock(() => Promise.resolve({ success: true, data: { members: [{ userId: 'u-1', email: 'b@x', role: 'member' }] } })) } as any,
      { findByUserId: mock(() => Promise.resolve({ organizationId: 'org-A' })) } as any,
    )
    await page.handle(makeCtx())
    expect(captured.lastCall.component).toBe('Manager/ApiKeys/Create')
    expect(captured.lastCall.props.assignees.length).toBe(1)
  })

  test('store: create 成功 + assignee 非空 → 呼叫 assign', async () => {
    const createSvc = { execute: mock(() => Promise.resolve({ success: true, data: { key: { id: 'k-1' } } })) }
    const assignSvc = { execute: mock(() => Promise.resolve({ success: true })) }
    const inertia = { render: mock() } as any
    const body = { label: 'Prod', quotaAllocated: 100, budgetResetPeriod: '30d', assigneeUserId: 'u-1' }
    const page = new ManagerApiKeyCreatePage(
      inertia,
      createSvc as any, assignSvc as any,
      { execute: mock(() => Promise.resolve({ success: true, data: { members: [] } })) } as any,
      { findByUserId: mock(() => Promise.resolve({ organizationId: 'org-A' })) } as any,
    )
    const res = await page.store(makeCtx(body))
    expect(res.headers.get('location')).toBe('/manager/api-keys')
    expect(createSvc.execute).toHaveBeenCalled()
    expect(assignSvc.execute).toHaveBeenCalled()
  })

  test('store: assigneeUserId 為空時不呼叫 assign', async () => {
    const createSvc = { execute: mock(() => Promise.resolve({ success: true, data: { key: { id: 'k-1' } } })) }
    const assignSvc = { execute: mock(() => Promise.resolve({ success: true })) }
    const inertia = { render: mock() } as any
    const body = { label: 'Prod', quotaAllocated: 100, budgetResetPeriod: '30d' }
    const page = new ManagerApiKeyCreatePage(
      inertia,
      createSvc as any, assignSvc as any,
      { execute: mock(() => Promise.resolve({ success: true, data: { members: [] } })) } as any,
      { findByUserId: mock(() => Promise.resolve({ organizationId: 'org-A' })) } as any,
    )
    await page.store(makeCtx(body))
    expect(assignSvc.execute).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 確認失敗**

Run: `bun test src/Website/__tests__/Manager/ManagerApiKeyCreatePage.test.ts`

- [ ] **Step 3: 實作 Page**

```typescript
// src/Website/Manager/Pages/ManagerApiKeyCreatePage.ts
import type { AssignApiKeyService } from '@/Modules/ApiKey/Application/Services/AssignApiKeyService'
import type { CreateApiKeyService } from '@/Modules/ApiKey/Application/Services/CreateApiKeyService'
import type { ListMembersService } from '@/Modules/Organization/Application/Services/ListMembersService'
import type { IOrganizationMemberRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'

interface CreateForm {
  label: string
  quotaAllocated?: number
  budgetResetPeriod?: '7d' | '30d'
  assigneeUserId?: string | null
}

export class ManagerApiKeyCreatePage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly createApiKeyService: CreateApiKeyService,
    private readonly assignApiKeyService: AssignApiKeyService,
    private readonly listMembersService: ListMembersService,
    private readonly memberRepository: IOrganizationMemberRepository,
  ) {}

  private async resolveOrgId(ctx: IHttpContext): Promise<{ orgId: string } | { redirect: Response }> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const m = await this.memberRepository.findByUserId(auth.userId)
    if (!m) return { redirect: ctx.redirect('/member/dashboard') }
    return { orgId: m.organizationId }
  }

  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const r = await this.resolveOrgId(ctx)
    if ('redirect' in r) return r.redirect
    const members = await this.listMembersService.execute(r.orgId, auth.userId, auth.role)
    const assignees = members.success
      ? (members.data?.members ?? []).filter((m: any) => m.role === 'member')
      : []
    return this.inertia.render(ctx, 'Manager/ApiKeys/Create', {
      orgId: r.orgId,
      assignees,
    })
  }

  async store(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const r = await this.resolveOrgId(ctx)
    if ('redirect' in r) return r.redirect
    const body = (ctx.get('validated') as CreateForm | undefined) ?? { label: '' }

    const created = await this.createApiKeyService.execute({
      orgId: r.orgId,
      createdByUserId: auth.userId,
      callerSystemRole: auth.role,
      label: body.label,
      budgetMaxLimit: body.quotaAllocated,
      budgetResetPeriod: body.budgetResetPeriod,
    })

    if (!created.success || !created.data?.key?.id) {
      return ctx.redirect('/manager/api-keys/create')
    }

    if (body.assigneeUserId && body.assigneeUserId.length > 0) {
      await this.assignApiKeyService.execute({
        keyId: created.data.key.id,
        orgId: r.orgId,
        assigneeUserId: body.assigneeUserId,
        callerUserId: auth.userId,
        callerSystemRole: auth.role,
      })
    }

    return ctx.redirect('/manager/api-keys')
  }
}
```

> 若 `CreateApiKeyService.execute` 回傳的 key id 路徑不同，請對齊。可檢視 `src/Modules/ApiKey/Application/Services/CreateApiKeyService.ts` 取得正確 DTO 結構。

- [ ] **Step 4: 測試通過 + Commit**

Run: `bun test src/Website/__tests__/Manager/ManagerApiKeyCreatePage.test.ts`

```bash
git add src/Website/Manager/Pages/ManagerApiKeyCreatePage.ts src/Website/__tests__/Manager/ManagerApiKeyCreatePage.test.ts
git commit -m "feat: [manager-portal] ManagerApiKeyCreatePage"
```

---

### Task J2: Create binding + routes

**Files:**
- Modify: `src/Website/Manager/bindings/registerManagerBindings.ts`
- Modify: `src/Website/Manager/routes/registerManagerRoutes.ts`

- [ ] **Step 1: binding**

```typescript
import type { CreateApiKeyService } from '@/Modules/ApiKey/Application/Services/CreateApiKeyService'
import { ManagerApiKeyCreatePage } from '../Pages/ManagerApiKeyCreatePage'

container.singleton(k.apiKeyCreate, (c) => new ManagerApiKeyCreatePage(
  c.make(i) as InertiaService,
  c.make('createApiKeyService') as CreateApiKeyService,
  c.make('assignApiKeyService') as AssignApiKeyService,
  c.make('listMembersService') as ListMembersService,
  c.make('organizationMemberRepository') as IOrganizationMemberRepository,
))
```

- [ ] **Step 2: 路由**

```typescript
{ method: 'get',  path: '/manager/api-keys/create', page: MANAGER_PAGE_KEYS.apiKeyCreate, action: 'handle', name: 'pages.manager.apiKeys.create' },
{ method: 'post', path: '/manager/api-keys',        page: MANAGER_PAGE_KEYS.apiKeyCreate, action: 'store',  name: 'pages.manager.apiKeys.store' },
```

- [ ] **Step 3: Commit**

```bash
git add src/Website/Manager/bindings/registerManagerBindings.ts src/Website/Manager/routes/registerManagerRoutes.ts
git commit -m "feat: [manager-portal] ApiKey create binding + routes"
```

---

### Task J3: React 頁面 `Manager/ApiKeys/Create.tsx`

**Files:**
- Create: `resources/js/Pages/Manager/ApiKeys/Create.tsx`

- [ ] **Step 1: 建立表單頁**

```tsx
import { useState } from 'react'
import { Head, router } from '@inertiajs/react'
import { ManagerLayout } from '@/layouts/ManagerLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Assignee {
  userId: string
  email: string
  displayName: string | null
}
interface Props {
  assignees: Assignee[]
}

export default function ManagerApiKeyCreate({ assignees }: Props) {
  const [label, setLabel] = useState('')
  const [quota, setQuota] = useState<number | ''>('')
  const [period, setPeriod] = useState<'7d' | '30d'>('30d')
  const [assignee, setAssignee] = useState<string>('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    router.post('/manager/api-keys', {
      label,
      quotaAllocated: quota === '' ? undefined : Number(quota),
      budgetResetPeriod: period,
      assigneeUserId: assignee === '' ? null : assignee,
    })
  }

  return (
    <ManagerLayout>
      <Head title="建立 API Key" />
      <div className="p-4 max-w-md">
        <Card>
          <CardHeader><CardTitle>建立 API Key</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-3">
              <div><label className="text-sm">Key 名稱</label><Input required value={label} onChange={(e) => setLabel(e.target.value)} /></div>
              <div><label className="text-sm">配額上限</label><Input type="number" min={0} value={quota} onChange={(e) => setQuota(e.target.value === '' ? '' : Number(e.target.value))} /></div>
              <div><label className="text-sm">重置週期</label>
                <select className="border rounded px-2 py-1 bg-background w-full" value={period} onChange={(e) => setPeriod(e.target.value as any)}>
                  <option value="7d">每 7 天</option>
                  <option value="30d">每 30 天</option>
                </select>
              </div>
              <div><label className="text-sm">指派給成員（可選）</label>
                <select className="border rounded px-2 py-1 bg-background w-full" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                  <option value="">未指派</option>
                  {assignees.map((a) => <option key={a.userId} value={a.userId}>{a.displayName ?? a.email}</option>)}
                </select>
              </div>
              <Button type="submit">建立</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </ManagerLayout>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/Pages/Manager/ApiKeys/Create.tsx
git commit -m "feat: [manager-portal] ApiKey Create Inertia page"
```

---

## Phase K — Manager 個人設定

### Task K1: `ManagerSettingsPage` backend + test

**Files:**
- Create: `src/Website/Manager/Pages/ManagerSettingsPage.ts`
- Create: `src/Website/__tests__/Manager/ManagerSettingsPage.test.ts`

> 沿用 Member 的 `GetProfileService` / `UpdateProfileService`。唯一差別是 layout 與路徑。

- [ ] **Step 1: 寫失敗測試**

```typescript
// src/Website/__tests__/Manager/ManagerSettingsPage.test.ts
import { describe, expect, mock, test } from 'bun:test'
import { loadMessages } from '@/Shared/Infrastructure/I18n'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { ManagerSettingsPage } from '../../Manager/Pages/ManagerSettingsPage'

function makeCtx(body?: any): IHttpContext {
  const store = new Map<string, unknown>()
  const auth = { userId: 'mgr-1', email: 'm@x', role: 'manager' }
  store.set('auth', auth)
  if (body) store.set('validated', body)
  store.set('inertia:shared', {
    locale: 'en', messages: loadMessages('en'),
    auth: { user: { id: auth.userId, email: auth.email, role: auth.role } },
    currentOrgId: null, flash: {},
  })
  return {
    get: <T>(k: string) => store.get(k) as T | undefined,
    set: (k: string, v: unknown) => { store.set(k, v) },
    getPathname: () => '/manager/settings',
    getParam: () => undefined, getQuery: () => undefined, getHeader: () => undefined,
    getMethod: () => 'GET', getCookie: () => undefined, setCookie: () => {},
    json: (d: any) => Response.json(d), text: (s: string) => new Response(s),
    redirect: (u: string) => Response.redirect(u, 302),
    getBodyText: async () => '', getJsonBody: async <T>() => ({} as T), getBody: async <T>() => ({} as T),
    params: {}, query: {}, headers: {},
  } as unknown as IHttpContext
}

describe('ManagerSettingsPage', () => {
  test('handle: 渲染 Manager/Settings/Index', async () => {
    const captured: { c?: string; p?: any } = {}
    const inertia = { render: (_: IHttpContext, c: string, p: any) => { captured.c = c; captured.p = p; return new Response() } } as any
    const get = { execute: mock(() => Promise.resolve({ success: true, data: { displayName: 'Mgr', timezone: 'Asia/Taipei', locale: 'zh-TW' } })) }
    const page = new ManagerSettingsPage(inertia, get as any, { execute: mock() } as any)
    await page.handle(makeCtx())
    expect(captured.c).toBe('Manager/Settings/Index')
    expect(captured.p.profile.displayName).toBe('Mgr')
  })

  test('update: 呼叫 UpdateProfileService 並導回 /manager/settings', async () => {
    const inertia = { render: mock() } as any
    const update = { execute: mock(() => Promise.resolve({ success: true })) }
    const page = new ManagerSettingsPage(inertia, { execute: mock() } as any, update as any)
    const res = await page.update(makeCtx({ displayName: 'N' }))
    expect(res.headers.get('location')).toBe('/manager/settings')
    expect(update.execute).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 確認失敗**

Run: `bun test src/Website/__tests__/Manager/ManagerSettingsPage.test.ts`

- [ ] **Step 3: 實作 Page**

```typescript
// src/Website/Manager/Pages/ManagerSettingsPage.ts
import type { GetProfileService } from '@/Modules/Profile/Application/Services/GetProfileService'
import type { UpdateProfileService } from '@/Modules/Profile/Application/Services/UpdateProfileService'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'

export class ManagerSettingsPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly getProfileService: GetProfileService,
    private readonly updateProfileService: UpdateProfileService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const profile = await this.getProfileService.execute(auth.userId)
    return this.inertia.render(ctx, 'Manager/Settings/Index', {
      profile: profile.success ? profile.data : null,
      error: profile.success ? null : { key: 'manager.settings.loadFailed' },
    })
  }

  async update(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const body = ctx.get('validated') as Record<string, unknown> | undefined
    await this.updateProfileService.execute(auth.userId, body ?? {})
    return ctx.redirect('/manager/settings')
  }
}
```

- [ ] **Step 4: 測試通過 + Commit**

Run: `bun test src/Website/__tests__/Manager/ManagerSettingsPage.test.ts`

```bash
git add src/Website/Manager/Pages/ManagerSettingsPage.ts src/Website/__tests__/Manager/ManagerSettingsPage.test.ts
git commit -m "feat: [manager-portal] ManagerSettingsPage"
```

---

### Task K2: Settings binding + routes

**Files:**
- Modify: `src/Website/Manager/bindings/registerManagerBindings.ts`
- Modify: `src/Website/Manager/routes/registerManagerRoutes.ts`

- [ ] **Step 1: binding**

```typescript
import type { GetProfileService } from '@/Modules/Profile/Application/Services/GetProfileService'
import type { UpdateProfileService } from '@/Modules/Profile/Application/Services/UpdateProfileService'
import { ManagerSettingsPage } from '../Pages/ManagerSettingsPage'

container.singleton(k.settings, (c) => new ManagerSettingsPage(
  c.make(i) as InertiaService,
  c.make('getProfileService') as GetProfileService,
  c.make('updateProfileService') as UpdateProfileService,
))
```

- [ ] **Step 2: 路由**

```typescript
{ method: 'get', path: '/manager/settings', page: MANAGER_PAGE_KEYS.settings, action: 'handle', name: 'pages.manager.settings' },
{ method: 'put', path: '/manager/settings', page: MANAGER_PAGE_KEYS.settings, action: 'update', name: 'pages.manager.settings.update' },
```

- [ ] **Step 3: Commit**

```bash
git add src/Website/Manager/bindings/registerManagerBindings.ts src/Website/Manager/routes/registerManagerRoutes.ts
git commit -m "feat: [manager-portal] Settings binding + routes"
```

---

### Task K3: React 頁面 `Manager/Settings/Index.tsx`

**Files:**
- Create: `resources/js/Pages/Manager/Settings/Index.tsx`

- [ ] **Step 1: 建立最小頁面（可從 Member 版複製精簡）**

```tsx
import { useState } from 'react'
import { Head, router } from '@inertiajs/react'
import { ManagerLayout } from '@/layouts/ManagerLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Profile {
  displayName?: string
  timezone?: string
  locale?: string
}
interface Props {
  profile: Profile | null
  error: { key: string } | null
}

export default function ManagerSettingsIndex({ profile, error }: Props) {
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '')
  const [timezone, setTimezone] = useState(profile?.timezone ?? 'Asia/Taipei')
  const [locale, setLocale] = useState(profile?.locale ?? 'zh-TW')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    router.put('/manager/settings', { displayName, timezone, locale })
  }

  return (
    <ManagerLayout>
      <Head title="個人設定" />
      <div className="p-4 max-w-md">
        <Card>
          <CardHeader><CardTitle>個人設定</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-3">
              <div><label className="text-sm">顯示名稱</label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></div>
              <div><label className="text-sm">時區</label><Input value={timezone} onChange={(e) => setTimezone(e.target.value)} /></div>
              <div><label className="text-sm">語系</label><Input value={locale} onChange={(e) => setLocale(e.target.value)} /></div>
              <Button type="submit">儲存</Button>
              {error && <p className="text-sm text-red-500">載入失敗</p>}
            </form>
          </CardContent>
        </Card>
      </div>
    </ManagerLayout>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/Pages/Manager/Settings/Index.tsx
git commit -m "feat: [manager-portal] Settings Inertia page"
```

---

## Phase L — Manager Layout（前端側欄 / AppShell）

### Task L1: 建立 `ManagerLayout.tsx`

**Files:**
- Create: `resources/js/layouts/ManagerLayout.tsx`

- [ ] **Step 1: 仿 `MemberLayout.tsx` 建立 Manager 版本**

```tsx
import type { ReactNode } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import type { NavItem } from '@/components/layout/Sidebar'
import { LayoutDashboard, Building2, Users, Key, Settings } from 'lucide-react'

const managerNavItems: NavItem[] = [
  { label: '總覽', href: '/manager/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: '組織設定', href: '/manager/organization', icon: <Building2 className="h-4 w-4" /> },
  { label: '成員管理', href: '/manager/members', icon: <Users className="h-4 w-4" /> },
  { label: 'API Keys', href: '/manager/api-keys', icon: <Key className="h-4 w-4" /> },
  { label: '個人設定', href: '/manager/settings', icon: <Settings className="h-4 w-4" /> },
]

export function ManagerLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell sidebarTitle="Draupnir Manager" navItems={managerNavItems}>
      {children}
    </AppShell>
  )
}
```

- [ ] **Step 2: 前端型別檢查 + dev server smoke**

Run: `bun run typecheck && bun run dev`
Expected: 型別無錯誤；瀏覽器以 manager 角色登入，`/manager/dashboard` 與其他路由可訪問，側欄顯示 5 項。

- [ ] **Step 3: Commit**

```bash
git add resources/js/layouts/ManagerLayout.tsx
git commit -m "feat: [manager-portal] ManagerLayout 側欄"
```

---

## Phase M — Member Portal 限縮

### Task M1: 移除 Member 端 API Key 寫入路由（create / revoke / budget）

**Files:**
- Modify: `src/Website/Member/routes/registerMemberRoutes.ts`

- [ ] **Step 1: 從 `MEMBER_PAGE_ROUTES` 移除下列 6 條路由**

刪除：
```typescript
// { method: 'get',  path: '/member/api-keys/create', ... }
// { method: 'post', path: '/member/api-keys',        ... }
// { method: 'get',  path: '/member/api-keys/:keyId/budget', ... }
// { method: 'post', path: '/member/api-keys/:keyId/budget', ... }
// { method: 'post', path: '/member/api-keys/:keyId/revoke', ... }
```

保留 `GET /member/api-keys`（列表）。

- [ ] **Step 2: 型別檢查**

Run: `bun run typecheck`
Expected: 可能會因 `keys.ts` 仍含對應 key 而通過（接下 M2 移除 keys）；也可能因 binding 仍引用而錯誤。繼續往下。

- [ ] **Step 3: Commit**

```bash
git add src/Website/Member/routes/registerMemberRoutes.ts
git commit -m "refactor: [member-portal] 移除 API Key create/revoke/budget 路由"
```

---

### Task M2: 刪除 Member 端寫入相關 page 類別與 binding / keys

**Files:**
- Modify: `src/Website/Member/keys.ts`
- Modify: `src/Website/Member/bindings/registerMemberBindings.ts`
- Delete: `src/Website/Member/Pages/MemberApiKeyCreatePage.ts`
- Delete: `src/Website/Member/Pages/MemberApiKeyBudgetPage.ts`
- Delete: `src/Website/Member/Pages/MemberApiKeyRevokeHandler.ts`
- Delete: 相關測試（若存在）

- [ ] **Step 1: 從 `MEMBER_PAGE_KEYS` 移除三個 key**

在 `src/Website/Member/keys.ts`：

```typescript
export const MEMBER_PAGE_KEYS = {
  dashboard: 'page.member.dashboard',
  apiKeys: 'page.member.apiKeys',
  // apiKeyCreate / apiKeyBudget / apiKeyRevoke 已移除
  usage: 'page.member.usage',
  costBreakdown: 'page.member.costBreakdown',
  contracts: 'page.member.contracts',
  settings: 'page.member.settings',
  ALERTS: 'member/alerts',
  alerts: 'member/alerts',
} as const
```

- [ ] **Step 2: 從 `registerMemberBindings` 移除三個 binding**

刪除：
- `container.singleton(k.apiKeyCreate, ...)`
- `container.singleton(k.apiKeyBudget, ...)`
- `container.singleton(k.apiKeyRevoke, ...)`

移除相關 `import`（`MemberApiKeyCreatePage`、`MemberApiKeyBudgetPage`、`MemberApiKeyRevokeHandler`、`CreateApiKeyService`、`RevokeApiKeyService`、`UpdateApiKeyBudgetService`、`IApiKeyRepository`、`OrgAuthorizationHelper`）。

- [ ] **Step 3: 刪除三個 page 檔**

```bash
rm src/Website/Member/Pages/MemberApiKeyCreatePage.ts
rm src/Website/Member/Pages/MemberApiKeyBudgetPage.ts
rm src/Website/Member/Pages/MemberApiKeyRevokeHandler.ts
```

- [ ] **Step 4: 刪除相應測試（若存在）**

```bash
# 先列出存在的檔案
ls src/Website/__tests__/Member/ | grep -E 'MemberApiKey(Create|Budget|Revoke)'
# 若存在則刪除
rm -f src/Website/__tests__/Member/MemberApiKeyCreatePage.test.ts
rm -f src/Website/__tests__/Member/MemberApiKeyBudgetPage.test.ts
rm -f src/Website/__tests__/Member/MemberApiKeyRevokeHandler.test.ts
```

- [ ] **Step 5: 型別檢查**

Run: `bun run typecheck`
Expected: 無錯誤（未使用 import 已移除、`k.apiKeyCreate` 等引用已清除）。

- [ ] **Step 6: Commit**

```bash
git add -A src/Website/Member/keys.ts src/Website/Member/bindings/registerMemberBindings.ts src/Website/Member/Pages/ src/Website/__tests__/Member/
git commit -m "refactor: [member-portal] 移除 API Key 寫入相關 page 與 binding"
```

---

### Task M3: `MemberApiKeysPage` 依 `assigned_member_id` 過濾

**Files:**
- Modify: `src/Website/Member/Pages/MemberApiKeysPage.ts`
- Modify: `src/Website/__tests__/Member/MemberApiKeysPage.test.ts`

- [ ] **Step 1: 更新既有測試（新增行為斷言）**

在 `src/Website/__tests__/Member/MemberApiKeysPage.test.ts` 新增：

```typescript
test('Member 列表呼叫 ListApiKeysService 並附帶 assignedMemberId filter', async () => {
  const ctx = createMemberContext({ getQuery: () => undefined })
  const { inertia } = createMockInertia()
  const mockListService = {
    execute: mock(() => Promise.resolve({ success: true, data: { keys: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } } })),
  }
  const mockMemberRepository = { findByUserId: mock(() => Promise.resolve({ organizationId: 'org-A' })) }
  const page = new MemberApiKeysPage(inertia, mockListService as any, mockMemberRepository as any)
  await page.handle(ctx)
  // 驗證 execute 第 5+1（filter）參數為 { assignedMemberId: 'member-1' }
  const args = (mockListService.execute as any).mock.calls[0]
  expect(args[0]).toBe('org-A')         // orgId
  expect(args[1]).toBe('member-1')      // callerUserId
  expect(args[5]).toEqual({ assignedMemberId: 'member-1' })
})
```

- [ ] **Step 2: 修改 Page handler，傳入 filter**

在 `handle` 內，將 `execute` 呼叫改為：

```typescript
const result = await this.listService.execute(
  orgId,
  auth.userId,
  auth.role,
  page,
  limit,
  { assignedMemberId: auth.userId },
)
```

- [ ] **Step 3: 測試通過**

Run: `bun test src/Website/__tests__/Member/MemberApiKeysPage.test.ts`
Expected: 新舊案例全 PASS。

- [ ] **Step 4: Commit**

```bash
git add src/Website/Member/Pages/MemberApiKeysPage.ts src/Website/__tests__/Member/MemberApiKeysPage.test.ts
git commit -m "feat: [member-portal] API Keys 列表限縮為被指派的 key"
```

---

### Task M4: 修改 Member React 頁面：移除建立 / 撤銷 / 調整配額按鈕

**Files:**
- Modify: `resources/js/Pages/Member/ApiKeys/Index.tsx`
- Modify: `resources/js/Pages/Member/ApiKeys/columns.tsx`
- Delete: `resources/js/Pages/Member/ApiKeys/Create.tsx`
- Delete: `resources/js/Pages/Member/ApiKeys/Budget.tsx`

- [ ] **Step 1: 開啟 `Index.tsx` 並移除「建立 Key」按鈕與連結**

以 Read 查看 `resources/js/Pages/Member/ApiKeys/Index.tsx`，刪除或註解以下元素：
- 任何 `Link to="/member/api-keys/create"` 或 `router.get('/member/api-keys/create')`
- 相對應的 "建立" Button

- [ ] **Step 2: 開啟 `columns.tsx`，刪除撤銷與預算按鈕**

以 Read 查看 `resources/js/Pages/Member/ApiKeys/columns.tsx`，移除：
- 撤銷按鈕 handler 與 UI
- `/member/api-keys/:keyId/budget` 連結
- 只保留：複製 key 值、查看用量（navigate 到 `/member/usage` 或 inline detail）

> 若 `columns.tsx` 為 table column definition（shadcn DataTable 模式），刪除 `actions` column 或把 actions 精簡為「複製」。

- [ ] **Step 3: 刪除 `Create.tsx` 與 `Budget.tsx`**

```bash
rm resources/js/Pages/Member/ApiKeys/Create.tsx
rm resources/js/Pages/Member/ApiKeys/Budget.tsx
```

- [ ] **Step 4: 前端型別檢查與手動 smoke**

Run: `bun run typecheck && bun run dev`
Expected: 無 TS error；以 member 帳號登入 `/member/api-keys` 看不到建立、撤銷、調整配額按鈕。

- [ ] **Step 5: Commit**

```bash
git add -A resources/js/Pages/Member/ApiKeys/
git commit -m "refactor: [member-portal] 前端 API Keys 限縮為被動查看"
```

---

### Task M5: Member Layout 移除 Alerts 導航

**Files:**
- Modify: `resources/js/layouts/MemberLayout.tsx`

- [ ] **Step 1: 移除 Alerts 條件顯示，改為固定不顯示**

將 `MemberLayout` 簡化為：

```tsx
import type { ReactNode } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import type { NavItem } from '@/components/layout/Sidebar'
import { LayoutDashboard, Key, BarChart3, FileText, Settings, PieChart } from 'lucide-react'

const memberNavItems: NavItem[] = [
  { label: '總覽', href: '/member/dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'API Keys', href: '/member/api-keys', icon: <Key className="h-4 w-4" /> },
  { label: '用量', href: '/member/usage', icon: <BarChart3 className="h-4 w-4" /> },
  { label: '成本分析', href: '/member/cost-breakdown', icon: <PieChart className="h-4 w-4" /> },
  { label: '配額', href: '/member/contracts', icon: <FileText className="h-4 w-4" /> },
  { label: '設定', href: '/member/settings', icon: <Settings className="h-4 w-4" /> },
]

export function MemberLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell sidebarTitle="Draupnir" navItems={memberNavItems}>
      {children}
    </AppShell>
  )
}
```

> 注意：`/member/alerts` 路由仍存在（由既有 `MEMBER_PAGE_KEYS.ALERTS` 定義）；只是 sidebar 不再顯示入口，符合 spec §4.3。

- [ ] **Step 2: 前端型別檢查 + smoke**

Run: `bun run typecheck && bun run dev`

- [ ] **Step 3: Commit**

```bash
git add resources/js/layouts/MemberLayout.tsx
git commit -m "refactor: [member-portal] 側欄移除 Alerts 入口 (spec §4.3)"
```

---

### Task M6: Member Dashboard 文案校正（已在組織中不顯示建立組織卡）

**Files:**
- Modify: `resources/js/Pages/Member/Dashboard/Index.tsx`

> `MemberDashboardPage` 已傳入 `hasOrganization` prop。前端依此顯示「尚未加入組織」的引導卡。Spec §4.1：已加入組織者 **不得** 再見到「建立組織」入口，UI 上不可有該按鈕。

- [ ] **Step 1: 開啟檔案，確認僅在 `hasOrganization === false` 才顯示 `CreateOrganizationModal` 或對應入口**

以 Read 查看 `resources/js/Pages/Member/Dashboard/Index.tsx`，找到 `CreateOrganizationModal` 渲染位置，確保條件是：

```tsx
{!hasOrganization && <CreateOrganizationModal />}
```

若存在其他路徑顯示建立組織入口，補上同樣條件。

- [ ] **Step 2: 前端型別檢查 + smoke**

Run: `bun run typecheck && bun run dev`
Expected: 以已加入 org 的 MEMBER 登入，看不到建立組織入口。

- [ ] **Step 3: Commit（僅在確有改動時）**

```bash
git add resources/js/Pages/Member/Dashboard/Index.tsx
git commit -m "refactor: [member-portal] Dashboard 在籍期間隱藏建立組織入口 (spec §2)"
```

---

## Phase N — 整合測試與煙霧驗證

### Task N1: 全專案測試

- [ ] **Step 1: 跑完整測試套件**

Run: `bun test`
Expected: 所有測試通過。

- [ ] **Step 2: 跑型別檢查**

Run: `bun run typecheck`
Expected: 無錯誤。

- [ ] **Step 3: lint（若有）**

Run: `bun run lint`（若 `package.json` 未定義此 script 則略過）

---

### Task N2: 手動 Smoke Checklist（以三個角色走過主要流程）

執行 dev server：`bun run dev`

- [ ] **Admin 身份**
  - 登入 → 重導至 `/admin/dashboard`（既有行為，不應受影響）
  - 直接造訪 `/manager/dashboard` → 重導至 `/admin/dashboard`
  - 直接造訪 `/member/dashboard` → 仍可進入（既有行為；不在 spec 範圍）

- [ ] **Manager 身份**（先以 admin 建立一位 manager 或用既有 manager 帳號）
  - 登入 → 重導至 `/manager/dashboard`
  - 側欄 5 項齊備，每項可開啟
  - `/manager/members` 產生邀請，複製邀請連結
  - `/manager/api-keys/create` 建立一把 key，指派給某 member
  - `/manager/api-keys` 列表中切換指派（下拉）應即時更新
  - 嘗試直接造訪 `/admin/dashboard` → 重導至 `/member/dashboard`（因為 manager 非 admin）

- [ ] **Member 身份（無組織）**
  - 登入 → `/member/dashboard` 顯示建立組織引導
  - 側欄不應出現 Alerts

- [ ] **Member 身份（已加入組織 + 被指派 key）**
  - 登入 → `/member/dashboard`，不顯示建立組織入口
  - `/member/api-keys` 只看到被指派給自己的 key
  - 看不到「建立 Key」、「撤銷」、「調整配額」按鈕
  - 直接造訪 `/manager/dashboard` → 重導至 `/member/dashboard`

- [ ] **v1 單組織限制**
  - 以 API（或 member 身份透過 UI）嘗試建立組織 → 後端拒絕 `ALREADY_HAS_ORGANIZATION`

- [ ] **Commit（若過程中發現 bug 並修正）**

```bash
git add -A
git commit -m "fix: [smoke] 修正手動 smoke 發現的問題"
```

---

### Task N3: 最終總結 commit（可選）

- [ ] **Step 1: 確保所有 phase 的 commit 完成 + Changelog 記錄（若專案有）**

Run: `git log --oneline $(git merge-base HEAD master)..HEAD`
Expected: 看到本計畫涵蓋的 commits（Phase A–N）。

- [ ] **Step 2: 若專案要求，更新 CHANGELOG.md / docs 索引**

若沒有 CHANGELOG 慣例，略過。

---

## Appendix — 風險與後續工作（非本計畫實作範圍）

1. **Contract 配額上限校驗**：本計畫的 `AssignApiKeyService` 未驗 `sumAllocated ≤ contractCap`；依 `docs/draupnir/specs/2026-04-16-contract-quota-allocation-spec.md`，此驗證屬 `CreateApiKeyService` / `UpdateApiKeyBudgetService`。若已在既有 service 實作，新任務不需動；若尚未，另開規格實作。
2. **Alerts 功能回歸**：Spec §4.3 指「之後版本再實作並加回導航」；本計畫保留 `/member/alerts` 路由但不顯示 sidebar 入口 — 已達成。
3. **DB 層跨組織防護**：目前指派一致性仰賴 `AssignApiKeyService` 的應用層驗證；若要加 DB-level check（composite FK / trigger），可另開 migration。
4. **Manager 對其他 Manager 指派 Key**：spec §6.2「v1 指派對象僅限 role = MEMBER」— `AssignApiKeyService` 已拒絕非 member；未來若放寬，需修改 `INVALID_ASSIGNEE_ROLE` 檢查。
5. **Middleware 層 org 驗證**：本計畫的 `requireManager` 不驗 `organization_id` — 由各 page 自行 `findByUserId` 判斷並 redirect。若日後需統一行為，建議引入 `requireManagerWithOrg` middleware 專用於 GET routes（避免 POST 被中斷為非 Inertia 回應）。

---

**計畫完**
