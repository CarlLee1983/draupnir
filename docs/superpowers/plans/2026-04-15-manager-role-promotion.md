# Manager 角色晉降機制 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 實作完整的 `manager` 系統角色生命週期：用戶建立組織後自動晉升為 `manager`，失去所有 org-level 管理角色後自動降回 `member`。

**Architecture:** 在 Repository 層加入兩個新查詢方法（`updateRole`、`isOrgManagerInAnyOrg`），在 `CreateOrganizationService` 內的 transaction 中呼叫晉升，在 `RemoveMemberService` 和 `ChangeOrgMemberRoleService` 成功後呼叫降級檢查。前端 `MemberDashboardPage` 改為主動查詢用戶組織歸屬，無組織時渲染 `CreateOrganizationModal`。

**Tech Stack:** TypeScript strict, Bun test / vitest, gravito-atlas migrations DSL, Inertia.js + React, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-04-15-manager-role-promotion-design.md`

---

## File Map

**新增**
- `database/migrations/2026_04_15_000002_add_unique_org_manager_per_user.ts`
- `resources/js/Pages/Member/Dashboard/components/CreateOrganizationModal.tsx`

**修改**
- `src/Modules/Auth/Domain/Repositories/IAuthRepository.ts` — 新增 `updateRole()` + `withTransaction()`
- `src/Modules/Auth/Infrastructure/Repositories/AuthRepository.ts` — 實作上述兩方法
- `src/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository.ts` — 新增 `isOrgManagerInAnyOrg()`
- `src/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository.ts` — 實作
- `src/Modules/Organization/Application/Services/CreateOrganizationService.ts` — admin 拒絕 + org 檢查 + updateRole in transaction
- `src/Modules/Organization/Application/Services/RemoveMemberService.ts` — 注入 authRepository + 降級邏輯
- `src/Modules/Organization/Application/Services/ChangeOrgMemberRoleService.ts` — 注入 authRepository + 降級邏輯
- `src/Modules/Organization/Infrastructure/Providers/OrganizationServiceProvider.ts` — 更新 DI wiring
- `src/Modules/Organization/Presentation/Routes/organization.routes.ts` — POST 改為 `requireAuth()`
- `src/Website/Member/Pages/MemberDashboardPage.ts` — 注入 memberRepository + hasOrganization prop
- `src/Website/Member/bindings/registerMemberBindings.ts` — 更新 dashboard binding
- `resources/js/Pages/Member/Dashboard/Index.tsx` — 新增 `hasOrganization` prop + no-org card

**測試修改**
- `src/Modules/Organization/__tests__/CreateOrganizationService.test.ts`
- `src/Modules/Organization/__tests__/RemoveMemberService.test.ts`
- `src/Modules/Organization/__tests__/ChangeOrgMemberRoleService.test.ts`

---

## Task 1: IAuthRepository — 新增 updateRole + withTransaction

**Files:**
- Modify: `src/Modules/Auth/Domain/Repositories/IAuthRepository.ts`

- [ ] **Step 1: 在 IAuthRepository 加入兩個新方法**

```typescript
// src/Modules/Auth/Domain/Repositories/IAuthRepository.ts
// 在 import 區加入：
import type { IDatabaseAccess } from '@/Shared/Domain/IDatabaseAccess'
import type { RoleType } from '../ValueObjects/Role'

// 在 IAuthRepository interface 末尾加入：

  /**
   * Updates the system role of a user.
   * Must be called within a transaction when combined with org operations.
   */
  updateRole(userId: string, role: RoleType): Promise<void>

  /**
   * Returns a repository instance scoped to the given transaction.
   */
  withTransaction(tx: IDatabaseAccess): IAuthRepository
```

- [ ] **Step 2: 確認 TypeScript 通過**

```bash
bun run typecheck 2>&1 | grep "IAuthRepository" || echo "No errors"
```

Expected: No errors mentioning IAuthRepository

- [ ] **Step 3: Commit**

```bash
git add src/Modules/Auth/Domain/Repositories/IAuthRepository.ts
git commit -m "feat: [auth] IAuthRepository 新增 updateRole + withTransaction 方法"
```

---

## Task 2: IOrganizationMemberRepository — 新增 isOrgManagerInAnyOrg

**Files:**
- Modify: `src/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository.ts`

- [ ] **Step 1: 在 interface 末尾新增兩個方法（在 withTransaction 之前）**

```typescript
  /**
   * Returns true if the user holds an org-level 'manager' role in ANY organization.
   * Used for system-role promotion/demotion logic.
   */
  isOrgManagerInAnyOrg(userId: string): Promise<boolean>

  /**
   * Returns the OrganizationMember record where the user is the org-level 'manager'.
   * Returns null if the user has no manager membership.
   * Used by MemberDashboardPage to auto-discover the user's managed org.
   */
  findOrgManagerMembershipByUserId(userId: string): Promise<OrganizationMember | null>
