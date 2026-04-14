# i18n Phase 2 — Backend I18nMessage Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all pre-translated string props in page handlers with `I18nMessage` objects, update affected TSX Props interfaces to receive `I18nMessage | null`, and render errors via `t(error.key)` — so the frontend owns all translation.

**Architecture:** Each page handler currently calls `getInertiaShared(ctx)` to get `messages` and passes pre-translated strings (e.g. `messages['member.apiKeys.selectOrg']`) or raw service messages (`result.message`) as Inertia props. After this plan every `error`, `formError`, and `message` prop that carries user-visible text becomes `I18nMessage | null` on the backend and is consumed via `t(key)` in the TSX. Flash cookies are migrated to the JSON format from `setFlash()`.

**Tech Stack:** TypeScript (backend: `tsconfig.json`, frontend: `tsconfig.frontend.json`), Bun test, `@inertiajs/react` `usePage`, existing `I18nMessage` type from `src/Shared/Infrastructure/I18n`.

---

## File Map

### Create
- `src/Shared/Presentation/toI18nMessage.ts` — maps service error codes to `I18nMessage`

### Modify (backend)
- `src/Shared/Infrastructure/I18n/loadMessages.ts` — add 6 new catalog keys
- `src/Shared/Infrastructure/I18n/index.ts` — export `toI18nMessage` (already exports types)
- `src/Website/Member/Pages/MemberApiKeysPage.ts`
- `src/Website/Member/Pages/MemberApiKeyCreatePage.ts`
- `src/Website/Member/Pages/MemberDashboardPage.ts`
- `src/Website/Member/Pages/MemberUsagePage.ts`
- `src/Website/Member/Pages/MemberContractsPage.ts`
- `src/Website/Member/Pages/MemberSettingsPage.ts`
- `src/Website/Member/Pages/MemberAlertsPage.ts`
- `src/Website/Member/Pages/MemberCostBreakdownPage.ts`
- `src/Website/Admin/Pages/AdminApiKeysPage.ts`
- `src/Website/Admin/Pages/AdminContractsPage.ts`
- `src/Website/Admin/Pages/AdminContractCreatePage.ts`
- `src/Website/Admin/Pages/AdminContractDetailPage.ts`
- `src/Website/Admin/Pages/AdminModulesPage.ts`
- `src/Website/Admin/Pages/AdminModuleCreatePage.ts`
- `src/Website/Admin/Pages/AdminOrganizationsPage.ts`
- `src/Website/Admin/Pages/AdminOrganizationDetailPage.ts`
- `src/Website/Admin/Pages/AdminUsersPage.ts`
- `src/Website/Admin/Pages/AdminUserDetailPage.ts`
- `src/Website/Auth/Pages/RegisterPage.ts`
- `src/Website/Auth/Pages/LoginPage.ts`
- `src/Website/Auth/Pages/EmailVerificationPage.ts`

### Modify (frontend — Props interface + error rendering only, NOT hardcoded UI strings)
- `resources/js/lib/i18n.ts` — add 6 new keys to `frontendCatalog`
- `resources/js/Pages/Member/ApiKeys/Index.tsx`
- `resources/js/Pages/Member/ApiKeys/Create.tsx`
- `resources/js/Pages/Member/Dashboard/Index.tsx`
- `resources/js/Pages/Member/Usage/Index.tsx`
- `resources/js/Pages/Member/Contracts/Index.tsx`
- `resources/js/Pages/Member/Settings/Index.tsx`
- `resources/js/Pages/Member/Alerts/Index.tsx`
- `resources/js/Pages/Member/CostBreakdown/Index.tsx`
- `resources/js/Pages/Admin/ApiKeys/Index.tsx`
- `resources/js/Pages/Admin/Contracts/Index.tsx`
- `resources/js/Pages/Admin/Contracts/Create.tsx`
- `resources/js/Pages/Admin/Contracts/Show.tsx`
- `resources/js/Pages/Admin/Modules/Index.tsx`
- `resources/js/Pages/Admin/Modules/Create.tsx`
- `resources/js/Pages/Admin/Organizations/Index.tsx`
- `resources/js/Pages/Admin/Organizations/Show.tsx`
- `resources/js/Pages/Admin/Users/Index.tsx`
- `resources/js/Pages/Admin/Users/Show.tsx`
- `resources/js/Pages/Auth/Login.tsx`
- `resources/js/Pages/Auth/Register.tsx`
- `resources/js/Pages/Auth/EmailVerification.tsx`

