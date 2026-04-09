# @gravito/impulse 表單驗證整合 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將所有模組的手動 Zod safeParse 驗證遷移至 @gravito/impulse 的 FormRequest 類別，統一驗證流程。

**Architecture:** 擴展 IModuleRouter 介面支援 FormRequest overloads，修改 GravitoModuleRouter 偵測並透傳 FormRequest 給 core.router 的原生支援。每個模組的 Validators/ 資料夾轉為 Requests/，Controller 移除驗證樣板改用 ctx.get('validated')。

**Tech Stack:** @gravito/impulse, @gravito/core (Router native FormRequest), Zod, Bun, TypeScript

---

## File Map

### New Files

| File | Responsibility |
|------|---------------|
| `src/Modules/Auth/Presentation/Requests/LoginRequest.ts` | 登入 body 驗證 |
| `src/Modules/Auth/Presentation/Requests/RegisterRequest.ts` | 註冊 body 驗證 |
| `src/Modules/Auth/Presentation/Requests/RefreshTokenRequest.ts` | Token 刷新 body 驗證 |
| `src/Modules/Auth/Presentation/Requests/index.ts` | barrel export |
| `src/Modules/User/Presentation/Requests/UpdateProfileRequest.ts` | 更新個人資料 body 驗證 |
| `src/Modules/User/Presentation/Requests/ChangeStatusRequest.ts` | 變更狀態 body 驗證 |
| `src/Modules/User/Presentation/Requests/ListUsersRequest.ts` | 列表查詢 query 驗證 |
| `src/Modules/User/Presentation/Requests/params.ts` | 路由參數 schema（UserIdSchema） |
| `src/Modules/User/Presentation/Requests/index.ts` | barrel export |
| `src/Modules/Organization/Presentation/Requests/CreateOrganizationRequest.ts` | 建立組織 body 驗證 |
| `src/Modules/Organization/Presentation/Requests/UpdateOrganizationRequest.ts` | 更新組織 body 驗證 |
| `src/Modules/Organization/Presentation/Requests/ChangeOrgStatusRequest.ts` | 變更組織狀態 body 驗證 |
| `src/Modules/Organization/Presentation/Requests/InviteMemberRequest.ts` | 邀請成員 body 驗證 |
| `src/Modules/Organization/Presentation/Requests/AcceptInvitationRequest.ts` | 接受邀請 body 驗證 |
| `src/Modules/Organization/Presentation/Requests/ChangeMemberRoleRequest.ts` | 變更成員角色 body 驗證 |
| `src/Modules/Organization/Presentation/Requests/params.ts` | 路由參數 schema（OrganizationIdSchema 等） |
| `src/Modules/Organization/Presentation/Requests/index.ts` | barrel export |
| `src/Modules/Credit/Presentation/Requests/TopUpRequest.ts` | 儲值 body 驗證 |
| `src/Modules/Credit/Presentation/Requests/RefundRequest.ts` | 退款 body 驗證 |
| `src/Modules/Credit/Presentation/Requests/index.ts` | barrel export |

### Modified Files

| File | Change |
|------|--------|
| `src/Shared/Presentation/IModuleRouter.ts` | 加入 FormRequest overloads |
| `src/Shared/Infrastructure/Framework/GravitoModuleRouter.ts` | 偵測 FormRequest 並透傳給 core.router |
| `src/Modules/Auth/Presentation/Routes/auth.routes.ts` | 掛載 FormRequest |
| `src/Modules/Auth/Presentation/Controllers/AuthController.ts` | 移除 safeParse，用 ctx.get('validated') |
| `src/Modules/User/Presentation/Routes/user.routes.ts` | 掛載 FormRequest |
| `src/Modules/User/Presentation/Controllers/UserController.ts` | 移除 safeParse，用 ctx.get('validated') |
| `src/Modules/Organization/Presentation/Routes/organization.routes.ts` | 掛載 FormRequest |
| `src/Modules/Organization/Presentation/Controllers/OrganizationController.ts` | 移除 safeParse，用 ctx.get('validated') |
| `src/Modules/Credit/Presentation/Routes/credit.routes.ts` | 掛載 FormRequest |
| `src/Modules/Credit/Presentation/Controllers/CreditController.ts` | 移除 safeParse，用 ctx.get('validated') |
| `docs/openapi.yaml` | 驗證失敗 400 → 422 |
| `tests/Feature/api-spec.test.ts` | 狀態碼斷言 400 → 422 |

### Deleted Files

| File |
|------|
| `src/Modules/Auth/Presentation/Validators/login.validator.ts` |
| `src/Modules/Auth/Presentation/Validators/register.validator.ts` |
| `src/Modules/Auth/Presentation/Validators/index.ts` |
| `src/Modules/User/Presentation/Validators/updateProfile.validator.ts` |
| `src/Modules/User/Presentation/Validators/changeStatus.validator.ts` |
| `src/Modules/User/Presentation/Validators/listUsers.validator.ts` |
| `src/Modules/User/Presentation/Validators/index.ts` |
| `src/Modules/Organization/Presentation/Validators/organization.validator.ts` |
| `src/Modules/Organization/Presentation/Validators/member.validator.ts` |
| `src/Modules/Organization/Presentation/Validators/index.ts` |
| `src/Modules/Credit/Presentation/Validators/credit.validator.ts` |

---

## Task 1: 安裝 @gravito/impulse

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 安裝套件**

```bash
cd /Users/carl/Dev/CMG/Draupnir && bun add @gravito/impulse
```

- [ ] **Step 2: 驗證安裝**

Run: `ls node_modules/@gravito/impulse/package.json`
Expected: 檔案存在

- [ ] **Step 3: 確認型別可用**

Run: `bun run typecheck`
Expected: PASS（安裝不應破壞現有型別）

- [ ] **Step 4: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: 安裝 @gravito/impulse 表單驗證套件"
```

---

## Task 2: 擴展 IModuleRouter 介面

**Files:**
- Modify: `src/Shared/Presentation/IModuleRouter.ts`

- [ ] **Step 1: 加入 FormRequestClass import 和 overloads**

將 `src/Shared/Presentation/IModuleRouter.ts` 替換為：

```typescript
import type { IHttpContext } from './IHttpContext'
import type { FormRequestClass } from '@gravito/core'

