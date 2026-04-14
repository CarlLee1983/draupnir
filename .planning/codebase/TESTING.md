# Testing Patterns

**Analysis Date:** 2026-04-10

## Test Framework

**Runner:**
- Bun built-in test runner (for Unit tests)
- Vitest v4.0.18 (for isolated unit/integration tests with mocking)
- Playwright v1.48.0 (for E2E testing)
- Config: No separate config files; uses `package.json` `test` scripts

**Assertion Library:**
- Bun test: built-in expect API
- Vitest: expect API (compatible with Jest)

**Run Commands:**
```bash
bun test src tests                 # Run all tests
bun test src tests --watch        # Watch mode
bun test --coverage               # Coverage report
bun test tests/Unit/              # Run only unit tests
bun test tests/Feature/           # Run feature tests（若檔名為 *.e2e.ts，請用路徑前綴 ./ 單跑）
bun test src --filter integration # Run integration tests (marked in file)
bun test tests/ --filter User     # Run User-related tests
playwright test                   # E2E tests
playwright test --ui              # E2E with UI
playwright test --debug           # E2E debugging
```

## Test File Organization

**Location:**
- **Co-located (preferred):** `src/Modules/*/Domain/**/__tests__/` (unit tests alongside domain code)
- **Feature tests:** `tests/Feature/` (API-level, routes, flows)
- **Unit tests (framework):** `tests/Unit/` (BifrostClient, adapters, low-level)
- **E2E tests:** `playwright/tests/` (critical user flows)

**Naming:**
- Domain tests: `[ClassName].test.ts` (e.g., `Organization.test.ts`)
- Integration tests: `[ServiceName].integration.test.ts` (e.g., `CreditEventFlow.integration.test.ts`)
- Feature HTTP 測試：`[feature].e2e.ts`（例如 `routes-existence.e2e.ts`）；其他仍可用 `[feature].test.ts`

**Structure:**
```
src/Modules/Organization/
├── Domain/
│   ├── Aggregates/
│   │   └── Organization.ts
│   └── __tests__/
│       ├── Organization.test.ts         # Unit tests
│       └── OrganizationInvitation.test.ts

tests/
├── Feature/
│   ├── lib/
│   │   ├── test-client.ts              # Shared HTTP client for tests
│   │   ├── test-server.ts              # Test server setup
│   │   ├── auth-helper.ts              # Auth utilities
│   │   └── admin-seed.ts               # Test data seeding
│   ├── routes-existence.e2e.ts         # API endpoint existence（需 API_BASE_URL 或 test:feature）
│   ├── routes-connectivity.e2e.ts      # Route connectivity / auth behavior
│   ├── api-spec.test.ts                # API spec compliance
│   └── api-flows.test.ts               # End-to-end flows
├── Unit/
│   ├── Health/
│   │   └── HealthStatus.test.ts
│   ├── Foundation/
│   │   └── BifrostClient/
│   │       ├── BifrostClient.test.ts
│   │       ├── errors.test.ts
│   │       ├── retry.test.ts
│   │       └── types.test.ts
│   └── Adapters/
│       └── AtlasDatabaseAdapter.test.ts
```

## Test Structure

**Suite Organization (Bun test):**
```typescript
import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test'
import { TestClient } from './lib/test-client'

describe('Routes Existence Verification', () => {
  describe('Health Module', () => {
    it('GET /health 存在', async () => {
      const response = await client.get('/health')
      expect(response.status).not.toBe(404)
    })
  })

  describe('Auth Module', () => {
    it('POST /api/auth/register 存在', async () => {
      const response = await client.post('/api/auth/register', {})
      expect(response.status).not.toBe(404)
    })
  })
})
```

**Suite Organization (Vitest):**
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Organization } from '../Domain/Aggregates/Organization'

