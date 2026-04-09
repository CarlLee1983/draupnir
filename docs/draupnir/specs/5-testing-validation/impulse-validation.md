# @gravito/impulse 表單驗證整合設計

## 目標

將 Draupnir 目前散落在各 Controller 中的手動 Zod `safeParse` 驗證樣板，遷移至 `@gravito/impulse` 的 `FormRequest` 類別，統一驗證流程並消除重複程式碼。

## 決策記錄

- **遷移策略**：一次性遷移所有模組（Auth、User、Organization、Credit）
- **檔案策略**：`Validators/` 資料夾全部取代為 `Requests/`，舊檔案刪除。但 Controller 內使用的路由參數 schema（如 `UserIdSchema`、`OrganizationIdSchema`、`OrganizationMemberParamsSchema`）搬到對應模組的 `Requests/params.ts` 中保留
- **路由參數驗證**：保留在 Controller 內（如 `validateOrganizationId()`），FormRequest 只負責 body/query。參數 schema 從 `Validators/` 遷至 `Requests/params.ts`，Controller import 路徑需更新
- **整合方式**：方案 A — 直接路由掛載，利用 `core.router` 原生 FormRequest 支援
- **錯誤狀態碼**：接受 422（Unprocessable Entity），取代目前的 400

## 核心問題：IModuleRouter 抽象層

`@gravito/core` 的 Router 已原生支援 FormRequest，但 Draupnir 的 `IModuleRouter` 介面沒有對應的 overload。`GravitoModuleRouter` 將所有請求壓成 middleware pipeline 後交給 core router，繞過了原生 FormRequest 偵測。

### 解法

1. 在 `IModuleRouter` 介面加入 FormRequest overloads
2. 在 `GravitoModuleRouter` 中偵測 FormRequest class，直接透傳給 `core.router`

## 架構改動

### 1. IModuleRouter 介面擴展

每個 HTTP 方法加入兩個新 overload：

```typescript
import type { FormRequestClass } from '@gravito/impulse'

export interface IModuleRouter {
  // 現有
  post(path: string, handler: RouteHandler): void
  post(path: string, middlewares: Middleware[], handler: RouteHandler): void
  // 新增
  post(path: string, formRequest: FormRequestClass, handler: RouteHandler): void
  post(path: string, middlewares: Middleware[], formRequest: FormRequestClass, handler: RouteHandler): void
  // get, put, patch, delete 同理
}
```

### 2. GravitoModuleRouter 偵測邏輯

在 `register()` 函數中，偵測 `args[0]` 或 `args[1]` 是否為 FormRequest class（透過 `FORM_REQUEST_SYMBOL` 或 prototype 的 `validate` 方法）。若偵測到：

- `(path, FormRequest, handler)` — 直接呼叫 `core.router[method](fullPath, FormRequest, wrappedHandler)`
- `(path, middlewares[], FormRequest, handler)` — 先透過 `runPipeline` 執行 middlewares，再讓 core router 處理 FormRequest

### 3. FormRequest 類別結構

每個 Request 類別繼承 `FormRequest`，內嵌 Zod schema：

```typescript
import { FormRequest } from '@gravito/impulse'
import { z } from 'zod'

export class LoginRequest extends FormRequest {
  schema = z.object({
    email: z.string().email('請輸入有效的電子郵件'),
    password: z.string().min(1, '密碼不得為空'),
  })
}
```

命名慣例：`{Action}Request.ts`。每個模組的 `Requests/index.ts` 作為 barrel export。

### 4. 路由掛載

```typescript
import { LoginRequest, RegisterRequest } from '../Requests'

router.post('/api/auth/login', LoginRequest, (ctx) => controller.login(ctx))
router.post('/api/auth/register', RegisterRequest, (ctx) => controller.register(ctx))

// middleware + FormRequest 共存（保留原有的權限 middleware）
router.post('/api/organizations', [requireAuth(), createRoleMiddleware('admin')], CreateOrganizationRequest, (ctx) => controller.create(ctx))
```

### 5. Controller 簡化

移除所有 `safeParse` 樣板，改用 `ctx.get('validated')`：

```typescript
// Before
async login(ctx: IHttpContext) {
  const body = ctx.getJsonBody()
  const validation = LoginSchema.safeParse(body)
  if (!validation.success) {
    return ctx.json({ success: false, message: '驗證失敗', error: validation.error.issues[0].message }, 400)
  }
  const result = await this.authService.login(validation.data)
  return ctx.json(result)
}

// After
async login(ctx: IHttpContext) {
  const data = ctx.get('validated')
  const result = await this.authService.login(data)
  return ctx.json(result)
}
```

## 錯誤回應

驗證失敗由 `@gravito/core` 的 `RequestValidator` 處理，回傳 `422 Unprocessable Entity`。授權失敗（`authorize()` 回傳 false）回傳 `403 Forbidden`。

