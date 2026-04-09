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