---

## Task 1: Add new catalog keys + create toI18nMessage utility

**Files:**
- Modify: `src/Shared/Infrastructure/I18n/loadMessages.ts`
- Create: `src/Shared/Presentation/toI18nMessage.ts`
- Modify: `resources/js/lib/i18n.ts`

- [ ] **Step 1: Add 6 new keys to zh-TW catalog in `loadMessages.ts`**

In `src/Shared/Infrastructure/I18n/loadMessages.ts`, add these keys to `zhTW` (after `'sdkApi.unauthorized'` line):

```typescript
  'member.apiKeys.loadFailed': '讀取 API Key 失敗',
  'member.dashboard.loadFailed': '讀取儀表板資料失敗',
  'member.alerts.selectOrg': '請先選擇組織',
  'member.costBreakdown.selectOrg': '請先選擇組織',
  'auth.register.success': '帳號建立成功，請登入',
  'auth.login.failed': '登入失敗，請確認帳號與密碼',
```

- [ ] **Step 2: Add matching keys to `en` catalog**

In the same file, add to the `en` section (before the closing `} satisfies ...`):

```typescript
  'member.apiKeys.loadFailed': 'Failed to load API keys',
  'member.dashboard.loadFailed': 'Failed to load dashboard data',
  'member.alerts.selectOrg': 'Please select an organization first',
  'member.costBreakdown.selectOrg': 'Please select an organization first',
  'auth.register.success': 'Account created successfully, please log in',
  'auth.login.failed': 'Login failed, please check your credentials',
```

- [ ] **Step 3: Create `src/Shared/Presentation/toI18nMessage.ts`**

```typescript
import type { I18nMessage, MessageKey } from '@/Shared/Infrastructure/I18n'

/**
 * Maps a service error code or raw message string to an I18nMessage.
 * Used in page handlers to convert service result errors to structured format.
 *
 * If `codeOrMessage` matches a known error code in ERROR_CODE_MAP, the
 * corresponding MessageKey is used. Otherwise it is cast directly as a MessageKey
 * (handles cases where services already return catalog keys as error codes).
 */
const ERROR_CODE_MAP: Partial<Record<string, MessageKey>> = {
  // Auth
  INVALID_CREDENTIALS: 'auth.login.failed',
  // ApiKey
  NOT_ORG_MEMBER: 'member.apiKeys.loadFailed',
  LABEL_REQUIRED: 'member.apiKeys.createFailed',
  KEY_NOT_FOUND: 'member.apiKeys.createFailed',
}

export function toI18nMessage(
  codeOrMessage: string | null | undefined,
  fallbackKey?: MessageKey,
  params?: Record<string, string | number>,
): I18nMessage {
  if (!codeOrMessage && fallbackKey) {
    return { key: fallbackKey, params }
  }
  const raw = codeOrMessage ?? ''
  const mapped = ERROR_CODE_MAP[raw]
  const key: MessageKey = mapped ?? fallbackKey ?? (raw as MessageKey)
  return { key, params }
}
```

- [ ] **Step 4: Add new keys to frontend catalog in `resources/js/lib/i18n.ts`**

In `frontendCatalog`, add after `'sdkApi.unauthorized': true,`:

```typescript
  'member.apiKeys.loadFailed': true,
  'member.dashboard.loadFailed': true,
  'member.alerts.selectOrg': true,
  'member.costBreakdown.selectOrg': true,
  'auth.register.success': true,
  'auth.login.failed': true,
```

- [ ] **Step 5: Run backend tests to confirm no regressions**

```bash
bun test src/Shared/Infrastructure/I18n
```

Expected: 3 pass, 0 fail

- [ ] **Step 6: Commit**

