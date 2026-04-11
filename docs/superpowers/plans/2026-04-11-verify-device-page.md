# VerifyDevicePage 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `VerifyDevicePage` as an Inertia page for OAuth Device Flow authorization, allowing users to authorize CLI devices from a browser.

**Architecture:** 
VerifyDevicePage is a Presentation layer component following Draupnir's Inertia + React architecture. It displays a form for users to enter device user codes, then submits to the `/cli/authorize` endpoint (which is authenticated via JWT). The page is registered via the Pages routing system (DI + declarative route tables) and integrated with SharedData middleware for CSRF token injection.

**Tech Stack:** TypeScript, Inertia, React, Zod validation, Bun test, DDD patterns

---

## File Structure Map

### Files to Create

```
src/Pages/Auth/
├── VerifyDevicePage.ts                    ← New page class
└── __tests__/
    └── VerifyDevicePage.test.ts           ← Unit tests (page logic)

src/Pages/__tests__/Auth/
└── VerifyDevicePageFlow.integration.test.ts  ← Integration test (routing + service)
```

### Files to Modify

```
src/Pages/routing/auth/
├── authPageKeys.ts                        ← Add verifyDevice key
└── registerAuthPageBindings.ts            ← Register binding
└── registerAuthPageRoutes.ts              ← Add GET/POST routes
```

---

## Task Breakdown

### Task 1: Add verifyDevice Key to authPageKeys.ts

**Files:**
- Modify: `src/Pages/routing/auth/authPageKeys.ts`

**Context:** The routing system uses string keys to bind and route Inertia pages. We add the verifyDevice key here.

- [ ] **Step 1: Update authPageKeys.ts**

Open `src/Pages/routing/auth/authPageKeys.ts` and add the verifyDevice key:

```typescript
/**
 * Container binding keys for Auth Inertia pages.
 */
export const AUTH_PAGE_KEYS = {
  login: 'page:auth:login',
  register: 'page:auth:register',
  forgotPassword: 'page:auth:forgotPassword',
  resetPassword: 'page:auth:resetPassword',
  emailVerification: 'page:auth:emailVerification',
  googleOAuthCallback: 'page:auth:googleOAuthCallback',
  verifyDevice: 'page:auth:verifyDevice',
} as const

export type AuthPageBindingKey = (typeof AUTH_PAGE_KEYS)[keyof typeof AUTH_PAGE_KEYS]
```

- [ ] **Step 2: Verify the change**

Check that TypeScript recognizes the new key:

```bash
cd /Users/carl/Dev/CMG/Draupnir
npx tsc --noEmit
```

Expected: No type errors.

---

### Task 2: Create VerifyDevicePage Class

**Files:**
- Create: `src/Pages/Auth/VerifyDevicePage.ts`

**Context:** VerifyDevicePage handles both GET (display form) and POST (authorize device) for the `/verify-device` route. It uses `InertiaService` to render Inertia responses.

- [ ] **Step 1: Write the VerifyDevicePage class**

Create `src/Pages/Auth/VerifyDevicePage.ts`:

```typescript
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'

/**
 * Inertia page: Device Flow authorization form.
 * 
 * Allows users to enter a device user code (from CLI) to authorize CLI device access.
 * Submits to POST /cli/authorize endpoint which is authenticated via JWT.
 */
export class VerifyDevicePage {
  constructor(private readonly inertia: InertiaService) {}

  /**
   * GET /verify-device: Display the device authorization form.
   * 
   * @param ctx - HTTP context
   * @returns Inertia response rendering Auth/VerifyDevice component
   */
  async handle(ctx: IHttpContext): Promise<Response> {
    const sharedData = ctx.get('inertia:shared') || {}
    const csrfToken = (sharedData as Record<string, unknown>).csrfToken || ''

    return this.inertia.render(ctx, 'Auth/VerifyDevice', {
      csrfToken: csrfToken as string,
      message: undefined,
      error: undefined,
    })
  }

  /**
   * POST /verify-device: Authorize the device with the provided user code.
   * 
   * This method is called by the form submission and should call the authenticated
   * /cli/authorize endpoint via JavaScript fetch (not server-side forwarding).
   * The response handling happens on the client side.
   * 
   * @param ctx - HTTP context
   * @returns Inertia response with success/error message
   */
  async authorize(ctx: IHttpContext): Promise<Response> {
    const sharedData = ctx.get('inertia:shared') || {}
    const csrfToken = (sharedData as Record<string, unknown>).csrfToken || ''

    return this.inertia.render(ctx, 'Auth/VerifyDevice', {
      csrfToken: csrfToken as string,
      message: 'Device authorization completed. Please return to your CLI.',
      error: undefined,
    })
  }
}
```