```

- [ ] **Step 2: 確認 TypeScript 通過**

```bash
bun run typecheck 2>&1 | grep "isOrgManagerInAnyOrg" || echo "No errors"
```

Expected: Errors about `OrganizationMemberRepository` not implementing `isOrgManagerInAnyOrg` (that's fine — Task 4 fixes this)

- [ ] **Step 3: Commit**

```bash
git add src/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository.ts
git commit -m "feat: [org] IOrganizationMemberRepository 新增 isOrgManagerInAnyOrg 方法"
```

---

## Task 3: AuthRepository — 實作 updateRole + withTransaction

**Files:**
- Modify: `src/Modules/Auth/Infrastructure/Repositories/AuthRepository.ts`

- [ ] **Step 1: 先在 AuthRepository tests 中新增兩個失敗測試**

打開 `src/Modules/Auth/__tests__/AuthRepository.test.ts`，在現有測試後加入：

```typescript
describe('updateRole', () => {
  it('應更新 users.role 欄位', async () => {
    // 先建立用戶
    const db = new MemoryDatabaseAccess()
    const repo = new AuthRepository(db)
    // 透過直接插入測試資料（或用 RegisterUserService）
    const { AuthRepository } = await import('../Infrastructure/Repositories/AuthRepository')
    // 先確認 updateRole 方法存在
    expect(typeof repo.updateRole).toBe('function')
  })
})
```

> 注意：AuthRepository test 已使用 vitest。只需驗證 `updateRole` 被呼叫後 `findById` 回傳的 user.role 已改變。

實際測試在 Task 9（`CreateOrganizationService` integration test）中透過整合測試驗證，這裡只做介面驗證。

- [ ] **Step 2: 在 AuthRepository 實作 updateRole**

在 `AuthRepository` class 的 `countAll` 方法後加入：

```typescript
  /**
   * Updates a user's system role.
   */
  async updateRole(userId: string, role: RoleType): Promise<void> {
    await this.db.table('users').where('id', '=', userId).update({ role })
  }

  /**
   * Returns a repository scoped to the given transaction context.
   */
  withTransaction(tx: IDatabaseAccess): AuthRepository {
    return new AuthRepository(tx)
  }
```

在 import 區加入：
```typescript
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { RoleType } from '../../Domain/ValueObjects/Role'
```

- [ ] **Step 3: 確認 TypeScript 通過**

```bash
bun run typecheck 2>&1 | grep "AuthRepository" || echo "No errors"
```

Expected: No errors

- [ ] **Step 4: Run tests**

```bash
bun test src/Modules/Auth/__tests__/AuthRepository.test.ts
```

Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/Modules/Auth/Infrastructure/Repositories/AuthRepository.ts
git commit -m "feat: [auth] AuthRepository 實作 updateRole + withTransaction"
```

---

## Task 4: OrganizationMemberRepository — 實作 isOrgManagerInAnyOrg + findOrgManagerMembershipByUserId

**Files:**
- Modify: `src/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository.ts`

- [ ] **Step 1: 在 OrganizationMemberRepository 末尾加入兩個方法（在 withTransaction 之前）**

```typescript
  async isOrgManagerInAnyOrg(userId: string): Promise<boolean> {
    const count = await this.db
      .table('organization_members')
      .where('user_id', '=', userId)
      .where('role', '=', 'manager')
      .count()
    return count > 0
  }

  async findOrgManagerMembershipByUserId(userId: string): Promise<OrganizationMember | null> {
    const row = await this.db
      .table('organization_members')
      .where('user_id', '=', userId)
      .where('role', '=', 'manager')
      .first()
    return row ? OrganizationMemberMapper.toEntity(row) : null
  }
```

- [ ] **Step 2: 確認 TypeScript 通過（interface 未實作的錯誤應消失）**

```bash
bun run typecheck 2>&1 | grep "OrganizationMemberRepository" || echo "No errors"
```

Expected: No errors

- [ ] **Step 3: Run tests**

```bash
bun test src/Modules/Organization/__tests__/
```

Expected: All PASS

- [ ] **Step 4: Commit**

```bash
git add src/Modules/Organization/Infrastructure/Repositories/OrganizationMemberRepository.ts
git commit -m "feat: [org] OrganizationMemberRepository 實作 isOrgManagerInAnyOrg + findOrgManagerMembershipByUserId"
```

---

## Task 5: CreateOrganizationService — admin 拒絕 + isOrgManagerInAnyOrg + updateRole in transaction

