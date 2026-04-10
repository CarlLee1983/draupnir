# Coding Conventions

**Analysis Date:** 2026-04-10

## Naming Patterns

**Files:**
- Service files: PascalCase ending in `Service` (e.g., `CreateOrganizationService.ts`, `CreditDeductionService.ts`)
- Domain files: PascalCase by domain concept (e.g., `Organization.ts`, `User.ts`, `CreditAccount.ts`)
- DTO files: PascalCase ending in `DTO` (e.g., `OrganizationDTO.ts`, `RegisterUserDTO.ts`)
- Request validators: PascalCase ending in `Request` (e.g., `CreateOrganizationRequest.ts`, `InviteMemberRequest.ts`)
- Repository interfaces: PascalCase starting with `I`, ending in `Repository` (e.g., `IOrganizationRepository.ts`)
- Repository implementations: PascalCase ending in `Repository` (e.g., `OrganizationRepository.ts`)
- Value objects: PascalCase domain name (e.g., `OrgSlug.ts`, `Email.ts`, `Password.ts`)
- Test files: Mimic source file name with `.test.ts` or `.integration.test.ts` suffix
  - Unit: `src/Modules/Organization/Domain/Aggregates/Organization.ts` → `src/Modules/Organization/__tests__/Organization.test.ts`
  - Integration: `src/Modules/Credit/__tests__/CreditEventFlow.integration.test.ts`

**Functions/Methods:**
- camelCase for all functions and methods
- Event handlers: `handle` prefix (e.g., `handleBalanceDepletedService`)
- Service execute methods: always named `execute()` (not `run`, `perform`, etc.)
- Getter methods: `get` prefix (e.g., `getId()`, `getBalance()`, `getTokenHash()`)
- Boolean checks: `is` or `can` prefix (e.g., `isValid()`, `isExpired()`, `canActivate()`)
- Repository methods: `findById()`, `findBySlug()`, `findAll()`, `save()`, `delete()`, `withTransaction()`

**Variables:**
- camelCase for all variables and properties
- Constants in modules: UPPER_SNAKE_CASE (e.g., `DEFAULT_OPTIONS`, `RETRYABLE_STATUS_CODES`)
- Private fields in classes: `private readonly` or `private` prefix (e.g., `private config`, `private props`)
- Aggregate root props: stored in private `props` object (see Organization.ts pattern)

**Types:**
- Interface names start with `I` prefix for contract/repository interfaces (e.g., `IOrganizationRepository`, `IContainer`, `IDatabaseAccess`)
- Type names are PascalCase without prefix (e.g., `CreateOrganizationRequest`, `OrganizationProps`)
- Enum-like objects use `as const` pattern (e.g., `ErrorCodes`)
- Generic types use single letter or descriptive names (e.g., `<T>`, `<Request>`, `<Response>`)

## Code Style

**Formatting:**
- Tool: Biome v2.4.11
- Indent: 2 spaces
- Line width: 100 characters
- Quote style: single quotes for JavaScript (`'use-single-quotes'`)

**Linting:**
- Tool: Biome with recommended rules enabled
- Exception: `noConsole` is disabled, but `console.log` is allowed (see biome.json)
- No unused variables: `noUnusedLocals` and `noUnusedParameters` enforced via TypeScript
- No unused imports automatically removed by Biome

**TypeScript Strict Mode:**
- `strict: true` - all strict checks enabled
- `noImplicitAny: true` - all types must be explicit
- `strictNullChecks: true` - null/undefined must be handled explicitly
- `strictFunctionTypes: true` - function parameter/return types strictly checked
- `noUnusedLocals: true` - no unused variables allowed
- `noUnusedParameters: true` - no unused function parameters allowed
- `noImplicitReturns: true` - all code paths must return a value
- `noFallthroughCasesInSwitch: true` - switch statements must have break/return

## Import Organization

**Order:**
1. External framework imports (`@gravito/*`, `zod`, etc.)
2. Type imports from external packages (`type { ... } from ...`)
3. Path alias imports (`@/Shared`, `@/Modules`)
4. Relative imports (`./../`, `./`)
5. Type-only imports grouped at end (`import type { ... }`)

**Example from codebase:**
```typescript
// External frameworks
import { describe, it, expect, beforeEach } from 'vitest'
import { FormRequest, z } from '@gravito/impulse'

// Path alias imports
import type { IDatabaseAccess } from '@/Shared/Infrastructure/IDatabaseAccess'
import { Organization } from '../../Domain/Aggregates/Organization'
import { OrganizationMember } from '../../Domain/Entities/OrganizationMember'

// Type imports at end
import type { IOrganizationRepository } from '../../Domain/Repositories/IOrganizationRepository'
```

**Path Aliases:**
- `@/*` maps to `./src/*` (primary alias for cross-module imports)
- `@gravito/prism`, `@gravito/signal`, `@gravito/stasis` mapped in tsconfig.json

## Error Handling

**Pattern: Typed Service Response**
All application services return a `Response` object (not throwing exceptions for business logic):