```bash
git add src/Shared/Infrastructure/I18n/loadMessages.ts \
        src/Shared/Presentation/toI18nMessage.ts \
        resources/js/lib/i18n.ts
git commit -m "feat: [i18n] 新增 Phase 2 catalog key 與 toI18nMessage 工具函式"
```

---

## Task 2: Migrate Member selectOrg errors (messages['key'] patterns)

**Files:**
- Modify: `src/Website/Member/Pages/MemberApiKeysPage.ts`
- Modify: `src/Website/Member/Pages/MemberUsagePage.ts`
- Modify: `src/Website/Member/Pages/MemberDashboardPage.ts`
- Modify: `src/Website/Member/Pages/MemberContractsPage.ts`
- Modify: `src/Website/Member/Pages/MemberAlertsPage.ts`
- Modify: `src/Website/Member/Pages/MemberCostBreakdownPage.ts`
- Modify: `resources/js/Pages/Member/ApiKeys/Index.tsx`
- Modify: `resources/js/Pages/Member/Usage/Index.tsx`
- Modify: `resources/js/Pages/Member/Dashboard/Index.tsx`
- Modify: `resources/js/Pages/Member/Contracts/Index.tsx`
- Modify: `resources/js/Pages/Member/Alerts/Index.tsx`
- Modify: `resources/js/Pages/Member/CostBreakdown/Index.tsx`

- [ ] **Step 1: Update `MemberApiKeysPage.ts` — remove messages dependency, use I18nMessage**

Remove the `const { messages } = getInertiaShared(ctx)` line and replace the two error props:

```typescript
// Remove this line from the handle() method:
// const { messages } = getInertiaShared(ctx)

// Change (line ~38):
error: messages['member.apiKeys.selectOrg'],
// To:
error: { key: 'member.apiKeys.selectOrg' },

// Change (line ~68):
error: result.success ? null : result.message,
// To:
error: result.success ? null : { key: 'member.apiKeys.loadFailed' },
```

Also remove the `getInertiaShared` import if it's no longer used (check if other imports remain).

- [ ] **Step 2: Update `MemberUsagePage.ts`**

```typescript
// Remove: const { messages } = getInertiaShared(ctx)

// Change (line ~38):
error: messages['member.usage.selectOrg'],
// To:
error: { key: 'member.usage.selectOrg' },

// Change (line ~54):
error: result.success ? null : result.message,
// To:
error: result.success ? null : { key: 'member.usage.loadFailed' },
```

- [ ] **Step 3: Update `MemberDashboardPage.ts`**

```typescript
// Remove: const { messages } = getInertiaShared(ctx)

// Change (line ~37):
error: messages['member.dashboard.selectOrg'],
// To:
error: { key: 'member.dashboard.selectOrg' },

// Change (line ~46):
error: balanceResult.success ? null : balanceResult.message,
// To:
error: balanceResult.success ? null : { key: 'member.dashboard.loadFailed' },
```

- [ ] **Step 4: Update `MemberContractsPage.ts`**

```typescript
// Remove: const { messages } = getInertiaShared(ctx)

// Change (line ~56):
error: messages['member.contracts.selectOrg'],
// To:
error: { key: 'member.contracts.selectOrg' },

// Change (line ~70):
error: result.success ? null : result.message,
// To:
error: result.success ? null : { key: 'member.contracts.loadFailed' },
```

- [ ] **Step 5: Update `MemberAlertsPage.ts`**

```typescript
// Remove: const { messages } = getInertiaShared(ctx)

// Change (line ~47):
error: messages['member.alerts.selectOrg'] ?? 'Select an organization to view alerts.',
// To:
error: { key: 'member.alerts.selectOrg' },
```

- [ ] **Step 6: Update `MemberCostBreakdownPage.ts`**

```typescript
// Change (line ~25):
error: 'Select an organization to view cost breakdown.',
// To:
error: { key: 'member.costBreakdown.selectOrg' },
```

Note: `MemberCostBreakdownPage` may not use `getInertiaShared`. No import change needed.

- [ ] **Step 7: Update TSX Props interfaces and error rendering for Member pages**

