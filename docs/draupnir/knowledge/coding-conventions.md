# Coding Conventions

Complete reference for naming patterns, code style, error handling, and design principles across Draupnir.

---

## Naming Patterns

Consistent naming across the codebase improves readability and prevents classification errors during code generation.

### PascalCase

- **Service files**: End with `Service`
  - ✅ `CreateOrganizationService.ts`, `CreditDeductionService.ts`
  - ❌ `createOrganization.ts`, `credit_deduction.ts`

- **Domain entities**: PascalCase, no suffix
  - ✅ `Organization.ts`, `User.ts`, `CreditAccount.ts`
  
- **Data Transfer Objects**: End with `DTO`
  - ✅ `OrganizationDTO.ts`, `RegisterUserDTO.ts`

- **Request validators**: End with `Request`
  - ✅ `CreateOrganizationRequest.ts`, `InviteMemberRequest.ts`

- **Repository interfaces**: Start with `I`, end with `Repository`
  - ✅ `IOrganizationRepository.ts`, `IUserRepository.ts`

- **Repository implementations**: End with `Repository`
  - ✅ `OrganizationRepository.ts`, `UserRepository.ts`

- **Value Objects**: PascalCase, descriptive names
  - ✅ `Email.ts`, `Password.ts`, `OrgSlug.ts`, `Balance.ts`

- **Domain Aggregates**: PascalCase (root entity)
  - ✅ `CreditAccount.ts`, `Organization.ts`

### camelCase

- **Variables and properties**: Always camelCase
  - ✅ `userId`, `organizationId`, `isActive`, `lastUsedAt`

- **Constants**: UPPER_SNAKE_CASE (module scope)
  - ✅ `DEFAULT_OPTIONS`, `RETRYABLE_STATUS_CODES`, `MAX_RETRY_ATTEMPTS`

- **Function and method names**: camelCase
  - ✅ `getId()`, `getBalance()`, `isExpired()`, `canActivate()`

- **Boolean checks**: Use `is` or `can` prefix
  - ✅ `isValid()`, `isActive()`, `canRevoke()`

- **Event handlers**: Use `handle` prefix
  - ✅ `handleUserRegistered()`, `handleCreditDeducted()`

### Special Prefixes

- **Interfaces**: Always start with `I`
  - ✅ `IOrganizationRepository`, `IContainer`, `IDatabaseAccess`

- **Private fields**: Use `private readonly` or `private` keyword
  - ✅ `private readonly config`, `private props`

- **Type definitions**: PascalCase (no `I` prefix)
  - ✅ `type CreateOrganizationRequest = { ... }`
  - ✅ `interface ApiResponse<T> { ... }`

### Service Methods

- **Execute methods**: Always named `execute()`
  - ❌ `run()`, `perform()`, `handle()`
  - ✅ `async execute(request: CreateOrgRequest): Promise<Response>`

- **Repository methods**: Standardized names
  - ✅ `findById()`, `findBySlug()`, `findAll()`, `save()`, `delete()`, `withTransaction()`

---

## Code Style

### Biome Configuration

**Tool**: Biome v2.4.11 (linter + formatter)

```json
{
  "linter": {
    "rules": {
      "style": {
        "noConsole": false,        // console.log allowed for logging
        "useSingleQuote": true,    // single quotes in JS/TS
        "useTemplate": true
      },
      "suspicious": {
        "noConstantCondition": "warn"
      }
    }
  },
  "formatter": {
    "indentStyle": "space",
    "indentSize": 2,
    "lineWidth": 100
  }
}
```

**Formatting Rules**:
- **Indentation**: 2 spaces (no tabs)
- **Line width**: 100 characters max
- **Quotes**: Single quotes for JavaScript/TypeScript
- **Semicolons**: Required at statement ends
- **Trailing commas**: Multi-line objects/arrays must have trailing comma

### TypeScript Strict Mode

