# 進階工具

## `validateRequest` middleware

`validateRequest` 將 `FormRequest` 包裝成 Gravito middleware，可直接插入路由中間件鏈：

```typescript
import { validateRequest } from '@gravito/impulse'
import { CreateUserRequest } from './Requests/CreateUserRequest'

// 於路由定義中使用
router.post('/users', validateRequest(CreateUserRequest), (ctx) => controller.create(ctx))

// 部分驗證（所有欄位皆為選用）
router.patch('/users/:id', validateRequest(CreateUserRequest, { partial: true }), (ctx) => controller.update(ctx))
```

驗證通過後，結果存入 `ctx` 並可透過 `ctx.get('validated')` 取出（型別為 `unknown`，Controller 中需手動 cast）。

> **注意：** 若框架的 `router.post(path, RequestClass, handler)` 已原生支援 FormRequest 類別作為第二參數，通常不需要手動使用 `validateRequest`。兩者選其一即可，不要重複使用。

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
import { BlueprintGenerator, z } from '@gravito/impulse'

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

// 判斷是否為 Zod schema
BlueprintGenerator.isZodSchema(someValue)   // boolean
```

典型使用場景：提供一個 GET 端點，回傳表單的驗證規則供前端動態渲染。

## `SchemaCache` 進階

`SchemaCache` 使用 `WeakMap` 快取「schema 物件 → 對應 validator」的對應，避免每次請求重複解析。初始化方式見 `references/setup.md`。

當 schema 物件被 GC 回收後，對應的快取條目自動清除，不會造成記憶體洩漏。若需在 HMR 環境下強制清除所有快取，請使用 `Impulse.clearAllCaches()`（見 `references/setup.md`）。

## 型別工具

```typescript
import type { IsZodSchema, InferZodType, ValidationResult } from '@gravito/impulse'
import { z } from '@gravito/impulse'

const mySchema = z.object({ name: z.string() })

// 編譯期判斷是否為 Zod schema
type Check = IsZodSchema<typeof mySchema>   // true

// 從 Zod schema 推導型別（等同 z.infer）
type MyType = InferZodType<typeof mySchema>  // { name: string }

// validate() 的回傳型別
type Result = ValidationResult<MyType>
// = { success: true; data: MyType } | { success: false; errors: Array<{ field: string; message: string; code?: string }> }
```