/** 最終請求處理函式，回傳 HTTP Response */
export type RouteHandler = (ctx: IHttpContext) => Promise<Response>

/**
 * 中間件函式 — 洋蔥模型（Onion Model）
 * 呼叫 next() 繼續管線，或直接回傳 Response 短路
 */
export type Middleware = (
  ctx: IHttpContext,
  next: () => Promise<Response>,
) => Promise<Response>

export interface IModuleRouter {
  // === GET ===
  get(path: string, handler: RouteHandler): void
  get(path: string, middlewares: Middleware[], handler: RouteHandler): void
  get(path: string, formRequest: FormRequestClass, handler: RouteHandler): void
  get(path: string, middlewares: Middleware[], formRequest: FormRequestClass, handler: RouteHandler): void

  // === POST ===
  post(path: string, handler: RouteHandler): void
  post(path: string, middlewares: Middleware[], handler: RouteHandler): void
  post(path: string, formRequest: FormRequestClass, handler: RouteHandler): void
  post(path: string, middlewares: Middleware[], formRequest: FormRequestClass, handler: RouteHandler): void

  // === PUT ===
  put(path: string, handler: RouteHandler): void
  put(path: string, middlewares: Middleware[], handler: RouteHandler): void
  put(path: string, formRequest: FormRequestClass, handler: RouteHandler): void
  put(path: string, middlewares: Middleware[], formRequest: FormRequestClass, handler: RouteHandler): void

  // === PATCH ===
  patch(path: string, handler: RouteHandler): void
  patch(path: string, middlewares: Middleware[], handler: RouteHandler): void
  patch(path: string, formRequest: FormRequestClass, handler: RouteHandler): void
  patch(path: string, middlewares: Middleware[], formRequest: FormRequestClass, handler: RouteHandler): void

  // === DELETE ===
  delete(path: string, handler: RouteHandler): void
  delete(path: string, middlewares: Middleware[], handler: RouteHandler): void
  delete(path: string, formRequest: FormRequestClass, handler: RouteHandler): void
  delete(path: string, middlewares: Middleware[], formRequest: FormRequestClass, handler: RouteHandler): void

  // === HEAD ===
  head(path: string, handler: RouteHandler): void

  // === OPTIONS ===
  options(path: string, handler: RouteHandler): void

  group(prefix: string, fn: (router: IModuleRouter) => void): void
}
```

- [ ] **Step 2: 執行型別檢查**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/Shared/Presentation/IModuleRouter.ts
git commit -m "feat: [shared] IModuleRouter 加入 FormRequest overloads"
```

---

## Task 3: 更新 GravitoModuleRouter 偵測 FormRequest

**Files:**
- Modify: `src/Shared/Infrastructure/Framework/GravitoModuleRouter.ts`

- [ ] **Step 1: 加入 FormRequest 偵測與透傳邏輯**

將 `src/Shared/Infrastructure/Framework/GravitoModuleRouter.ts` 替換為：

```typescript
import type { PlanetCore } from '@gravito/core'
import type { FormRequestClass } from '@gravito/core'
import { fromGravitoContext } from '@/Shared/Presentation/IHttpContext'
import type {
  IModuleRouter,
  RouteHandler,
  Middleware,
} from '@/Shared/Presentation/IModuleRouter'

const FORM_REQUEST_SYMBOL = Symbol.for('gravito.formRequest')

function isFormRequestClass(value: unknown): value is FormRequestClass {
  if (typeof value !== 'function') return false
  if ((value as any)[FORM_REQUEST_SYMBOL] === true) return true
  if (value.prototype && typeof value.prototype.validate === 'function') return true
  return false
}

function runPipeline(middlewares: Middleware[], handler: RouteHandler): RouteHandler {
  return (ctx) => {
    let index = -1
    const dispatch = (i: number): Promise<Response> => {
      if (i <= index) return Promise.reject(new Error('next() called multiple times'))
      index = i
      if (i === middlewares.length) return handler(ctx)
      return middlewares[i](ctx, () => dispatch(i + 1))
    }
    return dispatch(0)
  }
}

function wrapHandler(handler: RouteHandler) {
  return (ctx: any) => handler(fromGravitoContext(ctx))
}

export function createGravitoModuleRouter(core: PlanetCore, prefix = ''): IModuleRouter {
  function register(method: 'get' | 'post' | 'put' | 'patch' | 'delete') {
    return (path: string, ...args: unknown[]) => {
      const fullPath = prefix + path
      const handler = args[args.length - 1] as RouteHandler
      const wrapped = wrapHandler(handler)

      // (path, FormRequest, handler)
      if (args.length === 2 && isFormRequestClass(args[0])) {
        core.router[method](fullPath, args[0] as FormRequestClass, wrapped)
        return
      }

      // (path, middlewares[], FormRequest, handler)
      if (args.length === 3 && Array.isArray(args[0]) && isFormRequestClass(args[1])) {
        const middlewares = args[0] as Middleware[]
        const formRequest = args[1] as FormRequestClass
        const pipeline = runPipeline(middlewares, (ctx) =>
          new Promise((resolve) => {
            // 將已通過 middleware 的請求交給 core.router 處理 FormRequest
            // 使用 pipeline wrapper 確保 middleware 先執行
            resolve(handler(ctx))
          }),
        )
        // 先跑 middleware pipeline，再讓 core 處理 FormRequest
        core.router[method](fullPath, formRequest, (ctx: any) =>
          pipeline(fromGravitoContext(ctx)),
        )
        return
      }

      // (path, handler) 或 (path, middlewares[], handler) — 現有邏輯
      const middlewares = args.length > 1 ? (args[0] as Middleware[]) : []
      const pipeline = runPipeline(middlewares, handler)
      core.router[method](fullPath, (ctx: any) => pipeline(fromGravitoContext(ctx)))
    }
  }

  return {
    get: register('get') as IModuleRouter['get'],
    post: register('post') as IModuleRouter['post'],
    put: register('put') as IModuleRouter['put'],
    patch: register('patch') as IModuleRouter['patch'],
    delete: register('delete') as IModuleRouter['delete'],
    head: (path, handler) => {
      core.router.get(prefix + path, (ctx: any) => handler(fromGravitoContext(ctx)))
    },
    options: (path, handler) => {
      const fullPath = prefix + path
      const r = core.router as any
      if (r.options && typeof r.options === 'function') {
        r.options(fullPath, (ctx: any) => handler(fromGravitoContext(ctx)))
      } else {
        r.get(fullPath, (ctx: any) => handler(fromGravitoContext(ctx)))
      }
    },
    group(groupPrefix, fn) {
      fn(createGravitoModuleRouter(core, prefix + groupPrefix))
    },
  }
}
```