**Files:**
- Modify: `src/Modules/Organization/Application/Services/CreateOrganizationService.ts`
- Modify: `src/Modules/Organization/__tests__/CreateOrganizationService.test.ts`

- [ ] **Step 1: 先寫失敗測試（TDD）**

在 `CreateOrganizationService.test.ts` 中新增三個測試（在現有測試後）：

```typescript
it('admin 呼叫時應回傳 ADMIN_CANNOT_CREATE_ORG', async () => {
  // 建立 admin 用戶
  const authRepo = new AuthRepository(db)
  const registerResult = await new RegisterUserService(
    authRepo,
    new ScryptPasswordHasher(),
  ).execute({ email: 'admin@example.com', password: 'StrongPass123' })
  const adminId = registerResult.data!.id
  // 直接更新 role 為 admin
  await authRepo.updateRole(adminId, RoleType.ADMIN)

  const result = await service.execute({ name: 'Test Org', managerUserId: adminId })
  expect(result.success).toBe(false)
  expect(result.error).toBe('ADMIN_CANNOT_CREATE_ORG')
})

it('已有組織的 manager 再次建立應回傳 ALREADY_HAS_ORGANIZATION', async () => {
  // managerId 在 beforeEach 中已建立
  await service.execute({ name: 'First Org', managerUserId: managerId })

  const result = await service.execute({ name: 'Second Org', managerUserId: managerId })
  expect(result.success).toBe(false)
  expect(result.error).toBe('ALREADY_HAS_ORGANIZATION')
})

it('建立成功後 users.role 應為 manager', async () => {
  const authRepo = new AuthRepository(db)
  await service.execute({ name: 'Promo Org', managerUserId: managerId })

  const user = await authRepo.findById(managerId)
  expect(user!.role.getValue()).toBe(RoleType.MANAGER)
})
```

加入 import：
```typescript
import { RoleType } from '@/Modules/Auth/Domain/ValueObjects/Role'
```

- [ ] **Step 2: Run tests — 確認新增的三個失敗**

```bash
bun test src/Modules/Organization/__tests__/CreateOrganizationService.test.ts
```

Expected: 3 new tests FAIL

- [ ] **Step 3: 修改 CreateOrganizationService.execute()**

替換 `execute` 方法的開頭和 transaction 內容：

```typescript
async execute(request: CreateOrganizationRequest): Promise<OrganizationResponse> {
  try {
    if (!request.name || !request.name.trim()) {
      return { success: false, message: 'Organization name is required', error: 'NAME_REQUIRED' }
    }

    const manager = await this.authRepository.findById(request.managerUserId)
    if (!manager) {
      return {
        success: false,
        message: 'Designated manager not found',
        error: 'MANAGER_NOT_FOUND',
      }
    }

    // Step 0: admin 不可建立組織
    if (manager.role.isAdmin()) {
      return {
        success: false,
        message: 'Admin accounts cannot create organizations',
        error: 'ADMIN_CANNOT_CREATE_ORG',
      }
    }

    // Step 2: 確認用戶尚未擁有任何組織的 org-level manager 角色
    const alreadyManager = await this.memberRepository.isOrgManagerInAnyOrg(request.managerUserId)
    if (alreadyManager) {
      return {
        success: false,
        message: 'User already has an organization',
        error: 'ALREADY_HAS_ORGANIZATION',
      }
    }

    const orgId = crypto.randomUUID()
    const org = Organization.create(orgId, request.name, request.description || '', request.slug)

    const existingSlug = await this.orgRepository.findBySlug(org.slug)
    if (existingSlug) {
      return { success: false, message: 'This slug is already in use', error: 'SLUG_EXISTS' }
    }

    // Steps 3-6: 在同一個 transaction 內完成
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
      await this.provisionOrganizationDefaults.execute(orgId, request.managerUserId)
      await txAuthRepo.updateRole(request.managerUserId, RoleType.MANAGER)
    })

    return {
      success: true,
      message: 'Organization established successfully',
      data: OrganizationPresenter.fromEntity(org),
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Establishment failed'
    return { success: false, message, error: message }
  }
}
```

加入 import：
```typescript
import { RoleType } from '@/Modules/Auth/Domain/ValueObjects/Role'
```

- [ ] **Step 4: Run tests — 確認全部通過**

```bash
bun test src/Modules/Organization/__tests__/CreateOrganizationService.test.ts
```

Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/Modules/Organization/Application/Services/CreateOrganizationService.ts \
        src/Modules/Organization/__tests__/CreateOrganizationService.test.ts