describe('Organization Aggregate', () => {
  it('應成功建立 Organization', () => {
    const org = Organization.create('org-1', 'CMG 科技', '公司描述')
    expect(org.id).toBe('org-1')
    expect(org.name).toBe('CMG 科技')
    expect(org.slug).toMatch(/^[a-z0-9\-]+$/)
    expect(org.status).toBe('active')
  })

  it('update 應回傳新物件', () => {
    const org = Organization.create('org-1', 'CMG 科技', '舊描述')
    const updated = org.update({ description: '新描述' })
    expect(updated.description).toBe('新描述')
    expect(org.description).toBe('舊描述')  // Original unchanged (immutability)
  })

  it('suspend 和 activate 應正確切換狀態', () => {
    const org = Organization.create('org-1', 'CMG', '')
    const suspended = org.suspend()
    expect(suspended.status).toBe('suspended')
    const activated = suspended.activate()
    expect(activated.status).toBe('active')
  })
})
```

**Patterns:**
- **Setup:** `beforeEach()` initializes dependencies and test state
- **Teardown:** `afterEach()` cleans up (e.g., `DomainEventDispatcher.resetForTesting()`)
- **Isolation:** Each test is independent; no shared mutable state between tests

## Mocking

**Framework:** Vitest `vi` or Bun `mock` (for built-in test)

**Pattern - Mocking External Services:**
```typescript
describe('Credit Event Flow 整合測試', () => {
  let apiKeyRepo: IApiKeyRepository
  let bifrostClient: BifrostClient

  beforeEach(async () => {
    // Mock ApiKey repo
    apiKeyRepo = {
      findActiveByOrgId: vi.fn(),
      findSuspendedByOrgId: vi.fn(),
      update: vi.fn(),
    } as unknown as IApiKeyRepository

    bifrostClient = {
      updateVirtualKey: vi.fn().mockResolvedValue({}),
    } as unknown as BifrostClient
  })
})
```

**Pattern - Mocking fetch (for HTTP tests):**
```typescript
describe('BifrostClient', () => {
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    client = new BifrostClient(TEST_CONFIG)
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('should create a virtual key', async () => {
    const mockResponse: VirtualKeyResponse = {
      message: 'Virtual key created',
      virtual_key: { id: 'vk-123', name: 'test-key', is_active: true, provider_configs: [] },
    }
    globalThis.fetch = mock(() => Promise.resolve(mockFetchResponse(200, mockResponse))) as any

    const result = await client.createVirtualKey({ name: 'test-key' })
    expect(result.id).toBe('vk-123')
  })
})
```

**What to Mock:**
- External API clients (Bifrost, third-party services)
- Repository implementations (use in-memory alternatives for tests)
- Global dependencies (fetch, timers, file system)
- Event dispatchers (for testing event handlers in isolation)

**What NOT to Mock:**
- Domain objects and value objects (test them directly)
- Application service business logic (test real logic, not mocked)
- Validation schemas (test with real Zod)
- Database adapters (use MemoryDatabaseAccess for integration tests)

## Fixtures and Factories

**Test Data Pattern - Memory Database:**
```typescript
beforeEach(async () => {
  db = new MemoryDatabaseAccess()
  accountRepo = new CreditAccountRepository(db)
  txRepo = new CreditTransactionRepository(db)

  // Create test data
  const account = CreditAccount.fromDatabase({
    id: 'acc-1',
    org_id: 'org-1',
    balance: '100',
    low_balance_threshold: '50',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })
  await accountRepo.save(account)
})
```

**Test Data Pattern - Domain Factory:**
```typescript
// Create aggregate directly
const org = Organization.create('org-1', 'CMG 科技', '公司描述')
expect(org.id).toBe('org-1')