- [ ] **Step 2: 執行型別檢查**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 3: 執行現有測試確保不破壞功能**

Run: `bun test`
Expected: 所有現有測試通過（此步只新增偵測邏輯，不改變現有路由行為）

- [ ] **Step 4: Commit**

```bash
git add src/Shared/Infrastructure/Framework/GravitoModuleRouter.ts
git commit -m "feat: [shared] GravitoModuleRouter 支援 FormRequest 偵測與透傳"
```

---

## Task 4: Auth 模組 — 建立 FormRequest 類別

**Files:**
- Create: `src/Modules/Auth/Presentation/Requests/LoginRequest.ts`
- Create: `src/Modules/Auth/Presentation/Requests/RegisterRequest.ts`
- Create: `src/Modules/Auth/Presentation/Requests/RefreshTokenRequest.ts`
- Create: `src/Modules/Auth/Presentation/Requests/index.ts`

- [ ] **Step 1: 建立 LoginRequest.ts**

```typescript
// src/Modules/Auth/Presentation/Requests/LoginRequest.ts
import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'

export class LoginRequest extends FormRequest {
  schema = z.object({
    email: z.string().email('電子郵件格式無效'),
    password: z.string().min(1, '密碼不能為空'),
  })
}

export type LoginParams = z.infer<LoginRequest['schema']>
```

- [ ] **Step 2: 建立 RegisterRequest.ts**

```typescript
// src/Modules/Auth/Presentation/Requests/RegisterRequest.ts
import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'

export class RegisterRequest extends FormRequest {
  schema = z.object({
    email: z.string().email('電子郵件格式無效'),
    password: z.string()
      .min(8, '密碼至少需要 8 個字符')
      .regex(/[A-Z]/, '密碼必須包含至少一個大寫字母')
      .regex(/[a-z]/, '密碼必須包含至少一個小寫字母')
      .regex(/[0-9]/, '密碼必須包含至少一個數字'),
    confirmPassword: z.string().optional(),
  }).refine((data) => {
    if (data.confirmPassword && data.password !== data.confirmPassword) return false
    return true
  }, { message: '密碼不匹配', path: ['confirmPassword'] })
}

export type RegisterParams = z.infer<RegisterRequest['schema']>
```

- [ ] **Step 3: 建立 RefreshTokenRequest.ts**

```typescript
// src/Modules/Auth/Presentation/Requests/RefreshTokenRequest.ts
import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'

export class RefreshTokenRequest extends FormRequest {
  schema = z.object({
    refreshToken: z.string().min(1, 'Refresh Token 不能為空'),
  })
}

export type RefreshTokenParams = z.infer<RefreshTokenRequest['schema']>
```

- [ ] **Step 4: 建立 index.ts**

```typescript
// src/Modules/Auth/Presentation/Requests/index.ts
export { LoginRequest, type LoginParams } from './LoginRequest'
export { RegisterRequest, type RegisterParams } from './RegisterRequest'
export { RefreshTokenRequest, type RefreshTokenParams } from './RefreshTokenRequest'
```

- [ ] **Step 5: 執行型別檢查**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/Modules/Auth/Presentation/Requests/
git commit -m "feat: [auth] 建立 FormRequest 驗證類別"
```

---

## Task 5: Auth 模組 — 遷移路由與 Controller

**Files:**
- Modify: `src/Modules/Auth/Presentation/Routes/auth.routes.ts`
- Modify: `src/Modules/Auth/Presentation/Controllers/AuthController.ts`
- Delete: `src/Modules/Auth/Presentation/Validators/login.validator.ts`
- Delete: `src/Modules/Auth/Presentation/Validators/register.validator.ts`
- Delete: `src/Modules/Auth/Presentation/Validators/index.ts`

- [ ] **Step 1: 更新路由掛載 FormRequest**

將 `src/Modules/Auth/Presentation/Routes/auth.routes.ts` 替換為：

```typescript
import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { AuthController } from '../Controllers/AuthController'
import { attachJwt } from '../Middleware/RoleMiddleware'
import { LoginRequest, RegisterRequest, RefreshTokenRequest } from '../Requests'