For each of these 6 TSX files, make two changes:
1. Add import and change `error: string | null` → `error: I18nMessage | null`
2. Add `useTranslation()` and change error rendering to `t(error.key, error.params)`

**`resources/js/Pages/Member/ApiKeys/Index.tsx`:**
```typescript
// Add import at top:
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'

// Change Props interface:
// error: string | null
error: I18nMessage | null

// Inside component, add:
const { t } = useTranslation()

// Change every error rendering line from:
// {error && <SomeComponent message={error} />}
// To (find the exact pattern in the file):
{error && <SomeComponent message={t(error.key, error.params)} />}
```

Apply the same pattern to:
- `resources/js/Pages/Member/Usage/Index.tsx`
- `resources/js/Pages/Member/Dashboard/Index.tsx` (renders `error` via `<InfoCard ... message={error} />`)
- `resources/js/Pages/Member/Contracts/Index.tsx`
- `resources/js/Pages/Member/Alerts/Index.tsx`
- `resources/js/Pages/Member/CostBreakdown/Index.tsx`

- [ ] **Step 8: Run TypeScript checks**

```bash
npx tsc --noEmit -p tsconfig.frontend.json 2>&1 | grep -E "Member/" | head -20
npx tsc --noEmit 2>&1 | grep -E "MemberApiKeys|MemberUsage|MemberDashboard|MemberContracts|MemberAlerts|MemberCost" | head -20
```

Expected: no new errors in changed files

- [ ] **Step 9: Run backend tests**

```bash
bun test src/Website/__tests__/Member/MemberApiKeysPage.test.ts \
         src/Website/__tests__/Member/MemberContractsPage.test.ts \
         src/Website/__tests__/Member/MemberUsagePage.test.ts \
         src/Website/__tests__/Member/MemberDashboardPage.test.ts 2>&1 | tail -5
```

Expected: all pass

- [ ] **Step 10: Commit**

```bash
git add src/Website/Member/Pages/Member*Page.ts \
        src/Website/Member/Pages/MemberCostBreakdownPage.ts \
        resources/js/Pages/Member/ApiKeys/Index.tsx \
        resources/js/Pages/Member/Usage/Index.tsx \
        resources/js/Pages/Member/Dashboard/Index.tsx \
        resources/js/Pages/Member/Contracts/Index.tsx \
        resources/js/Pages/Member/Alerts/Index.tsx \
        resources/js/Pages/Member/CostBreakdown/Index.tsx
git commit -m "feat: [i18n] Member selectOrg/loadFailed 改用 I18nMessage"
```

---

## Task 3: Migrate Member form errors and create operations

**Files:**
- Modify: `src/Website/Member/Pages/MemberApiKeyCreatePage.ts`
- Modify: `src/Website/Member/Pages/MemberSettingsPage.ts`
- Modify: `resources/js/Pages/Member/ApiKeys/Create.tsx`
- Modify: `resources/js/Pages/Member/Settings/Index.tsx`

- [ ] **Step 1: Update `MemberApiKeyCreatePage.ts`**

```typescript
// Remove: const { messages } = getInertiaShared(ctx)

// Change (line ~67):
formError: messages['member.apiKeys.missingOrgId'],
// To:
formError: { key: 'member.apiKeys.missingOrgId' },

// Change (line ~91):
formError: result.message ?? messages['member.apiKeys.createFailed'],
// To:
formError: result.success ? null : { key: 'member.apiKeys.createFailed' },
```

- [ ] **Step 2: Update `MemberSettingsPage.ts`**

```typescript
// Remove: const { messages } = getInertiaShared(ctx)  (if present)

// Change (line ~34):
error: result.success ? null : result.message,
// To:
error: result.success ? null : { key: 'member.settings.loadFailed' },

// Change (line ~62):
formError: updateResult.success ? null : updateResult.message,
// To:
formError: updateResult.success ? null : { key: 'member.settings.loadFailed' },
```

- [ ] **Step 3: Update `resources/js/Pages/Member/ApiKeys/Create.tsx` Props + rendering**

