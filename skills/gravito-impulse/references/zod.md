# Zod（via @gravito/impulse）

`@gravito/impulse` 重新匯出 Zod，無需單獨安裝：

```typescript
import { z } from '@gravito/impulse'
// 等同於 import { z } from 'zod'
```

## 型別推導

```typescript
import { FormRequest, z } from '@gravito/impulse'

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
