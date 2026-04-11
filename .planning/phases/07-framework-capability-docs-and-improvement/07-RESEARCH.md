# Phase 7: 框架功能盤點文件化與缺失功能完善計劃 - Research

**Researched:** 2026-04-11
**Domain:** Gravito framework module skills, i18n integration, API English-only enforcement, test stabilization
**Confidence:** HIGH

---

## Summary

Phase 7 is the post-milestone cleanup and capability-completion phase. After Phases 1–6 addressed the LLM gateway abstraction, domain rename, SDK extraction, and page test coverage, Phase 7 resolves two orthogonal concerns: (1) completing the i18n migration that was designed and partially implemented (the `src/Shared/Infrastructure/I18n/` infrastructure already exists) but not wired into pages or enforced in API controllers; and (2) addressing the 39 failing unit tests visible in the current test run.

The Gravito skill library (`skills/gravito-cosmos`) provides the full Draupnir-specific patterns for locale resolution, catalog structure, and SharedDataMiddleware integration. Two specification documents in `docs/superpowers/plans/` (`2026-04-11-gravito-i18n.md` and `2025-05-15-english-only-api-responses.md`) already decompose the work into specific file-level tasks; these are the authoritative implementation guides for this phase.

The current codebase has 39 failing tests and 3 errors. Key failure drivers are: `HandleCreditToppedUpService` test throws an unexpected `GatewayError`, and multiple page handler tests assert Chinese strings that the pages still return (hardcoded Chinese not yet replaced with i18n catalog calls). The i18n infrastructure (`loadMessages`, `resolvePageLocale`) is already implemented; the gap is wiring and replacement.

**Primary recommendation:** Phase 7 should be structured as two parallel tracks — (A) fix existing test failures (the 39 fails, primarily Credit module test bugs and Chinese-string assertion mismatches), and (B) complete the i18n migration per the existing plan documents (wire SharedDataMiddleware, replace page hardcoded strings, enforce English-only in API controllers). Both tracks MUST leave the full test suite green.

---

## Project Constraints (from CLAUDE.md / AGENTS.md)

The following directives are extracted from project instructions and apply throughout Phase 7 planning:

- **No new dependencies** — stay within the existing stack (Bun, TypeScript strict, Biome, Zod, `@gravito/cosmos` already installed). Do not add new npm packages.
- **Routes unchanged** — all existing HTTP routes, request/response shapes, and DB schemas must remain unchanged. Phase 7 is a correctness/quality phase.
- **Full test suite must pass at every plan boundary** — no skipped or `todo` tests introduced.
- **Immutability** — new types use `readonly` fields; no mutation.
- **Language** — commit messages, docs, and planning artifacts in Traditional Chinese (Taiwan). Code and identifiers in English.
- **Commit format** — `<type>: [<scope>] <subject>`.
- **No new `any` types or `@ts-ignore`** — TypeScript strict compliance.
- **Biome lint + format must be clean** — run `bun run lint` and `bun run typecheck` at phase gate.
- **API responses must be English-only** — per `docs/superpowers/plans/2025-05-15-english-only-api-responses.md` and `docs/draupnir/specs/2026-04-11-gravito-i18n-design.md`.
- **i18n catalogs for page layer** — per `docs/superpowers/plans/2026-04-11-gravito-i18n.md`, page-layer strings use `@gravito/cosmos` catalogs via `loadMessages`; API layer strings are plain English constants.
- **GSD workflow** — changes must go through `/gsd:execute-phase`, not direct edits.

---

## Standard Stack

### Core (already installed, no additions needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@gravito/cosmos` | installed | i18n locale resolution and catalog loading | Project-chosen i18n orbit |
| `bun:test` | built-in | Unit/integration test runner | Project standard |
| `zod` | 4.3.6 | Schema validation and type inference | Project standard |
| `biome` | 2.4.11 | Lint + format | Project standard |
| TypeScript | 5.3.0 | Language, strict mode | Project standard |

### Supporting (already implemented infrastructure)

| Library | Path | Purpose | When to Use |
|---------|------|---------|-------------|
| `loadMessages` | `src/Shared/Infrastructure/I18n/loadMessages.ts` | Per-locale message catalog | Page handlers needing i18n |
| `resolvePageLocale` | `src/Shared/Infrastructure/I18n/resolvePageLocale.ts` | Derive locale from request context | SharedDataMiddleware |
| `SharedDataMiddleware` | `src/Pages/SharedDataMiddleware.ts` | Inject `locale` + `messages` into Inertia shared props | All page routes |