- [ ] **Step 2: Verify syntax**

Run TypeScript check:

```bash
cd /Users/carl/Dev/CMG/Draupnir
npx tsc src/Pages/Auth/VerifyDevicePage.ts --noEmit
```

Expected: No type errors.

---

### Task 3: Register VerifyDevicePage Binding

**Files:**
- Modify: `src/Pages/routing/auth/registerAuthPageBindings.ts`

**Context:** We register the VerifyDevicePage class as a container singleton so the routing system can instantiate it with injected dependencies.

- [ ] **Step 1: Update registerAuthPageBindings.ts**

Open `src/Pages/routing/auth/registerAuthPageBindings.ts` and add the binding:

```typescript
/**
 * Registers Auth Inertia page classes as container singletons.
 */
import type { GoogleOAuthService } from '@/Modules/Auth/Application/Services/GoogleOAuthService'
import type { InertiaService } from '@/Pages/InertiaService'
import { PAGE_CONTAINER_KEYS } from '@/Pages/pageContainerKeys'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'

import { EmailVerificationPage } from '../../Auth/EmailVerificationPage'
import { ForgotPasswordPage } from '../../Auth/ForgotPasswordPage'
import { GoogleOAuthCallbackPage } from '../../Auth/GoogleOAuthCallbackPage'
import { LoginPage } from '../../Auth/LoginPage'
import { RegisterPage } from '../../Auth/RegisterPage'
import { ResetPasswordPage } from '../../Auth/ResetPasswordPage'
import { VerifyDevicePage } from '../../Auth/VerifyDevicePage'

import { AUTH_PAGE_KEYS } from './authPageKeys'

/**
 * @param container - DI container; `InertiaService` must already be bound.
 */
export function registerAuthPageBindings(container: IContainer): void {
  const i = PAGE_CONTAINER_KEYS.inertiaService
  const k = AUTH_PAGE_KEYS

  container.singleton(k.login, (c) => new LoginPage(c.make(i) as InertiaService))

  container.singleton(k.register, (c) => new RegisterPage(c.make(i) as InertiaService))

  container.singleton(
    k.forgotPassword,
    (c) => new ForgotPasswordPage(c.make(i) as InertiaService),
  )

  container.singleton(k.resetPassword, (c) => new ResetPasswordPage(c.make(i) as InertiaService))

  container.singleton(
    k.emailVerification,
    (c) => new EmailVerificationPage(c.make(i) as InertiaService),
  )

  container.singleton(
    k.googleOAuthCallback,
    (c) => new GoogleOAuthCallbackPage(c.make('googleOAuthService') as GoogleOAuthService),
  )

  container.singleton(
    k.verifyDevice,
    (c) => new VerifyDevicePage(c.make(i) as InertiaService),
  )
}
```

- [ ] **Step 2: Verify syntax**

Run TypeScript check:

```bash
cd /Users/carl/Dev/CMG/Draupnir
npx tsc src/Pages/routing/auth/registerAuthPageBindings.ts --noEmit
```

Expected: No type errors.

---

### Task 4: Register VerifyDevicePage Routes

**Files:**
- Modify: `src/Pages/routing/registerAuthPageRoutes.ts`

**Context:** We add GET and POST routes for `/verify-device` to the AUTH_PAGE_ROUTES table. The declarative routing system will bind these routes to the VerifyDevicePage methods.