```typescript
// Add import:
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'

// Change Props interface — find formError field:
// formError: string | null  (or formError?: string)
formError: I18nMessage | null

// Inside component add:
const { t } = useTranslation()

// Change every formError rendering from the string form to:
{formError && <p className="text-destructive">{t(formError.key, formError.params)}</p>}
// (match whatever JSX pattern the file uses for formError display)
```

- [ ] **Step 4: Update `resources/js/Pages/Member/Settings/Index.tsx` Props + rendering**

Same pattern as Create.tsx:
- Import `I18nMessage`, `useTranslation`
- Change `error: string | null` and `formError: string | null` → `I18nMessage | null`
- Add `const { t } = useTranslation()` inside component
- Update all rendering sites for `error` and `formError`

- [ ] **Step 5: Run tests**

```bash
bun test src/Website/__tests__/Member/MemberApiKeyCreatePage.test.ts \
         src/Website/__tests__/Member/MemberSettingsPage.test.ts 2>&1 | tail -5
```

Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add src/Website/Member/Pages/MemberApiKeyCreatePage.ts \
        src/Website/Member/Pages/MemberSettingsPage.ts \
        resources/js/Pages/Member/ApiKeys/Create.tsx \
        resources/js/Pages/Member/Settings/Index.tsx
git commit -m "feat: [i18n] Member ApiKeyCreate/Settings formError 改用 I18nMessage"
```

---

## Task 4: Migrate Admin detail pages (messages['key'] patterns)

**Files:**
- Modify: `src/Website/Admin/Pages/AdminContractDetailPage.ts`
- Modify: `src/Website/Admin/Pages/AdminOrganizationDetailPage.ts`
- Modify: `src/Website/Admin/Pages/AdminUserDetailPage.ts`
- Modify: `resources/js/Pages/Admin/Contracts/Show.tsx`
- Modify: `resources/js/Pages/Admin/Organizations/Show.tsx`
- Modify: `resources/js/Pages/Admin/Users/Show.tsx`

- [ ] **Step 1: Update `AdminContractDetailPage.ts`**

```typescript
// Remove: const { messages } = getInertiaShared(ctx)

// Change (line ~36):
error: messages['admin.contracts.missingId'],
// To:
error: { key: 'admin.contracts.missingId' },

// Change (line ~44):
error: result.success ? null : result.message,
// To:
error: result.success ? null : { key: 'admin.contracts.loadFailed' },
```

- [ ] **Step 2: Update `AdminOrganizationDetailPage.ts`**

```typescript
// Remove: const { messages } = getInertiaShared(ctx)

// Change (line ~34):
error: messages['admin.organizations.missingId'],
// To:
error: { key: 'admin.organizations.missingId' },
```

- [ ] **Step 3: Update `AdminUserDetailPage.ts`**

```typescript
// Remove: const { messages } = getInertiaShared(ctx)

// Change (line ~34):
error: messages['admin.users.missingId'],
// To:
error: { key: 'admin.users.missingId' },

// Change (line ~46):
error: userResult.message,
// To:
error: { key: 'admin.users.loadFailed' },

// Change (line ~66):
error: profileResult.success ? null : profileResult.message,
// To:
error: profileResult.success ? null : { key: 'admin.users.loadFailed' },
```

- [ ] **Step 4: Update TSX Props + rendering for Admin detail pages**

Apply the same import/Props/rendering pattern from Task 2 Step 7 to:
- `resources/js/Pages/Admin/Contracts/Show.tsx` — change `error: string | null` → `I18nMessage | null`
- `resources/js/Pages/Admin/Organizations/Show.tsx` — same
- `resources/js/Pages/Admin/Users/Show.tsx` — same

For each:
```typescript
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'
// Change Props: error: string | null → error: I18nMessage | null
// Add: const { t } = useTranslation()
// Change rendering: error → t(error.key, error.params)
```

- [ ] **Step 5: Run tests**

```bash
bun test src/Website/__tests__/Admin/AdminContractDetailPage.test.ts \
         src/Website/__tests__/Admin/AdminOrganizationDetailPage.test.ts \
         src/Website/__tests__/Admin/AdminUserDetailPage.test.ts 2>&1 | tail -5
