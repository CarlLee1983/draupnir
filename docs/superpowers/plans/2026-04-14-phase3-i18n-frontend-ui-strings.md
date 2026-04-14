# i18n Phase 3 — Frontend UI Strings Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all hardcoded UI strings (titles, buttons, labels, empty states) in TSX pages and components with `t('ui.*')` calls, backed by `ui.*` keys added to both the backend catalog (`loadMessages.ts`) and the frontend catalog (`i18n.ts`).

**Architecture:** Each page group (Auth / Member / Admin) is migrated as a standalone task. Within a task: (1) add `ui.*` keys to both catalogs, (2) call `useTranslation()` in the component, (3) replace every hardcoded string with `t('ui.xxx.xxx')`. Key naming convention: `ui.<area>.<page>.<element>`. Columns files are migrated alongside their parent Index page.

**Tech Stack:** Vitest (frontend tests), TypeScript `tsconfig.frontend.json`, `useTranslation` hook from `resources/js/lib/i18n.ts`.

**Prerequisite:** Phase 2 plan must be completed first (ensures `useTranslation` import exists and `I18nMessage` error props are already migrated).

---

## File Map

### Modify
- `src/Shared/Infrastructure/I18n/loadMessages.ts` — add ~120 `ui.*` keys (zh-TW + en)
- `resources/js/lib/i18n.ts` — add all `ui.*` keys to `frontendCatalog`
- All ~43 TSX page files listed per task below

---

## Task 1: Add all ui.* catalog keys to loadMessages.ts and i18n.ts

This task adds ALL `ui.*` keys upfront so subsequent tasks can reference them freely. Do NOT add placeholder values — every key must have real translations in both zh-TW and en.

**Files:**
- Modify: `src/Shared/Infrastructure/I18n/loadMessages.ts`
- Modify: `resources/js/lib/i18n.ts`

- [ ] **Step 1: Add Auth page keys to `zhTW` in `loadMessages.ts`**

```typescript
// Auth — Login
'ui.auth.login.title': '登入',
'ui.auth.login.description': '輸入您的帳號和密碼',
'ui.auth.login.emailLabel': '電子郵件',
'ui.auth.login.passwordLabel': '密碼',
'ui.auth.login.forgotPassword': '忘記密碼？',
'ui.auth.login.submitLoading': '登入中…',
'ui.auth.login.submitButton': '登入',
'ui.auth.login.googleButton': '使用 Google 登入',
'ui.auth.login.noAccount': '還沒帳號？',
'ui.auth.login.registerLink': '註冊',
// Auth — Register
'ui.auth.register.title': '建立帳號',
'ui.auth.register.description': '輸入您的資訊以建立帳號',
'ui.auth.register.emailLabel': '電子郵件',
'ui.auth.register.passwordLabel': '密碼',
'ui.auth.register.confirmPasswordLabel': '確認密碼',
'ui.auth.register.termsCheckbox': '我同意服務條款',
'ui.auth.register.submitLoading': '建立中…',
'ui.auth.register.hasAccount': '已有帳號？',
'ui.auth.register.loginLink': '登入',
// Auth — EmailVerification
'ui.auth.emailVerification.title': '電子郵件驗證',
'ui.auth.emailVerification.successTitle': '驗證成功',
'ui.auth.emailVerification.failTitle': '驗證失敗',
'ui.auth.emailVerification.redirecting': '{seconds} 秒後自動跳轉…',
'ui.auth.emailVerification.backToLogin': '返回登入',
// Auth — VerifyDevice
'ui.auth.verifyDevice.title': '授權裝置',
'ui.auth.verifyDevice.heading': '授權 CLI 裝置',
'ui.auth.verifyDevice.description': '輸入 CLI 顯示的 8 碼授權碼',
'ui.auth.verifyDevice.codeLabel': '授權碼',
'ui.auth.verifyDevice.codePlaceholder': 'ABCD1234',
'ui.auth.verifyDevice.submitButton': '授權',
'ui.auth.verifyDevice.submitLoading': '驗證中…',
'ui.auth.verifyDevice.successMessage': '您現在可以返回 CLI 繼續操作',
// Auth — ForgotPassword
'ui.auth.forgotPassword.title': '忘記密碼',
'ui.auth.forgotPassword.emailLabel': '電子郵件',
'ui.auth.forgotPassword.submitButton': '發送重設連結',
'ui.auth.forgotPassword.backToLogin': '返回登入',
// Auth — ResetPassword
'ui.auth.resetPassword.title': '重設密碼',
'ui.auth.resetPassword.passwordLabel': '新密碼',
'ui.auth.resetPassword.confirmLabel': '確認新密碼',
'ui.auth.resetPassword.submitButton': '重設密碼',
```

- [ ] **Step 2: Add Member page keys**