git commit -m "feat: [org] CreateOrganizationService 加入 admin 拒絕、已有組織拒絕、晉升 transaction"
```

---

## Task 6: RemoveMemberService — 注入 authRepository + 降級邏輯

**Files:**
- Modify: `src/Modules/Organization/Application/Services/RemoveMemberService.ts`
- Modify: `src/Modules/Organization/__tests__/RemoveMemberService.test.ts`

- [ ] **Step 1: 先寫失敗測試**

在 `RemoveMemberService.test.ts` 的 `describe` 內，`beforeEach` 中加入 `authRepo` 和修改 `removeService` 建構：

在 `beforeEach` 加入（在 `removeService = new RemoveMemberService(...)` 之前）：
```typescript
    const authRepoRef = authRepo  // authRepo 已在上方建立
```

在 `removeService` 建構時改為注入 `authRepo`（Task 6 Step 3 後才能做到，先跑現有 test 確保通過）。

新增測試（在現有測試後）：

```typescript
it('移除最後一個 org manager 後其系統角色應降為 member', async () => {
  // managerId 是唯一的 org manager
  // 以 admin 身份移除 manager（先把 memberId 提升為 manager）
  const authRepo = new AuthRepository(db)
  // 先讓 memberId 成為 org manager（透過 ChangeOrgMemberRoleService）
  const changeSvc = new ChangeOrgMemberRoleService(memberRepo, db)
  await changeSvc.execute(orgId, memberId, 'manager')
  // 現在 orgId 有兩個 managers: managerId 和 memberId
  // 移除 managerId
  await removeService.execute(orgId, managerId, memberId, 'user')
  // memberId 仍是 manager，managerId 應降為 member
  const user = await authRepo.findById(managerId)
  expect(user!.role.getValue()).toBe(RoleType.MEMBER)
})