**Installation:** No new installs required. Everything is already in `bun.lock`.

---

## Architecture Patterns

### Recommended Project Structure for i18n

The project already has the correct structure; Phase 7 completes the wiring:

```
src/
├── Shared/Infrastructure/I18n/
│   ├── index.ts                  # exports loadMessages, resolvePageLocale, LocaleCode
│   ├── loadMessages.ts           # catalog object, Proxy fallback (DONE)
│   ├── resolvePageLocale.ts      # locale priority chain (DONE)
│   └── __tests__/               # tests for these helpers (DONE)
├── Pages/
│   ├── SharedDataMiddleware.ts   # MUST expose locale + messages in shared props
│   ├── Admin/*.ts               # MUST read messages from ctx.get('inertia:shared')
│   └── Member/*.ts              # MUST read messages from ctx.get('inertia:shared')
```

### Pattern 1: i18n in Page Handlers (Replace Hardcoded Strings)

**What:** Each Admin/Member page handler reads `locale` and `messages` from the shared Inertia context set by `SharedDataMiddleware`, then uses catalog keys instead of hardcoded strings.

**When to use:** Any page handler that currently returns a hardcoded Chinese or English string in an error or message prop.

**Example:**
```typescript
// Source: docs/superpowers/plans/2026-04-11-gravito-i18n.md Task 4
const { locale, messages } = ctx.get('inertia:shared') as {
  locale: 'zh-TW' | 'en'
  messages: Record<string, string>
}

return this.inertia.render(ctx, 'Member/Dashboard/Index', {
  orgId: null,
  error: messages['member.dashboard.selectOrg'] ?? 'member.dashboard.selectOrg',
})
```

### Pattern 2: English-Only in API Controllers

**What:** API controllers and application services replace all Chinese fallback strings with English constants. Error codes remain unchanged.

**When to use:** Any module service returning a `{ success: false, message: '中文...' }` response.

**Example:**
```typescript
// Source: docs/superpowers/plans/2025-05-15-english-only-api-responses.md Task 1
// BEFORE
return { success: false, message: '登出失敗', error: 'LOGOUT_FAILED' }
// AFTER
return { success: false, message: 'Logout failed', error: 'LOGOUT_FAILED' }
```

### Pattern 3: Zod Validation Error Messages

**What:** Zod schema messages in Request classes use English strings.

**Example:**
```typescript
// BEFORE (Organization/Presentation/Requests/CreateOrganizationRequest.ts)
name: z.string().min(1, '名稱不能為空').max(100)
// AFTER
name: z.string().min(1, 'Name is required').max(100)
```

### Pattern 4: SharedDataMiddleware Locale Injection

**What:** `SharedDataMiddleware` resolves locale once per request and adds `locale` + `messages` to Inertia shared data.

**Example:**
```typescript
// Source: docs/superpowers/plans/2026-04-11-gravito-i18n.md Task 3
import { loadMessages, resolvePageLocale } from '@/Shared/Infrastructure/I18n'

const locale = resolvePageLocale(ctx)
const messages = loadMessages(locale)
// Merge into existing shared data structure
```

### Anti-Patterns to Avoid

- **Hardcoded Chinese in page handlers:** Every `'中文字串'` in `src/Pages/**/*.ts` must become a catalog lookup.
- **i18n in API responses:** API layer (`src/Modules/**/Controllers/**`) must NOT use `loadMessages` — English constants only.
- **Mixing locale resolution per-handler:** Only `SharedDataMiddleware` resolves locale; page handlers read from `ctx.get('inertia:shared')`.
- **Changing error codes:** `error: 'UNAUTHORIZED'` etc. must stay stable — only `message` values change.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Locale resolution | Custom `Accept-Language` parser | `resolvePageLocale` (already in `src/Shared/Infrastructure/I18n/`) | Already correct and tested |
| Message catalog with fallback | Custom key lookup | `loadMessages` with Proxy fallback (already implemented) | Already handles missing-key → return-key pattern |
| i18n orbit bootstrap | Custom orbit | `@gravito/cosmos` via `OrbitCosmos` | Project-standard orbit; see `skills/gravito-cosmos/` |
| Test mocking for page handlers | New mock utilities | `createMockContext` from `src/Pages/__tests__/InertiaService.test.ts` | Already used across all page tests in Phase 6 |