```typescript
// Member — Dashboard
'ui.member.dashboard.title': '總覽',
'ui.member.dashboard.subtitle': 'Member Dashboard',
'ui.member.dashboard.description': '以 7 / 30 / 90 天時間窗檢視成本、請求量、Token 與模型分布',
'ui.member.dashboard.downloadReport': 'Download Report',
'ui.member.dashboard.metricCost': '成本',
'ui.member.dashboard.metricRequests': '請求數',
'ui.member.dashboard.metricTokens': '總 Tokens',
'ui.member.dashboard.metricLatency': '平均延遲',
'ui.member.dashboard.balanceTitle': 'Credit 餘額',
'ui.member.dashboard.balanceDescription': '目前組織可用額度',
'ui.member.dashboard.lowBalance': '低額度',
'ui.member.dashboard.quickActionsTitle': '快速操作',
'ui.member.dashboard.quickActionsDescription': '常用 member 工作流',
'ui.member.dashboard.createApiKey': '建立 API Key',
'ui.member.dashboard.viewUsage': '查看用量',
'ui.member.dashboard.emptyTitle': 'No usage data yet',
'ui.member.dashboard.emptyDescription': 'Data syncs every 5 minutes from Bifrost. Check back after your first API call.',
// Member — ApiKeys Index
'ui.member.apiKeys.title': 'API Keys',
'ui.member.apiKeys.createButton': '建立 Key',
'ui.member.apiKeys.searchPlaceholder': '搜尋 Key 名稱…',
// Member — ApiKeys Create
'ui.member.apiKeys.create.title': '建立 API Key',
'ui.member.apiKeys.create.successTitle': 'Key 建立成功',
'ui.member.apiKeys.create.copyWarning': '請立即複製此 Key，離開頁面後將無法再次查看',
'ui.member.apiKeys.create.savedButton': '我已保存，返回列表',
'ui.member.apiKeys.create.nameLabel': '名稱',
'ui.member.apiKeys.create.namePlaceholder': '例如：開發測試用',
'ui.member.apiKeys.create.rpmLabel': '每分鐘請求數上限（RPM）',
'ui.member.apiKeys.create.tpmLabel': '每分鐘 Token 上限（TPM）',
'ui.member.apiKeys.create.submitLoading': '建立中…',
// Member — Usage
'ui.member.usage.title': '用量',
'ui.member.usage.heading': '用量分析',
'ui.member.usage.empty': '尚無用量資料',
// Member — Contracts
'ui.member.contracts.title': '合約',
'ui.member.contracts.searchPlaceholder': '搜尋合約…',
// Member — Settings
'ui.member.settings.title': '設定',
'ui.member.settings.heading': '個人設定',
'ui.member.settings.profileCard': '個人資料',
'ui.member.settings.emailLabel': 'Email',
'ui.member.settings.nameLabel': '顯示名稱',
'ui.member.settings.roleLabel': '角色',
'ui.member.settings.submitLoading': '儲存中…',
'ui.member.settings.submitButton': '儲存變更',
// Member — CostBreakdown
'ui.member.costBreakdown.title': '成本分析',
// Member — Alerts
'ui.member.alerts.title': 'Alerts',
'ui.member.alerts.heading': 'Alerts',
```

- [ ] **Step 3: Add Admin page keys**

```typescript
// Admin — Contracts Index
'ui.admin.contracts.title': '合約管理',
'ui.admin.contracts.createButton': '建立合約',
'ui.admin.contracts.searchPlaceholder': '搜尋合約…',
// Admin — Contracts Create
'ui.admin.contracts.create.title': '建立合約',
'ui.admin.contracts.create.cardTitle': '合約標的與條款',
'ui.admin.contracts.create.targetTypeLabel': '對象類型',
'ui.admin.contracts.create.targetOrg': '組織',
'ui.admin.contracts.create.targetUser': '使用者',
'ui.admin.contracts.create.targetIdLabel': '目標 ID',
'ui.admin.contracts.create.targetIdPlaceholder': '例如組織 id',
'ui.admin.contracts.create.creditQuotaLabel': 'Credit 配額',
'ui.admin.contracts.create.rpmLabel': 'RPM',
'ui.admin.contracts.create.tpmLabel': 'TPM',
'ui.admin.contracts.create.startDateLabel': '生效日',
'ui.admin.contracts.create.endDateLabel': '到期日',
'ui.admin.contracts.create.modulesLabel': '允許模組（逗號分隔）',
'ui.admin.contracts.create.submitLoading': '建立中…',
'ui.admin.contracts.create.cancelButton': '取消',
// Admin — Modules Index
'ui.admin.modules.title': '模組管理',
'ui.admin.modules.createButton': '註冊模組',
'ui.admin.modules.searchPlaceholder': '搜尋模組…',
// Admin — Modules Create
'ui.admin.modules.create.title': '註冊模組',
'ui.admin.modules.create.cardTitle': '模組資訊',
'ui.admin.modules.create.nameLabel': '識別名稱（英小寫加底線）',
'ui.admin.modules.create.namePlaceholder': '例如：advanced_analytics',
'ui.admin.modules.create.descriptionLabel': '描述',
'ui.admin.modules.create.typeLabel': '類型',
'ui.admin.modules.create.typeFree': '免費',
'ui.admin.modules.create.typePaid': '付費',
'ui.admin.modules.create.submitLoading': '註冊中…',
'ui.admin.modules.create.cancelButton': '取消',
// Admin — Organizations
'ui.admin.organizations.title': '組織管理',
'ui.admin.organizations.searchPlaceholder': '搜尋組織…',
// Admin — Users
'ui.admin.users.title': '使用者管理',
'ui.admin.users.searchPlaceholder': '搜尋 Email 或名稱…',
// Admin — ApiKeys
'ui.admin.apiKeys.title': 'API Keys 總覽',
'ui.admin.apiKeys.selectOrgTitle': '選擇組織',
'ui.admin.apiKeys.orgLabel': '組織',
'ui.admin.apiKeys.orgPlaceholder': '— 請選擇 —',
'ui.admin.apiKeys.searchPlaceholder': '搜尋 Key 名稱…',
'ui.admin.apiKeys.emptyState': '請先選擇組織以查看 API Keys',
```

