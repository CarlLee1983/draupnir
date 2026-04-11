---
phase: 07-framework-capability-docs-and-improvement
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/Pages/__tests__/Member/MemberDashboardPage.test.ts
  - src/Pages/__tests__/Member/MemberApiKeysPage.test.ts
  - src/Pages/__tests__/Member/MemberContractsPage.test.ts
  - src/Pages/__tests__/Member/MemberSettingsPage.test.ts
  - src/Pages/__tests__/Member/MemberUsagePage.test.ts
  - src/Pages/__tests__/Member/MemberApiKeyCreatePage.test.ts
autonomous: true
requirements: [I18N-01, I18N-02, TEST-01]
user_setup: []

must_haves:
  truths:
    - "Page handler tests inject locale and messages into mock context"
    - "Page handler tests assert English messages from catalog when en locale is used"
    - "Page handler tests assert Chinese messages when zh-TW locale is used"
    - "All 6 member page tests pass with correct i18n message assertions"
  artifacts:
    - path: "src/Pages/__tests__/Member/MemberDashboardPage.test.ts"
      provides: "Member dashboard page test with i18n fixtures"
      contains: "loadMessages"
    - path: "src/Pages/__tests__/Member/MemberApiKeysPage.test.ts"
      provides: "API keys page test with i18n fixtures"
      contains: "loadMessages"
    - path: "src/Pages/__tests__/Member/MemberContractsPage.test.ts"
      provides: "Contracts page test with i18n fixtures"
      contains: "loadMessages"
    - path: "src/Pages/__tests__/Member/MemberSettingsPage.test.ts"
      provides: "Settings page test with i18n fixtures"
      contains: "loadMessages"
    - path: "src/Pages/__tests__/Member/MemberUsagePage.test.ts"
      provides: "Usage page test with i18n fixtures"
      contains: "loadMessages"
    - path: "src/Pages/__tests__/Member/MemberApiKeyCreatePage.test.ts"
      provides: "API key create page test with i18n fixtures"
      contains: "loadMessages"
  key_links:
    - from: "test mocks"
      to: "inertia:shared context"
      via: "ctx.set('inertia:shared', { locale, messages, ... })"
      pattern: "ctx.set\\('inertia:shared'"
    - from: "page handler"
      to: "shared messages"
      via: "ctx.get('inertia:shared').messages\[key\]"
      pattern: "messages\\['"

---

<objective>
Update member page handler unit tests to properly inject i18n locale and messages fixtures into mock contexts, then verify page handlers correctly use catalog-driven messages instead of hardcoded strings.

**Purpose:** The member page handlers (MemberDashboardPage, MemberApiKeysPage, etc.) already use `ctx.get('inertia:shared').messages[key]` to render localized strings. However, the tests (created in Phase 6) do not set up `inertia:shared`, so the pages receive `undefined` messages and fall back to the key itself. Tests assert the old hardcoded Chinese strings, causing ~15 failures. This plan fixes the test fixtures to inject proper i18n context, then updates assertions to match catalog-driven output.

**Output:** All member page tests pass with i18n fixtures in place.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/07-framework-capability-docs-and-improvement/07-RESEARCH.md
@docs/superpowers/plans/2026-04-11-gravito-i18n.md

## Existing Implementations

The i18n infrastructure is already complete and production-ready:
- `src/Shared/Infrastructure/I18n/loadMessages.ts` — Message catalogs with Proxy fallback (zh-TW and en)
- `src/Shared/Infrastructure/I18n/resolvePageLocale.ts` — Locale resolution from request context
- `src/Pages/SharedDataMiddleware.ts` — Already injects `locale` and `messages` into `ctx.set('inertia:shared', ...)`

The member page handlers are already wired to use catalogs:
- `src/Pages/Member/MemberDashboardPage.ts` — Uses `messages['member.dashboard.selectOrg']`
- `src/Pages/Member/MemberApiKeysPage.ts` — Uses `messages['member.apiKeys.selectOrg']` and `messages['member.apiKeys.createFailed']`
- `src/Pages/Member/MemberContractsPage.ts` — Uses `messages['member.contracts.selectOrg']` and `messages['member.contracts.loadFailed']`
- `src/Pages/Member/MemberSettingsPage.ts` — Uses `messages['member.settings.loadFailed']`
- `src/Pages/Member/MemberUsagePage.ts` — Uses `messages['member.usage.selectOrg']` and `messages['member.usage.loadFailed']`
- `src/Pages/Member/MemberApiKeyCreatePage.ts` — Uses `messages['member.apiKeys.missingOrgId']` and `messages['member.apiKeys.createFailed']`

The test structure exists in `/src/Pages/__tests__/InertiaService.test.ts` with `createMockContext` helper, but member page tests do not set `inertia:shared`.

## Test Fixture Pattern (Reference)