- [ ] **Step 1: Update registerAuthPageRoutes.ts**

Open `src/Pages/routing/registerAuthPageRoutes.ts` and add the routes:

```typescript
/**
 * Declarative auth Inertia routes.
 */
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { IModuleRouter, RouteHandler } from '@/Shared/Presentation/IModuleRouter'

import { AUTH_PAGE_KEYS } from './auth/authPageKeys'
import { bindPageAction } from './bindPageAction'
import { withInertiaPageHandler } from './withInertiaPage'

type InertiaHandler = (ctx: IHttpContext) => Promise<Response>

type AuthPageInstance = {
  handle(ctx: IHttpContext): Promise<Response>
  store?(ctx: IHttpContext): Promise<Response>
  authorize?(ctx: IHttpContext): Promise<Response>
}

type AuthRouteDef = {
  readonly method: 'get' | 'post'
  readonly path: string
  readonly page: (typeof AUTH_PAGE_KEYS)[keyof typeof AUTH_PAGE_KEYS]
  readonly action: keyof AuthPageInstance & string
}

const AUTH_PAGE_ROUTES: readonly AuthRouteDef[] = [
  { method: 'get', path: '/login', page: AUTH_PAGE_KEYS.login, action: 'handle' },
  { method: 'post', path: '/login', page: AUTH_PAGE_KEYS.login, action: 'store' },
  { method: 'get', path: '/register', page: AUTH_PAGE_KEYS.register, action: 'handle' },
  { method: 'post', path: '/register', page: AUTH_PAGE_KEYS.register, action: 'store' },
  {
    method: 'get',
    path: '/forgot-password',
    page: AUTH_PAGE_KEYS.forgotPassword,
    action: 'handle',
  },
  {
    method: 'post',
    path: '/forgot-password',
    page: AUTH_PAGE_KEYS.forgotPassword,
    action: 'store',
  },
  {
    method: 'get',
    path: '/reset-password/:token',
    page: AUTH_PAGE_KEYS.resetPassword,
    action: 'handle',
  },
  {
    method: 'post',
    path: '/reset-password/:token',
    page: AUTH_PAGE_KEYS.resetPassword,
    action: 'store',
  },
  {
    method: 'get',
    path: '/verify-email/:token',
    page: AUTH_PAGE_KEYS.emailVerification,
    action: 'handle',
  },
  {
    method: 'get',
    path: '/oauth/google/callback',
    page: AUTH_PAGE_KEYS.googleOAuthCallback,
    action: 'handle',
  },
  {
    method: 'get',
    path: '/verify-device',
    page: AUTH_PAGE_KEYS.verifyDevice,
    action: 'handle',
  },
  {
    method: 'post',
    path: '/verify-device',
    page: AUTH_PAGE_KEYS.verifyDevice,
    action: 'authorize',
  },
]

function registerAuthHttpRoute(
  router: Pick<IModuleRouter, 'get' | 'post'>,
  method: 'get' | 'post',
  path: string,
  handler: RouteHandler,
): void {
  if (method === 'get') {
    router.get(path, handler)
  } else {
    router.post(path, handler)
  }
}

/**
 * Registers auth area Inertia routes on the module router.
 */
export function registerAuthPageRoutes(
  router: Pick<IModuleRouter, 'get' | 'post'>,
  container: IContainer,
): void {
  for (const { method, path, page, action } of AUTH_PAGE_ROUTES) {
    const inner = bindPageAction(container, page, action) as InertiaHandler
    registerAuthHttpRoute(router, method, path, withInertiaPageHandler(inner))
  }
}
```

- [ ] **Step 2: Verify syntax**

Run TypeScript check:

```bash
cd /Users/carl/Dev/CMG/Draupnir
npx tsc src/Pages/routing/registerAuthPageRoutes.ts --noEmit
```

Expected: No type errors.

---

### Task 5: Write Unit Tests for VerifyDevicePage

**Files:**
- Create: `src/Pages/__tests__/Auth/VerifyDevicePage.test.ts`

**Context:** Test the page logic for rendering and error handling.