export async function registerAuthRoutes(router: IModuleRouter, controller: AuthController): Promise<void> {
  router.post('/api/auth/register', RegisterRequest, (ctx) => controller.register(ctx))
  router.post('/api/auth/login', LoginRequest, (ctx) => controller.login(ctx))
  router.post('/api/auth/refresh', RefreshTokenRequest, (ctx) => controller.refresh(ctx))
  router.post('/api/auth/logout', [attachJwt()], (ctx) => controller.logout(ctx))
}
```

- [ ] **Step 2: 簡化 AuthController**

更新 `src/Modules/Auth/Presentation/Controllers/AuthController.ts`，移除所有 safeParse 樣板。每個有驗證的方法改為直接取 `ctx.get('validated')`：

**register 方法** — 移除 `RegisterUserSchema` import 和 safeParse 區塊：
```typescript
async register(ctx: IHttpContext): Promise<Response> {
  const body = ctx.get('validated') as RegisterParams
  const result = await this.registerUserService.execute(body)
  return ctx.json(result, 201)
}
```

**login 方法** — 移除 `LoginSchema` import 和 safeParse 區塊：
```typescript
async login(ctx: IHttpContext): Promise<Response> {
  const body = ctx.get('validated') as LoginParams
  const result = await this.loginUserService.execute(body)
  if (!result.success) return ctx.json(result, 401)
  return ctx.json(result)
}
```

**refresh 方法** — 移除 `RefreshTokenSchema` import 和 safeParse 區塊：
```typescript
async refresh(ctx: IHttpContext): Promise<Response> {
  const body = ctx.get('validated') as RefreshTokenParams
  const result = await this.refreshTokenService.execute(body)
  if (!result.success) return ctx.json(result, 401)
  return ctx.json(result)
}
```

**logout 方法** — 不涉及 FormRequest 驗證，保持不變。

**import 更新** — 移除 `import { LoginSchema, ... } from '../Validators'`，加入 `import type { LoginParams, RegisterParams, RefreshTokenParams } from '../Requests'`。

- [ ] **Step 3: 刪除舊 Validators 資料夾**

```bash
rm -rf src/Modules/Auth/Presentation/Validators/
```

- [ ] **Step 4: 執行型別檢查**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 5: 執行測試**

Run: `bun test`
Expected: 所有測試通過（驗證失敗狀態碼可能從 400 變為 422，測試斷言待 Task 10 統一更新）

- [ ] **Step 6: Commit**

```bash
git add -A src/Modules/Auth/Presentation/
git commit -m "feat: [auth] 遷移至 FormRequest，移除手動 safeParse 樣板"
```

---

## Task 6: User 模組 — 建立 FormRequest 類別與 params

**Files:**
- Create: `src/Modules/User/Presentation/Requests/UpdateProfileRequest.ts`
- Create: `src/Modules/User/Presentation/Requests/ChangeStatusRequest.ts`
- Create: `src/Modules/User/Presentation/Requests/ListUsersRequest.ts`
- Create: `src/Modules/User/Presentation/Requests/params.ts`
- Create: `src/Modules/User/Presentation/Requests/index.ts`

- [ ] **Step 1: 建立 UpdateProfileRequest.ts**

```typescript
// src/Modules/User/Presentation/Requests/UpdateProfileRequest.ts
import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'

export class UpdateProfileRequest extends FormRequest {
  schema = z.object({
    displayName: z.string().min(1).max(50).optional(),
    avatarUrl: z.string().url().nullable().optional(),
    phone: z.string().regex(/^\+?[0-9\s-]{7,15}$/).nullable().optional(),
    bio: z.string().max(255).nullable().optional(),
    timezone: z.string().optional(),
    locale: z.string().optional(),
    notificationPreferences: z.record(z.string(), z.any()).optional(),
  })
}

export type UpdateProfileParams = z.infer<UpdateProfileRequest['schema']>
```

- [ ] **Step 2: 建立 ChangeStatusRequest.ts**

```typescript
// src/Modules/User/Presentation/Requests/ChangeStatusRequest.ts
import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'

export class ChangeStatusRequest extends FormRequest {
  schema = z.object({
    status: z.enum(['active', 'suspended'], { error: '無效的狀態值' }),
  })
}

export type ChangeStatusParams = z.infer<ChangeStatusRequest['schema']>
```

- [ ] **Step 3: 建立 ListUsersRequest.ts**

```typescript
// src/Modules/User/Presentation/Requests/ListUsersRequest.ts
import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'

export class ListUsersRequest extends FormRequest {
  source = 'query' as const

  schema = z.object({
    role: z.string().optional(),
    status: z.enum(['active', 'suspended']).optional(),
    keyword: z.string().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  })
}

export type ListUsersQueryParams = z.infer<ListUsersRequest['schema']>
```

- [ ] **Step 4: 建立 params.ts（路由參數 schema）**

```typescript
// src/Modules/User/Presentation/Requests/params.ts
import { z } from 'zod'

export const UserIdSchema = z.object({
  id: z.string().uuid('無效的使用者 ID'),
})

export type UserIdParams = z.infer<typeof UserIdSchema>
```

- [ ] **Step 5: 建立 index.ts**

```typescript
// src/Modules/User/Presentation/Requests/index.ts
export { UpdateProfileRequest, type UpdateProfileParams } from './UpdateProfileRequest'
export { ChangeStatusRequest, type ChangeStatusParams } from './ChangeStatusRequest'
export { ListUsersRequest, type ListUsersQueryParams } from './ListUsersRequest'
export { UserIdSchema, type UserIdParams } from './params'
```

- [ ] **Step 6: 執行型別檢查**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/Modules/User/Presentation/Requests/
git commit -m "feat: [user] 建立 FormRequest 驗證類別與路由參數 schema"
```

---

## Task 7: User 模組 — 遷移路由與 Controller

**Files:**
- Modify: `src/Modules/User/Presentation/Routes/user.routes.ts`
- Modify: `src/Modules/User/Presentation/Controllers/UserController.ts`
- Delete: `src/Modules/User/Presentation/Validators/updateProfile.validator.ts`
- Delete: `src/Modules/User/Presentation/Validators/changeStatus.validator.ts`
- Delete: `src/Modules/User/Presentation/Validators/listUsers.validator.ts`
- Delete: `src/Modules/User/Presentation/Validators/index.ts`

- [ ] **Step 1: 更新路由掛載 FormRequest**

將 `src/Modules/User/Presentation/Routes/user.routes.ts` 替換為：

```typescript
import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { UserController } from '../Controllers/UserController'
import { requireAuth, createRoleMiddleware } from '@/Modules/Auth/Presentation/Middleware/RoleMiddleware'
import { UpdateProfileRequest, ChangeStatusRequest, ListUsersRequest } from '../Requests'

export async function registerUserRoutes(router: IModuleRouter, controller: UserController): Promise<void> {
  router.get('/api/users/me',             [requireAuth()],                  (ctx) => controller.getMe(ctx))
  router.put('/api/users/me',             [requireAuth()], UpdateProfileRequest, (ctx) => controller.updateMe(ctx))
  router.get('/api/users',                [createRoleMiddleware('admin')], ListUsersRequest, (ctx) => controller.listUsers(ctx))
  router.get('/api/users/:id',            [createRoleMiddleware('admin')],   (ctx) => controller.getUser(ctx))
  router.patch('/api/users/:id/status',   [createRoleMiddleware('admin')], ChangeStatusRequest, (ctx) => controller.changeUserStatus(ctx))
}
```

