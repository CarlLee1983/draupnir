# FormRequest

`FormRequest` is the core abstraction of `@gravito/impulse`, encapsulating the complete flow of "Extracting data from HTTP request → Validation → Providing to Controller".

## Basic Usage

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

## Data Source `source`

`source` determines which part of the request data is taken from. Default is `'json'`.

| Value | Taken from | Use Case |
|---|---|---|
| `'json'` | Request body (JSON) | POST / PUT / PATCH |
| `'form'` | FormData | multipart/form-data forms |
| `'query'` | URL query string | GET filtering / pagination |
| `'param'` | Route parameters | `:id`, `:slug`, etc. |

```typescript
export class ListUsersRequest extends FormRequest {
  source = 'query' as const   // ← Must use as const
  schema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
}
```

## Lifecycle Hooks (All optional)

### `authorize(ctx)`

Executed before validation. Returning `false` throws an `AuthorizationException` (HTTP 403).

```typescript
export class AdminOnlyRequest extends FormRequest {
  schema = z.object({ name: z.string() })

  async authorize(ctx: Context): Promise<boolean> {
    const user = ctx.get('user')
    return user?.role === 'admin'
  }

  authorizationMessage() {
    return 'Admin only operation'
  }
}
```

`authorizationMessage()` is an optional overridable method that returns a `string`, which will appear in the `message` field of the 403 error response. If not overridden, the framework uses a default message.

### `transform(data)`

Pre-process raw data before validation. Execution order: `transform → validate`.

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

Override messages for specific fields or error codes. Key format: `'field.code'` or `'field'`.

```typescript
messages() {
  return {
    'email.invalid_string': 'Invalid Email format',
    'password': 'Password field is incorrect',
  }
}
```

### `redirect()`

The URL to jump to when validation fails in SSR mode (not for API use).

```typescript
redirect() {
  return '/forms/create'
}
```

> **Note**: In non-SSR (API) mode, validation failure does not trigger a jump; the framework returns HTTP 422 with error details in the response body instead. `redirect()` only takes effect in SSR rendering scenarios.

## Retrieving Validated Data in Controller

`@gravito/impulse` is used in conjunction with `@gravito/core`. `GravitoContext` comes from `@gravito/core` (the HTTP framework layer). After successful validation, the result is stored in the `'validated'` field of `ctx`:

```typescript
import type { GravitoContext } from '@gravito/core'
import type { CreateUserParams } from '../Requests/CreateUserRequest'

async create(ctx: GravitoContext): Promise<Response> {
  const body = ctx.get('validated') as CreateUserParams
  // body.name, body.email are already validated
}
```

## Direct call `validate(ctx)`

When not using the framework's automatic route validation, it can be called manually:

```typescript
const request = new CreateUserRequest()
const result = await request.validate(ctx)

if (!result.success) {
  return ctx.json({ errors: result.errors }, 422)
  // Structure of result.errors
  // Array<{ field: string; message: string; code?: string }>
}

const data = result.data  // Already validated data
```

## Common Errors

- ❌ `source = 'query'` (without `as const`) — TypeScript will infer as `string` instead of the literal type, causing type errors.
- ❌ Using number schemas in `query` / `param` sources without `z.coerce` — query strings are always strings and require transformation.
- ❌ Forgetting to synchronize the schema after changing field structures in `transform` — `transform` executes first, then the result is passed to the schema for validation.
