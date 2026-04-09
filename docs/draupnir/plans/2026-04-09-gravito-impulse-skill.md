# gravito-impulse Skill 實作計劃

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 `skills/gravito-impulse/` skill，涵蓋 `@gravito/impulse` 套件的完整 API——FormRequest 生命週期、Zod schema、SchemaCache 初始化、進階工具——供任何使用該套件的專案查閱，不含專案特定架構假設。

**Architecture:** 一個 `SKILL.md` 作為入口（決策樹 + 快速範例），四個 `references/` 檔案按主題分拆（setup、form-request、zod、advanced），讓 Claude 只讀取與當前任務相關的部分。

**Tech Stack:** `@gravito/impulse 2.x`, Zod, `@gravito/core` GravitoContext

---

## 檔案結構

```
skills/gravito-impulse/
├── SKILL.md                      (新建) 入口：決策樹、API surfaces 總覽、快速範例
└── references/
    ├── setup.md                  (新建) 初始化：SchemaCache、ZodValidator、Impulse.clearAllCaches
    ├── form-request.md           (新建) FormRequest 完整生命週期：source、hooks、validate、ctx.get
    ├── zod.md                    (新建) Zod 常用 schema patterns（re-export 自 impulse）
    └── advanced.md               (新建) validateRequest middleware、DataExtractor、BlueprintGenerator
```

---

## Task 1：建立 `references/setup.md`

**Files:**
- Create: `skills/gravito-impulse/references/setup.md`

- [ ] **Step 1：建立檔案並寫入內容**

```markdown
# Setup

`@gravito/impulse` 需要在應用程式啟動時完成一次性初始化，才能讓 `FormRequest` 的驗證系統正常運作。

## 安裝

```bash
npm install @gravito/impulse
# 或
bun add @gravito/impulse
```

## 初始化（必要）

在應用程式入口呼叫，執行一次即可：

```typescript
import { SchemaCache, ZodValidator } from '@gravito/impulse'

SchemaCache.registerValidators([new ZodValidator()])
```

若使用 Valibot：

```typescript
import { SchemaCache, ValibotValidator } from '@gravito/impulse'

SchemaCache.registerValidators([new ValibotValidator()])
```

同時使用兩種驗證器：

```typescript
SchemaCache.registerValidators([new ZodValidator(), new ValibotValidator()])
```

`SchemaCache` 使用 `WeakMap` 快取 schema → validator 的對應，避免重複解析開銷。

## HMR / 開發模式下清除快取

Hot Module Replacement 重載模組後，舊的 FormRequest 實例和 schema 編譯快取可能殘留。呼叫：

```typescript
import { Impulse } from '@gravito/impulse'

Impulse.clearAllCaches()
```

強制重新實例化所有 `FormRequest` 並重新編譯 schema。通常放在 HMR handler 或 dev server hook 中。
```

- [ ] **Step 2：確認檔案內容完整，commit**

```bash
git add skills/gravito-impulse/references/setup.md
git commit -m "docs: [gravito-impulse] 新增 setup 參考文件"
```

---

## Task 2：建立 `references/form-request.md`

**Files:**
- Create: `skills/gravito-impulse/references/form-request.md`

- [ ] **Step 1：建立檔案並寫入內容**

```markdown
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
  schema = z.object({ ... })

  async authorize(ctx: Context): Promise<boolean> {
    const user = ctx.get('user')
    return user?.role === 'admin'
  }

  authorizationMessage() {
    return '僅限管理員操作'
  }
}
```

### `transform(data)`

在驗證之前對原始資料做預處理。

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

## 在 Controller 中取得已驗證資料

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
}

const data = result.data  // 已驗證的資料
```

## 常見錯誤

- ❌ `source = 'query'`（沒有 `as const`）— TypeScript 會推斷為 `string` 而非字面型別，導致型別錯誤。
- ❌ 在 `query` / `param` 來源使用數字 schema 但不加 `z.coerce` — query string 永遠是字串，需轉型。
- ❌ 同一個 `FormRequest` 子類既繼承 `schema` 又在 `transform` 中改變結構——schema 先驗證，transform 先執行，順序是 `transform → validate`，需確保 transform 後的形狀符合 schema。
```