- [ ] **Step 2: 簡化 UserController**

更新 `src/Modules/User/Presentation/Controllers/UserController.ts`：

**import 更新** — 移除 `import { UpdateUserProfileSchema, ... } from '../Validators'`，加入 `import type { UpdateProfileParams, ListUsersQueryParams, ChangeStatusParams } from '../Requests'` 和 `import { UserIdSchema, type UserIdParams } from '../Requests'`。

**updateMe 方法**：
```typescript
async updateMe(ctx: IHttpContext): Promise<Response> {
  const auth = AuthMiddleware.isAuthenticated(ctx)
  if (!auth) return ctx.json({ success: false, error: '未授權' }, 401)
  const body = ctx.get('validated') as UpdateProfileParams
  const result = await this.updateUserProfileService.execute(auth.userId, body)
  return ctx.json(result)
}
```

**listUsers 方法**：
```typescript
async listUsers(ctx: IHttpContext): Promise<Response> {
  const query = ctx.get('validated') as ListUsersQueryParams
  const result = await this.listUsersService.execute(query)
  return ctx.json(result)
}
```

**changeUserStatus 方法** — body 由 FormRequest 驗證，但 params 中的 `:id` 仍手動驗證：
```typescript
async changeUserStatus(ctx: IHttpContext): Promise<Response> {
  const paramValidation = UserIdSchema.safeParse({ id: ctx.getParam('id') })
  if (!paramValidation.success) {
    return ctx.json({ success: false, error: paramValidation.error.issues[0].message }, 400)
  }
  const body = ctx.get('validated') as ChangeStatusParams
  const result = await this.changeUserStatusService.execute(paramValidation.data.id, body)
  return ctx.json(result)
}
```

**getMe 方法** — 無 body 驗證，保持不變。

**getUser 方法** — 只有 param 驗證（UserIdSchema），保持不變但 import 改為從 `'../Requests'`。

- [ ] **Step 3: 刪除舊 Validators 資料夾**

```bash
rm -rf src/Modules/User/Presentation/Validators/
```

- [ ] **Step 4: 執行型別檢查**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 5: 執行測試**

Run: `bun test`
Expected: 通過（驗證失敗狀態碼待 Task 10 統一更新）

- [ ] **Step 6: Commit**

```bash
git add -A src/Modules/User/Presentation/
git commit -m "feat: [user] 遷移至 FormRequest，移除手動 safeParse 樣板"
```

---

## Task 8: Organization 模組 — 建立 FormRequest 類別與 params

**Files:**
- Create: `src/Modules/Organization/Presentation/Requests/CreateOrganizationRequest.ts`
- Create: `src/Modules/Organization/Presentation/Requests/UpdateOrganizationRequest.ts`
- Create: `src/Modules/Organization/Presentation/Requests/ChangeOrgStatusRequest.ts`
- Create: `src/Modules/Organization/Presentation/Requests/InviteMemberRequest.ts`
- Create: `src/Modules/Organization/Presentation/Requests/AcceptInvitationRequest.ts`
- Create: `src/Modules/Organization/Presentation/Requests/ChangeMemberRoleRequest.ts`
- Create: `src/Modules/Organization/Presentation/Requests/params.ts`
- Create: `src/Modules/Organization/Presentation/Requests/index.ts`

- [ ] **Step 1: 建立 CreateOrganizationRequest.ts**

```typescript
// src/Modules/Organization/Presentation/Requests/CreateOrganizationRequest.ts
import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'

export class CreateOrganizationRequest extends FormRequest {
  schema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(255).optional(),
    slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/).optional(),
    managerUserId: z.string().uuid('無效的用戶 ID'),
  })
}

export type CreateOrganizationParams = z.infer<CreateOrganizationRequest['schema']>
```

- [ ] **Step 2: 建立 UpdateOrganizationRequest.ts**

```typescript
// src/Modules/Organization/Presentation/Requests/UpdateOrganizationRequest.ts
import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'

export class UpdateOrganizationRequest extends FormRequest {
  schema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(255).optional(),
  })
}

export type UpdateOrganizationParams = z.infer<UpdateOrganizationRequest['schema']>
```

- [ ] **Step 3: 建立 ChangeOrgStatusRequest.ts**

```typescript
// src/Modules/Organization/Presentation/Requests/ChangeOrgStatusRequest.ts
import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'

export class ChangeOrgStatusRequest extends FormRequest {
  schema = z.object({
    status: z.enum(['active', 'suspended'], { error: '無效的狀態值' }),
  })
}

export type ChangeOrgStatusParams = z.infer<ChangeOrgStatusRequest['schema']>
```

- [ ] **Step 4: 建立 InviteMemberRequest.ts**

```typescript
// src/Modules/Organization/Presentation/Requests/InviteMemberRequest.ts
import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'

export class InviteMemberRequest extends FormRequest {
  schema = z.object({
    email: z.string().email('電子郵件格式無效'),
    role: z.string().optional(),
  })
}

export type InviteMemberParams = z.infer<InviteMemberRequest['schema']>
```

- [ ] **Step 5: 建立 AcceptInvitationRequest.ts**

```typescript
// src/Modules/Organization/Presentation/Requests/AcceptInvitationRequest.ts
import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'

export class AcceptInvitationRequest extends FormRequest {
  schema = z.object({
    token: z.string().min(1, 'Token 不能為空'),
  })
}

export type AcceptInvitationParams = z.infer<AcceptInvitationRequest['schema']>
```

- [ ] **Step 6: 建立 ChangeMemberRoleRequest.ts**