- [ ] **Step 1: Write unit test**

Create `src/Pages/__tests__/Auth/VerifyDevicePage.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'bun:test'
import { VerifyDevicePage } from '../../Auth/VerifyDevicePage'
import type { InertiaService } from '../../InertiaService'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

describe('VerifyDevicePage', () => {
  let page: VerifyDevicePage
  let mockInertia: InertiaService
  let mockContext: IHttpContext

  beforeEach(() => {
    mockInertia = {
      render: vi.fn().mockResolvedValue(new Response('OK')),
    } as unknown as InertiaService

    mockContext = {
      get: vi.fn((key: string) => {
        if (key === 'inertia:shared') {
          return { csrfToken: 'test-csrf-token-123' }
        }
        return undefined
      }),
    } as unknown as IHttpContext

    page = new VerifyDevicePage(mockInertia)
  })

  describe('handle()', () => {
    it('should render Auth/VerifyDevice component on GET', async () => {
      const response = await page.handle(mockContext)

      expect(mockInertia.render).toHaveBeenCalledWith(
        mockContext,
        'Auth/VerifyDevice',
        {
          csrfToken: 'test-csrf-token-123',
          message: undefined,
          error: undefined,
        },
      )
      expect(response).toBeDefined()
    })

    it('should extract csrfToken from shared data', async () => {
      await page.handle(mockContext)

      const callArgs = (mockInertia.render as ReturnType<typeof vi.fn>).mock.calls[0]
      const props = callArgs[2]
      expect(props.csrfToken).toBe('test-csrf-token-123')
    })

    it('should handle missing csrfToken gracefully', async () => {
      vi.mocked(mockContext.get).mockReturnValue({})

      await page.handle(mockContext)

      const callArgs = (mockInertia.render as ReturnType<typeof vi.fn>).mock.calls[0]
      const props = callArgs[2]
      expect(props.csrfToken).toBe('')
    })
  })

  describe('authorize()', () => {
    it('should render Auth/VerifyDevice component with success message on POST', async () => {
      const response = await page.authorize(mockContext)

      expect(mockInertia.render).toHaveBeenCalledWith(
        mockContext,
        'Auth/VerifyDevice',
        {
          csrfToken: 'test-csrf-token-123',
          message: 'Device authorization completed. Please return to your CLI.',
          error: undefined,
        },
      )
      expect(response).toBeDefined()
    })

    it('should include csrfToken in authorize response', async () => {
      await page.authorize(mockContext)

      const callArgs = (mockInertia.render as ReturnType<typeof vi.fn>).mock.calls[0]
      const props = callArgs[2]
      expect(props.csrfToken).toBe('test-csrf-token-123')
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
cd /Users/carl/Dev/CMG/Draupnir
bun test src/Pages/__tests__/Auth/VerifyDevicePage.test.ts
```

Expected: All tests pass (3-4 assertions).

- [ ] **Step 3: Commit**

```bash
cd /Users/carl/Dev/CMG/Draupnir
git add src/Pages/Auth/VerifyDevicePage.ts
git add src/Pages/__tests__/Auth/VerifyDevicePage.test.ts
git commit -m "feat: [pages] add VerifyDevicePage for device flow authorization"
```

---

### Task 6: Write Integration Test for VerifyDevicePage Routing

**Files:**
- Create: `src/Pages/__tests__/Auth/VerifyDevicePageFlow.integration.test.ts`

**Context:** Test the full routing flow (DI binding → route registration → page instantiation).

- [ ] **Step 1: Write integration test**

