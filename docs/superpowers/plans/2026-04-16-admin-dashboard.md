# Admin 後台功能實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 補齊三個 Admin 後台缺口：登入分流、合約配額調整 Modal、組織配額彙總卡、API Key 用量明細。

**Architecture:** 所有修改在 Presentation 與 Application 層，不動 domain 核心 invariants；新增 `AdjustContractQuotaService` 實作規格 §5.3 演算法；`quotaAllocated` 欄位以 DB migration 加到 `api_keys` 表；用量資料從 `usage_records` 聚合。

**Tech Stack:** Bun / TypeScript / Inertia.js / React / gravito-atlas (Schema migrations) / bun:test

---

## 文件結構

| 動作 | 路徑 |
|------|------|
| 修改 | `src/Website/Auth/Pages/LoginPage.ts` |
| 修改 | `src/Website/Auth/Pages/GoogleOAuthCallbackPage.ts` |
| 修改 | `src/Modules/Contract/Domain/Aggregates/Contract.ts` |
| 新增 migration | `database/migrations/2026_04_16_000001_add_quota_allocated_to_api_keys.ts` |
| 修改 | `src/Modules/ApiKey/Domain/Aggregates/ApiKey.ts` |
| 新增 | `src/Modules/Contract/Application/Services/AdjustContractQuotaService.ts` |
| 新增 test | `src/Modules/Contract/__tests__/AdjustContractQuotaService.test.ts` |
| 修改 | `src/Website/Admin/Pages/AdminContractDetailPage.ts` |
| 修改 | `src/Website/Admin/bindings/registerAdminBindings.ts` |
| 修改 | `src/Website/Admin/routes/registerAdminRoutes.ts` |
| 新增 test | `src/Website/__tests__/Admin/AdminContractDetailPageQuota.test.ts` |
| 新增 | `resources/js/Pages/Admin/Contracts/QuotaAdjustModal.tsx` |
| 修改 | `resources/js/Pages/Admin/Contracts/Show.tsx` |
| 修改 | `src/Website/Admin/Pages/AdminOrganizationDetailPage.ts` |
| 修改 | `resources/js/Pages/Admin/Organizations/Show.tsx` |
| 修改 | `src/Website/Admin/Pages/AdminApiKeysPage.ts` |
| 修改 | `resources/js/Pages/Admin/ApiKeys/columns.tsx` |
| 修改 | `resources/js/Pages/Admin/ApiKeys/Index.tsx` |

---

## Task 1：修正登入分流（admin → /admin/dashboard）

**Files:**
- Modify: `src/Website/Auth/Pages/LoginPage.ts`
- Modify: `src/Website/Auth/Pages/GoogleOAuthCallbackPage.ts`
- Test: `src/Website/__tests__/Auth/LoginPage.test.ts`

- [ ] **Step 1: 執行現有 LoginPage 測試，確認全部通過（baseline）**

```bash
bun test src/Website/__tests__/Auth/LoginPage.test.ts
```
Expected: PASS（驗收現況）

- [ ] **Step 2: 修改 `LoginPage.ts` 的 `store()` 方法**

```typescript
// src/Website/Auth/Pages/LoginPage.ts
// 將 store() 方法最後的 redirect 從固定路徑改為依 role 分流

async store(ctx: IHttpContext): Promise<Response> {
  const validated = ctx.get('validated') as { email?: string; password?: string } | undefined
  const email = validated?.email ?? ''
  const password = validated?.password ?? ''

  const result = await this.loginService.execute({ email, password })

  if (!result.success || !result.data) {
    return this.inertia.render(ctx, 'Auth/Login', {
      error: { key: 'auth.login.failed' },
      lastEmail: email,
    })
  }

  ctx.setCookie('auth_token', result.data.accessToken, {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 900,
    secure: isSecureRequest(ctx),
  })

  ctx.setCookie('refresh_token', result.data.refreshToken, {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
    secure: isSecureRequest(ctx),
  })

  const destination = result.data.user.role === 'admin' ? '/admin/dashboard' : '/member/dashboard'
  return ctx.redirect(destination)
}
```

- [ ] **Step 3: 修改 `GoogleOAuthCallbackPage.ts` 的 redirect**

`handle()` 最後一行改為：

```typescript
// src/Website/Auth/Pages/GoogleOAuthCallbackPage.ts
// 替換現有 return ctx.redirect('/member/dashboard', 302)

const destination = result.data.user.role === 'admin' ? '/admin/dashboard' : '/member/dashboard'
return ctx.redirect(destination, 302)
```

> `result.data` 型別來自 `GoogleOAuthService.exchange()` 回傳，含 `user.role: string`。確認 `result.data.user.role` 存在後再修改；若結構不同，用 `(result.data as any).user?.role === 'admin'` 做防禦性讀取。

- [ ] **Step 4: 執行現有測試確認未破壞**

```bash
bun test src/Website/__tests__/Auth/LoginPage.test.ts src/Website/__tests__/Auth/GoogleOAuthCallbackPage.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/Website/Auth/Pages/LoginPage.ts src/Website/Auth/Pages/GoogleOAuthCallbackPage.ts
git commit -m "feat: [auth] admin 登入後重導向至 /admin/dashboard"
```

---

## Task 2：Contract aggregate 新增 `adjustCreditQuota()` 方法

現有 `updateTerms()` 只允許 DRAFT 合約修改，但配額調整需要在 ACTIVE 合約上執行。

**Files:**
- Modify: `src/Modules/Contract/Domain/Aggregates/Contract.ts`

- [ ] **Step 1: 在 Contract aggregate 新增 `adjustCreditQuota()` 方法**

在 `terminate()` 方法之後加入：

```typescript
// src/Modules/Contract/Domain/Aggregates/Contract.ts
// 加在 terminate() 方法之後，updateTerms() 之前

/**
 * Returns a copy with the creditQuota adjusted by admin.
 * Unlike updateTerms(), this is allowed on both DRAFT and ACTIVE contracts.
 * @throws {Error} If newCreditQuota is negative.
 */
adjustCreditQuota(newCreditQuota: number): Contract {
  if (newCreditQuota < 0) {
    throw new Error('Credit quota cannot be negative')
  }
  const newTerms = this.props.terms.toJSON()
  return new Contract({
    ...this.props,
    terms: ContractTerm.create({ ...newTerms, creditQuota: newCreditQuota }),
    updatedAt: new Date(),
  })
}
```