```typescript
// src/Modules/Organization/Presentation/Requests/ChangeMemberRoleRequest.ts
import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'

export class ChangeMemberRoleRequest extends FormRequest {
  schema = z.object({
    role: z.string().min(1, '角色不能為空'),
  })
}

export type ChangeMemberRoleParams = z.infer<ChangeMemberRoleRequest['schema']>
```

- [ ] **Step 7: 建立 params.ts（路由參數 schema）**

```typescript
// src/Modules/Organization/Presentation/Requests/params.ts
import { z } from 'zod'

export const OrganizationIdSchema = z.object({
  id: z.string().uuid('無效的組織 ID'),
})

export const OrganizationMemberParamsSchema = z.object({
  id: z.string().uuid('無效的組織 ID'),
  userId: z.string().uuid('無效的使用者 ID'),
})

export const OrganizationInvitationParamsSchema = z.object({
  id: z.string().uuid('無效的組織 ID'),
  invId: z.string().min(1, '邀請 ID 不能為空'),
})

export const OrganizationAuthHeaderSchema = z.object({
  organizationId: z.string().uuid('無效的組織 ID'),
})

export type OrganizationIdParams = z.infer<typeof OrganizationIdSchema>
export type OrganizationMemberParams = z.infer<typeof OrganizationMemberParamsSchema>
export type OrganizationInvitationParams = z.infer<typeof OrganizationInvitationParamsSchema>
export type OrganizationAuthHeaderParams = z.infer<typeof OrganizationAuthHeaderSchema>
```

- [ ] **Step 8: 建立 index.ts**

```typescript
// src/Modules/Organization/Presentation/Requests/index.ts
export { CreateOrganizationRequest, type CreateOrganizationParams } from './CreateOrganizationRequest'
export { UpdateOrganizationRequest, type UpdateOrganizationParams } from './UpdateOrganizationRequest'
export { ChangeOrgStatusRequest, type ChangeOrgStatusParams } from './ChangeOrgStatusRequest'
export { InviteMemberRequest, type InviteMemberParams } from './InviteMemberRequest'
export { AcceptInvitationRequest, type AcceptInvitationParams } from './AcceptInvitationRequest'
export { ChangeMemberRoleRequest, type ChangeMemberRoleParams } from './ChangeMemberRoleRequest'
export {
  OrganizationIdSchema,
  OrganizationMemberParamsSchema,
  OrganizationInvitationParamsSchema,
  OrganizationAuthHeaderSchema,
  type OrganizationIdParams,
  type OrganizationMemberParams,
  type OrganizationInvitationParams,
  type OrganizationAuthHeaderParams,
} from './params'
```

- [ ] **Step 9: 執行型別檢查**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add src/Modules/Organization/Presentation/Requests/
git commit -m "feat: [organization] 建立 FormRequest 驗證類別與路由參數 schema"
```

---

## Task 9: Organization 模組 — 遷移路由與 Controller

**Files:**
- Modify: `src/Modules/Organization/Presentation/Routes/organization.routes.ts`
- Modify: `src/Modules/Organization/Presentation/Controllers/OrganizationController.ts`
- Delete: `src/Modules/Organization/Presentation/Validators/organization.validator.ts`
- Delete: `src/Modules/Organization/Presentation/Validators/member.validator.ts`
- Delete: `src/Modules/Organization/Presentation/Validators/index.ts`

- [ ] **Step 1: 更新路由掛載 FormRequest**

將 `src/Modules/Organization/Presentation/Routes/organization.routes.ts` 替換為：

```typescript
import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { OrganizationController } from '../Controllers/OrganizationController'
import { requireAuth, createRoleMiddleware } from '@/Modules/Auth/Presentation/Middleware/RoleMiddleware'
import { requireOrganizationContext } from '../Middleware/OrganizationMiddleware'
import {
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  ChangeOrgStatusRequest,
  InviteMemberRequest,
  AcceptInvitationRequest,
  ChangeMemberRoleRequest,
} from '../Requests'

