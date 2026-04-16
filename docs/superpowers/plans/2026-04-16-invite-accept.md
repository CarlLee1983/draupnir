# Member 接受／拒絕組織邀請 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓尚未加入組織的 Member 在 Dashboard 看到待處理邀請並接受或拒絕。

**Architecture:** `MemberDashboardPage` server-side 查詢登入 email 對應的 pending 邀請並透過 Inertia props 傳入前端。新增兩個 Application Services（接受/拒絕 by invitation ID）與對應 API 路由。前端 Dashboard 在無組織狀態下顯示邀請卡片。

**Tech Stack:** TypeScript, Bun, Inertia.js (React), Zod, Gravito framework, MemoryDatabaseAccess (tests)

---

## File Map

### 新增
| 路徑 | 職責 |
|------|------|
| `src/Modules/Organization/Application/Services/GetPendingInvitationsService.ts` | 依 userId 查詢 pending 邀請並補充 org name |
| `src/Modules/Organization/Application/Services/AcceptInvitationByIdService.ts` | 依 invitationId 接受邀請（dashboard 流程） |
| `src/Modules/Organization/Application/Services/DeclineInvitationService.ts` | 依 invitationId 拒絕邀請 |
| `src/Modules/Organization/__tests__/GetPendingInvitationsService.test.ts` | 單元測試 |
| `src/Modules/Organization/__tests__/AcceptInvitationByIdService.test.ts` | 單元測試 |
| `src/Modules/Organization/__tests__/DeclineInvitationService.test.ts` | 單元測試 |
| `resources/js/Pages/Member/Dashboard/components/InvitationCard.tsx` | 邀請卡片 UI 元件 |

### 修改
| 路徑 | 變更 |
|------|------|
| `src/Modules/Organization/Domain/Repositories/IOrganizationInvitationRepository.ts` | 新增 `findPendingByEmail` |
| `src/Modules/Organization/Infrastructure/Repositories/OrganizationInvitationRepository.ts` | 實作 `findPendingByEmail` |
| `src/Modules/Organization/Presentation/Controllers/OrganizationController.ts` | 新增 `acceptInvitationById` + `declineInvitation` |
| `src/Modules/Organization/Presentation/Routes/organization.routes.ts` | 新增 2 條路由 |
| `src/Modules/Organization/Infrastructure/Providers/OrganizationServiceProvider.ts` | 註冊 3 個新 service + 更新 controller |
| `src/Website/Member/Pages/MemberDashboardPage.ts` | 注入 `GetPendingInvitationsService`，無組織時查詢邀請 |
| `src/Website/Member/bindings/registerMemberBindings.ts` | 更新 dashboard 綁定 |
| `resources/js/Pages/Member/Dashboard/Index.tsx` | 新增 `pendingInvitations` prop + 邀請 UI |
| `src/Website/__tests__/Member/MemberDashboardPage.test.ts` | 更新既有測試 + 新增邀請情境測試 |

---

## Task 1：Repository Port 新增 `findPendingByEmail`

**Files:**
- Modify: `src/Modules/Organization/Domain/Repositories/IOrganizationInvitationRepository.ts`
- Modify: `src/Modules/Organization/Infrastructure/Repositories/OrganizationInvitationRepository.ts`

- [ ] **Step 1: 在 Port interface 新增方法簽名**

開啟 `src/Modules/Organization/Domain/Repositories/IOrganizationInvitationRepository.ts`，在 `deleteExpired` 後加入：

```typescript
import type { IDatabaseAccess } from '@/Shared/Domain/IDatabaseAccess'
import type { OrganizationInvitation } from '../Entities/OrganizationInvitation'

export interface IOrganizationInvitationRepository {
  save(invitation: OrganizationInvitation): Promise<void>
  update(invitation: OrganizationInvitation): Promise<void>
  findById(id: string): Promise<OrganizationInvitation | null>
  findByTokenHash(tokenHash: string): Promise<OrganizationInvitation | null>
  findByOrgId(orgId: string): Promise<OrganizationInvitation[]>
  findPendingByEmail(email: string): Promise<OrganizationInvitation[]>   // ← 新增
  deleteExpired(): Promise<void>
  withTransaction(tx: IDatabaseAccess): IOrganizationInvitationRepository
}
```

- [ ] **Step 2: 在 Repository 實作 `findPendingByEmail`**

開啟 `src/Modules/Organization/Infrastructure/Repositories/OrganizationInvitationRepository.ts`，在 `deleteExpired` 方法前插入：

```typescript
async findPendingByEmail(email: string): Promise<OrganizationInvitation[]> {
  const rows = await this.db
    .table('organization_invitations')
    .where('email', '=', email.toLowerCase())
    .where('status', '=', 'pending')
    .where('expires_at', '>', new Date().toISOString())
    .orderBy('created_at', 'DESC')
    .select()
  return rows.map((row) => OrganizationInvitationMapper.toEntity(row))
}
```

- [ ] **Step 3: 執行測試確認沒有 TypeScript 錯誤**

```bash
bun test src/Modules/Organization --reporter=verbose 2>&1 | head -40
```

期望：所有現有測試通過，無型別錯誤。

- [ ] **Step 4: Commit**

```bash
git add src/Modules/Organization/Domain/Repositories/IOrganizationInvitationRepository.ts
git add src/Modules/Organization/Infrastructure/Repositories/OrganizationInvitationRepository.ts
git commit -m "feat: [org] 新增 IOrganizationInvitationRepository.findPendingByEmail"
```

---

## Task 2：`GetPendingInvitationsService`（TDD）

**Files:**
- Create: `src/Modules/Organization/__tests__/GetPendingInvitationsService.test.ts`
- Create: `src/Modules/Organization/Application/Services/GetPendingInvitationsService.ts`

### 2a. 撰寫失敗測試

- [ ] **Step 1: 建立測試檔案**

新增 `src/Modules/Organization/__tests__/GetPendingInvitationsService.test.ts`：

