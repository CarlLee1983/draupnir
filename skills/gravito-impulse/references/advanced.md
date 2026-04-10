# Advanced Tools

## `validateRequest` middleware

`validateRequest` wraps `FormRequest` as a Gravito middleware, allowing it to be inserted directly into the route middleware chain:

```typescript
import { validateRequest } from '@gravito/impulse'
import { CreateUserRequest } from './Requests/CreateUserRequest'

// Used in route definition
router.post('/users', validateRequest(CreateUserRequest), (ctx) => controller.create(ctx))

// Partial validation (all fields become optional)
router.patch('/users/:id', validateRequest(CreateUserRequest, { partial: true }), (ctx) => controller.update(ctx))
```

After successful validation, the result is stored in `ctx` and can be retrieved via `ctx.get('validated')` (type is `unknown`, requires manual casting in the Controller).

> **Note:** If the framework's `router.post(path, RequestClass, handler)` already natively supports FormRequest classes as the second parameter, you usually don't need to manually use `validateRequest`. Choose one of the two, do not use both.

## `DataExtractor`

`DataExtractor` is a tool used internally by `FormRequest` to extract raw data from the request context. Usually, you don't need to use it directly, but it can be referenced when custom data extraction logic is needed:

```typescript
import { DataExtractor } from '@gravito/impulse'
import type { DataSource } from '@gravito/impulse'

const extractor = new DataExtractor()

// Extract from JSON body
const jsonData = await extractor.extract(ctx, 'json')

// Extract from query string
const queryData = await extractor.extract(ctx, 'query')
// URL: /users?page=1&limit=10
// Returns: { page: '1', limit: '10' }  ← Note: values are strings

// Extract from route parameters
const paramData = await extractor.extract(ctx, 'param')
// Route: /users/:id → /users/abc-123
// Returns: { id: 'abc-123' }
```

Supported `DataSource`: `'json' | 'form' | 'query' | 'param'`

## `BlueprintGenerator`

Converts Zod schema into JSON metadata consumable by the frontend, used for dynamic form generation or sharing validation rules between frontend and backend:

```typescript
import { BlueprintGenerator, z } from '@gravito/impulse'

const schema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  age: z.number().int().min(18),
})

const blueprint = BlueprintGenerator.generateBlueprint(schema, 'json')
// Returns:
// {
//   source: 'json',
//   rules: {
//     name: { type: 'string', required: true, min: 2, max: 50 },
//     email: { type: 'string', required: true, format: 'email' },
//     age: { type: 'number', required: true, min: 18, integer: true }
//   }
// }

// Check if it is a Zod schema
BlueprintGenerator.isZodSchema(someValue)   // boolean
```

Typical use case: Providing a GET endpoint that returns form validation rules for dynamic frontend rendering.

## Advanced `SchemaCache`

`SchemaCache` uses a `WeakMap` to cache the mapping of "schema object → corresponding validator" to avoid repeated parsing for every request. See `references/setup.md` for initialization.

When a schema object is garbage collected, the corresponding cache entry is automatically cleared, preventing memory leaks. If you need to force clear all caches in an HMR environment, use `Impulse.clearAllCaches()` (see `references/setup.md`).

## Type Utilities

```typescript
import type { IsZodSchema, InferZodType, ValidationResult } from '@gravito/impulse'
import { z } from '@gravito/impulse'

const mySchema = z.object({ name: z.string() })

// Compile-time check if it's a Zod schema
type Check = IsZodSchema<typeof mySchema>   // true

// Infer type from Zod schema (equivalent to z.infer)
type MyType = InferZodType<typeof mySchema>  // { name: string }

// Return type of validate()
type Result = ValidationResult<MyType>
// = { success: true; data: MyType } | { success: false; errors: Array<{ field: string; message: string; code?: string }> }
```