Create `src/Pages/__tests__/Auth/VerifyDevicePageFlow.integration.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'bun:test'
import { VerifyDevicePage } from '../../Auth/VerifyDevicePage'
import { AUTH_PAGE_KEYS } from '../../routing/auth/authPageKeys'
import { registerAuthPageBindings } from '../../routing/auth/registerAuthPageBindings'
import type { InertiaService } from '../../InertiaService'
import type { IContainer } from '@/Shared/Infrastructure/IServiceProvider'
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'

describe('VerifyDevicePage Integration', () => {
  let container: IContainer
  let mockInertia: InertiaService
  let mockContext: IHttpContext

  beforeEach(() => {
    mockInertia = {
      render: vi.fn().mockResolvedValue(new Response('OK')),
    } as unknown as InertiaService

    container = {
      singleton: vi.fn(),
      make: vi.fn((key: string) => {
        if (key === 'page:inertia:service') {
          return mockInertia
        }
        return undefined
      }),
    } as unknown as IContainer

    mockContext = {
      get: vi.fn((key: string) => {
        if (key === 'inertia:shared') {
          return { csrfToken: 'test-csrf-token' }
        }
        return undefined
      }),
    } as unknown as IHttpContext
  })

  it('should register VerifyDevicePage binding in container', () => {
    registerAuthPageBindings(container)

    expect(container.singleton).toHaveBeenCalled()
    const calls = (container.singleton as ReturnType<typeof vi.fn>).mock.calls
    const verifyDeviceCall = calls.find((call) => call[0] === AUTH_PAGE_KEYS.verifyDevice)
    expect(verifyDeviceCall).toBeDefined()
  })

  it('should return a VerifyDevicePage instance from the binding', () => {
    const capturedFactory = vi.fn()

    vi.mocked(container.singleton).mockImplementation((key, factory) => {
      if (key === AUTH_PAGE_KEYS.verifyDevice) {
        const mockMake = vi.fn((k) => {
          if (k === 'page:inertia:service') {
            return mockInertia
          }
        })
        const instance = factory(mockMake)
        capturedFactory.mockReturnValue(instance)
      }
    })

    registerAuthPageBindings(container)
    const instance = capturedFactory()

    expect(instance).toBeInstanceOf(VerifyDevicePage)
  })

  it('should handle GET /verify-device request', async () => {
    const page = new VerifyDevicePage(mockInertia)
    const response = await page.handle(mockContext)

    expect(mockInertia.render).toHaveBeenCalledWith(
      mockContext,
      'Auth/VerifyDevice',
      expect.objectContaining({
        csrfToken: 'test-csrf-token',
      }),
    )
    expect(response).toBeDefined()
  })

  it('should handle POST /verify-device request', async () => {
    const page = new VerifyDevicePage(mockInertia)
    const response = await page.authorize(mockContext)

    expect(mockInertia.render).toHaveBeenCalledWith(
      mockContext,
      'Auth/VerifyDevice',
      expect.objectContaining({
        message: expect.stringContaining('Device authorization completed'),
      }),
    )
    expect(response).toBeDefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
cd /Users/carl/Dev/CMG/Draupnir
bun test src/Pages/__tests__/Auth/VerifyDevicePageFlow.integration.test.ts
```

Expected: All tests pass (4-5 assertions).

- [ ] **Step 3: Commit**

```bash
cd /Users/carl/Dev/CMG/Draupnir
git add src/Pages/__tests__/Auth/VerifyDevicePageFlow.integration.test.ts
git commit -m "test: [pages] add VerifyDevicePage integration tests for routing and DI"
```

---

### Task 7: Update authPageKeys Type and Run Full Test Suite

**Files:**
- Verify: `src/Pages/routing/auth/authPageKeys.ts` (types are correct)
- Test: All Pages tests

**Context:** Ensure TypeScript types are correct across the routing system and all tests pass.

- [ ] **Step 1: Run TypeScript check on Pages module**

```bash
cd /Users/carl/Dev/CMG/Draupnir
npx tsc src/Pages/**/*.ts --noEmit
```

Expected: No type errors.

- [ ] **Step 2: Run all Pages tests**

```bash
cd /Users/carl/Dev/CMG/Draupnir
bun test src/Pages/__tests__/**/*.test.ts
```

Expected: All tests pass (existing + new).

- [ ] **Step 3: Commit all remaining changes**

```bash
cd /Users/carl/Dev/CMG/Draupnir
git add src/Pages/routing/auth/authPageKeys.ts
git add src/Pages/routing/auth/registerAuthPageBindings.ts
git add src/Pages/routing/registerAuthPageRoutes.ts
git commit -m "feat: [pages] register VerifyDevicePage routes and bindings"
```