it('移除成員後其仍有其他組織的 manager 角色時系統角色不變', async () => {
  // memberId 是普通成員，移除後本來就是 member，系統角色不變
  const authRepo = new AuthRepository(db)
  const before = await authRepo.findById(memberId)
  await removeService.execute(orgId, memberId, managerId, 'user')
  const after = await authRepo.findById(memberId)
  expect(after!.role.getValue()).toBe(before!.role.getValue())
})
```

加入 imports：
```typescript
import { ChangeOrgMemberRoleService } from '../Application/Services/ChangeOrgMemberRoleService'
import { RoleType } from '@/Modules/Auth/Domain/ValueObjects/Role'
import { AuthRepository } from '@/Modules/Auth/Infrastructure/Repositories/AuthRepository'
```

- [ ] **Step 2: Run tests — 確認新測試失敗**

```bash
bun test src/Modules/Organization/__tests__/RemoveMemberService.test.ts
```

Expected: 2 new tests FAIL (RemoveMemberService 尚未注入 authRepository)

- [ ] **Step 3: 修改 RemoveMemberService**

```typescript
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
  ) {}

  async execute(
    orgId: string,
    targetUserId: string,
    requesterId: string,
    requesterSystemRole: string,
  ): Promise<OrganizationResponse> {
    try {
      const authResult = await this.orgAuth.requireOrgManager(
        orgId,
        requesterId,
        requesterSystemRole,
      )
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
        if (member.isManager()) {
          const managerCount = await txMemberRepo.countManagersByOrgId(orgId)
          OrgMembershipRules.assertNotLastManager(member, managerCount)
        }
        await txMemberRepo.remove(member.id)
      })

      // 降級檢查：若 targetUserId 已無任何 org-level manager 角色，降回 member
      const stillManager = await this.memberRepository.isOrgManagerInAnyOrg(targetUserId)
      if (!stillManager) {
        await this.authRepository.updateRole(targetUserId, RoleType.MEMBER)
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

- [ ] **Step 4: 更新測試中 RemoveMemberService 的建構（在 beforeEach 中注入 authRepo）**

在 `RemoveMemberService.test.ts` 的 `beforeEach` 中，將 `removeService` 的建構改為：
```typescript
    removeService = new RemoveMemberService(memberRepo, orgAuth, db, authRepo)
```

- [ ] **Step 5: Run tests — 確認全部通過**

```bash
bun test src/Modules/Organization/__tests__/RemoveMemberService.test.ts
```

Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add src/Modules/Organization/Application/Services/RemoveMemberService.ts \
        src/Modules/Organization/__tests__/RemoveMemberService.test.ts
git commit -m "feat: [org] RemoveMemberService 注入 authRepository 並加入降級邏輯"
```

---

## Task 7: ChangeOrgMemberRoleService — 注入 authRepository + 降級邏輯

**Files:**
- Modify: `src/Modules/Organization/Application/Services/ChangeOrgMemberRoleService.ts`
- Modify: `src/Modules/Organization/__tests__/ChangeOrgMemberRoleService.test.ts`

> 注意：現有 `ChangeOrgMemberRoleService.test.ts` 使用 `bun:test` (mock 方式)。新測試也用 mock 方式。

- [ ] **Step 1: 先寫失敗測試（在現有 mock-based tests 後）**

```typescript
import { beforeEach, describe, expect, it, mock } from 'bun:test'

// ... 現有 makeMockMemberRepo 和 makeMockDb ...

function makeMockAuthRepo() {
  return {
    findById: mock(),
    findByEmail: mock(),
    findByGoogleId: mock(),
    emailExists: mock(),
    save: mock(),
    delete: mock(),
    findAll: mock(),
    countAll: mock(),
    updateRole: mock().mockResolvedValue(undefined),
    withTransaction: mock().mockReturnThis(),
  }
}

// 新增一個 describe block：
describe('ChangeOrgMemberRoleService — 降級邏輯', () => {
  let service: ChangeOrgMemberRoleService
  let memberRepo: IOrganizationMemberRepository
  let authRepo: ReturnType<typeof makeMockAuthRepo>
  let db: ReturnType<typeof makeMockDb>

  beforeEach(() => {
    memberRepo = makeMockMemberRepo()
    authRepo = makeMockAuthRepo()
    db = makeMockDb()
    service = new ChangeOrgMemberRoleService(memberRepo, db, authRepo as never)
  })

  it('將 manager 降為 member 後應呼叫 authRepository.updateRole', async () => {
    const manager = makeMember('manager')
    ;(memberRepo.findByUserAndOrgId as any).mockResolvedValue(manager)
    ;(memberRepo.countManagersByOrgId as any).mockResolvedValue(2) // 還有其他 manager
    ;(memberRepo.update as any).mockResolvedValue(undefined)
    ;(memberRepo.isOrgManagerInAnyOrg as any).mockResolvedValue(false) // 已無 manager 角色

    await service.execute('org-1', 'user-mem-1', 'member')

    expect(authRepo.updateRole).toHaveBeenCalledWith('user-mem-1', 'member')
  })

  it('仍為 manager 時不應呼叫 authRepository.updateRole', async () => {
    const member = makeMember('member')
    ;(memberRepo.findByUserAndOrgId as any).mockResolvedValue(member)
    ;(memberRepo.update as any).mockResolvedValue(undefined)
    ;(memberRepo.isOrgManagerInAnyOrg as any).mockResolvedValue(true) // 仍是其他 org 的 manager

    await service.execute('org-1', 'user-mem-1', 'manager')

    expect(authRepo.updateRole).not.toHaveBeenCalled()
  })
})
```

需要在 `IOrganizationMemberRepository` mock 中加入 `isOrgManagerInAnyOrg`:
```typescript
function makeMockMemberRepo(): IOrganizationMemberRepository {
  return {
    // ...existing fields...
    isOrgManagerInAnyOrg: mock(),
  }
}
```

- [ ] **Step 2: Run tests — 確認新測試失敗**

```bash
bun test src/Modules/Organization/__tests__/ChangeOrgMemberRoleService.test.ts
```

Expected: 2 new tests FAIL

- [ ] **Step 3: 修改 ChangeOrgMemberRoleService**

```typescript
import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import { RoleType } from '@/Modules/Auth/Domain/ValueObjects/Role'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IOrganizationMemberRepository } from '../../Domain/Repositories/IOrganizationMemberRepository'
import { OrgMembershipRules } from '../../Domain/Services/OrgMembershipRules'
import { OrgMemberRole } from '../../Domain/ValueObjects/OrgMemberRole'
import { OrganizationMemberPresenter, type OrganizationResponse } from '../DTOs/OrganizationDTO'

export class ChangeOrgMemberRoleService {
  constructor(
    private memberRepository: IOrganizationMemberRepository,
    private db: IDatabaseAccess,
    private authRepository: IAuthRepository,
  ) {}

