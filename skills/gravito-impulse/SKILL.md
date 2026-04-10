---
name: gravito-impulse
description: >
  Guidance for using @gravito/impulse — the Gravito validation layer. Use when writing FormRequest classes,
  defining Zod schemas for HTTP request validation, setting up SchemaCache/ZodValidator at bootstrap,
  reading validated data from ctx in controllers, or using validateRequest middleware, DataExtractor,
  or BlueprintGenerator. Exports z (Zod) directly so there is no need to install zod separately.
---

# @gravito/impulse

`@gravito/impulse` is Gravito's request validation package. Core workflow: Define a `FormRequest` subclass → The framework automatically extracts data from the request, executes lifecycle hooks, and calls the validator → The Controller retrieves validated data from `ctx.get('validated')`.

## Quick Example

```typescript
// 1. Define FormRequest (body source)
import { FormRequest, z } from '@gravito/impulse'

export class CreateUserRequest extends FormRequest {
  schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
  })
}
export type CreateUserParams = z.infer<CreateUserRequest['schema']>

// 2. Specify in route (automatic validation by framework)
router.post('/users', CreateUserRequest, (ctx) => controller.create(ctx))

// 3. Retrieve data in Controller
const body = ctx.get('validated') as CreateUserParams
```

## 1. Setup & Initialization

One-time initialization is required at application startup:

```typescript
import { SchemaCache, ZodValidator } from '@gravito/impulse'

// Register validators (Required)
SchemaCache.registerValidators([new ZodValidator()])
```

In HMR (Development Mode) environments, clear the cache when reloading modules:
```typescript
import { Impulse } from '@gravito/impulse'
Impulse.clearAllCaches()
```

See `references/setup.md` for details.

## 2. FormRequest Core Abstractions

### Data Source `source`
`source` determines which part of the request data is taken from. It must use `as const`:

| Value | Taken from | Use Case |
|---|---|---|
| `'json'` (Default) | Request body (JSON) | POST / PUT / PATCH |
| `'form'` | FormData | multipart/form-data |
| `'query'` | URL query string | GET filtering / pagination |
| `'param'` | Route parameters | `:id`, `:slug` |

```typescript
export class ListUsersRequest extends FormRequest {
  source = 'query' as const
  schema = z.object({
    page: z.coerce.number().int().min(1).default(1),
  })
}
```

### Lifecycle Hooks
- `authorize(ctx)`: Returns `false` to throw 403. Override `authorizationMessage()` for custom messages.
- `transform(data)`: Pre-process raw data before validation (e.g., `toLowerCase()`).
- `messages()`: Override messages for specific fields or error codes. Format: `'field.code'` or `'field'`.
- `redirect()`: URL to jump to when validation fails in SSR mode.

See `references/form-request.md` for details.

## 3. Zod Schema & Type Inference

`@gravito/impulse` re-exports `z` (Zod); it is recommended to import directly from this package.

### Common Patterns
- **Number Conversion**: `z.coerce.number()` (Required for query string/param).
- **Shared Schemas**: It is recommended to define reused IDs or parameters in separate files.
- **Error Codes**: Validation failure returns HTTP 422, with error format `Array<{ field: string, message: string, code?: string }>`.

See `references/zod.md` for details.

## 4. Advanced Tools

### `validateRequest` Middleware
Use `FormRequest` directly as a Gravito route middleware:
```typescript
import { validateRequest } from '@gravito/impulse'
import { CreateUserRequest } from './Requests/CreateUserRequest'

// Validated data is stored in ctx.get('validated')
router.post('/users', validateRequest(CreateUserRequest), (ctx) => controller.create(ctx))

// Partial validation (Commonly used for PATCH)
router.patch('/users/:id', validateRequest(CreateUserRequest, { partial: true }), (ctx) => controller.update(ctx))
```

### `BlueprintGenerator`
Convert Zod schema to JSON metadata for frontend consumption, used for dynamic form generation:
```typescript
import { BlueprintGenerator } from '@gravito/impulse'
const blueprint = BlueprintGenerator.generateBlueprint(mySchema, 'json')
```

### `DataExtractor`
Used for custom data extraction logic from `ctx`, supporting `json`, `form`, `query`, `param`.

### Type Utilities
- `IsZodSchema<T>`: Compile-time check.
- `InferZodType<T>`: Equivalent to `z.infer<T>`.
- `ValidationResult<T>`: Encapsulates `{ success: boolean, data?: T, errors?: [...] }`.

See `references/advanced.md` for details.

## Decision Tree

```
Initial setup of Impulse (App startup)?
  → references/setup.md

Writing FormRequest (schema, source, hooks)?
  → references/form-request.md

Writing Zod schema / Type inference / Shared schemas?
  → references/zod.md

Using validateRequest middleware, DataExtractor, BlueprintGenerator?
  → references/advanced.md
```

## Common Errors & Checklists

- [ ] Is `SchemaCache.registerValidators(...)` called at the application entry point?
- [ ] Is `source` appended with `as const` (e.g., `source = 'query' as const`)?
- [ ] Are number fields correctly using `z.coerce.number()` in `query` or `param` sources?
- [ ] Is the `schema` synchronized after `transform` modified the data structure?
- [ ] Is `ctx.get('validated')` correctly cast to the type inferred by `z.infer<T>` in the Controller?
- [ ] ❌ Do not use both `router.post(path, FormRequest, handler)` and `validateRequest(FormRequest)` simultaneously.
- [ ] ❌ `authorize(ctx)` returning `false` triggers a 403 error response; do not throw exceptions here.
- [ ] ❌ `redirect()` only takes effect in non-API (SSR) mode; API mode returns 422 JSON.
