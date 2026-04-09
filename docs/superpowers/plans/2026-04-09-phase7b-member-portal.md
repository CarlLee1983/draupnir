# Phase 7b: Member Portal 實作計劃

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 實作會員 Portal 所有頁面 — Dashboard、API Keys 管理、用量查看、合約檢視、個人設定，讓一般使用者可自助管理自己的 API Key、查看用量與 Credit 餘額。

**Architecture:** 依循 Phase 7a 建立的 Inertia + React + shadcn/ui 架構。每個頁面由一個 Inertia 頁面控制器（`src/Pages/Member/*Page.ts`）+ 對應的 React 頁面元件（`resources/js/Pages/Member/*.tsx`）組成。頁面控制器呼叫既有的 Application Service，取得資料後透過 InertiaService 渲染。表單操作（建立 Key、更新 profile）透過 Inertia 的 `router.post/patch` 直接呼叫既有 API 路由。

**Tech Stack:** React 19, @inertiajs/react, shadcn/ui, Tailwind CSS, TanStack Table, Recharts, React Hook Form + Zod

**Prerequisites:**
- `2026-04-09-phase7a-frontend-infrastructure.md` — **必須先完成**（InertiaService, Layouts, DataTable, Chart 元件）

**Related Plans:**
- `2026-04-09-phase7c-admin-portal.md` — 管理後台頁面

---

## Scope

本計劃僅涵蓋會員 Portal 頁面：

| 頁面 | 路徑 | 對應 API |
|------|------|----------|
| Dashboard | `/member/dashboard` | `GET /api/organizations/:orgId/dashboard` |
| API Keys 列表 | `/member/api-keys` | `GET /api/organizations/:orgId/keys` |
| API Keys 建立 | `/member/api-keys/create` | `POST /api/organizations/:orgId/keys` |
| Usage | `/member/usage` | `GET /api/organizations/:orgId/dashboard/usage` |
| Contracts | `/member/contracts` | `GET /api/contracts`（依權限過濾） |
| Settings | `/member/settings` | `GET/PUT /api/users/me` |

**組織切換：** 會員 Portal 的所有頁面接受 `?orgId=xxx` query parameter 指定當前組織，或從 Inertia shared `currentOrgId` 取得預設值。頁面控制器負責驗證當前使用者確實為該組織成員。

---

## File Structure

### 新增檔案

```
# Server-side Page Controllers
src/Pages/Member/MemberDashboardPage.ts
src/Pages/Member/MemberApiKeysPage.ts
src/Pages/Member/MemberApiKeyCreatePage.ts
src/Pages/Member/MemberUsagePage.ts
src/Pages/Member/MemberContractsPage.ts
src/Pages/Member/MemberSettingsPage.ts

# Shared Form Component
resources/js/components/forms/FormField.tsx
resources/js/components/ui/label.tsx
resources/js/components/ui/form.tsx
resources/js/components/ui/toast.tsx
resources/js/components/ui/toaster.tsx
resources/js/hooks/use-toast.ts

# Member Pages
resources/js/Pages/Member/Dashboard/Index.tsx
resources/js/Pages/Member/ApiKeys/Index.tsx
resources/js/Pages/Member/ApiKeys/Create.tsx
resources/js/Pages/Member/ApiKeys/columns.tsx
resources/js/Pages/Member/Usage/Index.tsx
resources/js/Pages/Member/Contracts/Index.tsx
resources/js/Pages/Member/Contracts/columns.tsx
resources/js/Pages/Member/Settings/Index.tsx

# Page-level shared utilities
resources/js/lib/format.ts                   # 數字、日期、Credit 格式化
```

### 修改檔案

```
src/Pages/page-routes.ts                     # 新增 6 條會員路由
```

---

### Task 1: 格式化工具函式

**Files:**
- Create: `resources/js/lib/format.ts`

- [ ] **Step 1: 建立格式化工具**

Create `resources/js/lib/format.ts`:

```typescript
export function formatNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (Number.isNaN(num)) return '0'
  return num.toLocaleString('zh-TW')
}

export function formatCredit(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (Number.isNaN(num)) return '0'
  return num.toLocaleString('zh-TW', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return '—'
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function formatDateTime(isoString: string | null | undefined): string {
  if (!isoString) return '—'
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function maskApiKey(key: string): string {
  if (!key || key.length < 12) return key
  return `${key.slice(0, 8)}...${key.slice(-4)}`
}
```

- [ ] **Step 2: Commit**