**Enabled in `tsconfig.json`**:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "target": "ES2020"
  }
}
```

**Implications**:
- All variables must have explicit types
- Null/undefined must be handled
- Unused variables/parameters cause errors
- All code paths must return a value
- Switch statements need `break` or `return`

---

## Import Organization

### Path Aliases

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

**Usage**:
```typescript
import { UserService } from '@/Modules/User/Application/Services/UserService'
import { IUserRepository } from '@/Modules/User/Domain/Repositories/IUserRepository'
import { AggregateRoot } from '@/Shared/Domain/AggregateRoot'
```

**Rules**:
- Use `@/*` for all cross-module imports
- Relative imports only within same module (not recommended)
- No circular dependencies (enforced by DAG verification)

---

## Error Handling

### Exception Types

Standardized exception classes for consistent error responses:

```typescript
// All in src/Shared/Application/Exceptions/

class NotFoundException extends Error {
  // HTTP 404 — resource not found
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundException'
  }
}

class ValidationException extends Error {
  // HTTP 422 — input validation failed
  constructor(public errors: Record<string, string>) {
    super('Validation failed')
    this.name = 'ValidationException'
  }
}

class ConflictException extends Error {
  // HTTP 409 — business logic conflict
  constructor(message: string) {
    super(message)
    this.name = 'ConflictException'
  }
}

class InternalException extends Error {
  // HTTP 500 — unexpected server error
  constructor(message: string) {
    super(message)
    this.name = 'InternalException'
  }
}
```

### Throwing Strategy

```typescript
// Domain Layer: Throw immediately for invariant violations
class CreditAccount {
  static fromString(balance: string): CreditAccount {
    if (!this.isValidDecimal(balance)) {
      throw new Error('Invalid balance format')
    }
    return new CreditAccount(balance)
  }
}

// Application Layer: Catch and return Response objects
class TopUpCreditService {
  async execute(request: TopUpRequest): Promise<Response<CreditDTO>> {
    try {
      const balance = Balance.fromString(request.amount)
      const account = await this.repo.findBy(request.orgId)
      const updated = account.addCredit(balance)
      await this.repo.save(updated)
      return { success: true, data: updated.toDTO() }
    } catch (error) {
      return { success: false, error: 'INSUFFICIENT_BALANCE' }
    }
  }
}
```

---

## Validation Strategy

### Value Objects (Constructor-Level)

Throw immediately on invalid state:

```typescript
export class Email {
  private constructor(private value: string) {}

  static create(email: string): Email {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format')
    }
    return new Email(email.toLowerCase())
  }

  getValue(): string {
    return this.value
  }
}

// Usage:
try {
  const email = Email.create('user@example.com')
} catch (error) {
  // Validation failed
}
```

### Zod Schemas (Presentation Layer)

Input validation in controllers via Zod FormRequests:

```typescript
// src/Modules/Credit/Presentation/Validators/TopUpRequest.ts
import { z } from 'zod'

export class TopUpRequest {
  static schema = z.object({
    organizationId: z.string().uuid(),
    amount: z.string().regex(/^\d+(\.\d{2})?$/),
  })

  constructor(data: unknown) {
    const validated = TopUpRequest.schema.parse(data)
    Object.assign(this, validated)
  }
}
```

### Service Layer (Business Validation)

Return `{ success: false, error: 'CODE' }` for business rule violations:

```typescript
async execute(request: Request): Promise<Response> {
  const account = await this.repo.findById(request.orgId)
  
  if (account.balance < request.deductAmount) {
    return {
      success: false,
      error: 'INSUFFICIENT_BALANCE'
    }
  }
  
  // Continue with business logic
  return { success: true, data: ... }
}
```

---

## Comments Policy

### When to Comment

**DO comment**:
- Complex algorithms or non-obvious business logic
- DDD patterns: aggregate roots, domain events, value objects
- Critical invariants (e.g., immutability guarantees, transaction boundaries)
- Integration points with external systems (Bifrost API, database transactions)

**DON'T comment**:
- Self-evident code: `const isActive = user.status === 'ACTIVE'`
- Function names that already describe intent
- Obvious loop or conditional logic

### JSDoc Style

For public service methods:

```typescript
/**
 * Creates a new organization and assigns the creator as ADMIN.
 * @param request - Organization creation request
 * @param request.name - Organization display name (required)
 * @param request.slug - URL-friendly identifier (must be unique)
 * @returns Organization DTO with ID and timestamps
 * @throws ValidationException if slug format is invalid
 * @throws ConflictException if slug already exists
 * @example
 * const org = await service.execute({ name: 'Acme Inc', slug: 'acme' })
 */
async execute(request: CreateOrgRequest): Promise<Response<OrganizationDTO>> {
  // implementation
}
```

---

## Function Design

### Parameters: Objects Over Positional

```typescript
// ❌ BAD: positional parameters
function createUser(name: string, email: string, role: string, isActive: boolean, ...): void