- [ ] **Step 2：確認檔案內容完整，commit**

```bash
git add skills/gravito-impulse/references/form-request.md
git commit -m "docs: [gravito-impulse] 新增 FormRequest 參考文件"
```

---

## Task 3：建立 `references/zod.md`

**Files:**
- Create: `skills/gravito-impulse/references/zod.md`

- [ ] **Step 1：建立檔案並寫入內容**

```markdown
# Zod（via @gravito/impulse）

`@gravito/impulse` 重新匯出 Zod，無需單獨安裝：

```typescript
import { z } from '@gravito/impulse'
// 等同於 import { z } from 'zod'
```

## 型別推導

```typescript
import { z } from '@gravito/impulse'
import type { FormRequest } from '@gravito/impulse'

export class CreateOrderRequest extends FormRequest {
  schema = z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1),
  })
}

// 推導出請求體型別
export type CreateOrderParams = z.infer<CreateOrderRequest['schema']>
// { productId: string; quantity: number }
```

## 常用 schema 模式

### 字串

```typescript
z.string()
z.string().min(1, '必填')
z.string().max(255)
z.string().email('Email 格式錯誤')
z.string().uuid('UUID 格式錯誤')
z.string().url()
z.string().regex(/^[a-z0-9-]+$/, '只允許小寫字母、數字、連字號')
z.string().optional()         // string | undefined
z.string().nullable()         // string | null
z.string().default('active')
```

### 數字

```typescript
z.number()
z.number().int()
z.number().min(0).max(100)
z.coerce.number()             // 從字串轉換（query string 必用）
z.coerce.number().int().min(1).default(1)
```

### 列舉

```typescript
z.enum(['active', 'inactive', 'pending'])
// 型別：'active' | 'inactive' | 'pending'
```

### 陣列

```typescript
z.array(z.string())
z.array(z.string()).min(1, '至少一個元素')
z.array(z.string().uuid())
```

### 巢狀物件

```typescript
z.object({
  terms: z.object({
    creditQuota: z.number().min(0),
    validityPeriod: z.object({
      startDate: z.string().min(1),
      endDate: z.string().min(1),
    }),
  }),
})
```

### 選用欄位

```typescript
z.object({
  name: z.string().min(1),
  description: z.string().max(255).optional(),  // 可省略
  slug: z.string().optional(),
})
```

### 共用 schema（params、header）

路由參數或 header 若多個 Request 共用，可抽成獨立 schema：

```typescript
// params.ts
export const UserIdSchema = z.object({
  id: z.string().uuid('無效的使用者 ID'),
})
export type UserIdParams = z.infer<typeof UserIdSchema>

// 在 FormRequest 中使用
export class GetUserRequest extends FormRequest {
  source = 'param' as const
  schema = UserIdSchema
}
```

## 驗證失敗的錯誤格式

Impulse 將 Zod 錯誤轉換為統一格式：

```typescript
interface ValidationErrorDetail {
  field: string
  message: string
  code?: string
}

interface ValidationErrorResponse {
  message: string
  errors: ValidationErrorDetail[]
}
```

HTTP 回應狀態碼為 **422 Unprocessable Entity**。
```

- [ ] **Step 2：確認檔案內容完整，commit**

```bash
git add skills/gravito-impulse/references/zod.md
git commit -m "docs: [gravito-impulse] 新增 Zod schema 參考文件"
```

---

## Task 4：建立 `references/advanced.md`

**Files:**
- Create: `skills/gravito-impulse/references/advanced.md`

- [ ] **Step 1：建立檔案並寫入內容**