```typescript
import { describe, expect, it, mock } from 'bun:test'
import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import type { IOrganizationRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationRepository'
import { OrganizationInvitation } from '@/Modules/Organization/Domain/Entities/OrganizationInvitation'
import { InvitationStatus } from '@/Modules/Organization/Domain/ValueObjects/InvitationStatus'
import { OrgMemberRole } from '@/Modules/Organization/Domain/ValueObjects/OrgMemberRole'
import type { IOrganizationInvitationRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationInvitationRepository'
import { GetPendingInvitationsService } from '@/Modules/Organization/Application/Services/GetPendingInvitationsService'

function makePendingInvitation(orgId = 'org-1'): OrganizationInvitation {
  return OrganizationInvitation.reconstitute({
    id: 'inv-1',
    organizationId: orgId,
    email: 'member@example.com',
    token: '',
    tokenHash: 'hash-abc',
    role: new OrgMemberRole('member'),
    invitedByUserId: 'user-manager',
    status: new InvitationStatus('pending'),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  })
}

function makeUser(email = 'member@example.com') {
  return { emailValue: email, id: 'user-1' }
}

function makeOrg(id = 'org-1', name = 'Test Org') {
  return { id, name }
}

describe('GetPendingInvitationsService', () => {
  it('無組織時回傳 pending 邀請列表（含 org name）', async () => {
    const invitationRepo = {
      findPendingByEmail: mock().mockResolvedValue([makePendingInvitation('org-1')]),
    } as unknown as IOrganizationInvitationRepository

    const authRepo = {
      findById: mock().mockResolvedValue(makeUser('member@example.com')),
    } as unknown as IAuthRepository

    const orgRepo = {
      findById: mock().mockResolvedValue(makeOrg('org-1', 'Test Org')),
    } as unknown as IOrganizationRepository

    const service = new GetPendingInvitationsService(invitationRepo, authRepo, orgRepo)
    const result = await service.execute('user-1')

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('inv-1')
    expect(result[0].organizationName).toBe('Test Org')
    expect(result[0].role).toBe('member')
    expect(result[0].organizationId).toBe('org-1')
    expect(typeof result[0].expiresAt).toBe('string')
  })

  it('user 不存在時回傳空陣列', async () => {
    const invitationRepo = {
      findPendingByEmail: mock().mockResolvedValue([]),
    } as unknown as IOrganizationInvitationRepository

    const authRepo = {
      findById: mock().mockResolvedValue(null),
    } as unknown as IAuthRepository

    const orgRepo = {
      findById: mock().mockResolvedValue(null),
    } as unknown as IOrganizationRepository

    const service = new GetPendingInvitationsService(invitationRepo, authRepo, orgRepo)
    const result = await service.execute('unknown-user')

    expect(result).toHaveLength(0)
  })

  it('org 不存在時邀請仍回傳（name 為空字串）', async () => {
    const invitationRepo = {
      findPendingByEmail: mock().mockResolvedValue([makePendingInvitation('deleted-org')]),
    } as unknown as IOrganizationInvitationRepository

    const authRepo = {
      findById: mock().mockResolvedValue(makeUser()),
    } as unknown as IAuthRepository

    const orgRepo = {
      findById: mock().mockResolvedValue(null),
    } as unknown as IOrganizationRepository

    const service = new GetPendingInvitationsService(invitationRepo, authRepo, orgRepo)
    const result = await service.execute('user-1')

    expect(result).toHaveLength(1)
    expect(result[0].organizationName).toBe('')
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
bun test src/Modules/Organization/__tests__/GetPendingInvitationsService.test.ts --reporter=verbose
```

期望：FAIL，`Cannot find module '@/Modules/Organization/Application/Services/GetPendingInvitationsService'`

### 2b. 實作 Service

- [ ] **Step 3: 新增 `GetPendingInvitationsService.ts`**

```typescript
// src/Modules/Organization/Application/Services/GetPendingInvitationsService.ts
import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import type { IOrganizationRepository } from '../../Domain/Repositories/IOrganizationRepository'
import type { IOrganizationInvitationRepository } from '../../Domain/Repositories/IOrganizationInvitationRepository'

export interface PendingInvitationDTO {
  id: string
  organizationId: string
  organizationName: string
  role: string
  expiresAt: string
}

export class GetPendingInvitationsService {
  constructor(
    private invitationRepository: IOrganizationInvitationRepository,
    private authRepository: IAuthRepository,
    private orgRepository: IOrganizationRepository,
  ) {}

  async execute(userId: string): Promise<PendingInvitationDTO[]> {
    const user = await this.authRepository.findById(userId)
    if (!user) return []

    const invitations = await this.invitationRepository.findPendingByEmail(user.emailValue)

    const results: PendingInvitationDTO[] = []
    for (const inv of invitations) {
      const org = await this.orgRepository.findById(inv.organizationId)
      results.push({
        id: inv.id,
        organizationId: inv.organizationId,
        organizationName: org?.name ?? '',
        role: inv.role.getValue(),
        expiresAt: inv.expiresAt.toISOString(),
      })
    }
    return results
  }
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
bun test src/Modules/Organization/__tests__/GetPendingInvitationsService.test.ts --reporter=verbose
```