// Or from database row
const org = Organization.fromDatabase({
  id: 'org-1',
  name: 'CMG 科技',
  slug: 'cmg',
  description: '公司描述',
  status: 'active',
  created_at: '2026-04-10T00:00:00Z',
  updated_at: '2026-04-10T00:00:00Z',
})
```

**Location:**
- Test helpers: `tests/Feature/lib/` (shared across feature tests)
- Domain factories: Within domain test files (kept simple and close to tests)
- Seed data: `tests/Feature/lib/admin-seed.ts` (for seeding test database)

## Coverage

**Requirements:** 80%+ coverage (enforced via `bun run verify`)

**View Coverage:**
```bash
bun test --coverage
# Generates coverage report in ./coverage directory
```

**Coverage Focus Areas:**
- Domain aggregates and entities: 100% (critical business logic)
- Application services: 80%+ (main use cases)
- Value objects: 100% (validation logic)
- Infrastructure adapters: 70%+ (implementation details)
- Controllers/Routes: Feature tests only (covered via API tests)

## Test Types

**Unit Tests:**
- **Scope:** Individual domain objects, value objects, services
- **Location:** `src/Modules/*/Domain/__tests__/` or `tests/Unit/`
- **Approach:** Test via public methods; mock all external dependencies
- **Speed:** Fast (no I/O, in-memory)
- **Example:** `Organization.test.ts`, `OrgSlug.test.ts`

**Integration Tests:**
- **Scope:** Multiple services working together, event flows, transactions
- **Location:** `src/Modules/*/Domain/__tests__/*.integration.test.ts`
- **Approach:** Use real repositories (MemoryDatabaseAccess), mock external APIs
- **Speed:** Medium (database operations)
- **Example:** `CreditEventFlow.integration.test.ts` (tests full credit workflow)

**Feature Tests (API Tests):**
- **Scope:** HTTP endpoints, request validation, response format
- **Location:** `tests/Feature/`
- **Approach:** Start test server, use TestClient HTTP wrapper
- **Speed:** Medium-slow (full server startup)
- **Example:** `routes-existence.e2e.ts`, `api-flows.test.ts`

**E2E Tests:**
- **Framework:** Playwright v1.48.0
- **Scope:** Critical user flows (authentication, create org, manage keys, etc.)
- **Location:** `playwright/tests/`
- **Approach:** Real browser, real server, full application flow
- **Speed:** Slow (browser automation)
- **Run:** `playwright test` or `playwright test --ui`

## Common Patterns

**Async Testing:**
```typescript
// Vitest with async/await
it('should handle async operations', async () => {
  const result = await service.execute(request)
  expect(result.success).toBe(true)
})

// Bun test with async/await
it('should fetch data', async () => {
  const response = await client.get('/api/organizations')
  expect(response.status).toBe(200)
})
```

**Error Testing:**
```typescript
// Testing exceptions
it('should throw on invalid slug', () => {
  expect(() => new OrgSlug('INVALID')).toThrow()
})

// Testing error responses
it('should return error response on manager not found', async () => {
  const result = await service.execute({
    name: 'Test Org',
    managerUserId: 'nonexistent',
  })
  expect(result.success).toBe(false)
  expect(result.error).toBe('MANAGER_NOT_FOUND')
})
```

**Service Response Testing Pattern:**
```typescript
// Services return { success, data?, error? }
it('應成功建立 Organization 並指定 Manager', async () => {
  const result = await service.execute({
    name: 'CMG 科技',
    description: '科技公司',
    managerUserId: managerId,
  })
  expect(result.success).toBe(true)
  expect(result.data?.name).toBe('CMG 科技')
  expect(result.data?.slug).toBeTruthy()
})

it('不存在的 Manager 應回傳錯誤', async () => {
  const result = await service.execute({
    name: 'Test Org',
    managerUserId: 'nonexistent',
  })
  expect(result.success).toBe(false)
  expect(result.error).toBe('MANAGER_NOT_FOUND')
})
```

**Event Dispatcher Testing (with cleanup):**
```typescript
describe('Event handling', () => {
  beforeEach(async () => {
    DomainEventDispatcher.resetForTesting()
    dispatcher.on('credit.balance_depleted', async (event) => {
      await handler.execute(event.data.orgId as string)
    })
  })

  afterEach(() => {
    DomainEventDispatcher.resetForTesting()  // Critical cleanup
  })

  it('should handle balance depleted event', async () => {
    // Test event dispatch
  })
})
```

**Test Client Helper Pattern:**
```typescript
// tests/Feature/lib/test-client.ts - reusable HTTP client
export class TestClient {
  constructor(private baseURL: string) {}

  async post(path: string, body: unknown, options?: { headers? }): Promise<TestResponse> {
    return this.request({ method: 'post', path }, { body, headers: options?.headers })
  }

  async get(path: string, auth?: string): Promise<TestResponse> {
    return this.request({ method: 'get', path }, { auth })
  }
}

// Usage in tests
let client: TestClient
beforeAll(() => {
  client = new TestClient(getBaseURL())
})

it('POST /api/organizations 存在', async () => {
  const response = await client.post('/api/organizations', {})
  expect(response.status).not.toBe(404)
})
```

**Immutability Testing Pattern:**
```typescript
it('update 應回傳新物件 (不改變原物件)', () => {
  const org = Organization.create('org-1', 'CMG 科技', '舊描述')
  const updated = org.update({ description: '新描述' })
  
  // Verify new object created
  expect(updated).not.toBe(org)
  
  // Verify original unchanged
  expect(org.description).toBe('舊描述')
  expect(updated.description).toBe('新描述')
})
```

---

*Testing analysis: 2026-04-10*
