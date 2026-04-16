# Member Dashboard Empty State Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the Member Dashboard empty state by hiding zero-value metrics, fixing duplicate text, and adding actionable quick links (Docs, Wallet).

**Architecture:** Frontend UI logic adjustments in React/Inertia components with updated i18n messages.

**Tech Stack:** React, Tailwind CSS, Lucide Icons, Inertia.js.

---

### Task 1: Update i18n Messages

**Files:**
- Modify: `src/Shared/Infrastructure/I18n/loadMessages.ts`

- [ ] **Step 1: Add new UI strings for documentation and adding funds**

Add these keys to both the base and localized message objects.

```typescript
// Add to the 'ui.member.dashboard' section
'ui.member.dashboard.viewDocs': 'View Documentation',
'ui.member.dashboard.addFunds': 'Add Funds',
```

- [ ] **Step 2: Commit i18n changes**

```bash
git add src/Shared/Infrastructure/I18n/loadMessages.ts
git commit -m "feat(i18n): add dashboard quick action strings"
```

---

### Task 2: Upgrade QuickActionsCard Component

**Files:**
- Modify: `resources/js/Pages/Member/Dashboard/components/QuickActionsCard.tsx`

- [ ] **Step 1: Update imports and implement new buttons with icons**

Modify the component to include `Plus`, `BarChart`, `BookOpen`, and `Wallet` icons and the new action buttons.

```tsx
import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RefreshCcw, Plus, BarChart, BookOpen, Wallet } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

interface Props {
  orgId?: string | null
}

export const QuickActionsCard = React.memo(({ orgId }: Props) => {
  const { t } = useTranslation()
  const keysQuery = orgId ? `?orgId=${encodeURIComponent(orgId)}` : ''

  return (
    <Card className="bg-white/[0.02] border-border rounded-lg shadow-indigo-500/5 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base text-white">{t('ui.member.dashboard.quickActionsTitle')}</CardTitle>
          <CardDescription className="text-white/40">{t('ui.member.dashboard.quickActionsDescription')}</CardDescription>
        </div>
        <RefreshCcw className="h-5 w-5 text-white/20" />
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <a
          href={`/member/api-keys/create${keysQuery}`}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-indigo-500 px-4 text-sm font-medium text-white transition-colors hover:bg-indigo-600 shadow-[0_0_20px_rgba(99,102,241,0.3)]"
        >
          <Plus className="h-4 w-4" />
          {t('ui.member.dashboard.createApiKey')}
        </a>
        <a
          href="/docs"
          target="_blank"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-4 text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          <BookOpen className="h-4 w-4" />
          {t('ui.member.dashboard.viewDocs')}
        </a>
        <a
          href={`/member/billing${keysQuery}`}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-4 text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          <Wallet className="h-4 w-4" />
          {t('ui.member.dashboard.addFunds')}
        </a>
        <a
          href={`/member/usage${keysQuery}`}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-4 text-sm font-medium text-white transition-colors hover:bg-white/10"
        >
          <BarChart className="h-4 w-4" />
          {t('ui.member.dashboard.viewUsage')}
        </a>
      </CardContent>
    </Card>
  )
})

QuickActionsCard.displayName = 'QuickActionsCard'
```

- [ ] **Step 2: Commit QuickActionsCard changes**

```bash
git add resources/js/Pages/Member/Dashboard/components/QuickActionsCard.tsx
git commit -m "feat(ui): upgrade QuickActionsCard with icons and more actions"
```

---

### Task 3: Refine Dashboard Index and Fix EmptyStateCard

**Files:**
- Modify: `resources/js/Pages/Member/Dashboard/Index.tsx`

- [ ] **Step 1: Fix text duplication in EmptyStateCard and hide MetricSection when empty**

```tsx
// Find EmptyStateCard function at the end of the file
function EmptyStateCard() {
  const { t } = useTranslation()
  return (
    <Card className="border-dashed bg-white/[0.02] border-border rounded-lg shadow-none">
      <CardHeader>
        <CardTitle className="text-base text-white">{t('ui.member.dashboard.emptyTitle')}</CardTitle>
        <CardDescription className="text-white/40">
          {t('ui.member.dashboard.emptyDescription')}
        </CardDescription>
      </CardHeader>
      {/* Removed CardContent with duplicate text */}
    </Card>
  )
}

// Update the main MemberDashboard component rendering logic (around line 180)
// Change:
// <MetricSection kpi={bundle?.kpi ?? null} />
// To:
// {!showEmptyState && <MetricSection kpi={bundle?.kpi ?? null} />}
```

- [ ] **Step 2: Verify changes in browser**

Run the dev server and check the dashboard in an empty state.
Run: `bun run dev`

- [ ] **Step 3: Commit Index changes**

```bash
git add resources/js/Pages/Member/Dashboard/Index.tsx
git commit -m "fix(ui): resolve text duplication and hide metrics in dashboard empty state"
```
