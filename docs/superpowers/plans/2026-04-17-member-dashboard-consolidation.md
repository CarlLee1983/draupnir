# Member Dashboard Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate the redundant Member Overview page into the API Keys page to simplify the user experience.

**Architecture:** 
- Update navigation to remove "Overview" and make "API Keys" the landing page.
- Enhance `MemberApiKeysPage` (Backend) to provide balance and onboarding data.
- Update `Member/ApiKeys/Index` (Frontend) to display the balance card and handle "no organization" onboarding states.
- Add a redirect from the old dashboard URL.

**Tech Stack:** TypeScript, React, Inertia.js, Gravito Framework.

---

### Task 1: Update Navigation & Landing Page

**Files:**
- Modify: `src/Website/Auth/dashboardPathForWebRole.ts`
- Modify: `resources/js/layouts/MemberLayout.tsx`

- [ ] **Step 1: Change default landing page for members**

```typescript
// src/Website/Auth/dashboardPathForWebRole.ts
export function dashboardPathForWebRole(role: string): string {
  if (role === 'admin') return '/admin/dashboard'
  if (role === 'manager') return '/manager/dashboard'
  return '/member/api-keys' // Changed from /member/dashboard
}
```

- [ ] **Step 2: Remove Overview from Sidebar**

```typescript
// resources/js/layouts/MemberLayout.tsx
const memberNavItems: NavItem[] = [
  // Removed Overview
  { label: 'API Keys', href: '/member/api-keys', icon: <Key className="h-4 w-4" /> },
  { label: '用量', href: '/member/usage', icon: <BarChart3 className="h-4 w-4" /> },
  { label: '設定', href: '/member/settings', icon: <Settings className="h-4 w-4" /> },
]
```

- [ ] **Step 3: Commit**

```bash
git add src/Website/Auth/dashboardPathForWebRole.ts resources/js/layouts/MemberLayout.tsx
git commit -m "refactor(member): change landing page to api-keys and remove overview from sidebar"
```

---

### Task 2: Implement Legacy Dashboard Redirect

**Files:**
- Modify: `src/Website/Member/Pages/MemberDashboardPage.ts`

- [ ] **Step 1: Update dashboard handler to redirect**

```typescript
// src/Website/Member/Pages/MemberDashboardPage.ts
export class MemberDashboardPage {
  // ... constructor ...
  async handle(ctx: IHttpContext): Promise<Response> {
    return ctx.redirect('/member/api-keys')
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/Website/Member/Pages/MemberDashboardPage.ts
git commit -m "feat(member): redirect /member/dashboard to /member/api-keys"
```

---

### Task 3: Enhance Backend API Keys Page

**Files:**
- Modify: `src/Website/Member/Pages/MemberApiKeysPage.ts`

- [ ] **Step 1: Inject Balance and Invitation services**

```typescript
// src/Website/Member/Pages/MemberApiKeysPage.ts
export class MemberApiKeysPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly listService: ListApiKeysService,
    private readonly membershipService: GetUserMembershipService,
    private readonly balanceService: GetBalanceService, // New
    private readonly pendingInvitationsService: GetPendingInvitationsService, // New
  ) {}
  
  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)!
    const membership = await this.membershipService.execute(auth.userId)

    if (!membership) {
      const pendingInvitations = await this.pendingInvitationsService.execute(auth.userId).catch(() => [])
      return this.inertia.render(ctx, 'Member/ApiKeys/Index', {
        orgId: null,
        balance: null,
        hasOrganization: false,
        pendingInvitations,
        keys: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
        error: null,
      })
    }

    const orgId = membership.orgId
    const balanceResult = await this.balanceService.execute(orgId, auth.userId, auth.role)
    
    // ... rest of existing key listing logic ...

    return this.inertia.render(ctx, 'Member/ApiKeys/Index', {
      orgId,
      balance: balanceResult.success ? (balanceResult.data ?? null) : null,
      hasOrganization: true,
      pendingInvitations: [],
      keys,
      meta,
      error: balanceResult.success ? null : { key: 'member.dashboard.loadFailed' },
    })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/Website/Member/Pages/MemberApiKeysPage.ts
git commit -m "feat(member): add balance and onboarding data to api-keys page backend"
```

---

### Task 4: Update Frontend API Keys Page UI

**Files:**
- Modify: `resources/js/Pages/Member/ApiKeys/Index.tsx`

- [ ] **Step 1: Add new props and components**

```tsx
// resources/js/Pages/Member/ApiKeys/Index.tsx
import { BalanceCard } from '../Dashboard/components/BalanceCard'
import { CreateOrganizationModal } from '../Dashboard/components/CreateOrganizationModal'
import { InvitationCard, type PendingInvitation } from '../Dashboard/components/InvitationCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Props {
  orgId: string | null
  balance: any | null
  hasOrganization: boolean
  pendingInvitations: PendingInvitation[]
  keys: ApiKeyRow[]
  meta: any
  error: I18nMessage | null
}

export default function ApiKeysIndex({ orgId, balance, hasOrganization, pendingInvitations, keys, error }: Props) {
  // ... hooks ...
  return (
    <MemberLayout>
      <div className="space-y-6">
        {/* Onboarding State if no Org */}
        {!hasOrganization && (
           <Card className="...">
             <CardHeader>
               <CardTitle>尚無組織</CardTitle>
               <CardDescription>建立組織以開始使用 API Key...</CardDescription>
             </CardHeader>
             <CardContent>
               <Button onClick={() => setCreateOrgOpen(true)}>建立我的組織</Button>
             </CardContent>
           </Card>
        )}

        {/* Balance if has Org */}
        {hasOrganization && <BalanceCard balance={balance} />}

        <DataTable ... />
      </div>
    </MemberLayout>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/Pages/Member/ApiKeys/Index.tsx
git commit -m "feat(member): integrate balance and onboarding into api-keys page UI"
```

---

### Task 5: Final Verification & Cleanup

- [ ] **Step 1: Run Unit Tests for redirects and props**
Run: `bun vitest tests/Unit/Website/Auth/dashboardPathForWebRole.test.ts`
Run: `bun vitest tests/Feature/Website/Member/MemberApiKeysPage.test.ts`

- [ ] **Step 2: Run E2E Tests for member flow**
Run: `bun playwright test e2e/auth-web.e2e.ts`

- [ ] **Step 3: Commit final verification**
```bash
git commit --allow-empty -m "test(member): verify dashboard consolidation"
```