```

Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add src/Website/Admin/Pages/AdminContractDetailPage.ts \
        src/Website/Admin/Pages/AdminOrganizationDetailPage.ts \
        src/Website/Admin/Pages/AdminUserDetailPage.ts \
        resources/js/Pages/Admin/Contracts/Show.tsx \
        resources/js/Pages/Admin/Organizations/Show.tsx \
        resources/js/Pages/Admin/Users/Show.tsx
git commit -m "feat: [i18n] Admin detail pages 改用 I18nMessage"
```

---

## Task 5: Migrate Admin create/form error pages

**Files:**
- Modify: `src/Website/Admin/Pages/AdminContractCreatePage.ts`
- Modify: `src/Website/Admin/Pages/AdminModuleCreatePage.ts`
- Modify: `resources/js/Pages/Admin/Contracts/Create.tsx`
- Modify: `resources/js/Pages/Admin/Modules/Create.tsx`

- [ ] **Step 1: Update `AdminContractCreatePage.ts`**

```typescript
// Remove: const { messages } = getInertiaShared(ctx) from store()

// Change in store() (line ~64):
formError: messages['admin.contracts.validationFailed'],
// To:
formError: { key: 'admin.contracts.validationFailed' },

// Change in store() (line ~93):
formError: result.message ?? messages['admin.contracts.createFailed'],
// To:
formError: result.success ? null : { key: 'admin.contracts.createFailed' },
```

- [ ] **Step 2: Update `AdminModuleCreatePage.ts`**

```typescript
// Remove: const { messages } = getInertiaShared(ctx)

// Change (line ~52):
formError: messages['admin.modules.nameRequired'],
// To:
formError: { key: 'admin.modules.nameRequired' },

// Change (line ~68):
formError: result.message ?? 'Registration failed',
// To:
formError: result.success ? null : { key: 'admin.modules.createFailed' },
```

- [ ] **Step 3: Update TSX for Admin create pages**

`resources/js/Pages/Admin/Contracts/Create.tsx`:
```typescript
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'
// Change Props: formError: string | null → formError: I18nMessage | null
// Add: const { t } = useTranslation()
// Change formError rendering to: t(formError.key, formError.params)
```

`resources/js/Pages/Admin/Modules/Create.tsx`: same pattern.

- [ ] **Step 4: Run tests**

```bash
bun test src/Website/__tests__/Admin/AdminContractCreatePage.test.ts \
         src/Website/__tests__/Admin/AdminModuleCreatePage.test.ts 2>&1 | tail -5
```

Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add src/Website/Admin/Pages/AdminContractCreatePage.ts \
        src/Website/Admin/Pages/AdminModuleCreatePage.ts \
        resources/js/Pages/Admin/Contracts/Create.tsx \
        resources/js/Pages/Admin/Modules/Create.tsx