- [ ] **Step 4: Add matching `en` translations for all keys above**

Add the exact same key set to the `en` catalog with English translations. Example pattern:
```typescript
// en catalog additions:
'ui.auth.login.title': 'Login',
'ui.auth.login.description': 'Enter your account and password',
'ui.auth.login.emailLabel': 'Email',
'ui.auth.login.passwordLabel': 'Password',
'ui.auth.login.forgotPassword': 'Forgot password?',
'ui.auth.login.submitLoading': 'Signing in…',
'ui.auth.login.submitButton': 'Sign In',
'ui.auth.login.googleButton': 'Sign in with Google',
'ui.auth.login.noAccount': 'No account yet?',
'ui.auth.login.registerLink': 'Register',
'ui.auth.register.title': 'Create Account',
'ui.auth.register.description': 'Enter your information to create an account',
'ui.auth.register.emailLabel': 'Email',
'ui.auth.register.passwordLabel': 'Password',
'ui.auth.register.confirmPasswordLabel': 'Confirm Password',
'ui.auth.register.termsCheckbox': 'I agree to the Terms of Service',
'ui.auth.register.submitLoading': 'Creating…',
'ui.auth.register.hasAccount': 'Already have an account?',
'ui.auth.register.loginLink': 'Sign in',
'ui.auth.emailVerification.title': 'Email Verification',
'ui.auth.emailVerification.successTitle': 'Verification Successful',
'ui.auth.emailVerification.failTitle': 'Verification Failed',
'ui.auth.emailVerification.redirecting': 'Redirecting in {seconds} seconds…',
'ui.auth.emailVerification.backToLogin': 'Back to Login',
'ui.auth.verifyDevice.title': 'Authorize Device',
'ui.auth.verifyDevice.heading': 'Authorize CLI Device',
'ui.auth.verifyDevice.description': 'Enter the 8-character authorization code shown in CLI',
'ui.auth.verifyDevice.codeLabel': 'Authorization Code',
'ui.auth.verifyDevice.codePlaceholder': 'ABCD1234',
'ui.auth.verifyDevice.submitButton': 'Authorize',
'ui.auth.verifyDevice.submitLoading': 'Verifying…',
'ui.auth.verifyDevice.successMessage': 'You can now return to the CLI to continue',
'ui.auth.forgotPassword.title': 'Forgot Password',
'ui.auth.forgotPassword.emailLabel': 'Email',
'ui.auth.forgotPassword.submitButton': 'Send Reset Link',
'ui.auth.forgotPassword.backToLogin': 'Back to Login',
'ui.auth.resetPassword.title': 'Reset Password',
'ui.auth.resetPassword.passwordLabel': 'New Password',
'ui.auth.resetPassword.confirmLabel': 'Confirm New Password',
'ui.auth.resetPassword.submitButton': 'Reset Password',
'ui.member.dashboard.title': 'Overview',
'ui.member.dashboard.subtitle': 'Member Dashboard',
'ui.member.dashboard.description': 'View costs, requests, tokens, and model distribution across 7/30/90-day windows',
'ui.member.dashboard.downloadReport': 'Download Report',
'ui.member.dashboard.metricCost': 'Cost',
'ui.member.dashboard.metricRequests': 'Requests',
'ui.member.dashboard.metricTokens': 'Total Tokens',
'ui.member.dashboard.metricLatency': 'Avg Latency',
'ui.member.dashboard.balanceTitle': 'Credit Balance',
'ui.member.dashboard.balanceDescription': 'Current available credits for this organization',
'ui.member.dashboard.lowBalance': 'Low Balance',
'ui.member.dashboard.quickActionsTitle': 'Quick Actions',
'ui.member.dashboard.quickActionsDescription': 'Common member workflows',
'ui.member.dashboard.createApiKey': 'Create API Key',
'ui.member.dashboard.viewUsage': 'View Usage',
'ui.member.dashboard.emptyTitle': 'No usage data yet',
'ui.member.dashboard.emptyDescription': 'Data syncs every 5 minutes from Bifrost. Check back after your first API call.',
'ui.member.apiKeys.title': 'API Keys',
'ui.member.apiKeys.createButton': 'Create Key',
'ui.member.apiKeys.searchPlaceholder': 'Search key name…',
'ui.member.apiKeys.create.title': 'Create API Key',
'ui.member.apiKeys.create.successTitle': 'Key Created',
'ui.member.apiKeys.create.copyWarning': 'Copy this key now — it will not be shown again',
'ui.member.apiKeys.create.savedButton': 'Saved, back to list',
'ui.member.apiKeys.create.nameLabel': 'Name',
'ui.member.apiKeys.create.namePlaceholder': 'e.g., dev-testing',
'ui.member.apiKeys.create.rpmLabel': 'Rate Limit (RPM)',
'ui.member.apiKeys.create.tpmLabel': 'Token Limit (TPM)',
'ui.member.apiKeys.create.submitLoading': 'Creating…',
'ui.member.usage.title': 'Usage',
'ui.member.usage.heading': 'Usage Analytics',
'ui.member.usage.empty': 'No usage data yet',
'ui.member.contracts.title': 'Contracts',
'ui.member.contracts.searchPlaceholder': 'Search contracts…',
'ui.member.settings.title': 'Settings',
'ui.member.settings.heading': 'Personal Settings',
'ui.member.settings.profileCard': 'Profile',
'ui.member.settings.emailLabel': 'Email',
'ui.member.settings.nameLabel': 'Display Name',
'ui.member.settings.roleLabel': 'Role',
'ui.member.settings.submitLoading': 'Saving…',
'ui.member.settings.submitButton': 'Save Changes',
'ui.member.costBreakdown.title': 'Cost Analysis',
'ui.member.alerts.title': 'Alerts',
'ui.member.alerts.heading': 'Alerts',
'ui.admin.contracts.title': 'Contract Management',
'ui.admin.contracts.createButton': 'Create Contract',
'ui.admin.contracts.searchPlaceholder': 'Search contracts…',
'ui.admin.contracts.create.title': 'Create Contract',
'ui.admin.contracts.create.cardTitle': 'Contract Target & Terms',
'ui.admin.contracts.create.targetTypeLabel': 'Target Type',
'ui.admin.contracts.create.targetOrg': 'Organization',
'ui.admin.contracts.create.targetUser': 'User',
'ui.admin.contracts.create.targetIdLabel': 'Target ID',
'ui.admin.contracts.create.targetIdPlaceholder': 'e.g., org id',
'ui.admin.contracts.create.creditQuotaLabel': 'Credit Quota',
'ui.admin.contracts.create.rpmLabel': 'RPM',
'ui.admin.contracts.create.tpmLabel': 'TPM',
'ui.admin.contracts.create.startDateLabel': 'Start Date',
'ui.admin.contracts.create.endDateLabel': 'End Date',
'ui.admin.contracts.create.modulesLabel': 'Allowed Modules (comma-separated)',
'ui.admin.contracts.create.submitLoading': 'Creating…',
'ui.admin.contracts.create.cancelButton': 'Cancel',
'ui.admin.modules.title': 'Module Management',
'ui.admin.modules.createButton': 'Register Module',
'ui.admin.modules.searchPlaceholder': 'Search modules…',
'ui.admin.modules.create.title': 'Register Module',
'ui.admin.modules.create.cardTitle': 'Module Info',
'ui.admin.modules.create.nameLabel': 'Identifier (lowercase with underscore)',
'ui.admin.modules.create.namePlaceholder': 'e.g., advanced_analytics',
'ui.admin.modules.create.descriptionLabel': 'Description',
'ui.admin.modules.create.typeLabel': 'Type',
'ui.admin.modules.create.typeFree': 'Free',
'ui.admin.modules.create.typePaid': 'Paid',
'ui.admin.modules.create.submitLoading': 'Registering…',
'ui.admin.modules.create.cancelButton': 'Cancel',
'ui.admin.organizations.title': 'Organization Management',
'ui.admin.organizations.searchPlaceholder': 'Search organizations…',
'ui.admin.users.title': 'User Management',
'ui.admin.users.searchPlaceholder': 'Search email or name…',
'ui.admin.apiKeys.title': 'API Keys Overview',
'ui.admin.apiKeys.selectOrgTitle': 'Select Organization',
'ui.admin.apiKeys.orgLabel': 'Organization',
'ui.admin.apiKeys.orgPlaceholder': '— Please select —',
'ui.admin.apiKeys.searchPlaceholder': 'Search key name…',
'ui.admin.apiKeys.emptyState': 'Please select an organization to view API Keys',
```