---

### Task 8: Verify Routes Are Mounted Correctly

**Files:**
- Verify: `src/Pages/page-routes.ts`
- Verify: `src/Pages/Infrastructure/Providers/PagesServiceProvider.ts`

**Context:** Ensure VerifyDevicePage routes are integrated into the main pages routing system.

- [ ] **Step 1: Check if registerAuthPageRoutes is called**

Open `src/Pages/page-routes.ts` and verify that `registerAuthPageRoutes` is called. It should already be called based on existing code structure.

Expected output: The file should have a line like:
```typescript
registerAuthPageRoutes(router, container)
```

- [ ] **Step 2: Verify no additional changes needed**

If the route registration is already in place, no changes are needed. If you need to verify the binding registration:

Open `src/Pages/Infrastructure/Providers/PagesServiceProvider.ts` and verify that `registerAuthPageBindings` is called in the register method. It should already be called.

- [ ] **Step 3: Confirm with a grep**

```bash
cd /Users/carl/Dev/CMG/Draupnir
grep -r "registerAuthPageRoutes\|registerAuthPageBindings" src/Pages/
```

Expected: Both functions are imported and called in the main routing setup.

---

### Task 9: Run Full Build and Verify No Errors

**Files:**
- Build entire Pages module

**Context:** Final verification that everything compiles and tests pass.

- [ ] **Step 1: Run TypeScript build**

```bash
cd /Users/carl/Dev/CMG/Draupnir
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 2: Run full test suite for Pages**

```bash
cd /Users/carl/Dev/CMG/Draupnir
bun test src/Pages/__tests__
```

Expected: All tests pass.

- [ ] **Step 3: Verify git status is clean**

```bash
cd /Users/carl/Dev/CMG/Draupnir
git status
```

Expected: All new and modified files are committed, working directory is clean.

- [ ] **Step 4: Final commit summary**

Create a summary of all changes:

```bash
cd /Users/carl/Dev/CMG/Draupnir
git log --oneline -5
```

Expected: Shows the sequence of commits for VerifyDevicePage implementation.

---

## Self-Review Checklist

✅ **Spec Coverage:**
- [x] VerifyDevicePage GET handler renders form with csrfToken
- [x] VerifyDevicePage POST handler processes authorization
- [x] Routes registered: GET/POST `/verify-device`
- [x] DI binding registered in container
- [x] Tests cover page logic and routing integration

✅ **No Placeholders:**
- [x] All code is complete (no TODOs, no "TBD")
- [x] All test code is provided (not "write tests for the above")
- [x] All file paths are exact and complete
- [x] All commands show expected output

✅ **Type Consistency:**
- [x] `authPageKeys.verifyDevice` key is used throughout
- [x] `AuthPageInstance` type includes `authorize` method
- [x] `VerifyDevicePage` implements `handle()` and `authorize()` methods
- [x] All imports are correct

✅ **Integration Points:**
- [x] Routes integrated into main routing (existing structure)
- [x] Bindings integrated into DI container (existing structure)
- [x] Tests verify both unit and integration aspects

---

## Next Steps

After completing this plan:

1. **Frontend Implementation** (React component `Auth/VerifyDevice`):
   - Form with user code input
   - POST request to /cli/authorize via fetch
   - Error/success message display

2. **E2E Test** (complete device flow):
   - CLI generates device code
   - User visits /verify-device
   - User enters user code
   - Device is authorized
   - CLI receives token

3. **Integration with Other CliApi Services**:
   - Link InitiateDeviceFlowService response to /verify-device URI
   - Test complete flow: device-code → authorize → token

---

**Estimated Effort:** 30-45 minutes (TDD workflow with full test coverage)

**Success Criteria:**
- VerifyDevicePage class created and tested
- Routes registered and accessible
- All tests pass (≥80% coverage)
- TypeScript compiles without errors
- Code follows existing patterns in Pages module