From `src/Pages/__tests__/member-page-i18n.test.ts` (already passing):
```typescript
const store = new Map<string, unknown>()
store.set('inertia:shared', {
  locale: 'en',
  messages: loadMessages('en'),
  auth: { user: { id: 'u1', email: 'test@test.com', role: 'member' } },
  currentOrgId: null,
  flash: {},
})
```

## Failure Pattern

Current failures (e.g., `MemberApiKeysPage.test.ts:127`):
```typescript
expect(captured.lastCall?.props.error).toContain('請先選擇組織')
// Page renders: messages['member.apiKeys.selectOrg'] where messages is {} (empty fallback)
// So page outputs: 'member.apiKeys.selectOrg' (the key itself, per Proxy fallback)
// Test assertion expects: '請先選擇組織' (hardcoded from memory)
// Result: FAIL because 'member.apiKeys.selectOrg' !== '請先選擇組織'
```

</context>

<tasks>

<task type="auto">
  <name>Task 1: Update MemberDashboardPage tests with i18n fixtures</name>
  <files>src/Pages/__tests__/Member/MemberDashboardPage.test.ts</files>
  <action>
Import `loadMessages` from `@/Shared/Infrastructure/I18n`. Update `createMemberContext()` helper to inject `inertia:shared` with locale and messages. 

For the test "without orgId renders with null summary and balance" (around line 97-111):
- Modify the context setup to include `ctx.set('inertia:shared', { locale: 'en', messages: loadMessages('en'), auth: { user: { id: 'member-1', ... } }, ... })`
- Update assertion from `expect(captured.lastCall?.props.error).toContain('請先選擇組織')` to `expect(captured.lastCall?.props.error).toBe('Please select an organization first')`

The helper should look like:
```typescript
function createMemberContext(overrides: Partial<IHttpContext> = {}): IHttpContext {
  const store = new Map<string, unknown>()
  const auth = { userId: 'member-1', email: 'member@test.com', role: 'member' }
  store.set('auth', auth)
  store.set('inertia:shared', {
    locale: 'en',
    messages: loadMessages('en'),
    auth: { user: { id: auth.userId, email: auth.email, role: auth.role } },
    currentOrgId: null,
    flash: {},
  })
  
  return createMockContext({
    get: <T>(key: string) => store.get(key) as T | undefined,
    set: (key: string, value: unknown) => store.set(key, value),
    ...overrides,
  })
}
```

Then update test assertions:
- Line 111: Change to `expect(captured.lastCall?.props.error).toBe('Please select an organization first')`
  </action>
  <verify>
    <automated>bun test src/Pages/__tests__/Member/MemberDashboardPage.test.ts -v</automated>
  </verify>
  <done>All MemberDashboardPage tests pass. The "without orgId" test correctly asserts English message 'Please select an organization first' when locale is 'en'.</done>
</task>

<task type="auto">
  <name>Task 2: Update MemberApiKeysPage tests with i18n fixtures</name>
  <files>src/Pages/__tests__/Member/MemberApiKeysPage.test.ts</files>
  <action>
Import `loadMessages` from `@/Shared/Infrastructure/I18n`. Update mock context creation to inject `inertia:shared` with locale and messages.

Locate lines asserting hardcoded Chinese (around line 127: `expect(captured.lastCall?.props.error).toContain('請先選擇組織')`).

Update the test context creation to call a helper that injects:
```typescript
store.set('inertia:shared', {
  locale: 'en',
  messages: loadMessages('en'),
  auth: { user: { id: 'member-1', email: 'member@test.com', role: 'member' } },
  currentOrgId: null,
  flash: {},
})
```

Update assertions:
- Line 127: Change from `expect(...).toContain('請先選擇組織')` to `expect(...).toBe('Please select an organization first')`
- If assertion for creation failure exists, change Chinese to 'Create failed'

Ensure all member context creations in this file use the updated helper.
  </action>
  <verify>
    <automated>bun test src/Pages/__tests__/Member/MemberApiKeysPage.test.ts -v</automated>
  </verify>
  <done>All MemberApiKeysPage tests pass with i18n fixtures. Assertions match English catalog messages.</done>
</task>

<task type="auto">
  <name>Task 3: Update MemberContractsPage tests with i18n fixtures</name>
  <files>src/Pages/__tests__/Member/MemberContractsPage.test.ts</files>
  <action>
Import `loadMessages` from `@/Shared/Infrastructure/I18n`. Update mock context creation to inject `inertia:shared`.

Locate lines with hardcoded Chinese (around line 124: `expect(...).toContain('請先選擇組織')`).

Update test context setup:
```typescript
store.set('inertia:shared', {
  locale: 'en',
  messages: loadMessages('en'),
  auth: { user: { id: 'member-1', email: 'member@test.com', role: 'member' } },
  currentOrgId: null,
  flash: {},
})
```

Update assertions:
- Line 124: Change from hardcoded Chinese to `expect(...).toBe('Please select an organization first')`
- If "loadFailed" assertion exists, change to 'Failed to load contracts'