- [ ] **Step 5: Add ALL new `ui.*` keys to `frontendCatalog` in `resources/js/lib/i18n.ts`**

In `frontendCatalog`, add a `true` entry for every key added in steps 1-4. Example structure:
```typescript
// Auth
'ui.auth.login.title': true,
'ui.auth.login.description': true,
// ... all auth keys
// Member
'ui.member.dashboard.title': true,
// ... all member keys
// Admin
'ui.admin.contracts.title': true,
// ... all admin keys
```

- [ ] **Step 6: Run TypeScript check to confirm satisfies constraint still passes**

```bash
npx tsc --noEmit 2>&1 | grep "loadMessages\|I18n" | head -10
```

Expected: no errors related to i18n files

- [ ] **Step 7: Commit**

```bash
git add src/Shared/Infrastructure/I18n/loadMessages.ts \
        resources/js/lib/i18n.ts
git commit -m "feat: [i18n] 新增所有 ui.* catalog key（Auth / Member / Admin）"
```

---

## Task 2: Migrate Auth pages (Login, Register, EmailVerification, VerifyDevice, ForgotPassword, ResetPassword)

**Files:**
- Modify: `resources/js/Pages/Auth/Login.tsx`
- Modify: `resources/js/Pages/Auth/Register.tsx`
- Modify: `resources/js/Pages/Auth/EmailVerification.tsx`
- Modify: `resources/js/Pages/Auth/VerifyDevice.tsx`
- Modify: `resources/js/Pages/Auth/ForgotPassword.tsx`
- Modify: `resources/js/Pages/Auth/ResetPassword.tsx`

- [ ] **Step 1: Migrate `Login.tsx` hardcoded strings**

Add `useTranslation` import (if not present from Phase 2) and replace all hardcoded strings:

