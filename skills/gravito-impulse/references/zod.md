# Zod (via @gravito/impulse)

`@gravito/impulse` re-exports Zod, so no separate installation is needed:

```typescript
import { z } from '@gravito/impulse'
// Equivalent to import { z } from 'zod'
```

## Type Inference

```typescript
import { FormRequest, z } from '@gravito/impulse'

export class CreateOrderRequest extends FormRequest {
  schema = z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1),
  })
}

// Infer request body type
export type CreateOrderParams = z.infer<CreateOrderRequest['schema']>
// { productId: string; quantity: number }
```

## Common Schema Patterns

### Strings

```typescript
z.string()
z.string().min(1, 'Required')
z.string().max(255)
z.string().email('Invalid email format')
z.string().uuid('Invalid UUID format')
z.string().url()
z.string().regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens allowed')
z.string().optional()         // string | undefined
z.string().nullable()         // string | null
z.string().default('active')
```

### Numbers

```typescript
z.number()
z.number().int()
z.number().min(0).max(100)
z.coerce.number()             // Convert from string (Essential for query strings)
z.coerce.number().int().min(1).default(1)
```

### Enums

```typescript
z.enum(['active', 'inactive', 'pending'])
// Type: 'active' | 'inactive' | 'pending'
```

### Arrays

```typescript
z.array(z.string())
z.array(z.string()).min(1, 'At least one element')
z.array(z.string().uuid())
```

### Nested Objects

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

### Optional Fields

```typescript
z.object({
  name: z.string().min(1),
  description: z.string().max(255).optional(),  // Can be omitted
  slug: z.string().optional(),
})
```

### Shared Schemas (params, headers)

If route parameters or headers are shared across multiple Requests, they can be extracted into separate schemas:

```typescript
// params.ts
export const UserIdSchema = z.object({
  id: z.string().uuid('Invalid user ID'),
})
export type UserIdParams = z.infer<typeof UserIdSchema>

// Usage in FormRequest
export class GetUserRequest extends FormRequest {
  source = 'param' as const
  schema = UserIdSchema
}
```

## Error Format on Validation Failure

Impulse converts Zod errors into a unified format:

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

HTTP response status code is **422 Unprocessable Entity**.
