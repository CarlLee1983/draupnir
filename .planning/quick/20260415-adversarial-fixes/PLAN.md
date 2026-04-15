---
title: 修復對抗性審查四項 HIGH 問題
slug: adversarial-fixes
date: 2026-04-15
status: complete
quick_id: 260415-kc5
files_modified:
  - resources/js/Pages/Member/Dashboard/components/CreateOrganizationModal.tsx
  - src/Website/Member/Pages/MemberDashboardPage.ts
  - src/Website/__tests__/Member/MemberDashboardPage.test.ts
  - src/Modules/Organization/Application/Services/CreateOrganizationService.ts
  - src/Modules/Organization/Application/Services/RemoveMemberService.ts
  - src/Modules/Organization/Application/Services/ChangeOrgMemberRoleService.ts
  - src/Modules/Organization/__tests__/RemoveMemberService.test.ts
  - src/Modules/Organization/__tests__/ChangeOrgMemberRoleService.test.ts
---

## 背景

adversarial review 發現四項 HIGH 問題。本計畫逐一修復，每步附具體程式碼變更說明。

---

## Issue 1 — CSRF token 未附加於 CreateOrganizationModal 的 POST 請求

**檔案：** `resources/js/Pages/Member/Dashboard/components/CreateOrganizationModal.tsx`

**問題：** 第 48–53 行的 `fetch('/api/organizations', ...)` 只送出 `Content-Type` 與 `Accept` 標頭，未包含 `X-CSRF-Token`，導致後端 CSRF 防護可能拒絕此請求。

**參考模式：** `resources/js/Pages/Member/Alerts/api.ts` 的 `readCsrfToken()` 函式已示範正確做法：
```typescript
function readCsrfToken(): string {
  const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
  return token ?? ''
}
```

### 步驟 1-A：在檔案頂部新增 `readCsrfToken` helper

在 import 陳述後、`ERROR_MESSAGES` 常數前插入：

```typescript
function readCsrfToken(): string {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? ''
}
```

### 步驟 1-B：在 `fetch` 呼叫中附加 CSRF token

將第 48–53 行改為（加入 `'X-CSRF-Token': readCsrfToken()`）：

```typescript
const response = await fetch('/api/organizations', {
  method: 'POST',
  credentials: 'same-origin',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-CSRF-Token': readCsrfToken(),
  },
  body: JSON.stringify({ name: name.trim() }),
})
```

**驗證：** `npx tsc --noEmit` 零錯誤；手動在瀏覽器 DevTools Network 確認請求標頭含 `X-CSRF-Token`。

---

## Issue 2 — MemberDashboardPage 僅查詢 manager 身份，plain member 呈現無組織狀態

**檔案：** `src/Website/Member/Pages/MemberDashboardPage.ts`

**問題：** 第 29 行呼叫 `findOrgManagerMembershipByUserId`（只找 role=manager 的成員紀錄），當使用者以 plain member（role=member）身份加入組織時，查詢回傳 `null`，儀表板錯誤地顯示「您尚未加入組織」。

**可用方法（IOrganizationMemberRepository）：**
- `findOrgManagerMembershipByUserId(userId)` — 只找 manager 角色（目前使用，太窄）
- `findByUserId(userId)` — 找該使用者的任意成員紀錄（無角色限制，正確選擇）

### 步驟 2-A：將查詢方法改為 `findByUserId`

```typescript
// 舊：
const membership = await this.memberRepository.findOrgManagerMembershipByUserId(auth.userId)

// 新：
const membership = await this.memberRepository.findByUserId(auth.userId)
```

**注意：** `findByUserId` 與 `findOrgManagerMembershipByUserId` 的回傳型別相同（`OrganizationMember | null`），`membership.organizationId` 欄位存取不變，無需其他修改。

### 步驟 2-B：更新測試檔

**檔案：** `src/Website/__tests__/Member/MemberDashboardPage.test.ts`

目前兩個 mock 都使用 `findOrgManagerMembershipByUserId` 鍵名。改成使用 `findByUserId`。

第 85–89 行（有 org 情境）：
```typescript
const mockMemberRepo = {
  findByUserId: mock(() => Promise.resolve({ organizationId: 'org-123' })),
}
```

第 109–112 行（無 org 情境）：
```typescript
const mockMemberRepo = {
  findByUserId: mock(() => Promise.resolve(null)),
}
```

第 131–134 行（service failure 情境）：
```typescript
const mockMemberRepo = {
  findByUserId: mock(() => Promise.resolve({ organizationId: 'org-123' })),
}
```

新增一個 plain member 測試案例，確認 role=member 的使用者也能看到自己的 org：