```typescript
import { useTranslation } from '@/lib/i18n'

// Inside Login component:
const { t } = useTranslation()

// Replace every hardcoded string:
<Head title="登入" />  →  <Head title={t('ui.auth.login.title')} />
"輸入您的帳號和密碼"   →  {t('ui.auth.login.description')}
"電子郵件"            →  {t('ui.auth.login.emailLabel')}
"密碼"               →  {t('ui.auth.login.passwordLabel')}
"忘記密碼？"          →  {t('ui.auth.login.forgotPassword')}
"登入中…"            →  {t('ui.auth.login.submitLoading')}
"登入"               →  {t('ui.auth.login.submitButton')}
"使用 Google 登入"   →  {t('ui.auth.login.googleButton')}
"還沒帳號？"          →  {t('ui.auth.login.noAccount')}
"註冊"               →  {t('ui.auth.login.registerLink')}
```

- [ ] **Step 2: Migrate `Register.tsx` hardcoded strings**

```typescript
// Same pattern — replace each hardcoded string:
"建立帳號"           →  {t('ui.auth.register.title')}
"輸入您的資訊…"      →  {t('ui.auth.register.description')}
"電子郵件"           →  {t('ui.auth.register.emailLabel')}
"密碼"              →  {t('ui.auth.register.passwordLabel')}
"確認密碼"           →  {t('ui.auth.register.confirmPasswordLabel')}
"我同意服務條款"      →  {t('ui.auth.register.termsCheckbox')}
"建立中…"           →  {t('ui.auth.register.submitLoading')}
"已有帳號？"         →  {t('ui.auth.register.hasAccount')}
"登入"              →  {t('ui.auth.register.loginLink')}
```

Note: password requirement strings ("最少 X 個字元", "包含大寫字母" etc.) are rendered from the `passwordRequirements` prop passed from the backend. Leave those as-is for this phase — they are data-driven, not UI copy.

- [ ] **Step 3: Migrate `EmailVerification.tsx` hardcoded strings**

```typescript
<Head title="電子郵件驗證" />        →  <Head title={t('ui.auth.emailVerification.title')} />
'驗證成功'                           →  {t('ui.auth.emailVerification.successTitle')}
'驗證失敗'                           →  {t('ui.auth.emailVerification.failTitle')}
'{redirectSeconds} 秒後自動跳轉…'    →  {t('ui.auth.emailVerification.redirecting', { seconds: redirectSeconds })}
'返回登入'                           →  {t('ui.auth.emailVerification.backToLogin')}
```

- [ ] **Step 4: Migrate `VerifyDevice.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`**

Apply the same pattern for each. Look up the file to confirm exact hardcoded strings and replace using the corresponding `ui.auth.*` keys defined in Task 1.

- [ ] **Step 5: Run frontend TypeScript check**

```bash
npx tsc --noEmit -p tsconfig.frontend.json 2>&1 | grep "Auth/" | head -10
```

Expected: no errors in Auth pages

- [ ] **Step 6: Commit**

```bash
git add resources/js/Pages/Auth/
git commit -m "feat: [i18n] Auth pages 硬編碼文案改用 t()"
```

---

## Task 3: Migrate Member Dashboard + Usage + Contracts

**Files:**
- Modify: `resources/js/Pages/Member/Dashboard/Index.tsx`
- Modify: `resources/js/Pages/Member/Usage/Index.tsx`
- Modify: `resources/js/Pages/Member/Contracts/Index.tsx`
- Modify: `resources/js/Pages/Member/Contracts/columns.tsx`

- [ ] **Step 1: Migrate `Member/Dashboard/Index.tsx`**

If `useTranslation` not yet imported (from Phase 2), add it. Replace all hardcoded strings in the component and its sub-functions:

```typescript
// In MemberDashboard component:
<Head title="總覽" />                    →  <Head title={t('ui.member.dashboard.title')} />
"Member Dashboard"                       →  {t('ui.member.dashboard.subtitle')}
"以 7 / 30 / 90 天時間窗…"               →  {t('ui.member.dashboard.description')}

// In MetricCard calls:
title="成本"                             →  title={t('ui.member.dashboard.metricCost')}
title="請求數"                           →  title={t('ui.member.dashboard.metricRequests')}
title="總 Tokens"                        →  title={t('ui.member.dashboard.metricTokens')}
title="平均延遲"                          →  title={t('ui.member.dashboard.metricLatency')}

// In BalanceCard:
<CardTitle>Credit 餘額</CardTitle>        →  <CardTitle>{t('ui.member.dashboard.balanceTitle')}</CardTitle>
"目前組織可用額度"                         →  {t('ui.member.dashboard.balanceDescription')}
<Badge>低額度</Badge>                     →  <Badge>{t('ui.member.dashboard.lowBalance')}</Badge>

// In QuickActionsCard:
<CardTitle>快速操作</CardTitle>           →  <CardTitle>{t('ui.member.dashboard.quickActionsTitle')}</CardTitle>
"常用 member 工作流"                      →  {t('ui.member.dashboard.quickActionsDescription')}
"建立 API Key"                           →  {t('ui.member.dashboard.createApiKey')}
"查看用量"                               →  {t('ui.member.dashboard.viewUsage')}

// In EmptyStateCard:
"No usage data yet"                      →  {t('ui.member.dashboard.emptyTitle')}
"Data syncs every 5 minutes…"           →  {t('ui.member.dashboard.emptyDescription')}

// Download report button:
"Download Report"                        →  {t('ui.member.dashboard.downloadReport')}
```