- [ ] **Step 2: 確認 TypeScript 編譯通過**

```bash
bun run tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/Modules/Contract/Domain/Aggregates/Contract.ts
git commit -m "feat: [contract] 新增 adjustCreditQuota() 支援 admin 調整 active 合約配額"
```

---

## Task 3：DB migration + ApiKey aggregate 新增 `quotaAllocated`

**Files:**
- Create: `database/migrations/2026_04_16_000001_add_quota_allocated_to_api_keys.ts`
- Modify: `src/Modules/ApiKey/Domain/Aggregates/ApiKey.ts`

- [ ] **Step 1: 建立 migration 檔案**

```typescript
// database/migrations/2026_04_16_000001_add_quota_allocated_to_api_keys.ts
import { type Migration, Schema } from '@gravito/atlas'

export default class AddQuotaAllocatedToApiKeys implements Migration {
  async up(): Promise<void> {
    await Schema.table('api_keys', (table) => {
      table.integer('quota_allocated').nullable().default(0)
    })
  }

  async down(): Promise<void> {
    await Schema.table('api_keys', (table) => {
      table.dropColumn('quota_allocated')
    })
  }
}
```

- [ ] **Step 2: 在 `ApiKey` aggregate 的 `ApiKeyProps` 介面新增欄位**

```typescript
// src/Modules/ApiKey/Domain/Aggregates/ApiKey.ts
// 在 ApiKeyProps 介面的 preFreezeRateLimit 之前加入：
readonly quotaAllocated: number
```

- [ ] **Step 3: 更新 `ApiKey.create()` 工廠方法**

在 `create()` 中的 `suspensionReason: null,` 之前加入：

```typescript
quotaAllocated: 0,
```

- [ ] **Step 4: 更新 `ApiKey.fromDatabase()` 方法**

在 `suspensionReason: ...` 之前加入：

```typescript
quotaAllocated: typeof row.quota_allocated === 'number' ? row.quota_allocated : 0,
```

- [ ] **Step 5: 在 `ApiKey` 新增 `adjustQuotaAllocated()` 方法與 getter**

在 `updateScope()` 方法之後加入：

```typescript
/** Returns a copy with adjusted quota allocation (admin only). */
adjustQuotaAllocated(newAllocation: number): ApiKey {
  if (newAllocation < 0) {
    throw new Error('Quota allocation cannot be negative')
  }
  return new ApiKey({
    ...this.props,
    quotaAllocated: newAllocation,
    updatedAt: new Date(),
  })
}

/** Current quota allocated to this key (in contract credit units). */
get quotaAllocated(): number {
  return this.props.quotaAllocated
}
```

- [ ] **Step 6: 確認 TypeScript 編譯通過**

```bash
bun run tsc --noEmit
```
Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add database/migrations/2026_04_16_000001_add_quota_allocated_to_api_keys.ts src/Modules/ApiKey/Domain/Aggregates/ApiKey.ts
git commit -m "feat: [api-key] 新增 quota_allocated 欄位與 adjustQuotaAllocated() 方法"
```

---

## Task 4：實作 AdjustContractQuotaService（§5.3 演算法）

**Files:**
- Create: `src/Modules/Contract/Application/Services/AdjustContractQuotaService.ts`
- Create: `src/Modules/Contract/__tests__/AdjustContractQuotaService.test.ts`

- [ ] **Step 1: 撰寫失敗測試**

```typescript
// src/Modules/Contract/__tests__/AdjustContractQuotaService.test.ts
import { describe, expect, mock, test } from 'bun:test'
import { AdjustContractQuotaService } from '../Application/Services/AdjustContractQuotaService'

function makeContract(creditQuota: number) {
  return {
    id: 'contract-1',
    targetId: 'org-1',
    targetType: 'organization' as const,
    status: 'active',
    terms: { creditQuota },
    adjustCreditQuota: mock((newCap: number) => ({
      ...makeContract(newCap),
      adjustCreditQuota: mock(),
    })),
    isActive: () => true,
    isDraft: () => false,
  }
}

function makeKey(id: string, quotaAllocated: number) {
  return {
    id,
    orgId: 'org-1',
    quotaAllocated,
    adjustQuotaAllocated: mock((newAlloc: number) => ({ ...makeKey(id, newAlloc), adjustQuotaAllocated: mock() })),
  }
}