**Key insight:** The i18n infrastructure (loadMessages, resolvePageLocale) is already production-ready. Phase 7 only wires it in and replaces strings — no new framework code is needed.

---

## Current Test Failure Analysis (HIGH CONFIDENCE)

This is the most critical input for planning. The suite currently shows **39 fail / 3 errors** across 912 tests in 138 files.

### Category A: Credit Module Test Errors (3 errors, ~6 fails)

**Root cause:** `HandleCreditToppedUpService.test.ts` uses `mock.failNext(new GatewayError(...))` inside an `async` closure. The `GatewayError` is being thrown during `failNext` setup rather than deferred as intended. This is a test-code bug introduced during Phase 2.

**Files affected:**
- `src/Modules/Credit/__tests__/HandleCreditToppedUpService.test.ts` — 3 `errors` (process-level throws)
- `src/Modules/Credit/__tests__/HandleBalanceDepletedService.test.ts` — Chinese console.log strings in test output (test passes but logs Chinese)

**Action:** Fix the async/await pattern in `HandleCreditToppedUpService.test.ts` so `GatewayError` is constructed before passing to `failNext`. Update `HandleBalanceDepletedService.ts` console.log strings to English.

### Category B: Page Handler Tests Asserting Chinese Strings (~33 fails)

**Root cause:** Phase 6 added page handler unit tests (Plans 06-01 and 06-02) that assert Chinese strings such as `'請先選擇組織'`, `'合約列表查詢失敗'`, etc. The i18n migration plan requires these to become catalog keys — but the pages haven't been updated yet.

The tests in `src/Pages/__tests__/Member/` and `src/Pages/__tests__/Admin/` are asserting the *current* hardcoded Chinese output. When i18n wiring is done, the pages will return English (for `en` locale) or zh-TW strings from catalogs. Tests need to be updated to assert catalog-driven output or use locale-specific fixture setup.

**Files affected (representative):**
- `src/Pages/__tests__/Member/MemberApiKeysPage.test.ts`
- `src/Pages/__tests__/Member/MemberContractsPage.test.ts`
- `src/Pages/__tests__/Member/MemberSettingsPage.test.ts`
- `src/Pages/__tests__/Admin/AdminModuleCreatePage.ts` (via `AdminUsageSyncPage` and `AdminModuleCreatePage` hardcoded strings)

**Action:** The correct sequencing is:
1. Wire `SharedDataMiddleware` to inject `locale` + `messages` (Task 3 of the i18n plan)
2. Update page handlers to use catalog keys (Tasks 4 and 5)
3. Update tests to inject a fixed locale/messages into mock context and assert the catalog-driven output

---

## Common Pitfalls

### Pitfall 1: Updating Messages Without Updating Tests

**What goes wrong:** Tests asserting `toBe('請先選擇組織')` will fail after pages are updated to use catalogs. Many current failing tests are ALREADY in this state.

**Why it happens:** Phase 6 wrote tests against the current hardcoded Chinese output. Phase 7 changes that output.

**How to avoid:** In each plan that updates page handlers, also update the corresponding test to pass a `messages` fixture with the expected catalog value, then assert against that.

**Warning signs:** A test failing with `expect(received).toBe('Please select an organization first')` after i18n wiring.

### Pitfall 2: i18n in API Layer

**What goes wrong:** Developer applies `loadMessages` to API controller responses "for consistency," breaking the English-only API contract.

**Why it happens:** Confusion between page-layer (Inertia) and API layer (JSON) response strategies.

**How to avoid:** Only files under `src/Pages/` use `loadMessages`. Files under `src/Modules/*/Presentation/Controllers/` use plain English string literals.

**Warning signs:** An import of `loadMessages` or `resolvePageLocale` in a Controller file.

### Pitfall 3: SharedDataMiddleware Not Running Before Page Handlers

**What goes wrong:** Page handler calls `ctx.get('inertia:shared')` but it is undefined because the middleware hasn't run.

**Why it happens:** Middleware ordering in route registration.

**How to avoid:** Verify `SharedDataMiddleware` is registered before page route handlers in `src/Pages/page-routes.ts`. The existing Phase 6 page tests use `createMockContext` which sets `ctx.get('inertia:shared')` directly — ensure the fixture sets `locale` and `messages`.

**Warning signs:** `Cannot destructure property 'locale' of undefined` runtime error.