Note: `BalanceCard` and `QuickActionsCard` are local sub-components inside the same file. Pass `t` as a prop OR move `useTranslation()` calls into each sub-component.

- [ ] **Step 2: Migrate `Member/Usage/Index.tsx`**

```typescript
<Head title="用量" />              →  <Head title={t('ui.member.usage.title')} />
"用量分析"                         →  {t('ui.member.usage.heading')}
"尚無用量資料"                     →  {t('ui.member.usage.empty')}
```

- [ ] **Step 3: Migrate `Member/Contracts/Index.tsx` and `columns.tsx`**

```typescript
// In Index.tsx:
<Head title="合約" />              →  <Head title={t('ui.member.contracts.title')} />
"搜尋合約…"                        →  {t('ui.member.contracts.searchPlaceholder')}
```

For `columns.tsx`: read the file and replace each hardcoded column header with the appropriate `ui.*` key. Column headers are typically strings passed to `header:` or as `<span>` text inside column definitions.

- [ ] **Step 4: Run TypeScript check**

```bash
npx tsc --noEmit -p tsconfig.frontend.json 2>&1 | grep "Member/Dashboard\|Member/Usage\|Member/Contracts" | head -10
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add resources/js/Pages/Member/Dashboard/ \
        resources/js/Pages/Member/Usage/ \
        resources/js/Pages/Member/Contracts/
git commit -m "feat: [i18n] Member Dashboard/Usage/Contracts 硬編碼文案改用 t()"
```

---

## Task 4: Migrate Member ApiKeys, Settings, Alerts, CostBreakdown

**Files:**
- Modify: `resources/js/Pages/Member/ApiKeys/Index.tsx`
- Modify: `resources/js/Pages/Member/ApiKeys/columns.tsx`
- Modify: `resources/js/Pages/Member/ApiKeys/Create.tsx`
- Modify: `resources/js/Pages/Member/Settings/Index.tsx`
- Modify: `resources/js/Pages/Member/Alerts/Index.tsx`
- Modify: `resources/js/Pages/Member/Alerts/tabs/` (all tab files)
- Modify: `resources/js/Pages/Member/CostBreakdown/Index.tsx`

- [ ] **Step 1: Migrate `Member/ApiKeys/Index.tsx` + `columns.tsx`**

```typescript
// Index.tsx:
<Head title="API Keys" />         →  <Head title={t('ui.member.apiKeys.title')} />
"建立 Key"                        →  {t('ui.member.apiKeys.createButton')}
"搜尋 Key 名稱…"                   →  {t('ui.member.apiKeys.searchPlaceholder')}
```

For `columns.tsx`: read the file and replace each column header string with the appropriate key.

- [ ] **Step 2: Migrate `Member/ApiKeys/Create.tsx`**

```typescript
// Ensure useTranslation is imported (from Phase 2 it should be)
"建立 API Key"                    →  {t('ui.member.apiKeys.create.title')}
"Key 建立成功"                    →  {t('ui.member.apiKeys.create.successTitle')}
"請立即複製此 Key…"               →  {t('ui.member.apiKeys.create.copyWarning')}
"我已保存，返回列表"               →  {t('ui.member.apiKeys.create.savedButton')}
"名稱"                           →  {t('ui.member.apiKeys.create.nameLabel')}
"例如：開發測試用"                 →  {t('ui.member.apiKeys.create.namePlaceholder')}
"每分鐘請求數上限（RPM）"          →  {t('ui.member.apiKeys.create.rpmLabel')}
"每分鐘 Token 上限（TPM）"        →  {t('ui.member.apiKeys.create.tpmLabel')}
"建立中…"                        →  {t('ui.member.apiKeys.create.submitLoading')}
```

- [ ] **Step 3: Migrate `Member/Settings/Index.tsx`**

```typescript
<Head title="設定" />             →  <Head title={t('ui.member.settings.title')} />
"個人設定"                        →  {t('ui.member.settings.heading')}
"個人資料"                        →  {t('ui.member.settings.profileCard')}
"Email"                          →  {t('ui.member.settings.emailLabel')}
"顯示名稱"                        →  {t('ui.member.settings.nameLabel')}
"角色"                           →  {t('ui.member.settings.roleLabel')}
"儲存中…"                        →  {t('ui.member.settings.submitLoading')}
"儲存變更"                        →  {t('ui.member.settings.submitButton')}
```

- [ ] **Step 4: Migrate `Member/Alerts/Index.tsx` and tab components**

Read `Alerts/Index.tsx` and all files in `Alerts/tabs/` and `Alerts/components/`. Replace each hardcoded UI string with the appropriate `ui.member.alerts.*` key. Add any missing keys to the catalog before replacing.

- [ ] **Step 5: Migrate `Member/CostBreakdown/Index.tsx`**

Read the file and replace hardcoded UI strings. Key mapping:
```typescript
"成本分析"            →  {t('ui.member.costBreakdown.title')}
```
Add any additional keys discovered to the catalog first.

- [ ] **Step 6: Run TypeScript check**

```bash
npx tsc --noEmit -p tsconfig.frontend.json 2>&1 | grep "Member/ApiKeys\|Member/Settings\|Member/Alerts\|Member/Cost" | head -10
```

Expected: no errors

- [ ] **Step 7: Commit**