```typescript
test('plain member（非 manager）也能看到所屬組織', async () => {
  const ctx = createMemberContext()
  const { inertia, captured } = createMockInertia()

  const mockBalanceService = {
    execute: mock(() => Promise.resolve({ success: true, data: { balance: 0 } })),
  }

  const mockMemberRepo = {
    findByUserId: mock(() => Promise.resolve({ organizationId: 'org-456' })),
  }

  const page = new MemberDashboardPage(inertia, mockBalanceService as any, mockMemberRepo as any)
  await page.handle(ctx)

  expect(captured.lastCall?.props.hasOrganization).toBe(true)
  expect(captured.lastCall?.props.orgId).toBe('org-456')
})
```

**驗證：** `bun test src/Website/__tests__/Member/MemberDashboardPage.test.ts` 全部通過。

---

## Issue 3 — ProvisionOrganizationDefaultsService 在 transaction 邊界外執行

**檔案：** `src/Modules/Organization/Application/Services/CreateOrganizationService.ts`

**問題：** 第 95 行 `await this.provisionOrganizationDefaults.execute(orgId, request.managerUserId)` 在 `db.transaction(async (tx) => { ... })` 的 callback 內呼叫，但 `ProvisionOrganizationDefaultsService` 使用它自己注入的 `contractRepo`、`subRepo`、`moduleRepo`，這些 repo 指向原始 `db` 而非 transaction connection `tx`。若 provisioning 失敗，org 與 member 已提交（或反之），造成部分寫入。

**解法：** 將 `provisionOrganizationDefaults.execute(...)` 移出 transaction callback，放在 transaction 成功後執行。provisioning 是冪等操作（內部有 `if (existing) return` 保護），失敗不會讓 org 本身進入不一致狀態；若需全原子性，應為 `ProvisionOrganizationDefaultsService` 加 `withTransaction` 支援（屬額外重構，超出本修復範圍）。

現階段最安全的修復：**將 provisioning 移至 transaction 之後單獨執行**，保持 org + member + role 更新在同一 transaction 中，provisioning 失敗時可重試而不影響 org 存在性。

### 步驟 3-A：重組 transaction 與 provisioning 呼叫

```typescript
await this.db.transaction(async (tx) => {
  const txOrgRepo = this.orgRepository.withTransaction(tx)
  const txMemberRepo = this.memberRepository.withTransaction(tx)
  const txAuthRepo = this.authRepository.withTransaction(tx)
  await txOrgRepo.save(org)
  const member = OrganizationMember.create(
    crypto.randomUUID(),
    orgId,
    request.managerUserId,
    new OrgMemberRole('manager'),
  )
  await txMemberRepo.save(member)
  await txAuthRepo.updateRole(request.managerUserId, RoleType.MANAGER)
  // ProvisionOrganizationDefaultsService 不在此處執行，
  // 因為它持有原始 db 連線，不在 tx 範圍內。
})

// 移至 transaction 外：provisioning 是冪等的，失敗不影響 org 一致性。
await this.provisionOrganizationDefaults.execute(orgId, request.managerUserId)
```

**重要：** `txAuthRepo.updateRole(...)` 原本在第 96 行位於 transaction 內（正確），維持不動。只有 `provisionOrganizationDefaults.execute(...)` 被移出。

**驗證：** `bun test src/Modules/Organization/__tests__/CreateOrganizationService.test.ts` 全部通過（現有 7 個測試）。

---

## Issue 4 — RemoveMemberService 和 ChangeOrgMemberRoleService 可將 global admin 降為 member

**檔案：**
- `src/Modules/Organization/Application/Services/RemoveMemberService.ts` （第 51–53 行）
- `src/Modules/Organization/Application/Services/ChangeOrgMemberRoleService.ts` （第 40–43 行）

**問題：** 兩個 service 在移除/降級成員後，若 `isOrgManagerInAnyOrg` 回傳 `false`，就無條件呼叫 `authRepository.updateRole(targetUserId, RoleType.MEMBER)`。當 target 是全域 `admin`（`RoleType.ADMIN`）時，這會將其系統角色降成 `MEMBER`，屬於特權升降漏洞。

**解法：** 在降級前，先用 `authRepository.findById(targetUserId)` 取得當前系統角色；若為 `ADMIN` 則跳過 `updateRole` 呼叫。

### 步驟 4-A：修復 RemoveMemberService

在第 51 行 `const stillManager = ...` 之前，加入 admin 保護：

```typescript
// 移除後的系統角色降級：只對非 admin 使用者執行。
const targetUser = await this.authRepository.findById(targetUserId)
if (targetUser && !targetUser.role.isAdmin()) {
  const stillManager = await this.memberRepository.isOrgManagerInAnyOrg(targetUserId)
  if (!stillManager) {
    await this.authRepository.updateRole(targetUserId, RoleType.MEMBER)
  }
}
```