export async function registerOrganizationRoutes(router: IModuleRouter, controller: OrganizationController): Promise<void> {
  router.post  ('/api/organizations',                          [createRoleMiddleware('admin')], CreateOrganizationRequest, (ctx) => controller.create(ctx))
  router.get   ('/api/organizations',                          [createRoleMiddleware('admin')],                            (ctx) => controller.list(ctx))
  router.get   ('/api/organizations/:id',                      [requireOrganizationContext()],                             (ctx) => controller.get(ctx))
  router.put   ('/api/organizations/:id',                      [createRoleMiddleware('admin')], UpdateOrganizationRequest, (ctx) => controller.update(ctx))
  router.patch ('/api/organizations/:id/status',               [createRoleMiddleware('admin')], ChangeOrgStatusRequest,    (ctx) => controller.changeStatus(ctx))

  router.get   ('/api/organizations/:id/members',              [requireOrganizationContext()],                             (ctx) => controller.listMembers(ctx))
  router.post  ('/api/organizations/:id/invitations',          [requireOrganizationContext()], InviteMemberRequest,        (ctx) => controller.invite(ctx))
  router.get   ('/api/organizations/:id/invitations',          [requireOrganizationContext()],                             (ctx) => controller.listInvitations(ctx))
  router.delete('/api/organizations/:id/invitations/:invId',   [requireOrganizationContext()],                             (ctx) => controller.cancelInvitation(ctx))

  router.post  ('/api/invitations/:token/accept',              [requireAuth()], AcceptInvitationRequest,                   (ctx) => controller.acceptInvitation(ctx))

  router.delete('/api/organizations/:id/members/:userId',      [requireOrganizationContext()],                             (ctx) => controller.removeMember(ctx))
  router.patch ('/api/organizations/:id/members/:userId/role', [createRoleMiddleware('admin'), requireOrganizationContext()], ChangeMemberRoleRequest, (ctx) => controller.changeMemberRole(ctx))
}
```

- [ ] **Step 2: 簡化 OrganizationController**

更新 `src/Modules/Organization/Presentation/Controllers/OrganizationController.ts`：

**import 更新** — 移除 `import { CreateOrganizationSchema, ... } from '../Validators'`，加入：
```typescript
import type {
  CreateOrganizationParams,
  UpdateOrganizationParams,
  ChangeOrgStatusParams,
  InviteMemberParams,
  AcceptInvitationParams,
  ChangeMemberRoleParams,
} from '../Requests'
import {
  OrganizationIdSchema,
  OrganizationMemberParamsSchema,
  OrganizationInvitationParamsSchema,
} from '../Requests'
```

**保留不變** — `resolveCurrentOrganizationId`、`validateOrganizationId`、`validateOrganizationMemberParams`、`validateInvitationParams` 這些輔助函數保持原樣，只更新 import 來源。

**有 body 驗證的方法改為 `ctx.get('validated')`**：

`create` 方法：
```typescript
async create(ctx: IHttpContext): Promise<Response> {
  const body = ctx.get('validated') as CreateOrganizationParams
  const result = await this.createOrgService.execute(body)
  return ctx.json(result, 201)
}
```

`update` 方法：
```typescript
async update(ctx: IHttpContext): Promise<Response> {
  const orgId = validateOrganizationId(ctx)
  if (orgId instanceof Response) return orgId
  const body = ctx.get('validated') as UpdateOrganizationParams
  const result = await this.updateOrgService.execute(orgId.id, body)
  return ctx.json(result)
}
```

`changeStatus` 方法：
```typescript
async changeStatus(ctx: IHttpContext): Promise<Response> {
  const orgId = validateOrganizationId(ctx)
  if (orgId instanceof Response) return orgId
  const body = ctx.get('validated') as ChangeOrgStatusParams
  const result = await this.changeOrgStatusService.execute(orgId.id, body)
  return ctx.json(result)
}
```

`invite` 方法：
```typescript
async invite(ctx: IHttpContext): Promise<Response> {
  const orgId = resolveCurrentOrganizationId(ctx)
  if (!orgId) return ctx.json({ success: false, error: '缺少組織 ID' }, 400)
  const body = ctx.get('validated') as InviteMemberParams
  const result = await this.inviteMemberService.execute(orgId, body)
  return ctx.json(result, 201)
}
```

`acceptInvitation` 方法：
```typescript
async acceptInvitation(ctx: IHttpContext): Promise<Response> {
  const auth = AuthMiddleware.isAuthenticated(ctx)
  if (!auth) return ctx.json({ success: false, error: '未授權' }, 401)
  const body = ctx.get('validated') as AcceptInvitationParams
  const result = await this.acceptInvitationService.execute(auth.userId, body.token)
  return ctx.json(result)
}
```

`changeMemberRole` 方法：
```typescript
async changeMemberRole(ctx: IHttpContext): Promise<Response> {
  const params = validateOrganizationMemberParams(ctx)
  if (params instanceof Response) return params
  const body = ctx.get('validated') as ChangeMemberRoleParams
  const result = await this.changeRoleService.execute(params.id, params.userId, body)
  return ctx.json(result)
}
```

**無 body 驗證的方法保持不變**：`list`、`get`、`listMembers`、`listInvitations`、`cancelInvitation`、`removeMember`。

- [ ] **Step 3: 刪除舊 Validators 資料夾**

```bash
rm -rf src/Modules/Organization/Presentation/Validators/
```

- [ ] **Step 4: 執行型別檢查**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 5: 執行測試**

Run: `bun test`
Expected: 通過（驗證狀態碼待 Task 10 統一更新）

- [ ] **Step 6: Commit**

```bash
git add -A src/Modules/Organization/Presentation/
git commit -m "feat: [organization] 遷移至 FormRequest，移除手動 safeParse 樣板"
```

---

## Task 10: Credit 模組 — 建立 FormRequest 類別、遷移路由與 Controller

**Files:**
- Create: `src/Modules/Credit/Presentation/Requests/TopUpRequest.ts`
- Create: `src/Modules/Credit/Presentation/Requests/RefundRequest.ts`
- Create: `src/Modules/Credit/Presentation/Requests/index.ts`
- Modify: `src/Modules/Credit/Presentation/Routes/credit.routes.ts`
- Modify: `src/Modules/Credit/Presentation/Controllers/CreditController.ts`
- Delete: `src/Modules/Credit/Presentation/Validators/credit.validator.ts`

- [ ] **Step 1: 建立 TopUpRequest.ts**

```typescript
// src/Modules/Credit/Presentation/Requests/TopUpRequest.ts
import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'

export class TopUpRequest extends FormRequest {
  schema = z.object({
    amount: z.string().refine(
      (val) => { const n = parseFloat(val); return !isNaN(n) && n > 0 },
      { message: '金額必須為正數' },
    ),
    description: z.string().optional(),
  })
}

export type TopUpParams = z.infer<TopUpRequest['schema']>
```

- [ ] **Step 2: 建立 RefundRequest.ts**

```typescript
// src/Modules/Credit/Presentation/Requests/RefundRequest.ts
import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'

export class RefundRequest extends FormRequest {
  schema = z.object({
    amount: z.string().refine(
      (val) => { const n = parseFloat(val); return !isNaN(n) && n > 0 },
      { message: '退款金額必須為正數' },
    ),
    referenceType: z.string().min(1, '參考類型為必填'),
    referenceId: z.string().min(1, '參考 ID 為必填'),
    description: z.string().optional(),
  })
}

export type RefundParams = z.infer<RefundRequest['schema']>
```

- [ ] **Step 3: 建立 index.ts**

```typescript
// src/Modules/Credit/Presentation/Requests/index.ts
export { TopUpRequest, type TopUpParams } from './TopUpRequest'
export { RefundRequest, type RefundParams } from './RefundRequest'
```

- [ ] **Step 4: 更新路由掛載 FormRequest**

將 `src/Modules/Credit/Presentation/Routes/credit.routes.ts` 替換為：

```typescript
import type { IModuleRouter } from '@/Shared/Presentation/IModuleRouter'
import type { CreditController } from '../Controllers/CreditController'
import { requireAuth, createRoleMiddleware } from '@/Modules/Auth/Presentation/Middleware/RoleMiddleware'
import { TopUpRequest, RefundRequest } from '../Requests'