```bash
git add resources/js/lib/format.ts
git commit -m "feat: [frontend] 新增格式化工具（數字、Credit、日期、API Key mask）"
```

---

### Task 2: shadcn/ui 額外元件（Label, Form, Toast）

**Files:**
- Create: `resources/js/components/ui/label.tsx`
- Create: `resources/js/components/ui/form.tsx`
- Create: `resources/js/components/ui/toast.tsx`
- Create: `resources/js/components/ui/toaster.tsx`
- Create: `resources/js/hooks/use-toast.ts`

- [ ] **Step 1: 使用 shadcn CLI 安裝元件**

```bash
cd /Users/carl/Dev/CMG/Draupnir && bunx shadcn@latest add label form toast --yes
```

> **備註：** 若 CLI 失敗，從 [ui.shadcn.com/docs/components](https://ui.shadcn.com/docs/components) 手動複製 `label.tsx`、`form.tsx`、`toast.tsx`、`toaster.tsx`、`use-toast.ts` 到對應路徑。所有 `cn()` 引用須指向 `@/lib/utils`，`cva` 引用 `class-variance-authority`。

- [ ] **Step 2: 驗證 TypeScript 編譯**

```bash
bunx tsc --project tsconfig.frontend.json --noEmit
```

Expected: PASS

- [ ] **Step 3: 在 app.tsx 掛載 Toaster**

修改 `resources/js/app.tsx`，在 `createInertiaApp` 的 `setup` 中加入 Toaster：

```tsx
import { createInertiaApp } from '@inertiajs/react'
import { createRoot } from 'react-dom/client'
import { Toaster } from '@/components/ui/toaster'
import '../css/app.css'

createInertiaApp({
  title: (title) => (title ? `${title} — Draupnir` : 'Draupnir'),
  resolve: (name) => {
    const pages = import.meta.glob('./Pages/**/*.tsx', { eager: true })
    const page = pages[`./Pages/${name}.tsx`]
    if (!page) {
      throw new Error(`Page not found: ${name}`)
    }
    return page
  },
  setup({ el, App, props }) {
    createRoot(el).render(
      <>
        <App {...props} />
        <Toaster />
      </>,
    )
  },
})
```

- [ ] **Step 4: Commit**

```bash
git add resources/js/components/ui/label.tsx resources/js/components/ui/form.tsx resources/js/components/ui/toast.tsx resources/js/components/ui/toaster.tsx resources/js/hooks/use-toast.ts resources/js/app.tsx
git commit -m "feat: [frontend] 新增 shadcn Label/Form/Toast 元件 + 掛載 Toaster"
```

---

### Task 3: Member Dashboard 頁面控制器

**Files:**
- Create: `src/Pages/Member/MemberDashboardPage.ts`

- [ ] **Step 1: 建立 MemberDashboardPage**

Create `src/Pages/Member/MemberDashboardPage.ts`:

```typescript
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import type { GetDashboardSummaryService } from '@/Modules/Dashboard/Application/Services/GetDashboardSummaryService'
import type { GetBalanceService } from '@/Modules/Credit/Application/Services/GetBalanceService'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'

export class MemberDashboardPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly summaryService: GetDashboardSummaryService,
    private readonly balanceService: GetBalanceService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.redirect('/login')

    const orgId = ctx.getQuery('orgId') ?? ctx.getHeader('X-Organization-Id')
    if (!orgId) {
      return this.inertia.render(ctx, 'Member/Dashboard/Index', {
        summary: null,
        balance: null,
        error: '請先選擇組織',
      })
    }

    const [summaryResult, balanceResult] = await Promise.all([
      this.summaryService.execute(orgId, auth.userId, auth.role),
      this.balanceService.execute(orgId, auth.userId, auth.role),
    ])

    return this.inertia.render(ctx, 'Member/Dashboard/Index', {
      orgId,
      summary: summaryResult.success ? summaryResult.data : null,
      balance: balanceResult.success ? balanceResult.data : null,
      error: summaryResult.success ? null : summaryResult.message,
    })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/Pages/Member/MemberDashboardPage.ts
git commit -m "feat: [member] 新增 MemberDashboardPage 頁面控制器"
```

---

### Task 4: Member Dashboard React 頁面

**Files:**
- Create: `resources/js/Pages/Member/Dashboard/Index.tsx`

- [ ] **Step 1: 建立 Member Dashboard 頁面元件**

Create `resources/js/Pages/Member/Dashboard/Index.tsx`:

```tsx
import { Head } from '@inertiajs/react'
import { MemberLayout } from '@/layouts/MemberLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Key, CreditCard, Activity, TrendingUp } from 'lucide-react'
import { formatCredit, formatNumber } from '@/lib/format'

interface DashboardSummary {
  totalKeys: number
  activeKeys: number
  totalUsage: number
  creditBalance: string
}

interface Balance {
  balance: string
  lowBalanceThreshold: string
  status: string
}

interface Props {
  orgId?: string
  summary: DashboardSummary | null
  balance: Balance | null
  error: string | null
}

export default function MemberDashboard({ summary, balance, error }: Props) {
  return (
    <MemberLayout>
      <Head title="總覽" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">總覽</h1>
        </div>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6 text-destructive">{error}</CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="API Keys 總數"
            value={summary ? formatNumber(summary.totalKeys) : '—'}
            icon={<Key className="h-4 w-4 text-muted-foreground" />}
          />
          <StatCard
            title="活躍 Keys"
            value={summary ? formatNumber(summary.activeKeys) : '—'}
            icon={<Activity className="h-4 w-4 text-green-500" />}
          />
          <StatCard
            title="本期用量"
            value={summary ? formatNumber(summary.totalUsage) : '—'}
            icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          />
          <StatCard
            title="Credit 餘額"
            value={balance ? formatCredit(balance.balance) : '—'}
            icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
            suffix={
              balance && parseFloat(balance.balance) < parseFloat(balance.lowBalanceThreshold) ? (
                <Badge variant="destructive" className="ml-2">低額度</Badge>
              ) : null
            }
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>快速操作</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <a
              href="/member/api-keys/create"
              className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              建立 API Key
            </a>
            <a
              href="/member/usage"
              className="inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              查看用量
            </a>
          </CardContent>
        </Card>
      </div>
    </MemberLayout>
  )
}

function StatCard({
  title,
  value,
  icon,
  suffix,
}: {
  title: string
  value: string
  icon: React.ReactNode
  suffix?: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline text-2xl font-bold">
          {value}
          {suffix}
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: 驗證 TypeScript**

```bash
bunx tsc --project tsconfig.frontend.json --noEmit
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add resources/js/Pages/Member/Dashboard/Index.tsx
git commit -m "feat: [member] 新增 Member Dashboard 頁面（統計卡片 + 快速操作）"
```

---

### Task 5: Member API Keys 列表頁面控制器

**Files:**
- Create: `src/Pages/Member/MemberApiKeysPage.ts`

- [ ] **Step 1: 建立 MemberApiKeysPage**

Create `src/Pages/Member/MemberApiKeysPage.ts`:

```typescript
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import type { ListApiKeysService } from '@/Modules/ApiKey/Application/Services/ListApiKeysService'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'

export class MemberApiKeysPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly listService: ListApiKeysService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.redirect('/login')

    const orgId = ctx.getQuery('orgId') ?? ctx.getHeader('X-Organization-Id')
    if (!orgId) {
      return this.inertia.render(ctx, 'Member/ApiKeys/Index', {
        orgId: null,
        keys: [],
        meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
        error: '請先選擇組織',
      })
    }

    const page = parseInt(ctx.getQuery('page') ?? '1', 10)
    const limit = parseInt(ctx.getQuery('limit') ?? '20', 10)

    const result = await this.listService.execute(orgId, auth.userId, auth.role, page, limit)

    return this.inertia.render(ctx, 'Member/ApiKeys/Index', {
      orgId,
      keys: result.success ? result.data?.keys ?? [] : [],
      meta: result.success ? result.data?.meta : { total: 0, page: 1, limit: 20, totalPages: 0 },
      error: result.success ? null : result.message,
    })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/Pages/Member/MemberApiKeysPage.ts
git commit -m "feat: [member] 新增 MemberApiKeysPage 頁面控制器"
```

---

### Task 6: Member API Keys 列表 React 頁面

**Files:**
- Create: `resources/js/Pages/Member/ApiKeys/columns.tsx`
- Create: `resources/js/Pages/Member/ApiKeys/Index.tsx`

- [ ] **Step 1: 建立 columns 定義**

Create `resources/js/Pages/Member/ApiKeys/columns.tsx`:

```tsx
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'
import { router } from '@inertiajs/react'
import { formatDateTime, maskApiKey } from '@/lib/format'

export interface ApiKeyRow {
  id: string
  label: string
  keyPreview: string
  status: 'active' | 'revoked' | 'suspended_no_credit'
  createdAt: string
  lastUsedAt: string | null
}

function statusBadge(status: ApiKeyRow['status']) {
  switch (status) {
    case 'active':
      return <Badge className="bg-green-500 hover:bg-green-600">啟用</Badge>
    case 'revoked':
      return <Badge variant="destructive">已撤銷</Badge>
    case 'suspended_no_credit':
      return <Badge variant="outline">額度不足</Badge>
  }
}

function handleRevoke(keyId: string) {
  if (!confirm('確定要撤銷此 API Key？撤銷後無法復原。')) return
  router.post(`/api/keys/${keyId}/revoke`, {}, {
    preserveScroll: true,
  })
}

export const apiKeyColumns: ColumnDef<ApiKeyRow>[] = [
  {
    accessorKey: 'label',
    header: '名稱',
  },
  {
    accessorKey: 'keyPreview',
    header: 'Key',
    cell: ({ row }) => (
      <code className="text-xs">{maskApiKey(row.original.keyPreview)}</code>
    ),
  },
  {
    accessorKey: 'status',
    header: '狀態',
    cell: ({ row }) => statusBadge(row.original.status),
  },
  {
    accessorKey: 'createdAt',
    header: '建立時間',
    cell: ({ row }) => formatDateTime(row.original.createdAt),
  },
  {
    accessorKey: 'lastUsedAt',
    header: '最後使用',
    cell: ({ row }) => formatDateTime(row.original.lastUsedAt),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const key = row.original
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => handleRevoke(key.id)}
              disabled={key.status !== 'active'}
              className="text-destructive"
            >
              撤銷
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
```

- [ ] **Step 2: 建立列表頁面**

Create `resources/js/Pages/Member/ApiKeys/Index.tsx`:

```tsx
import { Head, Link } from '@inertiajs/react'
import { MemberLayout } from '@/layouts/MemberLayout'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/tables/DataTable'
import { apiKeyColumns, type ApiKeyRow } from './columns'
import { Plus } from 'lucide-react'

interface Props {
  orgId: string | null
  keys: ApiKeyRow[]
  meta: { total: number; page: number; limit: number; totalPages: number }
  error: string | null
}

export default function ApiKeysIndex({ orgId, keys, error }: Props) {
  return (
    <MemberLayout>
      <Head title="API Keys" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">API Keys</h1>
          <Button asChild>
            <Link href={`/member/api-keys/create${orgId ? `?orgId=${orgId}` : ''}`}>
              <Plus className="mr-2 h-4 w-4" />
              建立 Key
            </Link>
          </Button>
        </div>

        {error && (
          <div className="rounded-md border border-destructive p-4 text-destructive">
            {error}
          </div>
        )}

        <DataTable
          columns={apiKeyColumns}
          data={keys}
          searchPlaceholder="搜尋 Key 名稱..."
          searchColumn="label"
        />
      </div>
    </MemberLayout>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add resources/js/Pages/Member/ApiKeys/
git commit -m "feat: [member] 新增 API Keys 列表頁面（DataTable + 狀態 badge + 撤銷操作）"
```

---

### Task 7: Member API Key 建立頁面

**Files:**
- Create: `src/Pages/Member/MemberApiKeyCreatePage.ts`
- Create: `resources/js/Pages/Member/ApiKeys/Create.tsx`

- [ ] **Step 1: 建立頁面控制器**

Create `src/Pages/Member/MemberApiKeyCreatePage.ts`:

```typescript
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'

export class MemberApiKeyCreatePage {
  constructor(private readonly inertia: InertiaService) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.redirect('/login')

    const orgId = ctx.getQuery('orgId') ?? ctx.getHeader('X-Organization-Id')

    return this.inertia.render(ctx, 'Member/ApiKeys/Create', {
      orgId: orgId ?? null,
    })
  }
}
```

- [ ] **Step 2: 建立 React 表單頁面**

Create `resources/js/Pages/Member/ApiKeys/Create.tsx`:

```tsx
import { Head, router } from '@inertiajs/react'
import { useState } from 'react'
import { MemberLayout } from '@/layouts/MemberLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

interface Props {
  orgId: string | null
}

export default function ApiKeyCreate({ orgId }: Props) {
  const { toast } = useToast()
  const [label, setLabel] = useState('')
  const [rpm, setRpm] = useState('60')
  const [tpm, setTpm] = useState('10000')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId) {
      toast({ title: '錯誤', description: '缺少 orgId', variant: 'destructive' })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/organizations/${orgId}/keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Organization-Id': orgId,
        },
        body: JSON.stringify({
          label,
          rateLimitPerMinute: parseInt(rpm, 10),
          tokensPerMinute: parseInt(tpm, 10),
        }),
      })

      const result = await response.json()
      if (result.success) {
        setCreatedKey(result.data.key)
        toast({ title: '成功', description: 'API Key 建立成功' })
      } else {
        toast({ title: '失敗', description: result.message ?? '建立失敗', variant: 'destructive' })
      }
    } catch (err) {
      toast({
        title: '錯誤',
        description: err instanceof Error ? err.message : '網路錯誤',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDone = () => {
    router.visit(`/member/api-keys${orgId ? `?orgId=${orgId}` : ''}`)
  }

  return (
    <MemberLayout>
      <Head title="建立 API Key" />

      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">建立 API Key</h1>

        {createdKey ? (
          <Card className="border-green-500">
            <CardHeader>
              <CardTitle>Key 建立成功</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                請立即複製此 Key 並妥善保管，離開此頁面後將無法再次查看完整 Key。
              </p>
              <code className="block break-all rounded-md bg-muted p-3 text-sm">
                {createdKey}
              </code>
              <Button onClick={handleDone}>我已保存，返回列表</Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="label">名稱</Label>
                  <Input
                    id="label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="例如：開發測試用"
                    required
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rpm">每分鐘請求數上限（RPM）</Label>
                  <Input
                    id="rpm"
                    type="number"
                    value={rpm}
                    onChange={(e) => setRpm(e.target.value)}
                    min="1"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tpm">每分鐘 Token 上限（TPM）</Label>
                  <Input
                    id="tpm"
                    type="number"
                    value={tpm}
                    onChange={(e) => setTpm(e.target.value)}
                    min="1"
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={isSubmitting || !orgId}>
                    {isSubmitting ? '建立中...' : '建立'}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleDone}>
                    取消
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </MemberLayout>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/Pages/Member/MemberApiKeyCreatePage.ts resources/js/Pages/Member/ApiKeys/Create.tsx
git commit -m "feat: [member] 新增 API Key 建立表單 + 成功後一次性顯示完整 Key"
```

---

### Task 8: Member Usage 頁面

**Files:**
- Create: `src/Pages/Member/MemberUsagePage.ts`
- Create: `resources/js/Pages/Member/Usage/Index.tsx`

- [ ] **Step 1: 建立頁面控制器**

Create `src/Pages/Member/MemberUsagePage.ts`:

```typescript
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import type { GetUsageChartService } from '@/Modules/Dashboard/Application/Services/GetUsageChartService'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'

export class MemberUsagePage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly usageChartService: GetUsageChartService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.redirect('/login')

    const orgId = ctx.getQuery('orgId') ?? ctx.getHeader('X-Organization-Id')
    if (!orgId) {
      return this.inertia.render(ctx, 'Member/Usage/Index', {
        orgId: null,
        usageData: [],
        error: '請先選擇組織',
      })
    }

    const result = await this.usageChartService.execute({
      orgId,
      callerUserId: auth.userId,
      callerSystemRole: auth.role,
      startTime: ctx.getQuery('start_time') ?? undefined,
      endTime: ctx.getQuery('end_time') ?? undefined,
    })

    return this.inertia.render(ctx, 'Member/Usage/Index', {
      orgId,
      usageData: result.success ? result.data ?? [] : [],
      error: result.success ? null : result.message,
    })
  }
}
```

- [ ] **Step 2: 建立 React 頁面**

Create `resources/js/Pages/Member/Usage/Index.tsx`:

```tsx
import { Head } from '@inertiajs/react'
import { MemberLayout } from '@/layouts/MemberLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UsageLineChart, type UsageDataPoint } from '@/components/charts/UsageLineChart'

interface RawUsagePoint {
  timestamp: string
  requests: number
  inputTokens: number
  outputTokens: number
}

interface Props {
  orgId: string | null
  usageData: RawUsagePoint[]
  error: string | null
}

export default function Usage({ usageData, error }: Props) {
  const chartData: UsageDataPoint[] = usageData.map((p) => ({
    date: new Date(p.timestamp).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' }),
    requests: p.requests,
    tokens: p.inputTokens + p.outputTokens,
  }))

  return (
    <MemberLayout>
      <Head title="用量" />

      <div className="space-y-6">
        <h1 className="text-2xl font-bold">用量分析</h1>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6 text-destructive">{error}</CardContent>
          </Card>
        )}

        {chartData.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              尚無用量資料
            </CardContent>
          </Card>
        ) : (
          <UsageLineChart data={chartData} title="用量趨勢" />
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">總請求數</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {chartData.reduce((sum, p) => sum + p.requests, 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">總 Token 消耗</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {chartData.reduce((sum, p) => sum + p.tokens, 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MemberLayout>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/Pages/Member/MemberUsagePage.ts resources/js/Pages/Member/Usage/Index.tsx
git commit -m "feat: [member] 新增 Usage 頁面（折線圖 + 總計卡片）"
```

---

### Task 9: Member Contracts 頁面

**Files:**
- Create: `src/Pages/Member/MemberContractsPage.ts`
- Create: `resources/js/Pages/Member/Contracts/columns.tsx`
- Create: `resources/js/Pages/Member/Contracts/Index.tsx`

- [ ] **Step 1: 建立頁面控制器**

Create `src/Pages/Member/MemberContractsPage.ts`:

```typescript
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import type { ListContractsService } from '@/Modules/Contract/Application/Services/ListContractsService'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'

export class MemberContractsPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly listService: ListContractsService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.redirect('/login')

    const orgId = ctx.getQuery('orgId') ?? ctx.getHeader('X-Organization-Id')

    // Service 會依 targetType 過濾，會員只看自己 org 的合約
    const result = await this.listService.execute({
      targetType: orgId ? 'organization' : undefined,
      targetId: orgId ?? undefined,
      page: 1,
      limit: 50,
    })

    return this.inertia.render(ctx, 'Member/Contracts/Index', {
      orgId: orgId ?? null,
      contracts: result.success ? result.data?.contracts ?? [] : [],
      error: result.success ? null : result.message,
    })
  }
}
```

- [ ] **Step 2: 建立 contracts columns**

Create `resources/js/Pages/Member/Contracts/columns.tsx`:

```tsx
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/format'

export interface ContractRow {
  id: string
  name: string
  status: 'draft' | 'active' | 'expired' | 'terminated'
  startDate: string
  endDate: string
  creditQuota: string
}

function statusBadge(status: ContractRow['status']) {
  const map: Record<ContractRow['status'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    draft: { label: '草稿', variant: 'outline' },
    active: { label: '生效中', variant: 'default' },
    expired: { label: '已過期', variant: 'secondary' },
    terminated: { label: '已終止', variant: 'destructive' },
  }
  const { label, variant } = map[status]
  return <Badge variant={variant}>{label}</Badge>
}

export const contractColumns: ColumnDef<ContractRow>[] = [
  {
    accessorKey: 'name',
    header: '合約名稱',
  },
  {
    accessorKey: 'status',
    header: '狀態',
    cell: ({ row }) => statusBadge(row.original.status),
  },
  {
    accessorKey: 'startDate',
    header: '生效日',
    cell: ({ row }) => formatDate(row.original.startDate),
  },
  {
    accessorKey: 'endDate',
    header: '到期日',
    cell: ({ row }) => formatDate(row.original.endDate),
  },
  {
    accessorKey: 'creditQuota',
    header: 'Credit 配額',
  },
]
```

- [ ] **Step 3: 建立列表頁面**

Create `resources/js/Pages/Member/Contracts/Index.tsx`:

```tsx
import { Head } from '@inertiajs/react'
import { MemberLayout } from '@/layouts/MemberLayout'
import { DataTable } from '@/components/tables/DataTable'
import { contractColumns, type ContractRow } from './columns'

interface Props {
  orgId: string | null
  contracts: ContractRow[]
  error: string | null
}

export default function ContractsIndex({ contracts, error }: Props) {
  return (
    <MemberLayout>
      <Head title="合約" />

      <div className="space-y-6">
        <h1 className="text-2xl font-bold">合約</h1>

        {error && (
          <div className="rounded-md border border-destructive p-4 text-destructive">
            {error}
          </div>
        )}

        <DataTable
          columns={contractColumns}
          data={contracts}
          searchPlaceholder="搜尋合約..."
          searchColumn="name"
        />
      </div>
    </MemberLayout>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/Pages/Member/MemberContractsPage.ts resources/js/Pages/Member/Contracts/
git commit -m "feat: [member] 新增 Contracts 列表頁面"
```

---

### Task 10: Member Settings 頁面

**Files:**
- Create: `src/Pages/Member/MemberSettingsPage.ts`
- Create: `resources/js/Pages/Member/Settings/Index.tsx`

- [ ] **Step 1: 建立頁面控制器**

Create `src/Pages/Member/MemberSettingsPage.ts`:

```typescript
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import type { GetUserProfileService } from '@/Modules/User/Application/Services/GetUserProfileService'
import { AuthMiddleware } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'

export class MemberSettingsPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly getUserProfileService: GetUserProfileService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const auth = AuthMiddleware.getAuthContext(ctx)
    if (!auth) return ctx.redirect('/login')

    const result = await this.getUserProfileService.execute(auth.userId)

    return this.inertia.render(ctx, 'Member/Settings/Index', {
      profile: result.success ? result.data : null,
      error: result.success ? null : result.message,
    })
  }
}
```

- [ ] **Step 2: 建立 Settings 表單頁面**

Create `resources/js/Pages/Member/Settings/Index.tsx`:

```tsx
import { Head } from '@inertiajs/react'
import { useState } from 'react'
import { MemberLayout } from '@/layouts/MemberLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

interface UserProfile {
  id: string
  email: string
  name: string
  role: string
}

interface Props {
  profile: UserProfile | null
  error: string | null
}

export default function Settings({ profile, error }: Props) {
  const { toast } = useToast()
  const [name, setName] = useState(profile?.name ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })

      const result = await response.json()
      if (result.success) {
        toast({ title: '成功', description: '個人資料已更新' })
      } else {
        toast({
          title: '失敗',
          description: result.message ?? '更新失敗',
          variant: 'destructive',
        })
      }
    } catch (err) {
      toast({
        title: '錯誤',
        description: err instanceof Error ? err.message : '網路錯誤',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <MemberLayout>
      <Head title="設定" />

      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">個人設定</h1>

        {error && (
          <div className="rounded-md border border-destructive p-4 text-destructive">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>個人資料</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={profile?.email ?? ''}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">顯示名稱</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">角色</Label>
                <Input
                  id="role"
                  value={profile?.role ?? ''}
                  disabled
                  className="bg-muted"
                />
              </div>

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? '儲存中...' : '儲存變更'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </MemberLayout>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/Pages/Member/MemberSettingsPage.ts resources/js/Pages/Member/Settings/Index.tsx
git commit -m "feat: [member] 新增 Settings 個人資料頁面（Email 唯讀 + 顯示名稱編輯）"
```

---

### Task 11: 註冊所有會員 Portal 路由

**Files:**
- Modify: `src/Pages/page-routes.ts`

- [ ] **Step 1: 在 page-routes.ts 新增會員路由**

在 `src/Pages/page-routes.ts` 的 import 區段新增：

```typescript
import { MemberDashboardPage } from './Member/MemberDashboardPage'
import { MemberApiKeysPage } from './Member/MemberApiKeysPage'
import { MemberApiKeyCreatePage } from './Member/MemberApiKeyCreatePage'
import { MemberUsagePage } from './Member/MemberUsagePage'
import { MemberContractsPage } from './Member/MemberContractsPage'
import { MemberSettingsPage } from './Member/MemberSettingsPage'
```

在 `registerPageRoutes` 函式內，`adminDashboard` 建立之後加入：

```typescript
// Member page controllers
const memberDashboard = new MemberDashboardPage(
  inertia,
  core.container.make('getDashboardSummaryService') as any,
  core.container.make('getBalanceService') as any,
)
const memberApiKeys = new MemberApiKeysPage(
  inertia,
  core.container.make('listApiKeysService') as any,
)
const memberApiKeyCreate = new MemberApiKeyCreatePage(inertia)
const memberUsage = new MemberUsagePage(
  inertia,
  core.container.make('getUsageChartService') as any,
)
const memberContracts = new MemberContractsPage(
  inertia,
  core.container.make('listContractsService') as any,
)
const memberSettings = new MemberSettingsPage(
  inertia,
  core.container.make('getUserProfileService') as any,
)
```

在 `// Admin routes` 之後加入：

```typescript
// Member routes
core.router.get('/member/dashboard', withSharedData((ctx) => memberDashboard.handle(ctx)))
core.router.get('/member/api-keys', withSharedData((ctx) => memberApiKeys.handle(ctx)))
core.router.get('/member/api-keys/create', withSharedData((ctx) => memberApiKeyCreate.handle(ctx)))
core.router.get('/member/usage', withSharedData((ctx) => memberUsage.handle(ctx)))
core.router.get('/member/contracts', withSharedData((ctx) => memberContracts.handle(ctx)))
core.router.get('/member/settings', withSharedData((ctx) => memberSettings.handle(ctx)))
```

- [ ] **Step 2: 驗證後端 TypeScript**

```bash
bun run typecheck
```

Expected: PASS

- [ ] **Step 3: 驗證後端測試**

```bash
bun test tests/Feature/health.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/Pages/page-routes.ts
git commit -m "feat: [member] 註冊 6 條 Member Portal 路由"
```

---

### Task 12: E2E 測試 — Member Portal 基本流程

**Files:**
- Create: `e2e/member-portal.spec.ts`

- [ ] **Step 1: 建立 E2E 測試**

Create `e2e/member-portal.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Member Portal', () => {
  test.beforeEach(async ({ request }) => {
    // Seed: 清理 + 建立測試使用者
    await request.post('/api/test/seed', {
      data: { action: 'reset' },
    }).catch(() => {})
  })

  test('會員 Dashboard 頁面可載入', async ({ page }) => {
    await page.goto('/member/dashboard')
    await expect(page.locator('#app')).toBeVisible()
    await expect(page.locator('h1')).toContainText('總覽')
  })

  test('API Keys 列表頁面可載入', async ({ page }) => {
    await page.goto('/member/api-keys')
    await expect(page.locator('#app')).toBeVisible()
    await expect(page.locator('h1')).toContainText('API Keys')
    await expect(page.locator('button', { hasText: '建立 Key' })).toBeVisible()
  })

  test('API Keys 建立頁面顯示表單', async ({ page }) => {
    await page.goto('/member/api-keys/create')
    await expect(page.locator('input#label')).toBeVisible()
    await expect(page.locator('input#rpm')).toBeVisible()
    await expect(page.locator('input#tpm')).toBeVisible()
  })

  test('Usage 頁面可載入', async ({ page }) => {
    await page.goto('/member/usage')
    await expect(page.locator('h1')).toContainText('用量分析')
  })

  test('Contracts 頁面可載入', async ({ page }) => {
    await page.goto('/member/contracts')
    await expect(page.locator('h1')).toContainText('合約')
  })

  test('Settings 頁面顯示使用者表單', async ({ page }) => {
    await page.goto('/member/settings')
    await expect(page.locator('h1')).toContainText('個人設定')
    await expect(page.locator('input#email')).toBeDisabled()
    await expect(page.locator('input#name')).toBeEnabled()
  })
})
```

- [ ] **Step 2: 執行 E2E 測試**

```bash
bun run build:frontend && bun run test:e2e -- --grep "Member Portal"
```

Expected: PASS（或 skip 個別需要登入的測試）

- [ ] **Step 3: Commit**

```bash
git add e2e/member-portal.spec.ts
git commit -m "test: [e2e] 新增 Member Portal 6 個頁面 smoke test"
```

---

## Self-Review Checklist

### 1. Spec Coverage

| 規格需求 | 對應 Task |
|----------|-----------|
| `resources/pages/Member/Dashboard/Index.tsx` | Task 3, 4 |
| `resources/pages/Member/ApiKeys/Index.tsx, Create.tsx` | Task 5-7 |
| `resources/pages/Member/Usage/Index.tsx` | Task 8 |
| `resources/pages/Member/Contracts/Index.tsx` | Task 9 |
| `resources/pages/Member/Settings/Index.tsx` | Task 10 |
| `resources/pages/Member/Layout/MemberLayout.tsx` | Phase 7a Task 11 |
| 會員自助管理 Key、用量、Credit | Task 3-8 |
| Loading / Empty / Error 狀態 | Task 4, 6, 8 (empty/error cards) |
| 響應式設計 | 透過 MemberLayout（Phase 7a）繼承 |
| 無 console.log、無 hardcoded 值 | 全部頁面使用 props 和 format utilities |

### 2. 延後至 Phase 7c 的項目

- 管理後台所有頁面（7c）
- 合約管理操作（建立、續約、終止）— 會員只檢視，操作在 admin
- Credit 充值介面 — 僅 admin 角色可用，在 7c 實作

### 3. 型別一致性

- `ApiKeyRow`、`ContractRow` 型別在各自的 `columns.tsx` 定義並由 `Index.tsx` 引用
- 所有頁面的 Props 介面與對應頁面控制器的 `render` 呼叫第 3 參數結構一致
- `UsageDataPoint`（來自 `@/components/charts/UsageLineChart`）在 Task 8 正確引用

### 4. 依賴檢查

- 所有頁面控制器使用 `core.container.make()` 解析既有 Service（已在現有 bootstrap.ts 註冊）
- 前端表單呼叫既有 API routes（`POST /api/organizations/:orgId/keys`、`PUT /api/users/me`）
- 無需修改既有 API 或 Service
