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

## Core exports

```typescript
import { FormRequest, z } from '@gravito/impulse'
import { SchemaCache, ZodValidator } from '@gravito/impulse'
import { validateRequest } from '@gravito/impulse'
import { DataExtractor, BlueprintGenerator, Impulse } from '@gravito/impulse'
```

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