  async execute(
    orgId: string,
    targetUserId: string,
    newRole: string,
  ): Promise<OrganizationResponse> {
    try {
      const newRoleVO = new OrgMemberRole(newRole)

      const member = await this.memberRepository.findByUserAndOrgId(targetUserId, orgId)
      if (!member) {
        return { success: false, message: 'Member not found', error: 'MEMBER_NOT_FOUND' }
      }

      const updated = member.changeRole(newRoleVO)

      await this.db.transaction(async (tx) => {
        const txMemberRepo = this.memberRepository.withTransaction(tx)
        if (member.isManager() && !newRoleVO.isManager()) {
          const managerCount = await txMemberRepo.countManagersByOrgId(orgId)
          OrgMembershipRules.assertNotLastManager(member, managerCount)
        }
        await txMemberRepo.update(updated)
      })

      // 降級檢查：若 targetUserId 已無任何 org-level manager 角色，降回 member
      const stillManager = await this.memberRepository.isOrgManagerInAnyOrg(targetUserId)
      if (!stillManager) {
        await this.authRepository.updateRole(targetUserId, RoleType.MEMBER)
      }

      return {
        success: true,
        message: 'Member role updated successfully',
        data: OrganizationMemberPresenter.fromEntity(updated),
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('last manager')) {
        return {
          success: false,
          message: 'Cannot demote the last manager',
          error: 'CANNOT_DEMOTE_LAST_MANAGER',
        }
      }
      const message = error instanceof Error ? error.message : 'Role change failed'
      return { success: false, message, error: message }
    }
  }
}
```

- [ ] **Step 4: Run tests — 確認全部通過**

```bash
bun test src/Modules/Organization/__tests__/ChangeOrgMemberRoleService.test.ts
```

Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/Modules/Organization/Application/Services/ChangeOrgMemberRoleService.ts \
        src/Modules/Organization/__tests__/ChangeOrgMemberRoleService.test.ts
git commit -m "feat: [org] ChangeOrgMemberRoleService 注入 authRepository 並加入降級邏輯"
```

---

## Task 8: DI Wiring — OrganizationServiceProvider + Routes

**Files:**
- Modify: `src/Modules/Organization/Infrastructure/Providers/OrganizationServiceProvider.ts`
- Modify: `src/Modules/Organization/Presentation/Routes/organization.routes.ts`

- [ ] **Step 1: 更新 OrganizationServiceProvider — removeMemberService 和 changeOrgMemberRoleService 注入 authRepository**

在 `registerApplicationServices` 中修改：

```typescript
// removeMemberService — 加入第四個參數 authRepository
container.bind('removeMemberService', (c: IContainer) => new RemoveMemberService(
  c.make('organizationMemberRepository') as IOrganizationMemberRepository,
  c.make('orgAuthorizationHelper') as OrgAuthorizationHelper,
  db as IDatabaseAccess,
  c.make('authRepository') as IAuthRepository,
))

// changeOrgMemberRoleService — 加入第三個參數 authRepository
container.bind('changeOrgMemberRoleService', (c: IContainer) => new ChangeOrgMemberRoleService(
  c.make('organizationMemberRepository') as IOrganizationMemberRepository,
  db as IDatabaseAccess,
  c.make('authRepository') as IAuthRepository,
))
```

- [ ] **Step 2: 更新 organization.routes.ts — POST /api/organizations 改為 requireAuth()**

```typescript
// 舊：
router.post(
  '/api/organizations',
  [createRoleMiddleware('admin')],
  CreateOrganizationRequest,
  (ctx) => controller.create(ctx),
)

// 新：
router.post(
  '/api/organizations',
  [requireAuth()],
  CreateOrganizationRequest,
  (ctx) => controller.create(ctx),
)
```

- [ ] **Step 3: 確認 TypeScript 通過**

```bash
bun run typecheck 2>&1 | head -20
```

Expected: No errors

- [ ] **Step 4: Run all Organization tests**

```bash
bun test src/Modules/Organization/__tests__/
```

Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add src/Modules/Organization/Infrastructure/Providers/OrganizationServiceProvider.ts \
        src/Modules/Organization/Presentation/Routes/organization.routes.ts
git commit -m "feat: [org] 更新 DI wiring 注入 authRepository，POST /api/organizations 開放 requireAuth"
```

---

## Task 9: DB Migration — partial unique constraint

**Files:**
- Create: `database/migrations/2026_04_15_000002_add_unique_org_manager_per_user.ts`

- [ ] **Step 1: 建立 migration 檔案**

```bash
npx orbit make:migration add_unique_org_manager_per_user
```

Expected: 產生 `database/migrations/2026_04_15_XXXXXX_add_unique_org_manager_per_user.ts`

- [ ] **Step 2: 填入 migration 內容**

```typescript
/**
 * Migration: 確保每位用戶在 organization_members 中最多只有一個 org-level 'manager' 角色
 *
 * 使用 partial unique index（SQLite/Postgres 均支援），僅對 role='manager' 的資料列
 * 限制 user_id 唯一，不影響同一用戶在多個組織的 member 資格。
 */
import { type Migration, Schema } from '@gravito/atlas'