```markdown
# 進階工具

## `validateRequest` middleware

`validateRequest` 將 `FormRequest` 包裝成 Gravito middleware，可直接插入路由中間件鏈：

```typescript
import { validateRequest } from '@gravito/impulse'
import { CreateUserRequest } from './Requests/CreateUserRequest'

// 於路由定義中使用
router.post('/users', validateRequest(CreateUserRequest), (ctx) => controller.create(ctx))

// 部分驗證（所有欄位皆為選用）
router.patch('/users/:id', validateRequest(CreateUserRequest, { partial: true }), ...)
```

驗證通過後，結果存入 `ctx.var.validated`（型別為 `unknown`，Controller 中需手動 cast）。

> 注意：若框架的 `router.post(path, RequestClass, handler)` 已原生支援 FormRequest 類別，通常不需要手動使用 `validateRequest`。兩者選其一。

## `DataExtractor`

`DataExtractor` 是 `FormRequest` 內部使用的工具，從請求 context 中取出原始資料。通常不需要直接使用，但在需要自訂資料提取邏輯時可參考：

```typescript
import { DataExtractor } from '@gravito/impulse'
import type { DataSource } from '@gravito/impulse'

const extractor = new DataExtractor()

// 從 JSON body 取出
const jsonData = await extractor.extract(ctx, 'json')

// 從 query string 取出
const queryData = await extractor.extract(ctx, 'query')
// URL: /users?page=1&limit=10
// Returns: { page: '1', limit: '10' }  ← 注意：值為字串

// 從路由參數取出
const paramData = await extractor.extract(ctx, 'param')
// Route: /users/:id → /users/abc-123
// Returns: { id: 'abc-123' }
```

支援的 `DataSource`：`'json' | 'form' | 'query' | 'param'`

## `BlueprintGenerator`

將 Zod schema 轉換為前端可消費的 JSON 中繼資料，用於動態表單生成或前後端共享驗證規則：

```typescript
import { BlueprintGenerator } from '@gravito/impulse'
import { z } from '@gravito/impulse'

const schema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  age: z.number().int().min(18),
})

const blueprint = BlueprintGenerator.generateBlueprint(schema, 'json')
// 回傳：
// {
//   source: 'json',
//   rules: {
//     name: { type: 'string', required: true, min: 2, max: 50 },
//     email: { type: 'string', required: true, format: 'email' },
//     age: { type: 'number', required: true, min: 18, integer: true }
//   }
// }
```

判斷是否為 Zod schema：

```typescript
BlueprintGenerator.isZodSchema(someValue)   // boolean
```

典型使用場景：提供一個 GET 端點，回傳表單的驗證規則供前端動態渲染。

## `SchemaCache` 進階

```typescript
import { SchemaCache, ZodValidator } from '@gravito/impulse'

// 初始化（應用程式啟動時執行一次）
SchemaCache.registerValidators([new ZodValidator()])
```

`SchemaCache` 內部使用 `WeakMap` 快取「schema 物件 → 對應 validator」的對應。當 schema 物件被 GC 回收後，快取條目自動清除，不會造成記憶體洩漏。

## 型別工具

```typescript
import type { IsZodSchema, InferZodType, ValidationResult } from '@gravito/impulse'
import { z } from '@gravito/impulse'

// 編譯期判斷是否為 Zod schema
type Check = IsZodSchema<typeof mySchema>   // true | false

// 從 Zod schema 推導型別（等同 z.infer）
type MyType = InferZodType<typeof mySchema>

// validate() 的回傳型別
type Result = ValidationResult<MyType>
// = { success: true; data: MyType } | { success: false; errors: ... }
```
```

- [ ] **Step 2：確認檔案內容完整，commit**

```bash
git add skills/gravito-impulse/references/advanced.md
git commit -m "docs: [gravito-impulse] 新增進階工具參考文件"
```

---

## Task 5：建立 `SKILL.md`

**Files:**
- Create: `skills/gravito-impulse/SKILL.md`