export function registerCreditRoutes(router: IModuleRouter, controller: CreditController): void {
  router.get ('/api/organizations/:orgId/credits/balance',      [requireAuth()],                                 (ctx) => controller.getBalance(ctx))
  router.get ('/api/organizations/:orgId/credits/transactions', [requireAuth()],                                 (ctx) => controller.getTransactions(ctx))
  router.post('/api/organizations/:orgId/credits/topup',        [requireAuth(), createRoleMiddleware('admin')], TopUpRequest,  (ctx) => controller.topUp(ctx))
  router.post('/api/organizations/:orgId/credits/refund',       [requireAuth(), createRoleMiddleware('admin')], RefundRequest, (ctx) => controller.refund(ctx))
}
```

- [ ] **Step 5: 簡化 CreditController**

更新 `src/Modules/Credit/Presentation/Controllers/CreditController.ts`：

**import 加入**：`import type { TopUpParams, RefundParams } from '../Requests'`

**topUp 方法** — 原本沒有驗證，現在有了：
```typescript
async topUp(ctx: IHttpContext): Promise<Response> {
  const auth = AuthMiddleware.isAuthenticated(ctx)
  if (!auth) return ctx.json({ success: false, error: '未授權' }, 401)
  const orgId = ctx.getParam('orgId')
  if (!orgId) return ctx.json({ success: false, error: '缺少組織 ID' }, 400)
  const body = ctx.get('validated') as TopUpParams
  const result = await this.topUpService.execute({
    organizationId: orgId,
    amount: body.amount,
    description: body.description,
    callerUserId: auth.userId,
    callerSystemRole: auth.role,
  })
  return ctx.json(result)
}
```

**refund 方法** — 原本沒有驗證，現在有了：
```typescript
async refund(ctx: IHttpContext): Promise<Response> {
  const auth = AuthMiddleware.isAuthenticated(ctx)
  if (!auth) return ctx.json({ success: false, error: '未授權' }, 401)
  const orgId = ctx.getParam('orgId')
  if (!orgId) return ctx.json({ success: false, error: '缺少組織 ID' }, 400)
  const body = ctx.get('validated') as RefundParams
  const result = await this.refundService.execute({
    organizationId: orgId,
    amount: body.amount,
    referenceType: body.referenceType,
    referenceId: body.referenceId,
    description: body.description,
    callerUserId: auth.userId,
    callerSystemRole: auth.role,
  })
  return ctx.json(result)
}
```

**getBalance、getTransactions** — 無 body 驗證，保持不變。

- [ ] **Step 6: 刪除舊 Validators 檔案**

```bash
rm -rf src/Modules/Credit/Presentation/Validators/
```

- [ ] **Step 7: 執行型別檢查**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 8: 執行測試**

Run: `bun test`
Expected: 通過

- [ ] **Step 9: Commit**

```bash
git add -A src/Modules/Credit/Presentation/
git commit -m "feat: [credit] 遷移至 FormRequest，新增 TopUp/Refund 驗證"
```

---

## Task 11: 更新測試與 OpenAPI 合約（400 → 422）

**Files:**
- Modify: `tests/Feature/api-spec.test.ts`
- Modify: `docs/openapi.yaml`

- [ ] **Step 1: 更新 api-spec.test.ts 中的驗證失敗狀態碼**

搜尋 `tests/Feature/api-spec.test.ts` 中所有與表單驗證相關的 `400` 斷言，改為 `422`。

具體位置（第 209-214 行附近）：
```typescript
// Before
it('缺少必填欄位回傳 400', async () => {
  // ...
  expect(res.status).toBe(400)
})

// After
it('缺少必填欄位回傳 422', async () => {
  // ...
  expect(res.status).toBe(422)
})
```

注意：只更新**表單驗證**相關的 400。其他 400（如缺少 param、業務邏輯錯誤）不應改動。區分方式：只有當 400 是因為 body/query schema 驗證失敗才改為 422。

同樣檢查 `tests/Feature/api-parity.test.ts`，若有驗證相關的 400 斷言也需更新為 422。

- [ ] **Step 2: 更新 openapi.yaml 中的驗證失敗回應**

搜尋 `docs/openapi.yaml` 中的 `'400'` 回應定義，將表單驗證相關的改為 `'422'`：

```yaml
# Before
'400':
  description: Validation error

# After
'422':
  description: Validation error - Unprocessable Entity
```

- [ ] **Step 3: 執行完整測試套件**

Run: `bun test`
Expected: 所有測試通過

- [ ] **Step 4: 執行型別檢查和 lint**

Run: `bun run typecheck && bun run lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/Feature/api-spec.test.ts tests/Feature/api-parity.test.ts docs/openapi.yaml
git commit -m "fix: 驗證失敗狀態碼從 400 更新為 422（Unprocessable Entity）"
```

---

## Task 12: 最終驗證

- [ ] **Step 1: 執行完整品質檢查**

Run: `bun run check`
Expected: typecheck + lint + test 全部通過

- [ ] **Step 2: 確認無殘留的 Validators import**

```bash
cd /Users/carl/Dev/CMG/Draupnir && grep -r "from.*Validators" src/Modules/ --include="*.ts"
```

Expected: 無結果（所有 Validators import 都已移除）

- [ ] **Step 3: 確認無殘留的 safeParse 呼叫**

```bash
cd /Users/carl/Dev/CMG/Draupnir && grep -r "safeParse" src/Modules/*/Presentation/Controllers/ --include="*.ts"
```

Expected: 無結果（所有 Controller 中的 safeParse 都已移除）

- [ ] **Step 4: 確認 Validators 資料夾已全部刪除**

```bash
ls -d src/Modules/*/Presentation/Validators/ 2>&1
```

Expected: 全部 "No such file or directory"

- [ ] **Step 5: Commit（如有遺漏修正）**

```bash
git add -A
git commit -m "chore: 清理遺留的 Validators 引用與 safeParse 呼叫"
```