describe('AdjustContractQuotaService', () => {
  test('QUOTA-01: non-admin caller is rejected', async () => {
    const contractRepo = { findById: mock(() => Promise.resolve(makeContract(1000))), update: mock() }
    const keyRepo = { findByOrgId: mock(() => Promise.resolve([])), update: mock() }
    const svc = new AdjustContractQuotaService(contractRepo as any, keyRepo as any)

    const result = await svc.execute({ contractId: 'contract-1', newCap: 800, callerRole: 'member' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('FORBIDDEN')
  })

  test('QUOTA-02: newCap >= sumAllocated leaves key allocations unchanged', async () => {
    const key1 = makeKey('key-1', 300)
    const key2 = makeKey('key-2', 200)
    const contract = makeContract(1000)
    const contractRepo = { findById: mock(() => Promise.resolve(contract)), update: mock() }
    const keyRepo = { findActiveByOrgId: mock(() => Promise.resolve([key1, key2])), update: mock() }
    const svc = new AdjustContractQuotaService(contractRepo as any, keyRepo as any)

    const result = await svc.execute({ contractId: 'contract-1', newCap: 600, callerRole: 'admin' })

    expect(result.success).toBe(true)
    // sumAllocated = 500, newCap = 600 >= 500 → keys unchanged
    expect(key1.adjustQuotaAllocated).not.toHaveBeenCalled()
    expect(key2.adjustQuotaAllocated).not.toHaveBeenCalled()
  })

  test('QUOTA-03: newCap < sumAllocated triggers proportional reduction', async () => {
    const key1 = makeKey('key-1', 500)
    const key2 = makeKey('key-2', 500)
    const contract = makeContract(1000)
    let adjustedContract: ReturnType<typeof makeContract> | null = null
    const contractRepo = {
      findById: mock(() => Promise.resolve(contract)),
      update: mock((c: any) => { adjustedContract = c; return Promise.resolve() }),
    }
    const updatedKeys: unknown[] = []
    const keyRepo = {
      findActiveByOrgId: mock(() => Promise.resolve([key1, key2])),
      update: mock((k: any) => { updatedKeys.push(k); return Promise.resolve() }),
    }
    const svc = new AdjustContractQuotaService(contractRepo as any, keyRepo as any)

    const result = await svc.execute({ contractId: 'contract-1', newCap: 400, callerRole: 'admin' })

    expect(result.success).toBe(true)
    expect(contractRepo.update).toHaveBeenCalled()
    // Both keys should be updated (proportional: each gets 200)
    expect(keyRepo.update).toHaveBeenCalledTimes(2)
    expect(result.data?.changes).toHaveLength(2)
    // Sum of new allocations should equal newCap = 400
    const sumNew = (result.data?.changes ?? []).reduce((s: number, c: any) => s + c.newAllocated, 0)
    expect(sumNew).toBe(400)
  })

  test('QUOTA-04: contract not found returns error', async () => {
    const contractRepo = { findById: mock(() => Promise.resolve(null)), update: mock() }
    const keyRepo = { findActiveByOrgId: mock(() => Promise.resolve([])), update: mock() }
    const svc = new AdjustContractQuotaService(contractRepo as any, keyRepo as any)

    const result = await svc.execute({ contractId: 'missing', newCap: 500, callerRole: 'admin' })

    expect(result.success).toBe(false)
    expect(result.error).toBe('NOT_FOUND')
  })
})
```

- [ ] **Step 2: 執行測試確認全部失敗（紅燈）**

```bash
bun test src/Modules/Contract/__tests__/AdjustContractQuotaService.test.ts
```
Expected: FAIL（AdjustContractQuotaService 不存在）

- [ ] **Step 3: 實作 AdjustContractQuotaService**

```typescript
// src/Modules/Contract/Application/Services/AdjustContractQuotaService.ts
import type { IContractRepository } from '../../Domain/Repositories/IContractRepository'
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'

export interface QuotaChangeEntry {
  keyId: string
  oldAllocated: number
  newAllocated: number
}

export interface AdjustQuotaResult {
  success: boolean
  message: string
  data?: {
    contractId: string
    oldCap: number
    newCap: number
    changes: QuotaChangeEntry[]
    hardBlockedKeyIds: string[]
  }
  error?: string
}

export interface AdjustQuotaInput {
  contractId: string
  newCap: number
  callerRole: string
}

/**
 * Admin service: adjusts a contract's creditQuota and proportionally
 * redistributes quotaAllocated across the org's active API keys (spec §5.3).
 */
export class AdjustContractQuotaService {
  constructor(
    private readonly contractRepo: IContractRepository,
    private readonly keyRepo: IApiKeyRepository,
  ) {}

  async execute(input: AdjustQuotaInput): Promise<AdjustQuotaResult> {
    const { contractId, newCap, callerRole } = input

    if (callerRole !== 'admin') {
      return { success: false, message: 'Only admins can adjust contract quotas', error: 'FORBIDDEN' }
    }

    if (newCap < 0) {
      return { success: false, message: 'newCap cannot be negative', error: 'INVALID_INPUT' }
    }

    try {
      const contract = await this.contractRepo.findById(contractId)
      if (!contract) {
        return { success: false, message: 'Contract not found', error: 'NOT_FOUND' }
      }

      const oldCap = contract.terms.creditQuota
      const keys = await this.keyRepo.findActiveByOrgId(contract.targetId)
      const sumAllocated = keys.reduce((sum, k) => sum + k.quotaAllocated, 0)

      const changes: QuotaChangeEntry[] = []
      const hardBlockedKeyIds: string[] = []

      if (newCap >= sumAllocated) {
        // Step 1 of §5.3: unallocated pool absorbs the reduction, keys unchanged
        const updatedContract = contract.adjustCreditQuota(newCap)
        await this.contractRepo.update(updatedContract)
      } else {
        // Step 2 of §5.3: proportional reduction across keys
        const updatedContract = contract.adjustCreditQuota(newCap)
        await this.contractRepo.update(updatedContract)

        let runningSum = 0
        const adjustedKeys = keys.map((k, idx) => {
          const isLast = idx === keys.length - 1
          let newAlloc: number

          if (isLast) {
            // Last key absorbs rounding error to ensure Σ = newCap
            newAlloc = newCap - runningSum
          } else {
            newAlloc = sumAllocated > 0 ? Math.round((k.quotaAllocated / sumAllocated) * newCap) : 0
          }
          runningSum += newAlloc

          return { key: k, newAlloc }
        })

        for (const { key, newAlloc } of adjustedKeys) {
          const updated = key.adjustQuotaAllocated(newAlloc)
          await this.keyRepo.update(updated)
          changes.push({ keyId: key.id, oldAllocated: key.quotaAllocated, newAllocated: newAlloc })

          // Note: hardBlocked detection requires used_i data; placeholder for future usage sync
        }
      }

      return {
        success: true,
        message: 'Contract quota adjusted',
        data: { contractId, oldCap, newCap, changes, hardBlockedKeyIds },
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Adjustment failed'
      return { success: false, message, error: message }
    }
  }
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
bun test src/Modules/Contract/__tests__/AdjustContractQuotaService.test.ts
```
Expected: PASS（4 tests）

- [ ] **Step 5: Commit**

```bash
git add src/Modules/Contract/Application/Services/AdjustContractQuotaService.ts src/Modules/Contract/__tests__/AdjustContractQuotaService.test.ts
git commit -m "feat: [contract] 實作 AdjustContractQuotaService（§5.3 比例縮減演算法）"
```

---

## Task 5：Admin 合約詳情頁後端 + 路由 + DI 綁定

**Files:**
- Modify: `src/Website/Admin/Pages/AdminContractDetailPage.ts`
- Modify: `src/Website/Admin/routes/registerAdminRoutes.ts`
- Modify: `src/Website/Admin/bindings/registerAdminBindings.ts`
- Create: `src/Website/__tests__/Admin/AdminContractDetailPageQuota.test.ts`

- [ ] **Step 1: 撰寫失敗測試**

```typescript
// src/Website/__tests__/Admin/AdminContractDetailPageQuota.test.ts
import { describe, expect, mock, test } from 'bun:test'
import { loadMessages } from '@/Shared/Infrastructure/I18n'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AdminContractDetailPage } from '../../Admin/Pages/AdminContractDetailPage'
import type { InertiaService } from '../../Http/Inertia/InertiaRequestHandler'

function makeStore(auth = { userId: 'admin-1', email: 'admin@test.com', role: 'admin' }) {
  const store = new Map<string, unknown>()
  store.set('auth', auth)
  store.set('inertia:shared', {
    locale: 'en',
    messages: loadMessages('en'),
    auth: { user: auth },
    currentOrgId: null,
    flash: {},
  })
  return store
}

function makeCtx(store: Map<string, unknown>, body: unknown = {}, paramId?: string): IHttpContext {
  return {
    getBodyText: async () => '',
    getJsonBody: async <T>() => body as T,
    getBody: async <T>() => ({}) as T,
    getHeader: () => undefined,
    getParam: (name: string) => (name === 'id' ? paramId : undefined),
    getPathname: () => '/admin/contracts/contract-1/quota',
    getQuery: () => undefined,
    params: {},
    query: {},
    headers: {},
    json: (data: unknown, status?: number) => Response.json(data, { status: status ?? 200 }),
    text: (content: string, status?: number) => new Response(content, { status: status ?? 200 }),
    redirect: (url: string, status?: number) => Response.redirect(url, status ?? 302),
    get: <T>(key: string) => store.get(key) as T | undefined,
    set: (key: string, value: unknown) => { store.set(key, value) },
    getCookie: () => undefined,
    setCookie: () => {},
    getMethod: () => 'POST',
  } as unknown as IHttpContext
}

function makeMockInertia() {
  const captured = { lastCall: null as null | { component: string; props: Record<string, unknown> } }
  const inertia = {
    render: (_ctx: IHttpContext, component: string, props: Record<string, unknown>) => {
      captured.lastCall = { component, props }
      return new Response(JSON.stringify({ component, props }), { headers: { 'Content-Type': 'application/json' } })
    },
  } as unknown as InertiaService
  return { inertia, captured }
}

describe('AdminContractDetailPage.postQuota', () => {
  test('QUOTA-PAGE-01: postQuota calls adjustQuotaService and redirects', async () => {
    const { inertia } = makeMockInertia()
    const mockGetDetail = { execute: mock(() => Promise.resolve({ success: true, data: {} })) }
    const mockActivate = { execute: mock(() => Promise.resolve({ success: true })) }
    const mockTerminate = { execute: mock(() => Promise.resolve({ success: true })) }
    const mockAdjust = {
      execute: mock(() =>
        Promise.resolve({ success: true, data: { contractId: 'contract-1', oldCap: 1000, newCap: 800, changes: [], hardBlockedKeyIds: [] } }),
      ),
    }

    const page = new AdminContractDetailPage(
      inertia,
      mockGetDetail as any,
      mockActivate as any,
      mockTerminate as any,
      mockAdjust as any,
    )
    const store = makeStore()
    const ctx = makeCtx(store, { newCap: 800 }, 'contract-1')
    const response = await page.postQuota(ctx)

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toContain('/admin/contracts/contract-1')
    expect(mockAdjust.execute).toHaveBeenCalledWith({
      contractId: 'contract-1',
      newCap: 800,
      callerRole: 'admin',
    })
  })

  test('QUOTA-PAGE-02: postQuota with missing id redirects to list', async () => {
    const { inertia } = makeMockInertia()
    const mockGetDetail = { execute: mock(() => Promise.resolve({ success: true })) }
    const mockActivate = { execute: mock(() => Promise.resolve({ success: true })) }
    const mockTerminate = { execute: mock(() => Promise.resolve({ success: true })) }
    const mockAdjust = { execute: mock(() => Promise.resolve({ success: true })) }

    const page = new AdminContractDetailPage(
      inertia,
      mockGetDetail as any,
      mockActivate as any,
      mockTerminate as any,
      mockAdjust as any,
    )
    const store = makeStore()
    const ctx = makeCtx(store, { newCap: 800 }, undefined)
    const response = await page.postQuota(ctx)

    expect(response.status).toBe(302)
    expect(response.headers.get('Location')).toContain('/admin/contracts')
    expect(mockAdjust.execute).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 執行測試確認失敗（AdminContractDetailPage 還沒有 postQuota）**

```bash
bun test src/Website/__tests__/Admin/AdminContractDetailPageQuota.test.ts
```
Expected: FAIL

- [ ] **Step 3: 更新 `AdminContractDetailPage.ts` 注入 AdjustContractQuotaService 並新增 `postQuota()`**

```typescript
// src/Website/Admin/Pages/AdminContractDetailPage.ts
// 在 import 區新增：
import type { AdjustContractQuotaService } from '@/Modules/Contract/Application/Services/AdjustContractQuotaService'

// constructor 新增第五個參數：
constructor(
  private readonly inertia: InertiaService,
  private readonly getDetailService: GetContractDetailService,
  private readonly activateContractService: ActivateContractService,
  private readonly terminateContractService: TerminateContractService,
  private readonly adjustQuotaService: AdjustContractQuotaService,
) {}

// 在 postAction() 方法之後新增：
/**
 * POST `/admin/contracts/:id/quota`: body `{ newCap: number }`.
 * Adjusts contractCap and proportionally redistributes key allocations (spec §5.3).
 */
async postQuota(ctx: IHttpContext): Promise<Response> {
  const auth = AuthMiddleware.getAuthContext(ctx)!
  const contractId = ctx.getParam('id')
  if (!contractId) {
    return ctx.redirect('/admin/contracts')
  }

  const body = await ctx.getJsonBody<{ newCap?: unknown }>()
  const newCap = typeof body.newCap === 'number' ? body.newCap : NaN

  if (isNaN(newCap)) {
    return ctx.redirect(`/admin/contracts/${contractId}`)
  }

  await this.adjustQuotaService.execute({ contractId, newCap, callerRole: auth.role })

  return ctx.redirect(`/admin/contracts/${contractId}`)
}
```

- [ ] **Step 4: 在 `registerAdminBindings.ts` 更新 contractDetail 綁定（注入 adjustQuotaService）**

```typescript
// src/Website/Admin/bindings/registerAdminBindings.ts
// 在 import 區新增：
import type { AdjustContractQuotaService } from '@/Modules/Contract/Application/Services/AdjustContractQuotaService'

// 替換 contractDetail singleton：
container.singleton(
  k.contractDetail,
  (c) =>
    new AdminContractDetailPage(
      c.make(i) as InertiaService,
      c.make('getContractDetailService') as GetContractDetailService,
      c.make('activateContractService') as ActivateContractService,
      c.make('terminateContractService') as TerminateContractService,
      c.make('adjustContractQuotaService') as AdjustContractQuotaService,
    ),
)
```

- [ ] **Step 5: 在 `registerAdminRoutes.ts` 新增配額路由**

在 `ADMIN_PAGE_ROUTES` 陣列中，`/admin/contracts/:id/action` 之後加入：

```typescript
{
  method: 'post',
  path: '/admin/contracts/:id/quota',
  page: ADMIN_PAGE_KEYS.contractDetail,
  action: 'postQuota',
  name: 'pages.admin.contracts.quota',
},
```

> 注意：`AdminPageInstance` 型別也需新增 `postQuota?` 方法簽章，在 `postAction?` 那行後面加一行：
> ```typescript
> postQuota?(ctx: IHttpContext): Promise<Response>
> ```

- [ ] **Step 6: 在 `ContractServiceProvider.ts` 綁定 `adjustContractQuotaService`**

檔案路徑：`src/Modules/Contract/Infrastructure/Providers/ContractServiceProvider.ts`

在現有 `getContractDetailService` singleton 之後加入：

```typescript
container.singleton(
  'adjustContractQuotaService',
  (c) =>
    new AdjustContractQuotaService(
      c.make('contractRepository') as ContractRepository,
      c.make('apiKeyRepository') as ApiKeyRepository,
    ),
)
```

並在檔案頂部加入 import（仿照既有的 import 風格）：
```typescript
import { AdjustContractQuotaService } from '../Services/AdjustContractQuotaService'
// ApiKeyRepository 已在 ApiKeyServiceProvider 中實例化，這裡只需取得其介面
// 但由於 DI 容器已有 apiKeyRepository binding，直接 c.make('apiKeyRepository') 即可
// cast 為 ApiKeyRepository（concrete class），與其他服務的 cast 風格一致
```

> `ApiKeyRepository` 由 `ApiKeyServiceProvider` 在 `apiKeyRepository` key 下注冊，因此 `c.make('apiKeyRepository')` 可直接取得，不需要額外設定。

- [ ] **Step 7: 確認 TypeScript 編譯通過**

```bash
bun run tsc --noEmit
```
Expected: no errors

- [ ] **Step 8: 執行測試**

```bash
bun test src/Website/__tests__/Admin/AdminContractDetailPageQuota.test.ts
```
Expected: PASS（2 tests）

- [ ] **Step 9: Commit**

```bash
git add src/Website/Admin/Pages/AdminContractDetailPage.ts \
        src/Website/Admin/routes/registerAdminRoutes.ts \
        src/Website/Admin/bindings/registerAdminBindings.ts \
        src/Website/__tests__/Admin/AdminContractDetailPageQuota.test.ts
git commit -m "feat: [admin] 合約配額 POST endpoint 與 DI 綁定"
```

---

## Task 6：前端 QuotaAdjustModal 元件

**Files:**
- Create: `resources/js/Pages/Admin/Contracts/QuotaAdjustModal.tsx`

- [ ] **Step 1: 建立 QuotaAdjustModal 元件**

```tsx
// resources/js/Pages/Admin/Contracts/QuotaAdjustModal.tsx
import { useState, useMemo } from 'react'
import { router } from '@inertiajs/react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

export interface QuotaKeyRow {
  id: string
  label: string
  allocated: number
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  contractId: string
  contractCap: number
  sumAllocated: number
  keys: QuotaKeyRow[]
}

interface KeyChange {
  id: string
  label: string
  oldAllocated: number
  newAllocated: number
}

function computeProportionalReduction(
  keys: QuotaKeyRow[],
  newCap: number,
): KeyChange[] {
  const sumAllocated = keys.reduce((s, k) => s + k.allocated, 0)
  if (sumAllocated === 0 || newCap >= sumAllocated) return []

  let runningSum = 0
  return keys.map((k, idx) => {
    const isLast = idx === keys.length - 1
    let newAlloc: number
    if (isLast) {
      newAlloc = newCap - runningSum
    } else {
      newAlloc = Math.round((k.allocated / sumAllocated) * newCap)
    }
    runningSum += newAlloc
    return { id: k.id, label: k.label, oldAllocated: k.allocated, newAllocated: newAlloc }
  })
}

export function QuotaAdjustModal({
  open,
  onOpenChange,
  contractId,
  contractCap,
  sumAllocated,
  keys,
}: Props) {
  const { t } = useTranslation()
  const [newCapInput, setNewCapInput] = useState('')
  const [loading, setLoading] = useState(false)

  const newCap = parseInt(newCapInput, 10)
  const isValid = !isNaN(newCap) && newCap >= 0

  const preview = useMemo<KeyChange[]>(() => {
    if (!isValid) return []
    return computeProportionalReduction(keys, newCap)
  }, [keys, newCap, isValid])

  const unallocated = contractCap - sumAllocated
  const isKeysUnchanged = isValid && newCap >= sumAllocated
  const hardBlockedKeys = preview.filter((c) => c.newAllocated < 0)

  function handleConfirm() {
    if (!isValid) return
    setLoading(true)
    router.post(
      `/admin/contracts/${contractId}/quota`,
      { newCap },
      {
        onFinish: () => {
          setLoading(false)
          onOpenChange(false)
          setNewCapInput('')
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('ui.admin.contracts.quota.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 現況 */}
          <div className="rounded-md border p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('ui.admin.contracts.quota.currentCap')}</span>
              <span className="font-medium">{contractCap.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('ui.admin.contracts.quota.sumAllocated')}</span>
              <span className="font-medium">{sumAllocated.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('ui.admin.contracts.quota.unallocated')}</span>
              <span className="font-medium">{unallocated.toLocaleString()}</span>
            </div>
          </div>

          {/* 輸入新上限 */}
          <div className="space-y-2">
            <Label htmlFor="newCap">{t('ui.admin.contracts.quota.newCapLabel')}</Label>
            <Input
              id="newCap"
              type="number"
              min={0}
              value={newCapInput}
              onChange={(e) => setNewCapInput(e.target.value)}
              placeholder={String(contractCap)}
            />
          </div>

          {/* 影響預覽 */}
          {isValid && isKeysUnchanged && (
            <p className="text-sm text-muted-foreground">{t('ui.admin.contracts.quota.keysUnchanged')}</p>
          )}

          {isValid && !isKeysUnchanged && preview.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{t('ui.admin.contracts.quota.previewTitle')}</p>
              <div className="rounded-md border text-sm">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Key</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">{t('ui.admin.contracts.quota.before')}</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">{t('ui.admin.contracts.quota.after')}</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">{t('ui.admin.contracts.quota.diff')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((c) => {
                      const diff = c.newAllocated - c.oldAllocated
                      const isBlocked = c.newAllocated < 0
                      return (
                        <tr key={c.id} className={isBlocked ? 'bg-destructive/10' : ''}>
                          <td className="px-3 py-2 truncate max-w-[120px]">{c.label}</td>
                          <td className="px-3 py-2 text-right">{c.oldAllocated.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">{c.newAllocated.toLocaleString()}</td>
                          <td className={`px-3 py-2 text-right ${diff < 0 ? 'text-destructive' : 'text-green-600'}`}>
                            {diff > 0 ? '+' : ''}{diff.toLocaleString()}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {hardBlockedKeys.length > 0 && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{t('ui.admin.contracts.quota.hardBlockWarning')}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('ui.common.cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid || loading}>
            {loading ? t('ui.common.saving') : t('ui.admin.contracts.quota.confirmButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: 確認 TypeScript 編譯通過**

```bash
bun run tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add resources/js/Pages/Admin/Contracts/QuotaAdjustModal.tsx
git commit -m "feat: [admin-ui] 新增 QuotaAdjustModal 元件（含比例預覽）"
```

---

## Task 7：合約詳情頁前端接線（ContractShow + i18n key）

**Files:**
- Modify: `resources/js/Pages/Admin/Contracts/Show.tsx`
- Modify (i18n): 在 `resources/lang/zh-TW/ui.json`（或對應 i18n 檔案）新增 key

- [ ] **Step 1: 確認 i18n 檔案位置**

```bash
find resources/lang -name "*.json" | head -10
```

- [ ] **Step 2: 在 zh-TW i18n 檔新增 quota 相關 key（找到正確的 ui.admin.contracts 節點後加入）**

```json
"quota": {
  "title": "調整合約配額",
  "currentCap": "現有上限",
  "sumAllocated": "已配發總和",
  "unallocated": "未分配池",
  "newCapLabel": "新配額上限",
  "keysUnchanged": "新上限 ≥ 已配發總和，各 Key 配發不受影響。",
  "previewTitle": "影響預覽",
  "before": "配發前",
  "after": "配發後",
  "diff": "差異",
  "hardBlockWarning": "部分 Key 調降後 allocated < 0，將進入硬擋狀態。",
  "confirmButton": "確認調整",
  "adjustButton": "調整配額"
}
```

在 en i18n 檔做對應的英文版本。

- [ ] **Step 3: 修改 `AdminContractDetailPage.ts` 的 `handle()` 傳遞配額資料給前端**

在 `handle()` 方法中，取得 contract detail 後，額外查詢 keys 的配額資料：

```typescript
// 在 handle() 的 const result = await this.getDetailService.execute(...) 之後加入
// 注意：需注入 IApiKeyRepository 或透過現有 keyRepo 取得

// 由於 AdminContractDetailPage 目前沒有 keyRepo，
// 最簡單做法：在 getDetailService 回傳的 contract data 中讀取 targetId，
// 然後注入 listApiKeysService 查詢 keys。
// 但為避免 Task 5 範圍膨脹，先傳遞 sumAllocated: 0, keys: [] 作為 placeholder，
// 待 Task 9 更新 AdminApiKeysPage 後，前端改用 /admin/api-keys?orgId=xxx 的資料。
```

> **簡化決策**：ContractShow 頁的配額 Modal 所需的 `keys` 資料（各 key 的 `allocated`），透過另一個 API 取得會增加複雜度。**在此 Task 採用更簡單的方案**：Modal 在開啟前先發送 GET 請求到 `/admin/api-keys?orgId=xxx` 取得 keys 資料，或直接在 ContractShow 傳遞 `keys` 列表。

修改 `handle()` 在 render 前補充 `quotaData`：

```typescript
// 在 return this.inertia.render(...) 之前：
// 新增 keys 查詢（需在 constructor 注入 listApiKeysService）
// 如果暫時不注入，傳 keys: [] 讓 Modal 顯示「無 Key 資料」
return this.inertia.render(ctx, 'Admin/Contracts/Show', {
  contract: result.success ? (result.data as Record<string, unknown>) : null,
  error: result.success ? null : { key: 'admin.contracts.loadFailed' },
  quotaKeys: [],  // placeholder；Task 9 後可換成真實資料
})
```

- [ ] **Step 4: 修改 `Show.tsx` 新增「調整配額」按鈕與 Modal**

```tsx
// resources/js/Pages/Admin/Contracts/Show.tsx
// 在現有 import 後新增：
import { useState } from 'react'
import { QuotaAdjustModal, type QuotaKeyRow } from './QuotaAdjustModal'

// 在 Props 介面新增：
interface Props {
  contract: ContractDetail | null
  error: I18nMessage | null
  quotaKeys: QuotaKeyRow[]
}

// 在 ContractShow 元件內新增 state：
const [quotaModalOpen, setQuotaModalOpen] = useState(false)

// 在操作按鈕區（現有 activate/terminate 按鈕旁）新增：
<Button variant="outline" onClick={() => setQuotaModalOpen(true)}>
  {t('ui.admin.contracts.quota.adjustButton')}
</Button>

// 在 AdminLayout closing tag 之前新增 Modal：
<QuotaAdjustModal
  open={quotaModalOpen}
  onOpenChange={setQuotaModalOpen}
  contractId={contract.id}
  contractCap={contract.terms.creditQuota}
  sumAllocated={quotaKeys.reduce((s, k) => s + k.allocated, 0)}
  keys={quotaKeys}
/>
```

- [ ] **Step 5: 確認 TypeScript 編譯通過**

```bash
bun run tsc --noEmit
```
Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add resources/js/Pages/Admin/Contracts/Show.tsx
git commit -m "feat: [admin-ui] 合約詳情頁接線 QuotaAdjustModal"
```

---

## Task 8：組織詳情頁後端 + 前端配額彙總卡

**Files:**
- Modify: `src/Website/Admin/Pages/AdminOrganizationDetailPage.ts`
- Modify: `resources/js/Pages/Admin/Organizations/Show.tsx`

- [ ] **Step 1: 修改 `AdminOrganizationDetailPage.ts`，注入 ContractRepo 並查詢配額彙總**

```typescript
// src/Website/Admin/Pages/AdminOrganizationDetailPage.ts
// 新增 import：
import type { IContractRepository } from '@/Modules/Contract/Domain/Repositories/IContractRepository'
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'

// 在 constructor 新增兩個參數（在 listMembersService 之後）：
constructor(
  private readonly inertia: InertiaService,
  private readonly getOrgService: GetOrganizationService,
  private readonly listMembersService: ListMembersService,
  private readonly contractRepo: IContractRepository,
  private readonly keyRepo: IApiKeyRepository,
) {}

// 在 handle() 方法的 Promise.all 內新增兩個查詢：
const [orgResult, membersResult, activeContract, activeKeys] = await Promise.all([
  this.getOrgService.execute(orgId, auth.userId, auth.role),
  this.listMembersService.execute(orgId, auth.userId, auth.role),
  this.contractRepo.findActiveByTargetId(orgId),
  this.keyRepo.findActiveByOrgId(orgId),
])

// 在 return this.inertia.render(...) 前計算：
const contractCap = activeContract?.terms.creditQuota ?? null
const sumAllocated = activeKeys.reduce((sum, k) => sum + k.quotaAllocated, 0)
const unallocated = contractCap !== null ? contractCap - sumAllocated : null

// 在 render 加入：
return this.inertia.render(ctx, 'Admin/Organizations/Show', {
  organization,
  members,
  contractSummary: contractCap !== null
    ? {
        contractId: activeContract!.id,
        contractCap,
        sumAllocated,
        unallocated,
      }
    : null,
  error: orgResult.success ? null : { key: 'admin.organizations.loadFailed' },
})
```

- [ ] **Step 2: 更新 `registerAdminBindings.ts` 中的 organizationDetail 綁定**

```typescript
container.singleton(
  k.organizationDetail,
  (c) =>
    new AdminOrganizationDetailPage(
      c.make(i) as InertiaService,
      c.make('getOrganizationService') as GetOrganizationService,
      c.make('listMembersService') as ListMembersService,
      c.make('contractRepository') as IContractRepository,
      c.make('apiKeyRepository') as IApiKeyRepository,
    ),
)
```

並在 `registerAdminBindings.ts` 頂部新增：
```typescript
import type { IContractRepository } from '@/Modules/Contract/Domain/Repositories/IContractRepository'
import type { IApiKeyRepository } from '@/Modules/ApiKey/Domain/Repositories/IApiKeyRepository'
```

- [ ] **Step 3: 更新 `Admin/Organizations/Show.tsx` 新增配額彙總卡**

```tsx
// resources/js/Pages/Admin/Organizations/Show.tsx
// 在 Props 介面新增：
contractSummary: {
  contractId: string
  contractCap: number
  sumAllocated: number
  unallocated: number
} | null

// 在現有 Card 區塊（組織基本資訊）之後、members 列表之前加入：
{contractSummary && (
  <Card>
    <CardHeader>
      <CardTitle>{t('ui.admin.organizations.quotaSummary.title')}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{t('ui.admin.organizations.quotaSummary.cap')}</span>
        <span className="font-medium">{contractSummary.contractCap.toLocaleString()}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{t('ui.admin.organizations.quotaSummary.allocated')}</span>
        <span className="font-medium">{contractSummary.sumAllocated.toLocaleString()}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{t('ui.admin.organizations.quotaSummary.unallocated')}</span>
        <span className="font-medium">{contractSummary.unallocated.toLocaleString()}</span>
      </div>
      {contractSummary.contractCap > 0 && (
        <div className="space-y-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.min(100, (contractSummary.sumAllocated / contractSummary.contractCap) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-right">
            {Math.round((contractSummary.sumAllocated / contractSummary.contractCap) * 100)}% {t('ui.admin.organizations.quotaSummary.allocated')}
          </p>
        </div>
      )}
      <div className="flex gap-2 pt-2">
        <Link href={`/admin/contracts/${contractSummary.contractId}`} className="text-sm text-primary hover:underline">
          {t('ui.admin.organizations.quotaSummary.viewContract')}
        </Link>
        <span className="text-muted-foreground">·</span>
        <Link href={`/admin/api-keys?orgId=${/* orgId from props */''}`} className="text-sm text-primary hover:underline">
          {t('ui.admin.organizations.quotaSummary.viewApiKeys')}
        </Link>
      </div>
    </CardContent>
  </Card>
)}
```

> `orgId` 從 `organization.id` 取得，確認 `organization` prop 可用後替換空字串。

在 zh-TW i18n 加入：
```json
"quotaSummary": {
  "title": "合約配額彙總",
  "cap": "合約上限",
  "allocated": "已配發",
  "unallocated": "未分配池",
  "viewContract": "查看合約詳情",
  "viewApiKeys": "查看 API Keys"
}
```

- [ ] **Step 4: 確認 TypeScript 編譯通過**

```bash
bun run tsc --noEmit
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/Website/Admin/Pages/AdminOrganizationDetailPage.ts \
        src/Website/Admin/bindings/registerAdminBindings.ts \
        resources/js/Pages/Admin/Organizations/Show.tsx
git commit -m "feat: [admin] 組織詳情頁加入合約配額彙總卡"
```

---

## Task 9：API Keys 頁後端補充用量欄位

**Files:**
- Modify: `src/Website/Admin/Pages/AdminApiKeysPage.ts`

- [ ] **Step 1: 確認 `usage_records` 表的查詢方式**

```bash
grep -r "usage_records\|usageRecords" src/ --include="*.ts" -l | head -10
```

找到現有的 usage repository 或 DB access pattern 後，仿照使用。

- [ ] **Step 2: 修改 `AdminApiKeysPage.ts`，在查詢 keys 後補充用量資料**

```typescript
// src/Website/Admin/Pages/AdminApiKeysPage.ts
// 在 handle() 的 keys mapping 中補充 quotaAllocated：

const keys =
  result.success && result.data?.keys
    ? result.data.keys.map((k) => {
        const row = k as Record<string, unknown>
        return {
          id: row.id as string,
          label: row.label as string,
          keyPreview: (row.keyPrefix as string) ?? '',
          status: row.status as 'active' | 'revoked' | 'suspended_no_credit',
          orgId: row.orgId as string,
          userId: (row.createdByUserId as string) ?? '',
          createdAt: row.createdAt as string,
          lastUsedAt: (row.updatedAt as string | null | undefined) ?? null,
          quotaAllocated: typeof row.quotaAllocated === 'number' ? row.quotaAllocated : 0,
        }
      })
    : []
```

> `quotaAllocated` 是直接從 `ApiKey` aggregate 讀取的欄位（Task 3 已加入），`ApiKeyPresenter.fromEntity()` 需確認是否已包含此欄位。若沒有，修改 `ApiKeyPresenter` 加入 `quotaAllocated: entity.quotaAllocated`。

- [ ] **Step 3: 確認或修改 ApiKeyPresenter 包含 quotaAllocated**

```bash
grep -n "quotaAllocated\|quota_allocated" src/Modules/ApiKey/Application/DTOs/ApiKeyDTO.ts
```

若不存在，在 `ApiKeyPresenter.fromEntity()` 的回傳物件加入：
```typescript
quotaAllocated: entity.quotaAllocated,
```

- [ ] **Step 4: 確認 TypeScript 編譯通過**

```bash
bun run tsc --noEmit
```
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/Website/Admin/Pages/AdminApiKeysPage.ts src/Modules/ApiKey/Application/DTOs/ApiKeyDTO.ts
git commit -m "feat: [admin] API Keys 頁補充 quotaAllocated 欄位"
```

---

## Task 10：API Keys 前端欄位更新

**Files:**
- Modify: `resources/js/Pages/Admin/ApiKeys/columns.tsx`
- Modify: `resources/js/Pages/Admin/ApiKeys/Index.tsx`

- [ ] **Step 1: 閱讀現有 columns.tsx 確認型別結構**

```bash
cat resources/js/Pages/Admin/ApiKeys/columns.tsx
```

- [ ] **Step 2: 在 `AdminApiKeyRow` 型別新增 `quotaAllocated`**

在現有欄位定義中加入：
```typescript
quotaAllocated: number
```

- [ ] **Step 3: 新增 `quotaAllocated` 欄位定義**

在 `createAdminApiKeyColumns` 函式的 columns 陣列中，在 `status` 欄位後加入：

```typescript
{
  accessorKey: 'quotaAllocated',
  header: () => t('ui.admin.apiKeys.columns.quotaAllocated'),
  cell: ({ row }) => {
    const allocated = row.original.quotaAllocated
    return <span>{allocated.toLocaleString()}</span>
  },
},
```

在 zh-TW i18n 加入：
```json
"columns": {
  "quotaAllocated": "配發額度"
}
```

- [ ] **Step 4: 確認 TypeScript 編譯通過**

```bash
bun run tsc --noEmit
```
Expected: no errors

- [ ] **Step 5: 執行所有 Admin 相關測試**

```bash
bun test src/Website/__tests__/Admin/
```
Expected: 全部 PASS

- [ ] **Step 6: Commit**

```bash
git add resources/js/Pages/Admin/ApiKeys/columns.tsx resources/js/Pages/Admin/ApiKeys/Index.tsx
git commit -m "feat: [admin-ui] API Keys 頁新增配額配發欄位"
```

---

## Task 11：全面驗收測試

- [ ] **Step 1: 執行全部測試**

```bash
bun test
```
Expected: 全部 PASS，無新增失敗

- [ ] **Step 2: TypeScript 全局編譯**

```bash
bun run tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: 驗收清單**

手動驗收（或 E2E）：

| 場景 | 預期結果 |
|------|----------|
| admin 帳號登入 | 導向 `/admin/dashboard` |
| manager/member 帳號登入 | 導向 `/member/dashboard` |
| admin Google OAuth 登入 | 導向 `/admin/dashboard` |
| `GET /admin/contracts/:id` | 頁面有「調整配額」按鈕 |
| 點「調整配額」→ 輸入 `newCap >= sumAllocated` | 顯示「各 Key 不受影響」 |
| 輸入 `newCap < sumAllocated` | 顯示各 Key 比例縮減預覽表格 |
| 確認調整 → POST | 重導回合約詳情，creditQuota 更新 |
| `GET /admin/organizations/:id` | 頁面有配額彙總卡（contractCap / sumAllocated / unallocated） |
| `GET /admin/api-keys?orgId=xxx` | 欄位有「配發額度」 |
| member 嘗試存取 `/admin/*` | 403 Forbidden |

- [ ] **Step 4: 最終 Commit**

```bash
git add .
git commit -m "chore: [admin] 全功能驗收通過"
```