// ✅ GOOD: destructured object
function createUser(request: {
  readonly name: string
  readonly email: string
  readonly role: Role
  readonly isActive: boolean
}): User {
  // ...
}
```

### Immutable Parameters

Mark input parameters as `readonly`:

```typescript
interface CreateRequest {
  readonly organizationId: string
  readonly amount: string
  readonly description: string
}

async execute(request: readonly CreateRequest): Promise<Response> {
  // request.amount = '100'  // ❌ Error: cannot assign to readonly
}
```

### No Null Returns

Domain objects never return null; use exceptions or Optional pattern:

```typescript
// ❌ BAD
function findUser(id: string): User | null {
  // ...
}

// ✅ GOOD: throw if not found
function findUser(id: string): User {
  const user = db.query(...)
  if (!user) throw new NotFoundException(`User ${id} not found`)
  return user
}

// ✅ ALSO GOOD: explicit Optional type
function tryFindUser(id: string): { user: User } | { error: string } {
  // ...
}
```

---

## Module Design

### Barrel Export Pattern

Each module exports a public API surface from `index.ts`:

```typescript
// src/Modules/Organization/index.ts
export { Organization } from './Domain/Aggregates/Organization'
export { OrganizationDTO } from './Application/DTOs/OrganizationDTO'
export type { IOrganizationRepository } from './Domain/Repositories/IOrganizationRepository'
export { OrganizationServiceProvider } from './Infrastructure/Providers/OrganizationServiceProvider'
```

**Rules**:
- Only export public domain concepts (Aggregates, DTOs, Repository interfaces, ServiceProvider)
- Never export implementation details (Atlas repositories, internal services)
- Never export Presentation layer (Controllers, Routes) from module index
- All cross-module imports go through barrel exports

### Service Provider Pattern

Each module has a ServiceProvider for DI registration:

```typescript
// src/Modules/Organization/Infrastructure/Providers/OrganizationServiceProvider.ts
export class OrganizationServiceProvider extends ModuleServiceProvider {
  register(container: IContainer): void {
    container.singleton(
      'OrganizationRepository',
      () => new OrganizationRepository(getCurrentDatabaseAccess())
    )
    container.singleton(
      'CreateOrganizationService',
      (c) => new CreateOrganizationService(c.make('OrganizationRepository'))
    )
  }

  boot(container: IContainer): void {
    console.log('✅ Organization Module loaded')
  }
}
```

---

## Immutability Rules

Enforce immutable data flows throughout the application:

### Domain Objects

```typescript
// ❌ WRONG: Mutation
const account = await repo.findById(id)
account.balance = newBalance  // Mutation!
await repo.save(account)

// ✅ CORRECT: Immutability
const account = await repo.findById(id)
const updated = account.withBalance(newBalance)  // Returns new instance
await repo.save(updated)
```

### State Changes

All methods that modify state must return new instances:

```typescript
class CreditAccount {
  readonly balance: Balance
  readonly updatedAt: Date

  private constructor(balance: Balance, updatedAt: Date) {
    this.balance = balance
    this.updatedAt = updatedAt
  }

  // ✅ Returns new instance
  deductUsage(amount: Balance): CreditAccount {
    const newBalance = this.balance.subtract(amount)
    return new CreditAccount(newBalance, new Date())
  }
}
```

### DTOs and View Models

```typescript
interface UserDTO {
  readonly id: string
  readonly email: string
  readonly role: Role
  readonly createdAt: Date
}

// ✅ Use readonly at all levels
const user: UserDTO = { ... }
// user.email = 'new@example.com'  // ❌ Error: cannot assign
```

---

## Code Quality Checklist

Before marking work complete, verify:

- [ ] Code is readable and variables are well-named
- [ ] Functions are small (< 50 lines) and do one thing
- [ ] Files are focused (< 800 lines)
- [ ] No deep nesting (> 4 levels)
- [ ] Proper error handling (no silent failures)
- [ ] No `console.log` statements (logging via app-level mechanism)
- [ ] No hardcoded values (use constants or config)
- [ ] Immutable patterns used (no mutation)
- [ ] All parameters have explicit types
- [ ] All code paths return values (no implicit undefined)
- [ ] Tests pass (80%+ coverage)
- [ ] Biome lint and format pass
- [ ] TypeScript strict mode passes