```bash
git add resources/js/Pages/Member/ApiKeys/ \
        resources/js/Pages/Member/Settings/ \
        resources/js/Pages/Member/Alerts/ \
        resources/js/Pages/Member/CostBreakdown/
git commit -m "feat: [i18n] Member ApiKeys/Settings/Alerts/CostBreakdown 硬編碼文案改用 t()"
```

---

## Task 5: Migrate Admin Contracts pages

**Files:**
- Modify: `resources/js/Pages/Admin/Contracts/Index.tsx`
- Modify: `resources/js/Pages/Admin/Contracts/columns.tsx`
- Modify: `resources/js/Pages/Admin/Contracts/Create.tsx`
- Modify: `resources/js/Pages/Admin/Contracts/Show.tsx`

- [ ] **Step 1: Migrate `Admin/Contracts/Index.tsx` + `columns.tsx`**

```typescript
// Index.tsx:
<Head title="合約管理" />          →  <Head title={t('ui.admin.contracts.title')} />
"建立合約"                         →  {t('ui.admin.contracts.createButton')}
"搜尋合約…"                        →  {t('ui.admin.contracts.searchPlaceholder')}
```

For `columns.tsx`: read and replace column headers with `ui.admin.contracts.*` keys (add them to catalog first if missing).

- [ ] **Step 2: Migrate `Admin/Contracts/Create.tsx`**

```typescript
// useTranslation already imported from Phase 2
"建立合約"                         →  {t('ui.admin.contracts.create.title')}
"合約標的與條款"                    →  {t('ui.admin.contracts.create.cardTitle')}
"對象類型"                         →  {t('ui.admin.contracts.create.targetTypeLabel')}
"組織"                            →  {t('ui.admin.contracts.create.targetOrg')}
"使用者"                          →  {t('ui.admin.contracts.create.targetUser')}
"目標 ID…"                        →  {t('ui.admin.contracts.create.targetIdLabel')}
"例如組織 id"                      →  {t('ui.admin.contracts.create.targetIdPlaceholder')}
"Credit 配額"                      →  {t('ui.admin.contracts.create.creditQuotaLabel')}
"RPM"                            →  {t('ui.admin.contracts.create.rpmLabel')}
"TPM"                            →  {t('ui.admin.contracts.create.tpmLabel')}
"生效日"                          →  {t('ui.admin.contracts.create.startDateLabel')}
"到期日"                          →  {t('ui.admin.contracts.create.endDateLabel')}
"允許模組（逗號分隔）"               →  {t('ui.admin.contracts.create.modulesLabel')}
"建立中…"                         →  {t('ui.admin.contracts.create.submitLoading')}
"取消"                            →  {t('ui.admin.contracts.create.cancelButton')}
```

- [ ] **Step 3: Migrate `Admin/Contracts/Show.tsx`**

Read the file and replace all hardcoded strings. Add any missing keys to catalog first. Common patterns to replace: page heading, back button, field labels ("ID", "狀態", "對象類型" etc.), action buttons ("啟用", "終止").

- [ ] **Step 4: Run TypeScript check**

```bash
npx tsc --noEmit -p tsconfig.frontend.json 2>&1 | grep "Admin/Contracts" | head -10
```

- [ ] **Step 5: Commit**

```bash
git add resources/js/Pages/Admin/Contracts/
git commit -m "feat: [i18n] Admin Contracts pages 硬編碼文案改用 t()"
```

---

## Task 6: Migrate Admin Modules, Organizations, Users, ApiKeys pages

**Files:**
- Modify: `resources/js/Pages/Admin/Modules/Index.tsx`
- Modify: `resources/js/Pages/Admin/Modules/columns.tsx`
- Modify: `resources/js/Pages/Admin/Modules/Create.tsx`
- Modify: `resources/js/Pages/Admin/Organizations/Index.tsx`
- Modify: `resources/js/Pages/Admin/Organizations/columns.tsx`
- Modify: `resources/js/Pages/Admin/Organizations/Show.tsx`
- Modify: `resources/js/Pages/Admin/Users/Index.tsx`
- Modify: `resources/js/Pages/Admin/Users/columns.tsx`
- Modify: `resources/js/Pages/Admin/Users/Show.tsx`
- Modify: `resources/js/Pages/Admin/ApiKeys/Index.tsx`
- Modify: `resources/js/Pages/Admin/ApiKeys/columns.tsx`

- [ ] **Step 1: Migrate Admin Modules pages**

`Admin/Modules/Index.tsx`:
```typescript
<Head title="模組管理" />           →  <Head title={t('ui.admin.modules.title')} />
"註冊模組"                         →  {t('ui.admin.modules.createButton')}
"搜尋模組…"                        →  {t('ui.admin.modules.searchPlaceholder')}
```

`Admin/Modules/Create.tsx`:
```typescript
"註冊模組"                         →  {t('ui.admin.modules.create.title')}
"模組資訊"                         →  {t('ui.admin.modules.create.cardTitle')}
"識別名稱（英小寫…）"               →  {t('ui.admin.modules.create.nameLabel')}
"例如：advanced_analytics"        →  {t('ui.admin.modules.create.namePlaceholder')}
"描述"                            →  {t('ui.admin.modules.create.descriptionLabel')}
"類型"                            →  {t('ui.admin.modules.create.typeLabel')}
"免費"                            →  {t('ui.admin.modules.create.typeFree')}
"付費"                            →  {t('ui.admin.modules.create.typePaid')}
"註冊中…"                         →  {t('ui.admin.modules.create.submitLoading')}
"取消"                            →  {t('ui.admin.modules.create.cancelButton')}
```