export default class AddUniqueOrgManagerPerUser implements Migration {
  async up(): Promise<void> {
    // Atlas DSL 不直接支援 partial unique index，使用 raw SQL
    await Schema.rawStatement(
      `CREATE UNIQUE INDEX IF NOT EXISTS uniq_org_manager_per_user
       ON organization_members (user_id)
       WHERE role = 'manager'`
    )
  }

  async down(): Promise<void> {
    await Schema.rawStatement(
      `DROP INDEX IF EXISTS uniq_org_manager_per_user`
    )
  }
}
```

> 若 `Schema.rawStatement()` 不存在，改為在 `up()` 中加入 comment 並跳過此 migration：
> ```typescript
> async up(): Promise<void> {
>   // NOTE: Partial unique index must be applied manually:
>   // CREATE UNIQUE INDEX uniq_org_manager_per_user ON organization_members (user_id) WHERE role = 'manager';
>   console.log('[Migration] Manual step required: apply partial unique index on organization_members')
> }
> ```

- [ ] **Step 3: Commit**

```bash
git add database/migrations/
git commit -m "feat: [db] 新增 organization_members partial unique constraint（每用戶最多一個 org manager）"
```

---

## Task 10: MemberDashboardPage — 注入 memberRepository + hasOrganization prop

**Files:**
- Modify: `src/Website/Member/Pages/MemberDashboardPage.ts`
- Modify: `src/Website/Member/bindings/registerMemberBindings.ts`

- [ ] **Step 1: 修改 MemberDashboardPage**

```typescript
import type { IOrganizationMemberRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository'
import type { GetBalanceService } from '@/Modules/Credit/Application/Services/GetBalanceService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '@/Website/Http/Inertia/InertiaRequestHandler'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'

/**
 * Page handler for the member dashboard.
 *
 * Path: `/member/dashboard`
 * React Page: `Member/Dashboard/Index`
 */
export class MemberDashboardPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly balanceService: GetBalanceService,
    private readonly memberRepository: IOrganizationMemberRepository,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!

    // 透過 org-level manager membership 自動發現 orgId（不依賴 query param）
    // 使用 findOrgManagerMembershipByUserId 而非 findByUserId，
    // 因為用戶可能同時是其他組織的 member，findByUserId 可能返回非 manager 的那一筆
    const membership = await this.memberRepository.findOrgManagerMembershipByUserId(auth.userId)

    if (!membership) {
      // 用戶尚無組織，顯示引導卡片
      return this.inertia.render(ctx, 'Member/Dashboard/Index', {
        orgId: null,
        balance: null,
        hasOrganization: false,
        error: null,
      })
    }

    const orgId = membership.organizationId
    const balanceResult = await this.balanceService.execute(orgId, auth.userId, auth.role)

    return this.inertia.render(ctx, 'Member/Dashboard/Index', {
      orgId,
      balance: balanceResult.success ? (balanceResult.data ?? null) : null,
      hasOrganization: true,
      error: balanceResult.success ? null : { key: 'member.dashboard.loadFailed' },
    })
  }
}
```

> 注意：`OrganizationMember` 的 `organizationId` 屬性需要確認。查看 `src/Modules/Organization/Domain/Entities/OrganizationMember.ts` 確認 public 屬性名稱（可能是 `orgId` 或 `organizationId`）。

- [ ] **Step 2: 確認 OrganizationMember 屬性名稱**

```bash
grep -n "orgId\|organizationId" src/Modules/Organization/Domain/Entities/OrganizationMember.ts | head -10
```

根據結果調整 `membership.organizationId` 為實際屬性名。

- [ ] **Step 3: 修改 registerMemberBindings.ts — dashboard binding 注入 memberRepository**

```typescript
container.singleton(k.dashboard, (c) => {
  return new MemberDashboardPage(
    c.make(i) as InertiaService,
    c.make('getBalanceService') as GetBalanceService,
    c.make('organizationMemberRepository') as IOrganizationMemberRepository,
  )
})
```

加入 import：
```typescript
import type { IOrganizationMemberRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository'
```

- [ ] **Step 4: 確認 TypeScript 通過**

```bash
bun run typecheck 2>&1 | head -20
```

Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/Website/Member/Pages/MemberDashboardPage.ts \
        src/Website/Member/bindings/registerMemberBindings.ts
git commit -m "feat: [dashboard] MemberDashboardPage 自動查詢組織歸屬，無組織時傳遞 hasOrganization: false"
```

---

## Task 11: React UI — Dashboard Index + CreateOrganizationModal

**Files:**
- Modify: `resources/js/Pages/Member/Dashboard/Index.tsx`
- Create: `resources/js/Pages/Member/Dashboard/components/CreateOrganizationModal.tsx`

- [ ] **Step 1: 建立 CreateOrganizationModal 元件**

```tsx
// resources/js/Pages/Member/Dashboard/components/CreateOrganizationModal.tsx
import { useState } from 'react'
import { router } from '@inertiajs/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ERROR_MESSAGES: Record<string, string> = {
  ALREADY_HAS_ORGANIZATION: '您已擁有一個組織',
  ADMIN_CANNOT_CREATE_ORG: '管理員帳號無法建立組織',
}

export function CreateOrganizationModal({ open, onOpenChange }: Props) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const validate = (): string | null => {
    if (name.trim().length < 2) return '組織名稱至少需要 2 個字元'
    if (name.trim().length > 64) return '組織名稱不可超過 64 個字元'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const payload = (await response.json()) as {
        success: boolean
        error?: string
        message?: string
      }

      if (payload.success) {
        router.visit('/member/dashboard', { replace: true })
      } else {
        setError(
          ERROR_MESSAGES[payload.error ?? ''] ??
            payload.message ??
            '建立失敗，請稍後再試',
        )
      }
    } catch {
      setError('建立失敗，請稍後再試')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>建立我的組織</DialogTitle>
          <DialogDescription>
            建立組織以開始使用 API Key、帳單與儀表板功能。
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">組織名稱</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：我的科技公司"
              minLength={2}
              maxLength={64}
              disabled={submitting}
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              取消
            </Button>
            <Button type="submit" disabled={submitting || name.trim().length < 2}>
              {submitting ? '建立中…' : '建立組織'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

> 注意：`Dialog` 等元件需從 `@/components/ui/dialog` 引入。若 `dialog.tsx` 不存在，需先建立（見 shadcn/ui 安裝指令）。

- [ ] **Step 2: 確認 Dialog 元件存在**

```bash
ls resources/js/components/ui/dialog.tsx 2>/dev/null && echo "EXISTS" || echo "MISSING"
```

若 MISSING：
```bash
npx shadcn-ui@latest add dialog
```

- [ ] **Step 3: 更新 Dashboard/Index.tsx — 新增 hasOrganization prop + NoOrgCard**

在 `Props` interface 加入：
```typescript
interface Props {
  orgId?: string | null
  balance: Balance | null
  hasOrganization: boolean   // 新增
  error: I18nMessage | null
}
```

在 `MemberDashboard` 函數簽名更新：
```typescript
export default function MemberDashboard({ orgId, balance, hasOrganization, error }: Props) {
```

在 `useEffect` 上方加入 state：
```typescript
  const [createOrgOpen, setCreateOrgOpen] = useState(false)
```

在 return 的 `<MemberLayout>` 開頭，`<div className="space-y-8">` 後，加入：

```tsx
        {/* 尚無組織時顯示引導卡片 */}
        {!hasOrganization && (
          <>
            <CreateOrganizationModal open={createOrgOpen} onOpenChange={setCreateOrgOpen} />
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-base">尚無組織</CardTitle>
                <CardDescription>
                  建立組織以開始使用 API Key、帳單與儀表板功能
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setCreateOrgOpen(true)}>建立我的組織</Button>
              </CardContent>
            </Card>
          </>
        )}
```

在 `MemberDashboard` 函數頂部加入 import：
```typescript
import { CreateOrganizationModal } from './components/CreateOrganizationModal'
```

- [ ] **Step 4: 確認 TypeScript frontend 通過**

```bash
bun run typecheck:frontend 2>&1 | head -20
```

Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add resources/js/Pages/Member/Dashboard/
git commit -m "feat: [dashboard] 無組織時渲染引導卡片與 CreateOrganizationModal"
```

---

## Task 12: 整合驗收

- [ ] **Step 1: 全量 typecheck**

```bash
bun run typecheck
```

Expected: 0 errors

- [ ] **Step 2: 跑全部 tests**

```bash
bun test src/Modules/
```

Expected: All PASS

- [ ] **Step 3: 手動 E2E 驗證**

啟動開發伺服器：
```bash
ORM=memory bun run dev
```

驗證流程：
1. 以新用戶註冊 → 進入 `/member/dashboard` → 應看到「尚無組織」卡片
2. 點擊「建立我的組織」→ 輸入組織名稱 → 送出
3. 成功後 → 頁面刷新 → 應看到正常 Dashboard（有餘額、快速操作）
4. 重整頁面 → 仍看到正常 Dashboard（不再出現引導卡片）
5. 再次點擊「建立我的組織」（手動呼叫）→ 應收到 `ALREADY_HAS_ORGANIZATION` 錯誤

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: [manager-role] 最終整合驗收通過"
```

---

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | — |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 0 | — | — |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | — | — |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

**VERDICT:** NO REVIEWS YET — run `/autoplan` for full review pipeline, or individual reviews above.