需同步更新的驗證狀態碼相關檔案：
- Feature tests 中斷言 `400` 狀態碼的測試 → 更新為 `422`
- `docs/openapi.yaml` 中所有驗證失敗的回應定義 → 400 改為 422
- `tests/Feature/api-spec.test.ts` 和 `tests/Feature/api-parity.test.ts` 中的狀態碼斷言 → 同步更新

## 新增檔案

| 檔案 | 說明 |
|------|------|
| `src/Modules/Auth/Presentation/Requests/LoginRequest.ts` | 登入驗證 |
| `src/Modules/Auth/Presentation/Requests/RegisterRequest.ts` | 註冊驗證 |
| `src/Modules/Auth/Presentation/Requests/RefreshTokenRequest.ts` | Token 刷新 |
| `src/Modules/Auth/Presentation/Requests/index.ts` | barrel export |
| `src/Modules/User/Presentation/Requests/UpdateProfileRequest.ts` | 更新個人資料 |
| `src/Modules/User/Presentation/Requests/ChangeStatusRequest.ts` | 變更使用者狀態 |
| `src/Modules/User/Presentation/Requests/ListUsersRequest.ts` | 列表查詢參數 |
| `src/Modules/User/Presentation/Requests/params.ts` | 路由參數 schema（UserIdSchema） |
| `src/Modules/User/Presentation/Requests/index.ts` | barrel export |
| `src/Modules/Organization/Presentation/Requests/CreateOrganizationRequest.ts` | 建立組織 |
| `src/Modules/Organization/Presentation/Requests/UpdateOrganizationRequest.ts` | 更新組織 |
| `src/Modules/Organization/Presentation/Requests/MemberRequest.ts` | 成員操作 |
| `src/Modules/Organization/Presentation/Requests/params.ts` | 路由參數 schema（OrganizationIdSchema、OrganizationMemberParamsSchema 等） |
| `src/Modules/Organization/Presentation/Requests/index.ts` | barrel export |
| `src/Modules/Credit/Presentation/Requests/TopUpRequest.ts` | 儲值驗證 |
| `src/Modules/Credit/Presentation/Requests/index.ts` | barrel export |

## 修改檔案

- `src/Shared/Presentation/IModuleRouter.ts` — 加入 FormRequest overloads
- `src/Shared/Infrastructure/Framework/GravitoModuleRouter.ts` — 偵測並透傳 FormRequest
- `src/Modules/Auth/Presentation/Routes/auth.routes.ts` — 掛載 FormRequest
- `src/Modules/User/Presentation/Routes/user.routes.ts` — 掛載 FormRequest
- `src/Modules/Organization/Presentation/Routes/organization.routes.ts` — 掛載 FormRequest
- `src/Modules/Credit/Presentation/Routes/credit.routes.ts` — 掛載 FormRequest
- `src/Modules/Auth/Presentation/Controllers/AuthController.ts` — 移除 safeParse 樣板
- `src/Modules/User/Presentation/Controllers/UserController.ts` — 移除 safeParse 樣板
- `src/Modules/Organization/Presentation/Controllers/OrganizationController.ts` — 移除 safeParse 樣板
- `src/Modules/Credit/Presentation/Controllers/CreditController.ts` — 移除 safeParse 樣板
- `docs/openapi.yaml` — 驗證失敗回應 400 → 422
- `tests/Feature/api-spec.test.ts` — 狀態碼斷言 400 → 422
- `tests/Feature/api-parity.test.ts` — 狀態碼斷言 400 → 422
- 其他 Feature tests — 400 → 422 狀態碼斷言更新

## 刪除檔案

- `src/Modules/Auth/Presentation/Validators/` 下所有檔案
- `src/Modules/User/Presentation/Validators/` 下所有檔案
- `src/Modules/Organization/Presentation/Validators/` 下所有檔案
- `src/Modules/Credit/Presentation/Validators/` 下所有檔案

## 型別安全

`ctx.get('validated')` 回傳 `unknown`。在 Controller 中使用時，透過 Zod 的 `z.infer` 搭配 FormRequest 的 schema 取得型別：

```typescript
import type { z } from 'zod'
import type { LoginRequest } from '../Requests'

// 在 Controller 方法中
const data = ctx.get('validated') as z.infer<LoginRequest['schema']>
```

或者在每個 FormRequest 類別中 export 推導型別：

```typescript
export class LoginRequest extends FormRequest {
  schema = z.object({ ... })
}
export type LoginParams = z.infer<LoginRequest['schema']>
```

Controller 使用時：`const data = ctx.get('validated') as LoginParams`

## 不變的部分

- Controller 內的路由參數驗證函數（Organization 模組的 `validateOrganizationId()` 等）
- Service 層的業務邏輯驗證
- `AuthMiddleware` 及其他現有 middleware
- Domain 層、Application 層完全不受影響