- [ ] **Step 1：建立檔案並寫入內容**

```markdown
---
name: gravito-impulse
description: >
  Guidance for using @gravito/impulse — the Gravito validation layer. Use when writing FormRequest classes,
  defining Zod schemas for HTTP request validation, setting up SchemaCache/ZodValidator at bootstrap,
  reading validated data from ctx in controllers, or using validateRequest middleware, DataExtractor,
  or BlueprintGenerator. Exports z (Zod) directly so there is no need to install zod separately.
---

# @gravito/impulse

`@gravito/impulse` 是 Gravito 的請求驗證套件。核心流程：定義 `FormRequest` 子類 → 框架自動從請求中取出資料、執行 lifecycle hooks、呼叫驗證器 → Controller 從 `ctx.get('validated')` 取得已驗證的資料。

## 快速範例

```typescript
// 1. 定義 FormRequest（body 來源）
import { FormRequest, z } from '@gravito/impulse'

export class CreateUserRequest extends FormRequest {
  schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
  })
}
export type CreateUserParams = z.infer<CreateUserRequest['schema']>

// 2. 路由中指定（框架自動驗證）
router.post('/users', CreateUserRequest, (ctx) => controller.create(ctx))

// 3. Controller 中取得資料
const body = ctx.get('validated') as CreateUserParams
```

query string 範例：

```typescript
export class ListUsersRequest extends FormRequest {
  source = 'query' as const
  schema = z.object({
    page: z.coerce.number().int().min(1).default(1),
  })
}
```

## API surfaces

| 匯出 | 用途 |
|---|---|
| `FormRequest` | 請求驗證基底類別 |
| `z` | Zod（re-export，無需另裝） |
| `SchemaCache` | 初始化：`SchemaCache.registerValidators([...])` |
| `ZodValidator` | Zod adapter，傳入 `SchemaCache.registerValidators` |
| `ValibotValidator` | Valibot adapter（選用） |
| `validateRequest` | 將 FormRequest 包裝成 middleware |
| `DataExtractor` | 手動從 ctx 取出原始資料 |
| `BlueprintGenerator` | 將 schema 轉為前端 JSON metadata |
| `Impulse` | `Impulse.clearAllCaches()`（HMR 用） |

## 決策樹

```
首次設定 impulse（應用程式啟動）?
  → references/setup.md

撰寫 FormRequest（schema、source、hooks）?
  → references/form-request.md

撰寫 Zod schema / 型別推導 / 共用 schema?
  → references/zod.md

使用 validateRequest middleware、DataExtractor、BlueprintGenerator?
  → references/advanced.md
```

## 常見錯誤

- ❌ 忘記呼叫 `SchemaCache.registerValidators(...)` — `FormRequest` 驗證會靜默失敗或拋出 "No validator found"。
- ❌ `source = 'query'`（沒有 `as const`）— TypeScript 推斷為 `string` 而非字面型別。
- ❌ query/param 來源使用數字 schema 但不加 `z.coerce` — query string 永遠是字串。
- ❌ 在 `transform` 中改變欄位結構後忘記同步調整 schema — `transform` 先執行，結果再交給 schema 驗證。
```

- [ ] **Step 2：確認檔案內容完整，commit**

```bash
git add skills/gravito-impulse/SKILL.md
git commit -m "docs: [gravito-impulse] 新增主 SKILL.md 入口"
```

---

## 完成確認

- [ ] `ls skills/gravito-impulse/references/` 顯示四個檔案：`setup.md`、`form-request.md`、`zod.md`、`advanced.md`
- [ ] `SKILL.md` 的 `description` 包含所有主要觸發關鍵字（FormRequest、z、SchemaCache、validateRequest、DataExtractor、BlueprintGenerator）
- [ ] 所有範例程式碼語法正確（無 `TBD`、無佔位符）
- [ ] 無 Draupnir / DDD / IDatabaseAccess 等專案特定詞彙
