# Setup

`@gravito/impulse` requires a one-time initialization at application startup for the `FormRequest` validation system to function correctly.

## Installation

```bash
npm install @gravito/impulse
# or
bun add @gravito/impulse
```

## Initialization (Required)

Call at the application entry point, execution once is enough:

```typescript
import { SchemaCache, ZodValidator } from '@gravito/impulse'

SchemaCache.registerValidators([new ZodValidator()])
```

If using Valibot:

```typescript
import { SchemaCache, ValibotValidator } from '@gravito/impulse'

SchemaCache.registerValidators([new ValibotValidator()])
```

Using both validators simultaneously:

```typescript
SchemaCache.registerValidators([new ZodValidator(), new ValibotValidator()])
```

`SchemaCache` uses a `WeakMap` to cache schema → validator mappings, avoiding repeated parsing overhead.

## Clearing Cache in HMR / Development Mode

After Hot Module Replacement reloads modules, old FormRequest instances and schema compilation caches might remain. Call:

```typescript
import { Impulse } from '@gravito/impulse'

Impulse.clearAllCaches()
```

This forces re-instantiation of all `FormRequest`s and re-compilation of schemas. Usually placed in an HMR handler or dev server hook.