git commit -m "feat: [i18n] Admin Contracts/Modules create formError 改用 I18nMessage"
```

---

## Task 6: Migrate Admin list pages (result.message load failures)

**Files:**
- Modify: `src/Website/Admin/Pages/AdminApiKeysPage.ts`
- Modify: `src/Website/Admin/Pages/AdminContractsPage.ts`
- Modify: `src/Website/Admin/Pages/AdminModulesPage.ts`
- Modify: `src/Website/Admin/Pages/AdminOrganizationsPage.ts`
- Modify: `src/Website/Admin/Pages/AdminUsersPage.ts`
- Modify: `resources/js/Pages/Admin/ApiKeys/Index.tsx`
- Modify: `resources/js/Pages/Admin/Contracts/Index.tsx`
- Modify: `resources/js/Pages/Admin/Modules/Index.tsx`
- Modify: `resources/js/Pages/Admin/Organizations/Index.tsx`
- Modify: `resources/js/Pages/Admin/Users/Index.tsx`

- [ ] **Step 1: Update 5 Admin list page handlers**

For each file, remove `const { messages } = getInertiaShared(ctx)` (where present) and change the `result.message` load failure error:

**`AdminApiKeysPage.ts`** (line ~68):
```typescript
error: result.success ? null : result.message,
// →
error: result.success ? null : { key: 'admin.apiKeys.loadFailed' },
```

**`AdminContractsPage.ts`** (line ~62):
```typescript
error: result.success ? null : result.message,
// →
error: result.success ? null : { key: 'admin.contracts.loadFailed' },
```

**`AdminModulesPage.ts`** (line ~41):
```typescript
error: result.success ? null : result.message,
// →
error: result.success ? null : { key: 'admin.modules.loadFailed' },
```

**`AdminOrganizationsPage.ts`** (line ~46):
```typescript
error: result.success ? null : result.message,
// →
error: result.success ? null : { key: 'admin.organizations.loadFailed' },
```

**`AdminUsersPage.ts`** (line ~47):
```typescript
error: result.success ? null : result.message,
// →
error: result.success ? null : { key: 'admin.users.loadFailed' },
```

- [ ] **Step 2: Update 5 Admin list TSX Props + rendering**

Apply the import/Props/`useTranslation`/rendering pattern to each of the 5 TSX files:
- `resources/js/Pages/Admin/ApiKeys/Index.tsx`: `error: string | null` → `I18nMessage | null`
- `resources/js/Pages/Admin/Contracts/Index.tsx`: same
- `resources/js/Pages/Admin/Modules/Index.tsx`: same
- `resources/js/Pages/Admin/Organizations/Index.tsx`: same
- `resources/js/Pages/Admin/Users/Index.tsx`: same

For each file:
```typescript
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'
// Props: error: string | null → error: I18nMessage | null
// Component body: const { t } = useTranslation()
// Render: {error && <SomeErrorComponent ...message={t(error.key, error.params)} />}
```

- [ ] **Step 3: Run tests**

```bash
bun test src/Website/__tests__/Admin/AdminApiKeysPage.test.ts \
         src/Website/__tests__/Admin/AdminContractsPage.test.ts \
         src/Website/__tests__/Admin/AdminModulesPage.test.ts \
         src/Website/__tests__/Admin/AdminOrganizationsPage.test.ts \
         src/Website/__tests__/Admin/AdminUsersPage.test.ts 2>&1 | tail -5
```

Expected: all pass

- [ ] **Step 4: Commit**

```bash
git add src/Website/Admin/Pages/AdminApiKeysPage.ts \
        src/Website/Admin/Pages/AdminContractsPage.ts \
        src/Website/Admin/Pages/AdminModulesPage.ts \
        src/Website/Admin/Pages/AdminOrganizationsPage.ts \
        src/Website/Admin/Pages/AdminUsersPage.ts \
        resources/js/Pages/Admin/ApiKeys/Index.tsx \
        resources/js/Pages/Admin/Contracts/Index.tsx \
        resources/js/Pages/Admin/Modules/Index.tsx \
        resources/js/Pages/Admin/Organizations/Index.tsx \
        resources/js/Pages/Admin/Users/Index.tsx
git commit -m "feat: [i18n] Admin list pages error 改用 I18nMessage"
```

---

## Task 7: Migrate Auth pages + flash cookie

**Files:**
- Modify: `src/Website/Auth/Pages/RegisterPage.ts`
- Modify: `src/Website/Auth/Pages/LoginPage.ts`
- Modify: `src/Website/Auth/Pages/EmailVerificationPage.ts`
- Modify: `resources/js/Pages/Auth/Register.tsx`
- Modify: `resources/js/Pages/Auth/Login.tsx`
- Modify: `resources/js/Pages/Auth/EmailVerification.tsx`

- [ ] **Step 1: Update `RegisterPage.ts` — error prop + flash cookie**

```typescript
// Add import at top:
import { setFlash } from '@/Website/Http/Inertia/SharedPropsBuilder'

// Change in store() (line ~48):
error: 'Validation failed. Please check your input.',
// To:
error: { key: 'auth.login.failed' },

// Change (line ~56 — result.error ?? result.message):
error: result.error ?? result.message,
// To:
error: { key: 'auth.login.failed' },