### Pitfall 4: Missing Catalog Keys Causing Regression

**What goes wrong:** A page handler references a key not in `loadMessages` catalogs; the Proxy returns the key itself instead of a translated string.

**Why it happens:** Developer adds a new message in a page handler without adding the corresponding key to the catalog.

**How to avoid:** When adding a new message, add the key to BOTH `zh-TW` and `en` in `loadMessages.ts` BEFORE updating the page handler. Run the test to verify the key resolves.

**Warning signs:** Page test asserting a message string but receiving the raw key (e.g., `'admin.contracts.newKey'` instead of `'Contract created'`).

### Pitfall 5: Domain Value Object Chinese Throw Messages

**What goes wrong:** `AppKeyScope.ts`, `KeyRotationPolicy.ts`, `Email.ts`, `PasswordHasher.ts` throw domain errors with Chinese messages. These propagate into application service catch blocks.

**Why it happens:** These domain objects predate the English-only policy.

**How to avoid:** When fixing API English responses, follow the error propagation chain. If an application service has `catch (error) { message: error.message || '失敗' }`, update BOTH the fallback AND the domain object throw messages to English.

**Warning signs:** Chinese string appearing in an API response `message` field despite the service fallback being English.

---

## Code Examples

### SharedDataMiddleware Locale Injection
```typescript
// Source: docs/superpowers/plans/2026-04-11-gravito-i18n.md Task 3
// src/Pages/SharedDataMiddleware.ts
import { loadMessages, resolvePageLocale } from '@/Shared/Infrastructure/I18n'

// Inside the middleware function that builds shared data:
const locale = resolvePageLocale(ctx)
const messages = loadMessages(locale)
// Add to existing shared data object:
// { ..., locale, messages }
```

### Test Fixture Pattern for i18n Page Tests
```typescript
// Pattern used across Phase 6 page tests — extend to include i18n fields
const ctx = createMockContext({ ... })
ctx.set('inertia:shared', {
  auth: { user: { id: 'u1', email: 'test@example.com', role: 'member' } },
  currentOrgId: null,
  locale: 'en',
  messages: loadMessages('en'),
  flash: {},
})
```

### English-Only Fallback in Service
```typescript
// BEFORE: src/Modules/Auth/Application/Services/LogoutUserService.ts
message: error.message || '登出失敗',

// AFTER
message: error.message || 'Logout failed',
```