```typescript
export interface OrganizationResponse {
  success: boolean
  message: string
  data?: Record<string, unknown>
  error?: string
}

async execute(request: CreateOrganizationRequest): Promise<OrganizationResponse> {
  try {
    if (!request.name?.trim()) {
      return { success: false, message: '組織名稱不能為空', error: 'NAME_REQUIRED' }
    }
    // ... business logic
    return { success: true, message: '組織建立成功', data: org.toDTO() }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '建立失敗'
    return { success: false, message, error: message }
  }
}
```

**Pattern: Exception Hierarchy**
Base class in `src/Shared/Application/AppException.ts`:
```typescript
export class AppException extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly statusCode: number = 400,
    public readonly details?: Record<string, any>,
  ) { /* ... */ }
}
```

Specific exceptions:
- `NotFoundException` (404) - resource not found
- `ValidationException` (422) - input validation failed
- `ConflictException` (409) - business logic conflict
- `InternalException` (500) - server error

**Error Codes:**
Centralized in `src/Shared/Application/ErrorCodes.ts`:
```typescript
export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  BIFROST_ERROR: 'BIFROST_ERROR',
  // ... more
} as const
```

## Validation

**Framework:** Zod v4.3.6 via Gravito's FormRequest pattern

**Presentation Layer Pattern:**
```typescript
// src/Modules/Organization/Presentation/Requests/CreateOrganizationRequest.ts
import { FormRequest, z } from '@gravito/impulse'

export class CreateOrganizationRequest extends FormRequest {
  schema = z.object({
    name: z.string().min(1, '名稱不能為空').max(100),
    description: z.string().max(255).optional(),
    slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/).optional(),
    managerUserId: z.string().uuid('無效的用戶 ID'),
  })
}

export type CreateOrganizationParams = z.infer<CreateOrganizationRequest['schema']>
```

**Value Object Validation:**
- Value objects validate in constructor and throw on invalid state
- Example: `new OrgSlug(slug)` validates format, throws if invalid
- Never return validation errors from value object constructors; throw immediately

**Service Layer Validation:**
- Services validate business rules (not input format—that's Presentation layer)
- Return `{ success: false, error: 'CODE' }` for business logic violations
- Throw exceptions only for unexpected/system errors

## Comments

**When to Comment:**
- Complex algorithms or non-obvious business logic
- DDD patterns: aggregate roots, domain events, value objects
- Critical invariants (e.g., immutability guarantees, transaction boundaries)
- Integration points with external systems (Bifrost API, database transactions)

**Example from codebase:**
```typescript
/**
 * 應用建立函式 (createApp)
 *
 * 包裝 bootstrap 函式，提供給 src/index.ts 使用
 * 責任：
 * 1. 從配置取得連接埠號
 * 2. 調用 bootstrap 初始化應用
 * 3. 返回已初始化的 PlanetCore 實例
 */
export async function createApp() {
  const port = (process.env.PORT as unknown as number) || 3000
  const core = await bootstrap(port)
  return core
}
```

**JSDoc for Public APIs:**
- Use JSDoc for public service methods
- Include `@param`, `@returns` tags
- Document exceptions that may be thrown

## Function Design

**Size:** Target 30-50 lines maximum; complex services broken into smaller private methods

**Parameters:**
- Use objects for multiple parameters (not positional args)
- Make parameters `readonly` when possible
- Example: `request(operation: { method: string; path: string }, options: { body?: unknown; auth?: string })`

**Return Values:**
- Services return `Response` objects with typed payload
- Domain objects never return null; throw or use Optional pattern
- Use discriminated unions for complex responses

**Immutability (CRITICAL):**
All domain objects follow immutability pattern:
```typescript
// Organization.update() creates NEW instance
update(fields: UpdateOrganizationFields): Organization {
  return new Organization({
    ...this.props,
    ...(fields.name !== undefined && { name: fields.name }),
    updatedAt: new Date(),
  })
}

// Never mutate existing object
suspend(): Organization {
  return new Organization({ ...this.props, status: 'suspended', updatedAt: new Date() })
}
```

## Module Design

**Exports:**
- Each module exports public API from index files
- Example: `src/Foundation/index.ts` exports `BifrostClient`, service provider, types
- Domain layer types exported from module root, not from deep paths

**Barrel Files:**
Modules use index.ts files to export public API:
```typescript
// src/Foundation/index.ts
export { BifrostClient, BifrostApiError, isBifrostApiError } from './Infrastructure/Services/BifrostClient'
export type { BifrostClientConfig } from './Infrastructure/Services/BifrostClient'
export { FoundationServiceProvider } from './Infrastructure/Providers/FoundationServiceProvider'
```

**Module Structure (DDD):**
```
src/Modules/OrganizationModule/
├── Domain/                    # Business rules
│   ├── Aggregates/           # Root entities
│   ├── Entities/             # Value objects & entities
│   ├── ValueObjects/         # Immutable value types
│   └── Repositories/         # Repository interfaces
├── Application/              # Use cases & orchestration
│   ├── Services/             # Application services
│   └── DTOs/                 # Data transfer objects
├── Infrastructure/           # Technical implementation
│   ├── Repositories/         # Repository implementations
│   ├── Services/             # Infrastructure services
│   └── Providers/            # Service provider
├── Presentation/             # HTTP layer
│   ├── Controllers/          # Route handlers
│   └── Requests/             # Zod validation schemas
└── __tests__/               # Unit & integration tests
```

---

*Convention analysis: 2026-04-10*