Ensure all test context creations use the updated helper.
  </action>
  <verify>
    <automated>bun test src/Pages/__tests__/Member/MemberContractsPage.test.ts -v</automated>
  </verify>
  <done>All MemberContractsPage tests pass with i18n fixtures. Assertions match English catalog messages.</done>
</task>

<task type="auto">
  <name>Task 4: Update MemberSettingsPage tests with i18n fixtures</name>
  <files>src/Pages/__tests__/Member/MemberSettingsPage.test.ts</files>
  <action>
Import `loadMessages` from `@/Shared/Infrastructure/I18n`. Update mock context creation to inject `inertia:shared`.

Update test context setup:
```typescript
store.set('inertia:shared', {
  locale: 'en',
  messages: loadMessages('en'),
  auth: { user: { id: 'member-1', email: 'member@test.com', role: 'member' } },
  currentOrgId: null,
  flash: {},
})
```

Search for assertions with hardcoded Chinese related to settings (e.g., '讀取設定失敗') and update to 'Failed to load settings'.

Ensure all test context creations use the updated helper.
  </action>
  <verify>
    <automated>bun test src/Pages/__tests__/Member/MemberSettingsPage.test.ts -v</automated>
  </verify>
  <done>All MemberSettingsPage tests pass with i18n fixtures. Assertions match English catalog messages.</done>
</task>

<task type="auto">
  <name>Task 5: Update MemberUsagePage tests with i18n fixtures</name>
  <files>src/Pages/__tests__/Member/MemberUsagePage.test.ts</files>
  <action>
Import `loadMessages` from `@/Shared/Infrastructure/I18n`. Update mock context creation to inject `inertia:shared`.

Locate assertions with hardcoded Chinese (around line 119: `expect(...).toContain('請先選擇組織')`).

Update test context setup:
```typescript
store.set('inertia:shared', {
  locale: 'en',
  messages: loadMessages('en'),
  auth: { user: { id: 'member-1', email: 'member@test.com', role: 'member' } },
  currentOrgId: null,
  flash: {},
})
```

Update assertions:
- Line 119: Change from hardcoded Chinese to `expect(...).toBe('Please select an organization first')`
- If "loadFailed" assertion exists, change to 'Failed to load usage'

Ensure all test context creations use the updated helper.
  </action>
  <verify>
    <automated>bun test src/Pages/__tests__/Member/MemberUsagePage.test.ts -v</automated>
  </verify>
  <done>All MemberUsagePage tests pass with i18n fixtures. Assertions match English catalog messages.</done>
</task>

<task type="auto">
  <name>Task 6: Update MemberApiKeyCreatePage tests with i18n fixtures</name>
  <files>src/Pages/__tests__/Member/MemberApiKeyCreatePage.test.ts</files>
  <action>
Import `loadMessages` from `@/Shared/Infrastructure/I18n`. Update mock context creation to inject `inertia:shared`.

Update test context setup:
```typescript
store.set('inertia:shared', {
  locale: 'en',
  messages: loadMessages('en'),
  auth: { user: { id: 'member-1', email: 'member@test.com', role: 'member' } },
  currentOrgId: null,
  flash: {},
})
```

Search for assertions related to missing orgId or create failures and update hardcoded Chinese to:
- 'Missing orgId' for `member.apiKeys.missingOrgId`
- 'Create failed' for `member.apiKeys.createFailed`

Ensure all test context creations use the updated helper.
  </action>
  <verify>
    <automated>bun test src/Pages/__tests__/Member/MemberApiKeyCreatePage.test.ts -v</automated>
  </verify>
  <done>All MemberApiKeyCreatePage tests pass with i18n fixtures. Assertions match English catalog messages.</done>
</task>

</tasks>

<verification>
After all tasks complete:

```bash
bun test src/Pages/__tests__/Member/*.test.ts -v
```

Verify:
- All 6 member page test files pass (0 failures)
- Each test correctly injects `inertia:shared` with locale and messages
- Assertions use English messages from `loadMessages('en')` catalog
- No hardcoded Chinese strings remain in assertions

Then run full page test suite:
```bash
bun test src/Pages/__tests__ -v
```

All page tests should pass (member + admin + any utility tests).
</verification>

<success_criteria>
- [x] All 6 member page test files updated with i18n fixtures
- [x] Mock context helpers inject `inertia:shared` with `loadMessages('en')`
- [x] All hardcoded Chinese assertions replaced with English catalog messages
- [x] `bun test src/Pages/__tests__/Member/*.test.ts` passes (0 fail, 0 errors)
- [x] `bun test src/Pages/__tests__` passes (all page tests green)
- [x] No import errors or type issues
</success_criteria>

<output>
After completion, create `.planning/phases/07-framework-capability-docs-and-improvement/07-01-SUMMARY.md`

Summary should include:
- 6 member page test files updated
- i18n fixtures pattern documented
- Catalog message mappings used in assertions
- Test pass/fail counts before and after
</output>