For `columns.tsx`: read file and replace column headers.

- [ ] **Step 2: Migrate Admin Organizations pages**

`Admin/Organizations/Index.tsx`:
```typescript
<Head title="組織管理" />           →  <Head title={t('ui.admin.organizations.title')} />
"搜尋組織…"                        →  {t('ui.admin.organizations.searchPlaceholder')}
```

`Admin/Organizations/Show.tsx`: Read the file and replace all hardcoded strings. Add any missing `ui.admin.organizations.show.*` keys to catalog first.

- [ ] **Step 3: Migrate Admin Users pages**

`Admin/Users/Index.tsx`:
```typescript
<Head title="使用者管理" />         →  <Head title={t('ui.admin.users.title')} />
"搜尋 Email 或名稱…"               →  {t('ui.admin.users.searchPlaceholder')}
```

`Admin/Users/Show.tsx`: Read the file and replace all hardcoded strings.

- [ ] **Step 4: Migrate Admin ApiKeys page**

`Admin/ApiKeys/Index.tsx`:
```typescript
<Head title="API Keys 總覽" />     →  <Head title={t('ui.admin.apiKeys.title')} />
"選擇組織"                         →  {t('ui.admin.apiKeys.selectOrgTitle')}
"組織"                            →  {t('ui.admin.apiKeys.orgLabel')}
"— 請選擇 —"                       →  {t('ui.admin.apiKeys.orgPlaceholder')}
"搜尋 Key 名稱…"                   →  {t('ui.admin.apiKeys.searchPlaceholder')}
"請先選擇組織以查看 API Keys"       →  {t('ui.admin.apiKeys.emptyState')}
```

- [ ] **Step 5: Run TypeScript check**

```bash
npx tsc --noEmit -p tsconfig.frontend.json 2>&1 | grep "Admin/Modules\|Admin/Org\|Admin/Users\|Admin/ApiKeys" | head -10
```

- [ ] **Step 6: Commit**

```bash
git add resources/js/Pages/Admin/Modules/ \
        resources/js/Pages/Admin/Organizations/ \
        resources/js/Pages/Admin/Users/ \
        resources/js/Pages/Admin/ApiKeys/
git commit -m "feat: [i18n] Admin Modules/Organizations/Users/ApiKeys 硬編碼文案改用 t()"
```

---

## Task 7: Migrate Admin Dashboard and Reports pages

**Files:**
- Modify: `resources/js/Pages/Admin/Dashboard/Index.tsx`
- Modify: `resources/js/Pages/Admin/Reports/Index.tsx`
- Modify: `resources/js/Pages/Admin/Reports/Template.tsx`
- Modify: `resources/js/Pages/Admin/Reports/Components/ReportForm.tsx`
- Modify: `resources/js/Pages/Admin/Reports/Components/TimezonePicker.tsx`

- [ ] **Step 1: Add missing Admin Dashboard + Reports keys to catalog**

Read `Admin/Dashboard/Index.tsx` and `Admin/Reports/` files. For each hardcoded string, add a `ui.admin.dashboard.*` or `ui.admin.reports.*` key to both catalogs (zh-TW + en + frontendCatalog).

- [ ] **Step 2: Migrate all strings in Admin Dashboard + Reports files**

Apply `useTranslation` + `t()` pattern to each file. Follow the same process as previous tasks.

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit -p tsconfig.frontend.json 2>&1 | grep "Admin/Dashboard\|Admin/Reports" | head -10
```

- [ ] **Step 4: Commit**

```bash
git add resources/js/Pages/Admin/Dashboard/ \
        resources/js/Pages/Admin/Reports/
git commit -m "feat: [i18n] Admin Dashboard/Reports 硬編碼文案改用 t()"
```

---

## Task 8: Final verification and cleanup

- [ ] **Step 1: Scan for remaining hardcoded Chinese/English UI strings in Pages/**

```bash
grep -rn '"[^\\"]*[\u4e00-\u9fff][^\\"]*"' resources/js/Pages/ --include="*.tsx" | grep -v "//\|className\|href\|data-\|id=" | head -30
```

Fix any remaining hardcoded strings found.

- [ ] **Step 2: Run full frontend TypeScript check**

```bash
npx tsc --noEmit -p tsconfig.frontend.json 2>&1 | grep -v "Alerts/api\|CostBreakdown.*undefined" | head -20
```

Expected: no errors in newly changed files

- [ ] **Step 3: Run all i18n tests**

```bash
npx vitest run resources/js/lib/__tests__/i18n.test.ts 2>&1 | tail -5
```

Expected: 9 pass, 0 fail

- [ ] **Step 4: Run all backend tests**

```bash
bun test src/Website/__tests__/ src/Shared/Infrastructure/I18n/ 2>&1 | tail -5
```

Expected: all pass

- [ ] **Step 5: Verify catalog key parity (zh-TW satisfies constraint)**

```bash
npx tsc --noEmit 2>&1 | grep "satisfies\|loadMessages" | head -5
```

Expected: no errors (TypeScript confirms `en satisfies Record<keyof typeof zhTW, string>`)

- [ ] **Step 6: Final commit**

```bash
git add -p  # stage any remaining cleanup changes
git commit -m "chore: [i18n] Phase 3 完成 — 前端所有 UI 文案統一走 t()"
```
