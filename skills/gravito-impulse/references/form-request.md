# FormRequest

`FormRequest` 是 `@gravito/impulse` 的核心抽象，封裝「從 HTTP 請求中取出資料 → 驗證 → 提供給 Controller」的完整流程。

## 基本用法

```typescript
import { FormRequest, z } from '@gravito/impulse'

export class CreateUserRequest extends FormRequest {
  schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
  })
}

export type CreateUserParams = z.infer<CreateUserRequest['schema']>
```

## 資料來源 `source`

`source` 決定從請求的哪個部分取出資料，預設為 `'json'`。

| 值 | 取自 | 適用場景 |
|---|---|---|
| `'json'` | 請求 body（JSON） | POST / PUT / PATCH |
| `'form'` | FormData | multipart/form-data 表單 |
| `'query'` | URL query string | GET 篩選 / 分頁 |
| `'param'` | 路由參數 | `:id`、`:slug` 等 |

```typescript
export class ListUsersRequest extends FormRequest {
  source = 'query' as const   // ← 必須加 as const
  schema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
}
```

## 生命週期 hooks（皆為選用）

### `authorize(ctx)`

在驗證之前執行，回傳 `false` 則拋出 `AuthorizationException`（HTTP 403）。

```typescript
export class AdminOnlyRequest extends FormRequest {
  schema = z.object({ name: z.string() })

  async authorize(ctx: Context): Promise<boolean> {
    const user = ctx.get('user')
    return user?.role === 'admin'
  }

  authorizationMessage() {
    return '僅限管理員操作'
  }
}
```

`authorizationMessage()` 為選用的可覆寫方法，回傳型別為 `string`，其內容會出現在 403 錯誤回應的 `message` 欄位。若未覆寫，框架將使用預設訊息。

### `transform(data)`

在驗證之前對原始資料做預處理。執行順序：`transform → validate`。

```typescript
export class CreateTagRequest extends FormRequest {
  schema = z.object({ name: z.string() })

  transform(data: unknown) {
    const d = data as Record<string, unknown>
    return { ...d, name: (d.name as string)?.toLowerCase().trim() }
  }
}
```

### `messages()`

覆寫特定欄位或錯誤代碼的訊息。Key 格式：`'field.code'` 或 `'field'`。

```typescript
messages() {
  return {
    'email.invalid_string': 'Email 格式不正確',
    'password': '密碼欄位有誤',
  }
}
```

### `redirect()`

SSR 模式下，驗證失敗時要跳轉的 URL（非 API 用）。

```typescript
redirect() {
  return '/forms/create'
}
```

> **注意**：非 SSR（API）模式下，驗證失敗不會執行跳轉，框架改為回傳 HTTP 422 並在 response body 附帶錯誤詳情。`redirect()` 僅在 SSR 渲染情境下生效。

## 在 Controller 中取得已驗證資料

`@gravito/impulse` 與 `@gravito/core` 搭配使用。`GravitoContext` 來自 `@gravito/core`（HTTP 框架層），`@gravito/impulse` 在驗證通過後將結果寫入 `ctx`。

框架在驗證通過後將結果寫入 `ctx` 的 `'validated'` 欄位：

```typescript
import type { GravitoContext } from '@gravito/core'
import type { CreateUserParams } from '../Requests/CreateUserRequest'

async create(ctx: GravitoContext): Promise<Response> {
  const body = ctx.get('validated') as CreateUserParams
  // body.name, body.email 均已通過驗證
}
```

## 直接呼叫 `validate(ctx)`

不透過框架路由自動驗證時，可手動呼叫：

```typescript
const request = new CreateUserRequest()
const result = await request.validate(ctx)

if (!result.success) {
  return ctx.json({ errors: result.errors }, 422)
  // result.errors 的結構
  // Array<{ field: string; message: string; code?: string }>
}

const data = result.data  // 已驗證的資料
```

## 常見錯誤

- ❌ `source = 'query'`（沒有 `as const`）— TypeScript 會推斷為 `string` 而非字面型別，導致型別錯誤。
- ❌ 在 `query` / `param` 來源使用數字 schema 但不加 `z.coerce` — query string 永遠是字串，需轉型。
- ❌ `transform` 改變欄位結構後忘記同步調整 schema — `transform` 先執行，結果再交給 schema 驗證。