期望：3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/Modules/Organization/__tests__/GetPendingInvitationsService.test.ts
git add src/Modules/Organization/Application/Services/GetPendingInvitationsService.ts
git commit -m "feat: [org] 新增 GetPendingInvitationsService"
```

---

## Task 3：`DeclineInvitationService`（TDD）

**Files:**
- Create: `src/Modules/Organization/__tests__/DeclineInvitationService.test.ts`
- Create: `src/Modules/Organization/Application/Services/DeclineInvitationService.ts`

### 3a. 撰寫失敗測試

- [ ] **Step 1: 建立測試檔案**

新增 `src/Modules/Organization/__tests__/DeclineInvitationService.test.ts`：

```typescript
import { describe, expect, it, mock } from 'bun:test'
import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import type { IOrganizationInvitationRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationInvitationRepository'
import { OrganizationInvitation } from '@/Modules/Organization/Domain/Entities/OrganizationInvitation'
import { InvitationStatus } from '@/Modules/Organization/Domain/ValueObjects/InvitationStatus'
import { OrgMemberRole } from '@/Modules/Organization/Domain/ValueObjects/OrgMemberRole'
import { DeclineInvitationService } from '@/Modules/Organization/Application/Services/DeclineInvitationService'

function makePendingInvitation(email = 'member@example.com'): OrganizationInvitation {
  return OrganizationInvitation.reconstitute({
    id: 'inv-1',
    organizationId: 'org-1',
    email,
    token: '',
    tokenHash: 'hash-abc',
    role: new OrgMemberRole('member'),
    invitedByUserId: 'user-manager',
    status: new InvitationStatus('pending'),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  })
}

function makeMockInvitationRepo(): IOrganizationInvitationRepository {
  return {
    save: mock(),
    update: mock(),
    findById: mock(),
    findByTokenHash: mock(),
    findByOrgId: mock(),
    findPendingByEmail: mock(),
    deleteExpired: mock(),
    withTransaction: mock().mockReturnThis(),
  }
}

function makeUser(email = 'member@example.com') {
  return { emailValue: email, id: 'user-1' }
}

describe('DeclineInvitationService', () => {
  it('應成功拒絕 pending 邀請', async () => {
    const invitationRepo = makeMockInvitationRepo()
    ;(invitationRepo.findById as any).mockResolvedValue(makePendingInvitation())
    ;(invitationRepo.update as any).mockResolvedValue(undefined)

    const authRepo = {
      findById: mock().mockResolvedValue(makeUser()),
    } as unknown as IAuthRepository

    const service = new DeclineInvitationService(invitationRepo, authRepo)
    const result = await service.execute('inv-1', 'user-1')

    expect(result.success).toBe(true)
    const updatedArg = (invitationRepo.update as any).mock.calls[0][0]
    expect(updatedArg.status.getValue()).toBe('cancelled')
  })

  it('邀請不存在應回傳 INVALID_INVITATION', async () => {
    const invitationRepo = makeMockInvitationRepo()
    ;(invitationRepo.findById as any).mockResolvedValue(null)

    const authRepo = {
      findById: mock().mockResolvedValue(makeUser()),
    } as unknown as IAuthRepository

    const service = new DeclineInvitationService(invitationRepo, authRepo)
    const result = await service.execute('nonexistent', 'user-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe('INVALID_INVITATION')
  })

  it('user 不存在應回傳 USER_NOT_FOUND', async () => {
    const invitationRepo = makeMockInvitationRepo()
    const authRepo = {
      findById: mock().mockResolvedValue(null),
    } as unknown as IAuthRepository

    const service = new DeclineInvitationService(invitationRepo, authRepo)
    const result = await service.execute('inv-1', 'unknown-user')

    expect(result.success).toBe(false)
    expect(result.error).toBe('USER_NOT_FOUND')
  })

  it('email 不匹配應回傳 EMAIL_MISMATCH', async () => {
    const invitationRepo = makeMockInvitationRepo()
    ;(invitationRepo.findById as any).mockResolvedValue(makePendingInvitation('other@example.com'))

    const authRepo = {
      findById: mock().mockResolvedValue(makeUser('member@example.com')),
    } as unknown as IAuthRepository

    const service = new DeclineInvitationService(invitationRepo, authRepo)
    const result = await service.execute('inv-1', 'user-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe('EMAIL_MISMATCH')
  })

  it('邀請已過期應回傳 INVALID_INVITATION', async () => {
    const expiredInv = OrganizationInvitation.reconstitute({
      id: 'inv-expired',
      organizationId: 'org-1',
      email: 'member@example.com',
      token: '',
      tokenHash: 'hash-expired',
      role: new OrgMemberRole('member'),
      invitedByUserId: 'user-manager',
      status: new InvitationStatus('pending'),
      expiresAt: new Date(Date.now() - 1000),  // already expired
      createdAt: new Date(),
    })

    const invitationRepo = makeMockInvitationRepo()
    ;(invitationRepo.findById as any).mockResolvedValue(expiredInv)

    const authRepo = {
      findById: mock().mockResolvedValue(makeUser()),
    } as unknown as IAuthRepository

    const service = new DeclineInvitationService(invitationRepo, authRepo)
    const result = await service.execute('inv-expired', 'user-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe('INVALID_INVITATION')
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
bun test src/Modules/Organization/__tests__/DeclineInvitationService.test.ts --reporter=verbose
```

期望：FAIL，`Cannot find module ... DeclineInvitationService`

### 3b. 實作 Service

- [ ] **Step 3: 新增 `DeclineInvitationService.ts`**

```typescript
// src/Modules/Organization/Application/Services/DeclineInvitationService.ts
import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import type { IOrganizationInvitationRepository } from '../../Domain/Repositories/IOrganizationInvitationRepository'
import { OrgInvitationRules } from '../../Domain/Services/OrgInvitationRules'
import type { OrganizationResponse } from '../DTOs/OrganizationDTO'

export class DeclineInvitationService {
  constructor(
    private invitationRepository: IOrganizationInvitationRepository,
    private authRepository: IAuthRepository,
  ) {}

  async execute(invitationId: string, userId: string): Promise<OrganizationResponse> {
    try {
      const user = await this.authRepository.findById(userId)
      if (!user) {
        return { success: false, message: 'User not found', error: 'USER_NOT_FOUND' }
      }

      const invitation = await this.invitationRepository.findById(invitationId)
      if (!invitation || !invitation.isPending()) {
        return { success: false, message: 'Invalid or expired invitation', error: 'INVALID_INVITATION' }
      }

      try {
        OrgInvitationRules.assertEmailMatches(invitation, user.emailValue)
      } catch {
        return { success: false, message: 'This invitation was not sent to you', error: 'EMAIL_MISMATCH' }
      }

      const cancelled = invitation.cancel()
      await this.invitationRepository.update(cancelled)

      return { success: true, message: 'Invitation declined' }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Decline failed'
      return { success: false, message, error: message }
    }
  }
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
bun test src/Modules/Organization/__tests__/DeclineInvitationService.test.ts --reporter=verbose
```

期望：5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/Modules/Organization/__tests__/DeclineInvitationService.test.ts
git add src/Modules/Organization/Application/Services/DeclineInvitationService.ts
git commit -m "feat: [org] 新增 DeclineInvitationService"
```

---

## Task 4：`AcceptInvitationByIdService`（TDD）

**Files:**
- Create: `src/Modules/Organization/__tests__/AcceptInvitationByIdService.test.ts`
- Create: `src/Modules/Organization/Application/Services/AcceptInvitationByIdService.ts`

### 4a. 撰寫失敗測試

- [ ] **Step 1: 建立測試檔案**

新增 `src/Modules/Organization/__tests__/AcceptInvitationByIdService.test.ts`：

```typescript
import { describe, expect, it, mock } from 'bun:test'
import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IOrganizationInvitationRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationInvitationRepository'
import type { IOrganizationMemberRepository } from '@/Modules/Organization/Domain/Repositories/IOrganizationMemberRepository'
import { OrganizationInvitation } from '@/Modules/Organization/Domain/Entities/OrganizationInvitation'
import { InvitationStatus } from '@/Modules/Organization/Domain/ValueObjects/InvitationStatus'
import { OrgMemberRole } from '@/Modules/Organization/Domain/ValueObjects/OrgMemberRole'
import { AcceptInvitationByIdService } from '@/Modules/Organization/Application/Services/AcceptInvitationByIdService'

function makePendingInvitation(email = 'member@example.com', orgId = 'org-1'): OrganizationInvitation {
  return OrganizationInvitation.reconstitute({
    id: 'inv-1',
    organizationId: orgId,
    email,
    token: '',
    tokenHash: 'hash-abc',
    role: new OrgMemberRole('member'),
    invitedByUserId: 'user-manager',
    status: new InvitationStatus('pending'),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  })
}

function makeMockInvitationRepo(): IOrganizationInvitationRepository {
  return {
    save: mock(),
    update: mock(),
    findById: mock(),
    findByTokenHash: mock(),
    findByOrgId: mock(),
    findPendingByEmail: mock(),
    deleteExpired: mock(),
    withTransaction: mock().mockReturnThis(),
  }
}

function makeMockMemberRepo(): IOrganizationMemberRepository {
  return {
    save: mock(),
    findByUserAndOrgId: mock().mockResolvedValue(null),
    findByOrgId: mock(),
    findByUserId: mock(),
    delete: mock(),
    withTransaction: mock().mockReturnThis(),
  }
}

function makeUser(email = 'member@example.com') {
  return { emailValue: email, id: 'user-1' }
}

function makeMockDb(): IDatabaseAccess {
  return {
    transaction: mock().mockImplementation(async (fn: (tx: IDatabaseAccess) => Promise<void>) => {
      await fn({
        table: mock().mockReturnThis(),
        insert: mock().mockResolvedValue(undefined),
        update: mock().mockResolvedValue(undefined),
        where: mock().mockReturnThis(),
        first: mock().mockResolvedValue(null),
        select: mock().mockResolvedValue([]),
      } as unknown as IDatabaseAccess)
    }),
    table: mock().mockReturnThis(),
    where: mock().mockReturnThis(),
    insert: mock().mockResolvedValue(undefined),
  } as unknown as IDatabaseAccess
}

describe('AcceptInvitationByIdService', () => {
  it('應成功接受邀請並建立 membership', async () => {
    const invitationRepo = makeMockInvitationRepo()
    ;(invitationRepo.findById as any).mockResolvedValue(makePendingInvitation())

    const memberRepo = makeMockMemberRepo()
    const authRepo = {
      findById: mock().mockResolvedValue(makeUser()),
    } as unknown as IAuthRepository
    const db = makeMockDb()

    const service = new AcceptInvitationByIdService(invitationRepo, memberRepo, authRepo, db)
    const result = await service.execute('inv-1', 'user-1')

    expect(result.success).toBe(true)
  })

  it('邀請不存在應回傳 INVALID_INVITATION', async () => {
    const invitationRepo = makeMockInvitationRepo()
    ;(invitationRepo.findById as any).mockResolvedValue(null)

    const memberRepo = makeMockMemberRepo()
    const authRepo = {
      findById: mock().mockResolvedValue(makeUser()),
    } as unknown as IAuthRepository
    const db = makeMockDb()

    const service = new AcceptInvitationByIdService(invitationRepo, memberRepo, authRepo, db)
    const result = await service.execute('nonexistent', 'user-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe('INVALID_INVITATION')
  })

  it('user 不存在應回傳 USER_NOT_FOUND', async () => {
    const invitationRepo = makeMockInvitationRepo()
    ;(invitationRepo.findById as any).mockResolvedValue(makePendingInvitation())

    const memberRepo = makeMockMemberRepo()
    const authRepo = {
      findById: mock().mockResolvedValue(null),
    } as unknown as IAuthRepository
    const db = makeMockDb()

    const service = new AcceptInvitationByIdService(invitationRepo, memberRepo, authRepo, db)
    const result = await service.execute('inv-1', 'unknown-user')

    expect(result.success).toBe(false)
    expect(result.error).toBe('USER_NOT_FOUND')
  })

  it('email 不匹配應回傳 EMAIL_MISMATCH', async () => {
    const invitationRepo = makeMockInvitationRepo()
    ;(invitationRepo.findById as any).mockResolvedValue(makePendingInvitation('other@example.com'))

    const memberRepo = makeMockMemberRepo()
    const authRepo = {
      findById: mock().mockResolvedValue(makeUser('member@example.com')),
    } as unknown as IAuthRepository
    const db = makeMockDb()

    const service = new AcceptInvitationByIdService(invitationRepo, memberRepo, authRepo, db)
    const result = await service.execute('inv-1', 'user-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe('EMAIL_MISMATCH')
  })

  it('已是成員時應回傳 USER_ALREADY_IN_ORG', async () => {
    const invitationRepo = makeMockInvitationRepo()
    ;(invitationRepo.findById as any).mockResolvedValue(makePendingInvitation())

    const memberRepo = makeMockMemberRepo()
    ;(memberRepo.findByUserAndOrgId as any).mockResolvedValue({ userId: 'user-1' })

    const authRepo = {
      findById: mock().mockResolvedValue(makeUser()),
    } as unknown as IAuthRepository
    const db = makeMockDb()

    const service = new AcceptInvitationByIdService(invitationRepo, memberRepo, authRepo, db)
    const result = await service.execute('inv-1', 'user-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe('USER_ALREADY_IN_ORG')
  })
})
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
bun test src/Modules/Organization/__tests__/AcceptInvitationByIdService.test.ts --reporter=verbose
```

期望：FAIL，`Cannot find module ... AcceptInvitationByIdService`

### 4b. 實作 Service

- [ ] **Step 3: 新增 `AcceptInvitationByIdService.ts`**

```typescript
// src/Modules/Organization/Application/Services/AcceptInvitationByIdService.ts
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import type { IAuthRepository } from '@/Modules/Auth/Domain/Repositories/IAuthRepository'
import { OrganizationMember } from '../../Domain/Entities/OrganizationMember'
import type { IOrganizationInvitationRepository } from '../../Domain/Repositories/IOrganizationInvitationRepository'
import type { IOrganizationMemberRepository } from '../../Domain/Repositories/IOrganizationMemberRepository'
import { OrgInvitationRules } from '../../Domain/Services/OrgInvitationRules'
import {
  OrganizationMemberPresenter,
  type OrganizationResponse,
} from '../DTOs/OrganizationDTO'

export class AcceptInvitationByIdService {
  constructor(
    private invitationRepository: IOrganizationInvitationRepository,
    private memberRepository: IOrganizationMemberRepository,
    private authRepository: IAuthRepository,
    private db: IDatabaseAccess,
  ) {}

  async execute(invitationId: string, userId: string): Promise<OrganizationResponse> {
    try {
      const user = await this.authRepository.findById(userId)
      if (!user) {
        return { success: false, message: 'User not found', error: 'USER_NOT_FOUND' }
      }

      const invitation = await this.invitationRepository.findById(invitationId)
      if (!invitation || !invitation.isPending()) {
        return { success: false, message: 'Invalid or expired invitation', error: 'INVALID_INVITATION' }
      }

      try {
        OrgInvitationRules.assertEmailMatches(invitation, user.emailValue)
      } catch {
        return { success: false, message: 'This invitation was not sent to you', error: 'EMAIL_MISMATCH' }
      }

      const existingMembership = await this.memberRepository.findByUserAndOrgId(userId, invitation.organizationId)
      try {
        OrgInvitationRules.assertNotAlreadyMember(existingMembership)
      } catch {
        return { success: false, message: 'Already a member of this organization', error: 'USER_ALREADY_IN_ORG' }
      }

      const member = OrganizationMember.create(
        crypto.randomUUID(),
        invitation.organizationId,
        userId,
        invitation.role,
      )

      await this.db.transaction(async (tx) => {
        const txMemberRepo = this.memberRepository.withTransaction(tx)
        const txInvitationRepo = this.invitationRepository.withTransaction(tx)
        await txMemberRepo.save(member)
        const accepted = invitation.markAsAccepted()
        await txInvitationRepo.update(accepted)
      })

      return {
        success: true,
        message: 'Successfully joined organization',
        data: OrganizationMemberPresenter.fromEntity(member),
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Join failed'
      return { success: false, message, error: message }
    }
  }
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
bun test src/Modules/Organization/__tests__/AcceptInvitationByIdService.test.ts --reporter=verbose
```

期望：5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/Modules/Organization/__tests__/AcceptInvitationByIdService.test.ts
git add src/Modules/Organization/Application/Services/AcceptInvitationByIdService.ts
git commit -m "feat: [org] 新增 AcceptInvitationByIdService"
```

---

## Task 5：Controller、Routes、ServiceProvider 串接

**Files:**
- Modify: `src/Modules/Organization/Presentation/Controllers/OrganizationController.ts`
- Modify: `src/Modules/Organization/Presentation/Routes/organization.routes.ts`
- Modify: `src/Modules/Organization/Infrastructure/Providers/OrganizationServiceProvider.ts`

- [ ] **Step 1: 在 `OrganizationController` 新增兩個 handler**

在 `OrganizationController.ts` 的 `constructor` 加入兩個新的 service，並在類別末端新增方法：

首先更新 constructor import 與宣告（在現有 `cancelInvitationService` 後加入）：

```typescript
// 在現有 imports 後加入：
import type { AcceptInvitationByIdService } from '../../Application/Services/AcceptInvitationByIdService'
import type { DeclineInvitationService } from '../../Application/Services/DeclineInvitationService'
```

更新 constructor（在 `cancelInvitationService` 後加入兩個新參數）：

```typescript
constructor(
  private createOrgService: CreateOrganizationService,
  private updateOrgService: UpdateOrganizationService,
  private listOrgsService: ListOrganizationsService,
  private inviteMemberService: InviteMemberService,
  private acceptInvitationService: AcceptInvitationService,
  private removeMemberService: RemoveMemberService,
  private listMembersService: ListMembersService,
  private changeRoleService: ChangeOrgMemberRoleService,
  private getOrgService: GetOrganizationService,
  private changeOrgStatusService: ChangeOrgStatusService,
  private listInvitationsService: ListInvitationsService,
  private cancelInvitationService: CancelInvitationService,
  private acceptInvitationByIdService: AcceptInvitationByIdService,  // ← 新增
  private declineInvitationService: DeclineInvitationService,         // ← 新增
) {}
```

在 `cancelInvitation` 方法後新增兩個 handler：

```typescript
async acceptInvitationById(ctx: IHttpContext): Promise<Response> {
  const auth = AuthMiddleware.getAuthContext(ctx)
  if (!auth) return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
  const invitationId = ctx.getParam('id')
  if (!invitationId) {
    return ctx.json({ success: false, message: 'Missing invitation ID', error: 'ID_REQUIRED' }, 400)
  }
  const result = await this.acceptInvitationByIdService.execute(invitationId, auth.userId)
  return ctx.json(result, result.success ? 200 : 400)
}

async declineInvitation(ctx: IHttpContext): Promise<Response> {
  const auth = AuthMiddleware.getAuthContext(ctx)
  if (!auth) return ctx.json({ success: false, message: 'Unauthorized', error: 'UNAUTHORIZED' }, 401)
  const invitationId = ctx.getParam('id')
  if (!invitationId) {
    return ctx.json({ success: false, message: 'Missing invitation ID', error: 'ID_REQUIRED' }, 400)
  }
  const result = await this.declineInvitationService.execute(invitationId, auth.userId)
  return ctx.json(result, result.success ? 200 : 400)
}
```

- [ ] **Step 2: 在 `organization.routes.ts` 新增兩條路由**

在 `registerOrganizationRoutes` 函式的 `POST /api/invitations/:token/accept` 後加入：

```typescript
router.post('/api/invitations/:id/accept-by-id', [requireAuth()], (ctx) =>
  controller.acceptInvitationById(ctx),
)
router.post('/api/invitations/:id/decline', [requireAuth()], (ctx) =>
  controller.declineInvitation(ctx),
)
```

- [ ] **Step 3: 在 `OrganizationServiceProvider` 註冊新 services 並更新 controller**

在 `registerApplicationServices` 中，於 `getUserMembershipService` 後加入：

```typescript
container.bind('acceptInvitationByIdService', (c: IContainer) =>
  new AcceptInvitationByIdService(
    c.make('organizationInvitationRepository') as IOrganizationInvitationRepository,
    c.make('organizationMemberRepository') as IOrganizationMemberRepository,
    c.make('authRepository') as IAuthRepository,
    db as IDatabaseAccess,
  ),
)
container.bind('declineInvitationService', (c: IContainer) =>
  new DeclineInvitationService(
    c.make('organizationInvitationRepository') as IOrganizationInvitationRepository,
    c.make('authRepository') as IAuthRepository,
  ),
)
container.bind('getPendingInvitationsService', (c: IContainer) =>
  new GetPendingInvitationsService(
    c.make('organizationInvitationRepository') as IOrganizationInvitationRepository,
    c.make('authRepository') as IAuthRepository,
    c.make('organizationRepository') as IOrganizationRepository,
  ),
)
```

同時在最上方新增 imports：
```typescript
import { AcceptInvitationByIdService } from '../../Application/Services/AcceptInvitationByIdService'
import { DeclineInvitationService } from '../../Application/Services/DeclineInvitationService'
import { GetPendingInvitationsService } from '../../Application/Services/GetPendingInvitationsService'
```

更新 `registerControllers` 中的 `organizationController` binding，在 `cancelInvitationService` 後加入兩個新參數：

```typescript
container.bind('organizationController', (c: IContainer) => new OrganizationController(
  c.make('createOrganizationService') as CreateOrganizationService,
  c.make('updateOrganizationService') as UpdateOrganizationService,
  c.make('listOrganizationsService') as ListOrganizationsService,
  c.make('inviteMemberService') as InviteMemberService,
  c.make('acceptInvitationService') as AcceptInvitationService,
  c.make('removeMemberService') as RemoveMemberService,
  c.make('listMembersService') as ListMembersService,
  c.make('changeOrgMemberRoleService') as ChangeOrgMemberRoleService,
  c.make('getOrganizationService') as GetOrganizationService,
  c.make('changeOrgStatusService') as ChangeOrgStatusService,
  c.make('listInvitationsService') as ListInvitationsService,
  c.make('cancelInvitationService') as CancelInvitationService,
  c.make('acceptInvitationByIdService') as AcceptInvitationByIdService,
  c.make('declineInvitationService') as DeclineInvitationService,
))
```

- [ ] **Step 4: 執行全部 Org 模組測試確認無破壞**

```bash
bun test src/Modules/Organization --reporter=verbose 2>&1 | tail -20
```

期望：所有測試通過。

- [ ] **Step 5: Commit**

```bash
git add src/Modules/Organization/Presentation/Controllers/OrganizationController.ts
git add src/Modules/Organization/Presentation/Routes/organization.routes.ts
git add src/Modules/Organization/Infrastructure/Providers/OrganizationServiceProvider.ts
git commit -m "feat: [org] 串接 accept-by-id 和 decline 路由與 controller"
```

---

## Task 6：`MemberDashboardPage` 擴充（TDD）

**Files:**
- Modify: `src/Website/Member/Pages/MemberDashboardPage.ts`
- Modify: `src/Website/Member/bindings/registerMemberBindings.ts`
- Modify: `src/Website/__tests__/Member/MemberDashboardPage.test.ts`

### 6a. 更新現有測試並新增邀請情境

- [ ] **Step 1: 更新 `MemberDashboardPage.test.ts`**

完整取代 `src/Website/__tests__/Member/MemberDashboardPage.test.ts` 的內容：

```typescript
import { describe, expect, mock, test } from 'bun:test'
import { loadMessages } from '@/Shared/Infrastructure/I18n'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../../Http/Inertia/InertiaRequestHandler'
import { MemberDashboardPage } from '../../Member/Pages/MemberDashboardPage'

function createMockContext(overrides: Partial<IHttpContext> = {}): IHttpContext {
  const store = new Map<string, unknown>()
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => ({}) as T,
    getBody: async <T>() => ({}) as T,
    getHeader: () => undefined,
    getParam: () => undefined,
    getPathname: () => '/member/dashboard',
    getQuery: () => undefined,
    params: {},
    query: {},
    headers: {},
    json: (data: unknown, statusCode?: number) =>
      Response.json(data, { status: statusCode ?? 200 }),
    text: (content: string, statusCode?: number) =>
      new Response(content, { status: statusCode ?? 200 }),
    redirect: (url: string, statusCode?: number) => Response.redirect(url, statusCode ?? 302),
    get: <T>(key: string) => store.get(key) as T | undefined,
    set: (key: string, value: unknown) => {
      store.set(key, value)
    },
    getCookie: (_name: string) => undefined,
    setCookie: (_name: string, _value: string, _options?: unknown) => {},
    ...overrides,
    getMethod: overrides.getMethod ?? (() => 'GET'),
  }
}

function createMemberContext(overrides: Partial<IHttpContext> = {}): IHttpContext {
  const store = new Map<string, unknown>()
  const auth = { userId: 'member-1', email: 'member@test.com', role: 'member' }
  store.set('auth', auth)
  store.set('inertia:shared', {
    locale: 'en',
    messages: loadMessages('en'),
    auth: { user: { id: auth.userId, email: auth.email, role: auth.role } },
    currentOrgId: null,
    flash: {},
  })

  return createMockContext({
    get: <T>(key: string) => store.get(key) as T | undefined,
    set: (key: string, value: unknown) => {
      store.set(key, value)
    },
    getCookie: (_name: string) => undefined,
    getMethod: () => 'GET',
    setCookie: (_name: string, _value: string, _options?: unknown) => {},
    ...overrides,
  })
}

type InertiaCapture = { component: string; props: Record<string, unknown> } | null

function createMockInertia(): { inertia: InertiaService; captured: { lastCall: InertiaCapture } } {
  const captured = { lastCall: null as InertiaCapture }
  const inertia = {
    render: (_ctx: IHttpContext, component: string, props: Record<string, unknown>) => {
      captured.lastCall = { component, props }
      return new Response(JSON.stringify({ component, props }), {
        headers: { 'Content-Type': 'application/json' },
      })
    },
  } as unknown as InertiaService
  return { inertia, captured }
}

describe('MemberDashboardPage', () => {
  test('authenticated member request renders correct Inertia component', async () => {
    const ctx = createMemberContext()
    const { inertia, captured } = createMockInertia()

    const mockBalanceService = {
      execute: mock(() => Promise.resolve({ success: true, data: { balance: 50 } })),
    }
    const mockMembershipService = {
      execute: mock(() => Promise.resolve({ orgId: 'org-123' })),
    }
    const mockPendingInvitationsService = {
      execute: mock(() => Promise.resolve([])),
    }

    const page = new MemberDashboardPage(
      inertia,
      mockBalanceService as any,
      mockMembershipService as any,
      mockPendingInvitationsService as any,
    )
    await page.handle(ctx)

    expect(captured.lastCall).not.toBe(null)
    expect(captured.lastCall?.component).toBe('Member/Dashboard/Index')
    expect(captured.lastCall?.props.orgId).toBe('org-123')
    expect(captured.lastCall?.props.hasOrganization).toBe(true)
  })

  test('without membership renders no-org dashboard props with empty pendingInvitations', async () => {
    const ctx = createMemberContext()
    const { inertia, captured } = createMockInertia()

    const mockBalanceService = {
      execute: mock(() => Promise.resolve({ success: true, data: null })),
    }
    const mockMembershipService = {
      execute: mock(() => Promise.resolve(null)),
    }
    const mockPendingInvitationsService = {
      execute: mock(() => Promise.resolve([])),
    }

    const page = new MemberDashboardPage(
      inertia,
      mockBalanceService as any,
      mockMembershipService as any,
      mockPendingInvitationsService as any,
    )
    await page.handle(ctx)

    expect(captured.lastCall?.props.hasOrganization).toBe(false)
    expect(captured.lastCall?.props.pendingInvitations).toEqual([])
  })

  test('without membership passes pending invitations to Inertia props', async () => {
    const ctx = createMemberContext()
    const { inertia, captured } = createMockInertia()

    const mockInvitation = {
      id: 'inv-1',
      organizationId: 'org-1',
      organizationName: 'Test Org',
      role: 'member',
      expiresAt: '2026-05-01T00:00:00.000Z',
    }

    const mockBalanceService = {
      execute: mock(() => Promise.resolve({ success: true, data: null })),
    }
    const mockMembershipService = {
      execute: mock(() => Promise.resolve(null)),
    }
    const mockPendingInvitationsService = {
      execute: mock(() => Promise.resolve([mockInvitation])),
    }

    const page = new MemberDashboardPage(
      inertia,
      mockBalanceService as any,
      mockMembershipService as any,
      mockPendingInvitationsService as any,
    )
    await page.handle(ctx)

    expect(captured.lastCall?.props.pendingInvitations).toEqual([mockInvitation])
  })

  test('pending invitations service failure returns empty array (graceful degradation)', async () => {
    const ctx = createMemberContext()
    const { inertia, captured } = createMockInertia()

    const mockBalanceService = {
      execute: mock(() => Promise.resolve({ success: true, data: null })),
    }
    const mockMembershipService = {
      execute: mock(() => Promise.resolve(null)),
    }
    const mockPendingInvitationsService = {
      execute: mock(() => Promise.reject(new Error('DB error'))),
    }

    const page = new MemberDashboardPage(
      inertia,
      mockBalanceService as any,
      mockMembershipService as any,
      mockPendingInvitationsService as any,
    )
    await page.handle(ctx)

    expect(captured.lastCall?.props.pendingInvitations).toEqual([])
    expect(captured.lastCall?.props.hasOrganization).toBe(false)
  })

  test('service failure passes error message to Inertia', async () => {
    const ctx = createMemberContext()
    const { inertia, captured } = createMockInertia()

    const mockBalanceService = {
      execute: mock(() => Promise.resolve({ success: false, message: '組織不存在' })),
    }
    const mockMembershipService = {
      execute: mock(() => Promise.resolve({ orgId: 'org-123' })),
    }
    const mockPendingInvitationsService = {
      execute: mock(() => Promise.resolve([])),
    }

    const page = new MemberDashboardPage(
      inertia,
      mockBalanceService as any,
      mockMembershipService as any,
      mockPendingInvitationsService as any,
    )
    await page.handle(ctx)

    expect(captured.lastCall?.props.error).toEqual({ key: 'member.dashboard.loadFailed' })
  })
})
```

- [ ] **Step 2: 執行測試確認失敗（因 constructor signature 不符）**

```bash
bun test src/Website/__tests__/Member/MemberDashboardPage.test.ts --reporter=verbose
```

期望：FAIL，`Expected 3 arguments, but got 4` 或類似型別錯誤。

### 6b. 更新 MemberDashboardPage

- [ ] **Step 3: 更新 `MemberDashboardPage.ts`**

完整取代 `src/Website/Member/Pages/MemberDashboardPage.ts` 內容：

```typescript
import type { GetBalanceService } from '@/Modules/Credit/Application/Services/GetBalanceService'
import type { GetPendingInvitationsService } from '@/Modules/Organization/Application/Services/GetPendingInvitationsService'
import type { GetUserMembershipService } from '@/Modules/Organization/Application/Services/GetUserMembershipService'
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
    private readonly membershipService: GetUserMembershipService,
    private readonly pendingInvitationsService: GetPendingInvitationsService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!

    const membership = await this.membershipService.execute(auth.userId)

    if (!membership) {
      let pendingInvitations: Awaited<ReturnType<GetPendingInvitationsService['execute']>> = []
      try {
        pendingInvitations = await this.pendingInvitationsService.execute(auth.userId)
      } catch {
        // 查詢失敗不影響頁面渲染，回傳空陣列
      }

      return this.inertia.render(ctx, 'Member/Dashboard/Index', {
        orgId: null,
        balance: null,
        hasOrganization: false,
        pendingInvitations,
        error: null,
      })
    }

    const orgId = membership.orgId
    const balanceResult = await this.balanceService.execute(orgId, auth.userId, auth.role)

    return this.inertia.render(ctx, 'Member/Dashboard/Index', {
      orgId,
      balance: balanceResult.success ? (balanceResult.data ?? null) : null,
      hasOrganization: true,
      pendingInvitations: [],
      error: balanceResult.success ? null : { key: 'member.dashboard.loadFailed' },
    })
  }
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
bun test src/Website/__tests__/Member/MemberDashboardPage.test.ts --reporter=verbose
```

期望：5 tests PASS

- [ ] **Step 5: 更新 `registerMemberBindings.ts` 的 dashboard 綁定**

將 `registerMemberBindings.ts` 中的 dashboard singleton 更新為：

```typescript
container.singleton(k.dashboard, (c) => {
  return new MemberDashboardPage(
    c.make(i) as InertiaService,
    c.make('getBalanceService') as GetBalanceService,
    c.make('getUserMembershipService') as GetUserMembershipService,
    c.make('getPendingInvitationsService') as GetPendingInvitationsService,
  )
})
```

同時在 `registerMemberBindings.ts` 頂部 imports 加入：
```typescript
import type { GetPendingInvitationsService } from '@/Modules/Organization/Application/Services/GetPendingInvitationsService'
```

- [ ] **Step 6: 執行全部測試確認無破壞**

```bash
bun test src/Website --reporter=verbose 2>&1 | tail -20
```

期望：所有測試通過。

- [ ] **Step 7: Commit**

```bash
git add src/Website/Member/Pages/MemberDashboardPage.ts
git add src/Website/Member/bindings/registerMemberBindings.ts
git add src/Website/__tests__/Member/MemberDashboardPage.test.ts
git commit -m "feat: [member-portal] MemberDashboardPage 新增 pending invitations props"
```

---

## Task 7：前端 InvitationCard 元件與 Dashboard UI

**Files:**
- Create: `resources/js/Pages/Member/Dashboard/components/InvitationCard.tsx`
- Modify: `resources/js/Pages/Member/Dashboard/Index.tsx`

- [ ] **Step 1: 建立 `InvitationCard.tsx`**

新增 `resources/js/Pages/Member/Dashboard/components/InvitationCard.tsx`：

```tsx
import { useState } from 'react'
import { usePage } from '@inertiajs/react'
import { router } from '@inertiajs/react'
import { resolveCsrfTokenForFetch } from '@/lib/csrf'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export interface PendingInvitation {
  id: string
  organizationId: string
  organizationName: string
  role: string
  expiresAt: string
}

interface Props {
  invitation: PendingInvitation
  onDeclined: (id: string) => void
}

function formatExpiry(isoDate: string): string {
  const d = new Date(isoDate)
  if (isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString()
}

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_INVITATION: '邀請已過期或無效',
  EMAIL_MISMATCH: '此邀請並非寄送給你的帳號',
  USER_ALREADY_IN_ORG: '你已是該組織成員',
  UNAUTHORIZED: '請重新登入後再試',
}

export function InvitationCard({ invitation, onDeclined }: Props) {
  const { csrfToken: inertiaCsrf } = usePage().props
  const [accepting, setAccepting] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAccept = async () => {
    setAccepting(true)
    setError(null)
    try {
      const response = await fetch(`/api/invitations/${encodeURIComponent(invitation.id)}/accept-by-id`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-Token': resolveCsrfTokenForFetch(inertiaCsrf),
        },
        body: '{}',
      })
      const payload = (await response.json()) as { success: boolean; error?: string; message?: string }
      if (payload.success) {
        router.visit('/member/dashboard', { replace: true })
      } else {
        setError(ERROR_MESSAGES[payload.error ?? ''] ?? payload.message ?? '接受邀請失敗，請稍後再試')
      }
    } catch {
      setError('接受邀請失敗，請稍後再試')
    } finally {
      setAccepting(false)
    }
  }

  const handleDecline = async () => {
    setDeclining(true)
    setError(null)
    try {
      const response = await fetch(`/api/invitations/${encodeURIComponent(invitation.id)}/decline`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-Token': resolveCsrfTokenForFetch(inertiaCsrf),
        },
        body: '{}',
      })
      const payload = (await response.json()) as { success: boolean; error?: string; message?: string }
      if (payload.success) {
        onDeclined(invitation.id)
      } else {
        setError(ERROR_MESSAGES[payload.error ?? ''] ?? payload.message ?? '拒絕邀請失敗，請稍後再試')
      }
    } catch {
      setError('拒絕邀請失敗，請稍後再試')
    } finally {
      setDeclining(false)
    }
  }

  return (
    <Card className="border-border rounded-lg bg-white/[0.02] shadow-indigo-500/5 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-white">
            {invitation.organizationName || invitation.organizationId}
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {invitation.role}
          </Badge>
        </div>
        <CardDescription className="text-white/40">
          邀請加入組織 · 到期日：{formatExpiry(invitation.expiresAt)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex gap-2">
          <Button
            type="button"
            onClick={handleAccept}
            disabled={accepting || declining}
            className="bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
          >
            {accepting ? '接受中…' : '接受邀請'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleDecline}
            disabled={accepting || declining}
          >
            {declining ? '拒絕中…' : '拒絕'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: 更新 `Member/Dashboard/Index.tsx`**

在 `Index.tsx` 中做三處修改：

**a) 新增 import**（在現有 `import { Banner }` 後加入）：
```tsx
import { InvitationCard, type PendingInvitation } from './components/InvitationCard'
```

**b) 更新 `Props` interface**（在 `hasOrganization` 後加入）：
```tsx
interface Props {
  orgId?: string | null
  balance: Balance | null
  hasOrganization: boolean
  pendingInvitations: PendingInvitation[]   // ← 新增
  error: I18nMessage | null
}
```

**c) 更新 `MemberDashboard` 函式 signature 並處理邀請狀態**

在 `const [createOrgOpen, setCreateOrgOpen] = useState(false)` 下方加入：
```tsx
const [invitations, setInvitations] = useState<PendingInvitation[]>(pendingInvitations)
```

並在函式 signature 解構中加入 `pendingInvitations`：
```tsx
export default function MemberDashboard({ orgId, balance, hasOrganization, pendingInvitations, error }: Props) {
```

**d) 更新「無組織」狀態的 JSX**

將現有的 `{!hasOrganization ? ( ... ) : null}` 區塊取代為：

```tsx
{!hasOrganization ? (
  <>
    <CreateOrganizationModal open={createOrgOpen} onOpenChange={setCreateOrgOpen} />

    {invitations.length > 0 && (
      <div className="space-y-3">
        <p className="text-sm text-white/60">你有待處理的組織邀請：</p>
        {invitations.map((inv) => (
          <InvitationCard
            key={inv.id}
            invitation={inv}
            onDeclined={(id) => setInvitations((prev) => prev.filter((i) => i.id !== id))}
          />
        ))}
      </div>
    )}

    {invitations.length === 0 && (
      <Card className="border-border rounded-lg bg-white/[0.02] shadow-indigo-500/5 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base text-white">尚無組織</CardTitle>
          <CardDescription className="text-white/40">
            建立組織以開始使用 API Key、帳單與儀表板功能
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            onClick={() => setCreateOrgOpen(true)}
            className="bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
          >
            建立我的組織
          </Button>
        </CardContent>
      </Card>
    )}
  </>
) : null}
```

- [ ] **Step 3: 執行全部測試確認無破壞**

```bash
bun test src --reporter=verbose 2>&1 | tail -20
```

期望：所有測試通過。

- [ ] **Step 4: Commit**

```bash
git add resources/js/Pages/Member/Dashboard/components/InvitationCard.tsx
git add resources/js/Pages/Member/Dashboard/Index.tsx
git commit -m "feat: [member-portal] Dashboard 新增待處理邀請卡片 UI"
```

---

## Task 8：最終整合驗證

- [ ] **Step 1: 執行全部測試**

```bash
bun test src --reporter=verbose 2>&1 | tail -30
```

期望：所有測試通過，無失敗。

- [ ] **Step 2: TypeScript 型別檢查**

```bash
bun run typecheck 2>&1 | head -30
```

期望：無型別錯誤。

- [ ] **Step 3: 確認修改檔案清單完整**

確認以下所有檔案均已修改或新增：

```
✅ src/Modules/Organization/Domain/Repositories/IOrganizationInvitationRepository.ts
✅ src/Modules/Organization/Infrastructure/Repositories/OrganizationInvitationRepository.ts
✅ src/Modules/Organization/Application/Services/GetPendingInvitationsService.ts
✅ src/Modules/Organization/Application/Services/AcceptInvitationByIdService.ts
✅ src/Modules/Organization/Application/Services/DeclineInvitationService.ts
✅ src/Modules/Organization/__tests__/GetPendingInvitationsService.test.ts
✅ src/Modules/Organization/__tests__/AcceptInvitationByIdService.test.ts
✅ src/Modules/Organization/__tests__/DeclineInvitationService.test.ts
✅ src/Modules/Organization/Presentation/Controllers/OrganizationController.ts
✅ src/Modules/Organization/Presentation/Routes/organization.routes.ts
✅ src/Modules/Organization/Infrastructure/Providers/OrganizationServiceProvider.ts
✅ src/Website/Member/Pages/MemberDashboardPage.ts
✅ src/Website/Member/bindings/registerMemberBindings.ts
✅ src/Website/__tests__/Member/MemberDashboardPage.test.ts
✅ resources/js/Pages/Member/Dashboard/components/InvitationCard.tsx
✅ resources/js/Pages/Member/Dashboard/Index.tsx
```

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: [member-portal] 邀請接受功能完成整合驗證"
```