### Zod Request Validation English
```typescript
// BEFORE: src/Modules/Organization/Presentation/Requests/CreateOrganizationRequest.ts
name: z.string().min(1, '名稱不能為空').max(100)

// AFTER
name: z.string().min(1, 'Name is required').max(100)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded Chinese in page handlers | `loadMessages` catalog lookup via `ctx.get('inertia:shared').messages` | Phase 7 (this phase) | Pages become locale-aware |
| Chinese fallback strings in API services | English constants only | Phase 7 (this phase) | API responses language-stable |
| Chinese Zod error messages | English Zod messages | Phase 7 (this phase) | Validation errors consistent with API language policy |
| `console.log` with Chinese text in Credit services | English log strings | Phase 7 (this phase) | Log correlation in production |
| 39 failing tests | Full suite green | Phase 7 (this phase) | Quality gate restored |

---

## Open Questions

1. **Does SharedDataMiddleware already inject `locale`/`messages`?**
   - What we know: The file exists. The i18n helpers are implemented. The test in `member-page-i18n.test.ts` asserts `shared.locale` and `shared.messages`.
   - What's unclear: Whether the middleware already injects these or just injects the other fields. Need to read `src/Pages/SharedDataMiddleware.ts` body in planning phase to confirm what's already done vs. still needed.
   - Recommendation: First task in execution must read the current `SharedDataMiddleware.ts` implementation to determine if Task 3 of the i18n plan is complete or pending.

2. **Are the 39 failing tests all Chinese-string assertion failures, or are there other categories?**
   - What we know: `HandleCreditToppedUpService.test.ts` has 3 process-level errors (GatewayError thrown outside mock context). The output shows pattern `expect(received).not.toBe(expected)` and `expect(received).toContain(expected)` suggesting string mismatches.
   - What's unclear: The exact count split between Credit errors and page test string failures.
   - Recommendation: Plan 07-01 should include a diagnostic task that runs specific test files to classify failures before modifying any code.

3. **Scope of domain value object Chinese messages**
   - What we know: `AppKeyScope.ts`, `KeyRotationPolicy.ts`, `Email.ts`, `PasswordHasher.ts` throw Chinese domain errors (183 Chinese occurrences in non-test module files total).
   - What's unclear: Whether these domain throws are ever surfaced as API `message` fields (they might only appear in logs/internal paths).
   - Recommendation: Check if any currently-passing API test asserts on domain error messages. If not, domain object throws can be treated as lower priority and addressed only when they flow to user-visible messages.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 7 has no new external dependencies. All required tools (Bun, TypeScript, Biome) are part of the existing project setup.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Bun test (built-in) |
| Config file | none — invoked directly via `bun test` |
| Quick run command | `bun test src/Modules/Credit/__tests__/ src/Pages/__tests__/ -v` |
| Full suite command | `bun test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| I18N-01 | SharedDataMiddleware injects `locale` and `messages` | unit | `bun test src/Pages/__tests__/SharedDataMiddleware.test.ts -v` | Check at planning time |
| I18N-02 | Page handlers use catalog keys, not hardcoded strings | unit | `bun test src/Pages/__tests__/member-page-i18n.test.ts src/Pages/__tests__/admin-page-i18n.test.ts -v` | Partially (member-page-i18n.test.ts exists) |
| I18N-03 | Missing catalog key returns key itself (not undefined) | unit | `bun test src/Shared/Infrastructure/I18n/__tests__/ -v` | ✅ |
| API-01 | API controllers return English messages only | unit | `bun test src/Modules/Auth/__tests__/ -v` (and per-module) | ✅ |
| TEST-01 | HandleCreditToppedUpService GatewayError test passes | unit | `bun test src/Modules/Credit/__tests__/HandleCreditToppedUpService.test.ts -v` | ✅ (failing) |
| TEST-02 | Full suite: 0 fail, 0 errors | integration | `bun test` | Suite exists |
| QUAL-01 | Biome lint clean | quality | `bun run lint` | CI enforced |
| QUAL-02 | TypeScript strict clean | quality | `bun run typecheck` | CI enforced |

### Sampling Rate

- **Per task commit:** `bun test <affected-file-pattern> -v`
- **Per wave merge:** `bun test` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `src/Pages/__tests__/admin-page-i18n.test.ts` — covers I18N-02 for admin pages (referenced in i18n plan but may not exist yet; verify)
- [ ] Verify `src/Pages/__tests__/SharedDataMiddleware.test.ts` exists and covers I18N-01

*(If existing tests already cover these: "None — existing test infrastructure covers all phase requirements")*

---

## Sources

### Primary (HIGH confidence)

- `docs/superpowers/plans/2026-04-11-gravito-i18n.md` — complete 7-task i18n implementation plan with file lists and code examples
- `docs/superpowers/plans/2025-05-15-english-only-api-responses.md` — complete 5-task English-only API plan
- `docs/draupnir/specs/2026-04-11-gravito-i18n-design.md` — design decisions for API English-only vs page i18n strategy
- `src/Shared/Infrastructure/I18n/loadMessages.ts` — already-implemented catalog with `zh-TW` and `en` keys
- `src/Shared/Infrastructure/I18n/resolvePageLocale.ts` — already-implemented locale resolution
- `skills/gravito-cosmos/SKILL.md` + `references/draupnir-patterns.md` — Gravito-specific i18n patterns
- `bun test` output — 39 fail, 3 errors, 872 pass in current state

### Secondary (MEDIUM confidence)

- `.planning/codebase/CONCERNS.md` — items #4 (Prisma adapter), #5 (any types), #7/#8 (test gaps) are documented but NOT targeted by Phase 7
- `grep -rn '[一-龥]' src/Modules --include="*.ts"` — 183 occurrences in non-test module files; not all are user-visible API messages

### Tertiary (LOW confidence)

- Exact count of Chinese strings in API-visible paths vs. domain-internal paths — needs per-file analysis during planning

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — everything already installed, confirmed by `package.json` and skill files
- Architecture: HIGH — i18n design docs and existing implementations confirmed in codebase
- Pitfalls: HIGH — directly observed from live test failures and existing code
- Test failure classification: MEDIUM — summary counts confirmed, exact per-test breakdown needs verification during planning

**Research date:** 2026-04-11
**Valid until:** 2026-05-11 (stable domain; i18n plan docs are authoritative and won't change)