（刪除原第 51–54 行的 `stillManager` 區塊，替換為以上邏輯。）

### 步驟 4-B：修復 ChangeOrgMemberRoleService

在第 40 行 `const stillManager = ...` 之前，加入相同保護：

```typescript
// 降級後的系統角色同步：只對非 admin 使用者執行。
const targetUser = await this.authRepository.findById(targetUserId)
if (targetUser && !targetUser.role.isAdmin()) {
  const stillManager = await this.memberRepository.isOrgManagerInAnyOrg(targetUserId)
  if (!stillManager) {
    await this.authRepository.updateRole(targetUserId, RoleType.MEMBER)
  }
}
```

（刪除原第 40–43 行的 `stillManager` 區塊，替換為以上邏輯。）

### 步驟 4-C：新增測試 — RemoveMemberService

在 `src/Modules/Organization/__tests__/RemoveMemberService.test.ts` 末尾新增：

```typescript
it('移除 global admin 成員時不應降低其系統角色', async () => {
  const authRepo = new AuthRepository(db)
  // 建立一個 admin 使用者並加入組織（以 member 身份）
  const adminResult = await new RegisterUserService(authRepo, new ScryptPasswordHasher()).execute({
    email: 'admin@example.com',
    password: 'StrongPass123',
  })
  const adminUserId = adminResult.data!.id
  await authRepo.updateRole(adminUserId, RoleType.ADMIN)

  // 以 invitation 讓 admin 加入組織
  const inviteService = new InviteMemberService(orgRepo, invitationRepo, orgAuth)
  const acceptService = new AcceptInvitationService(invitationRepo, memberRepo, authRepo, db)
  const inv = await inviteService.execute(orgId, managerId, 'user', { email: 'admin@example.com' })
  await acceptService.execute(adminUserId, { token: inv.data!.token as string })

  // 移除這位 admin
  await removeService.execute(orgId, adminUserId, managerId, 'user')

  // admin 系統角色應維持 admin
  const user = await authRepo.findById(adminUserId)
  expect(user!.role.getValue()).toBe(RoleType.ADMIN)
})
```

**注意：** `RemoveMemberService.test.ts` 的 `beforeEach` 使用整合式 `MemoryDatabaseAccess`，因此此測試可直接使用相同的 `db`、`memberRepo`、`removeService`。需要在 describe scope 新增 `orgRepo`、`invitationRepo`、`orgAuth` 變數供此測試使用（目前只在 `beforeEach` 內宣告為 local）；提升為 describe-level 宣告。

### 步驟 4-D：新增測試 — ChangeOrgMemberRoleService

在 `src/Modules/Organization/__tests__/ChangeOrgMemberRoleService.test.ts` 的 `ChangeOrgMemberRoleService — 降級邏輯` describe 末尾新增：

```typescript
it('target 為 global admin 時不應呼叫 authRepository.updateRole', async () => {
  const member = makeMember('manager')
  ;(memberRepo.findByUserAndOrgId as any).mockResolvedValue(member)
  ;(memberRepo.countManagersByOrgId as any).mockResolvedValue(2)
  ;(memberRepo.update as any).mockResolvedValue(undefined)
  ;(memberRepo.isOrgManagerInAnyOrg as any).mockResolvedValue(false)

  // 模擬 target 是 admin
  const adminUser = { role: { isAdmin: () => true } }
  ;(authRepo.findById as any).mockResolvedValue(adminUser)

  await service.execute('org-1', 'user-mem-1', 'member')

  expect(authRepo.updateRole).not.toHaveBeenCalled()
})
```

**驗證：**
```bash
bun test src/Modules/Organization/__tests__/RemoveMemberService.test.ts
bun test src/Modules/Organization/__tests__/ChangeOrgMemberRoleService.test.ts
```
全部通過，包含新增測試案例。

---

## 執行順序

1. **Issue 1** — 前端 CSRF（獨立，先完成）
2. **Issue 2** — MemberDashboardPage + 測試更新（獨立）
3. **Issue 3** — CreateOrganizationService transaction 重組（影響 CreateOrganizationService.test.ts，先確認現有測試仍過）
4. **Issue 4** — RemoveMemberService + ChangeOrgMemberRoleService admin 保護 + 新增測試

完成後執行全套測試：
```bash
bun test
```

確認零失敗後提交：
```
fix: [org] 修復 CSRF 遺漏、dashboard 成員查詢、transaction 邊界及 admin 降級防護
```