// Replace the setCookie flash block (line ~61):
// ctx.setCookie('flash:success', encodeURIComponent('帳號建立成功，請登入'), { ... })
// With:
setFlash(ctx, 'success', { key: 'auth.register.success' })
```

- [ ] **Step 2: Update `LoginPage.ts`**

```typescript
// Change (line ~43):
error: result.error ?? result.message,
// To:
error: { key: 'auth.login.failed' },
```

- [ ] **Step 3: Update `EmailVerificationPage.ts` — change `message` to I18nMessage**

The `message` prop represents either a success or error verification result. Add dedicated catalog keys to `loadMessages.ts` first:

In `loadMessages.ts` add to `zhTW`:
```typescript
  'auth.emailVerification.success': '電子郵件驗證成功',
  'auth.emailVerification.failed': '驗證連結無效或已過期',
```

Add same keys to `en` catalog:
```typescript
  'auth.emailVerification.success': 'Email verified successfully',
  'auth.emailVerification.failed': 'Verification link is invalid or has expired',
```

Add to frontend catalog in `i18n.ts`:
```typescript
  'auth.emailVerification.success': true,
  'auth.emailVerification.failed': true,
```

Then in `EmailVerificationPage.ts`, change:
```typescript
// Change success path:
message: result.message,
// To:
message: { key: 'auth.emailVerification.success' },

// Change error path:
message: result.message,
// To:
message: { key: 'auth.emailVerification.failed' },
```

Change the `message` prop type in the backend render signature accordingly.

- [ ] **Step 4: Update Auth TSX files**

**`resources/js/Pages/Auth/Register.tsx`:**
```typescript
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'
// Props: error?: string → error?: I18nMessage
// Add: const { t } = useTranslation()
// Change error rendering: {error && <p>{error}</p>} → {error && <p>{t(error.key, error.params)}</p>}
```

**`resources/js/Pages/Auth/Login.tsx`:** same pattern for `error?: string` → `error?: I18nMessage`.

**`resources/js/Pages/Auth/EmailVerification.tsx`:**
```typescript
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'
// Props: message: string → message: I18nMessage
// Add: const { t } = useTranslation()
// Change: <p>{message}</p> → <p>{t(message.key, message.params)}</p>
```

- [ ] **Step 5: Run tests**

```bash
bun test src/Website/__tests__/Auth/LoginPage.test.ts \
         src/Website/__tests__/Auth/RegisterPage.test.ts \
         src/Website/__tests__/Auth/EmailVerificationPage.test.ts 2>&1 | tail -5
```

Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add src/Website/Auth/Pages/RegisterPage.ts \
        src/Website/Auth/Pages/LoginPage.ts \
        src/Website/Auth/Pages/EmailVerificationPage.ts \
        src/Shared/Infrastructure/I18n/loadMessages.ts \
        resources/js/lib/i18n.ts \
        resources/js/Pages/Auth/Register.tsx \
        resources/js/Pages/Auth/Login.tsx \
        resources/js/Pages/Auth/EmailVerification.tsx
git commit -m "feat: [i18n] Auth pages 改用 I18nMessage，flash cookie 改為 JSON 格式"
```

---

## Task 8: Final verification

- [ ] **Step 1: Run all affected backend tests**

```bash
bun test src/Website/__tests__/ src/Shared/Infrastructure/I18n/ 2>&1 | tail -10
```

Expected: all pass, 0 fail

- [ ] **Step 2: Run frontend TypeScript check**

```bash
npx tsc --noEmit -p tsconfig.frontend.json 2>&1 | grep -v "Alerts/api\|CostBreakdown/Index" | head -20
```

Expected: no errors in files changed by this plan

- [ ] **Step 3: Run frontend i18n tests**

```bash
npx vitest run resources/js/lib/__tests__/i18n.test.ts 2>&1 | tail -5
```

Expected: 9 pass, 0 fail

- [ ] **Step 4: Verify no remaining `messages\['` in page handlers**

```bash
grep -r "messages\['" src/Website/ --include="*.ts" | grep -v test | grep -v node_modules
```

Expected: no output

- [ ] **Step 5: Verify no remaining `result\.message` as prop value**

```bash
grep -rn "error: result\.message\|formError: result\.message\|error: .*\.message," src/Website/ --include="*.ts" | grep -v test
```

Expected: no output (or only patterns that are not user-visible props)
