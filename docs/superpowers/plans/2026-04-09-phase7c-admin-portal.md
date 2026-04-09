# Phase 7c: Admin Portal 實作計劃

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 實作管理後台所有頁面 — Dashboard、使用者管理、組織管理、合約管理、模組管理、API Keys 全域總覽、UsageSync 狀態監控。管理者可從單一介面管理整個系統的所有資源。

**Architecture:** 依循 Phase 7a 建立的 Inertia + React + shadcn/ui 架構。所有 Admin 頁面需通過 `requireAuth()` + `admin` role 檢查（在 page controller 內驗證 `auth.role === 'admin'`）。每個資源（User、Org、Contract、Module）有列表頁 + 詳細/建立頁 + 表單操作。

**Tech Stack:** React 19, @inertiajs/react, shadcn/ui, Tailwind CSS, TanStack Table, Recharts, React Hook Form + Zod

**Prerequisites:**
- `2026-04-09-phase7a-frontend-infrastructure.md` — **必須先完成**（InertiaService, Layouts, DataTable, Chart, shadcn UI 元件）
- `2026-04-09-phase7b-member-portal.md` — 建議先完成（共用了 Label/Form/Toast 等 shadcn 元件，可省去重複安裝）

**Related Plans:**
- `2026-04-09-phase7b-member-portal.md` — 會員 Portal 頁面

---

## Scope

本計劃涵蓋管理後台頁面（依規格 7.1 的優先序排列）：

| 優先級 | 頁面 | 路徑 | 對應 API |
|--------|------|------|----------|
| 1 | Dashboard（系統總覽） | `/admin/dashboard` | 多 API 聚合 |
| 2 | Users 列表 | `/admin/users` | `GET /api/users` |
| 2 | User 詳細 | `/admin/users/:id` | `GET /api/users/:id` + `PATCH .../status` |
| 2 | Organizations 列表 | `/admin/organizations` | `GET /api/organizations` |
| 2 | Organization 詳細 | `/admin/organizations/:id` | `GET /api/organizations/:id` + members |
| 3 | Contracts 列表 | `/admin/contracts` | `GET /api/contracts` |
| 3 | Contract 建立 | `/admin/contracts/create` | `POST /api/contracts` |
| 3 | Contract 詳細 | `/admin/contracts/:id` | `GET /api/contracts/:id` + 動作 |
| 3 | Modules 列表 | `/admin/modules` | `GET /api/modules` |
| 3 | Module 建立 | `/admin/modules/create` | `POST /api/modules` |
| 4 | API Keys 全域總覽 | `/admin/api-keys` | 跨 org 聚合 |
| 5 | UsageSync 狀態 | `/admin/usage-sync` | 運維監控資訊 |

> **注意：** Phase 7a Task 14-15 已建立基礎的 Admin Dashboard 頁面控制器 + React 頁面。本計劃的 Task 1 會將其擴充為完整的系統總覽（多資料來源聚合）。

---

## File Structure

### 新增檔案

```
# Server-side Page Controllers
src/Pages/Admin/AdminDashboardPage.ts            # 修改：擴充為完整總覽
src/Pages/Admin/AdminUsersPage.ts
src/Pages/Admin/AdminUserDetailPage.ts
src/Pages/Admin/AdminOrganizationsPage.ts
src/Pages/Admin/AdminOrganizationDetailPage.ts
src/Pages/Admin/AdminContractsPage.ts
src/Pages/Admin/AdminContractCreatePage.ts
src/Pages/Admin/AdminContractDetailPage.ts
src/Pages/Admin/AdminModulesPage.ts
src/Pages/Admin/AdminModuleCreatePage.ts
src/Pages/Admin/AdminApiKeysPage.ts
src/Pages/Admin/AdminUsageSyncPage.ts
src/Pages/Admin/helpers/requireAdmin.ts          # 共用 admin 角色檢查

# Admin React Pages
resources/js/Pages/Admin/Dashboard/Index.tsx     # 修改：擴充卡片與圖表
resources/js/Pages/Admin/Users/Index.tsx
resources/js/Pages/Admin/Users/Show.tsx
resources/js/Pages/Admin/Users/columns.tsx
resources/js/Pages/Admin/Organizations/Index.tsx
resources/js/Pages/Admin/Organizations/Show.tsx
resources/js/Pages/Admin/Organizations/columns.tsx
resources/js/Pages/Admin/Contracts/Index.tsx
resources/js/Pages/Admin/Contracts/Create.tsx
resources/js/Pages/Admin/Contracts/Show.tsx
resources/js/Pages/Admin/Contracts/columns.tsx
resources/js/Pages/Admin/Modules/Index.tsx
resources/js/Pages/Admin/Modules/Create.tsx
resources/js/Pages/Admin/Modules/columns.tsx
resources/js/Pages/Admin/ApiKeys/Index.tsx
resources/js/Pages/Admin/ApiKeys/columns.tsx
resources/js/Pages/Admin/UsageSync/Index.tsx
```

### 修改檔案

```
src/Pages/page-routes.ts                         # 新增所有 Admin 路由
src/Pages/Admin/AdminDashboardPage.ts            # 擴充資料聚合
resources/js/Pages/Admin/Dashboard/Index.tsx     # 擴充顯示
```

---

### Task 1: requireAdmin 共用輔助函式

**Files:**
- Create: `src/Pages/Admin/helpers/requireAdmin.ts`

- [ ] **Step 1: 建立 requireAdmin 輔助函式**

Create `src/Pages/Admin/helpers/requireAdmin.ts`:

```typescript
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import { AuthMiddleware, type AuthContext } from '@/Shared/Infrastructure/Middleware/AuthMiddleware'

export interface AdminAuthResult {
  ok: boolean
  auth?: AuthContext
  response?: Response
}

/**
 * 檢查請求是否來自已登入的 admin 使用者。
 * - 未登入：重導至 /login
 * - 非 admin：回傳 403 HTML 錯誤頁
 * - admin：回傳 { ok: true, auth }
 */
export function requireAdmin(ctx: IHttpContext): AdminAuthResult {
  const auth = AuthMiddleware.getAuthContext(ctx)

  if (!auth) {
    return { ok: false, response: ctx.redirect('/login') }
  }

  if (auth.role !== 'admin') {
    return {
      ok: false,
      response: new Response(
        '<html><body><h1>403 Forbidden</h1><p>需要管理員權限</p></body></html>',
        { status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
      ),
    }
  }

  return { ok: true, auth }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/Pages/Admin/helpers/requireAdmin.ts
git commit -m "feat: [admin] 新增 requireAdmin 輔助函式（統一的登入 + admin 角色檢查）"
```

---

### Task 2: Admin Dashboard 擴充

**Files:**
- Modify: `src/Pages/Admin/AdminDashboardPage.ts`
- Modify: `resources/js/Pages/Admin/Dashboard/Index.tsx`

- [ ] **Step 1: 擴充 AdminDashboardPage 聚合多資料源**

Replace `src/Pages/Admin/AdminDashboardPage.ts`:

```typescript
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import type { ListUsersService } from '@/Modules/User/Application/Services/ListUsersService'
import type { ListOrganizationsService } from '@/Modules/Organization/Application/Services/ListOrganizationsService'
import type { ListContractsService } from '@/Modules/Contract/Application/Services/ListContractsService'
import { requireAdmin } from './helpers/requireAdmin'

export class AdminDashboardPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly listUsersService: ListUsersService,
    private readonly listOrgsService: ListOrganizationsService,
    private readonly listContractsService: ListContractsService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const check = requireAdmin(ctx)
    if (!check.ok) return check.response!

    const [usersResult, orgsResult, contractsResult] = await Promise.all([
      this.listUsersService.execute({ page: 1, limit: 1 }),
      this.listOrgsService.execute(1, 1),
      this.listContractsService.execute({ page: 1, limit: 1 }),
    ])

    const totals = {
      users: usersResult.success ? usersResult.data?.meta?.total ?? 0 : 0,
      organizations: orgsResult.success ? orgsResult.data?.meta?.total ?? 0 : 0,
      contracts: contractsResult.success ? contractsResult.data?.meta?.total ?? 0 : 0,
    }

    return this.inertia.render(ctx, 'Admin/Dashboard/Index', {
      totals,
    })
  }
}
```

- [ ] **Step 2: 擴充 Admin Dashboard React 頁面**

Replace `resources/js/Pages/Admin/Dashboard/Index.tsx`:

```tsx
import { Head, Link } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UsageLineChart, type UsageDataPoint } from '@/components/charts/UsageLineChart'
import { Users, Building2, FileText, Key } from 'lucide-react'
import { formatNumber } from '@/lib/format'

interface Totals {
  users: number
  organizations: number
  contracts: number
}

interface Props {
  totals: Totals
}

export default function AdminDashboard({ totals }: Props) {
  const sampleUsageData: UsageDataPoint[] = [
    { date: '03/01', requests: 420, tokens: 145000 },
    { date: '03/02', requests: 650, tokens: 152000 },
    { date: '03/03', requests: 598, tokens: 138000 },
    { date: '03/04', requests: 800, tokens: 171000 },
    { date: '03/05', requests: 775, tokens: 163000 },
  ]

  return (
    <AdminLayout>
      <Head title="系統總覽" />

      <div className="space-y-6">
        <h1 className="text-2xl font-bold">系統總覽</h1>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="使用者總數"
            value={formatNumber(totals.users)}
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
            href="/admin/users"
          />
          <StatCard
            title="組織總數"
            value={formatNumber(totals.organizations)}
            icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
            href="/admin/organizations"
          />
          <StatCard
            title="合約總數"
            value={formatNumber(totals.contracts)}
            icon={<FileText className="h-4 w-4 text-muted-foreground" />}
            href="/admin/contracts"
          />
          <StatCard
            title="API Keys"
            value="—"
            icon={<Key className="h-4 w-4 text-muted-foreground" />}
            href="/admin/api-keys"
          />
        </div>

        <UsageLineChart data={sampleUsageData} title="全系統用量趨勢" />
      </div>
    </AdminLayout>
  )
}

function StatCard({
  title,
  value,
  icon,
  href,
}: {
  title: string
  value: string
  icon: React.ReactNode
  href: string
}) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:bg-accent">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
        </CardContent>
      </Card>
    </Link>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/Pages/Admin/AdminDashboardPage.ts resources/js/Pages/Admin/Dashboard/Index.tsx
git commit -m "feat: [admin] 擴充 Admin Dashboard 聚合 User/Org/Contract 總數 + 可點選卡片"
```

---

### Task 3: Admin Users 列表頁

**Files:**
- Create: `src/Pages/Admin/AdminUsersPage.ts`
- Create: `resources/js/Pages/Admin/Users/columns.tsx`
- Create: `resources/js/Pages/Admin/Users/Index.tsx`

- [ ] **Step 1: 建立頁面控制器**

Create `src/Pages/Admin/AdminUsersPage.ts`:

```typescript
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import type { ListUsersService } from '@/Modules/User/Application/Services/ListUsersService'
import { requireAdmin } from './helpers/requireAdmin'

export class AdminUsersPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly listService: ListUsersService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const check = requireAdmin(ctx)
    if (!check.ok) return check.response!

    const page = parseInt(ctx.getQuery('page') ?? '1', 10)
    const limit = parseInt(ctx.getQuery('limit') ?? '20', 10)
    const keyword = ctx.getQuery('keyword')
    const role = ctx.getQuery('role')
    const status = ctx.getQuery('status')

    const result = await this.listService.execute({ page, limit, keyword, role, status })

    return this.inertia.render(ctx, 'Admin/Users/Index', {
      users: result.success ? result.data?.users ?? [] : [],
      meta: result.success ? result.data?.meta : { total: 0, page: 1, limit: 20, totalPages: 0 },
      filters: { keyword: keyword ?? '', role: role ?? '', status: status ?? '' },
      error: result.success ? null : result.message,
    })
  }
}
```

- [ ] **Step 2: 建立 columns**

Create `resources/js/Pages/Admin/Users/columns.tsx`:

```tsx
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Link } from '@inertiajs/react'
import { formatDateTime } from '@/lib/format'

export interface UserRow {
  id: string
  email: string
  name: string
  role: 'admin' | 'manager' | 'user'
  status: 'active' | 'disabled'
  createdAt: string
}

function roleBadge(role: UserRow['role']) {
  const map = {
    admin: { label: '管理員', variant: 'default' as const },
    manager: { label: '經理', variant: 'secondary' as const },
    user: { label: '一般', variant: 'outline' as const },
  }
  return <Badge variant={map[role].variant}>{map[role].label}</Badge>
}

function statusBadge(status: UserRow['status']) {
  return status === 'active' ? (
    <Badge className="bg-green-500 hover:bg-green-600">啟用</Badge>
  ) : (
    <Badge variant="destructive">停用</Badge>
  )
}

export const userColumns: ColumnDef<UserRow>[] = [
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'name',
    header: '名稱',
  },
  {
    accessorKey: 'role',
    header: '角色',
    cell: ({ row }) => roleBadge(row.original.role),
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
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/admin/users/${row.original.id}`}>檢視</Link>
      </Button>
    ),
  },
]
```

- [ ] **Step 3: 建立列表頁面**

Create `resources/js/Pages/Admin/Users/Index.tsx`:

```tsx
import { Head } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { DataTable } from '@/components/tables/DataTable'
import { userColumns, type UserRow } from './columns'

interface Props {
  users: UserRow[]
  meta: { total: number; page: number; limit: number; totalPages: number }
  filters: { keyword: string; role: string; status: string }
  error: string | null
}

export default function UsersIndex({ users, error }: Props) {
  return (
    <AdminLayout>
      <Head title="使用者管理" />

      <div className="space-y-6">
        <h1 className="text-2xl font-bold">使用者管理</h1>

        {error && (
          <div className="rounded-md border border-destructive p-4 text-destructive">
            {error}
          </div>
        )}

        <DataTable
          columns={userColumns}
          data={users}
          searchPlaceholder="搜尋 Email 或名稱..."
          searchColumn="email"
        />
      </div>
    </AdminLayout>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/Pages/Admin/AdminUsersPage.ts resources/js/Pages/Admin/Users/Index.tsx resources/js/Pages/Admin/Users/columns.tsx
git commit -m "feat: [admin] 新增使用者管理列表頁（角色/狀態 badge + 搜尋）"
```

---

### Task 4: Admin User 詳細頁

**Files:**
- Create: `src/Pages/Admin/AdminUserDetailPage.ts`
- Create: `resources/js/Pages/Admin/Users/Show.tsx`

- [ ] **Step 1: 建立頁面控制器**

Create `src/Pages/Admin/AdminUserDetailPage.ts`:

```typescript
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import type { GetUserProfileService } from '@/Modules/User/Application/Services/GetUserProfileService'
import { requireAdmin } from './helpers/requireAdmin'

export class AdminUserDetailPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly getProfileService: GetUserProfileService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const check = requireAdmin(ctx)
    if (!check.ok) return check.response!

    const userId = ctx.getParam('id')
    if (!userId) {
      return this.inertia.render(ctx, 'Admin/Users/Show', {
        user: null,
        error: '缺少 user id',
      })
    }

    const result = await this.getProfileService.execute(userId)

    return this.inertia.render(ctx, 'Admin/Users/Show', {
      user: result.success ? result.data : null,
      error: result.success ? null : result.message,
    })
  }
}
```

- [ ] **Step 2: 建立 React 詳細頁**

Create `resources/js/Pages/Admin/Users/Show.tsx`:

```tsx
import { Head, Link, router } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft } from 'lucide-react'
import { formatDateTime } from '@/lib/format'

interface UserProfile {
  id: string
  email: string
  name: string
  role: string
  status: 'active' | 'disabled'
  createdAt: string
  updatedAt: string
}

interface Props {
  user: UserProfile | null
  error: string | null
}

export default function UserShow({ user, error }: Props) {
  const { toast } = useToast()

  const handleToggleStatus = async () => {
    if (!user) return
    const newStatus = user.status === 'active' ? 'disabled' : 'active'
    if (!confirm(`確定要將此使用者設為「${newStatus === 'active' ? '啟用' : '停用'}」？`)) return

    try {
      const res = await fetch(`/api/users/${user.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const result = await res.json()
      if (result.success) {
        toast({ title: '成功', description: '狀態已更新' })
        router.reload()
      } else {
        toast({ title: '失敗', description: result.message, variant: 'destructive' })
      }
    } catch (err) {
      toast({
        title: '錯誤',
        description: err instanceof Error ? err.message : '網路錯誤',
        variant: 'destructive',
      })
    }
  }

  return (
    <AdminLayout>
      <Head title="使用者詳細" />

      <div className="max-w-3xl space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/users">
              <ArrowLeft className="mr-1 h-4 w-4" />
              返回列表
            </Link>
          </Button>
        </div>

        {error && (
          <div className="rounded-md border border-destructive p-4 text-destructive">
            {error}
          </div>
        )}

        {user && (
          <>
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">{user.name || user.email}</h1>
              <Button
                variant={user.status === 'active' ? 'destructive' : 'default'}
                onClick={handleToggleStatus}
              >
                {user.status === 'active' ? '停用' : '啟用'}
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>基本資料</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Field label="ID" value={<code className="text-xs">{user.id}</code>} />
                <Field label="Email" value={user.email} />
                <Field label="名稱" value={user.name || '—'} />
                <Field label="角色" value={<Badge>{user.role}</Badge>} />
                <Field
                  label="狀態"
                  value={
                    user.status === 'active' ? (
                      <Badge className="bg-green-500">啟用</Badge>
                    ) : (
                      <Badge variant="destructive">停用</Badge>
                    )
                  }
                />
                <Field label="建立時間" value={formatDateTime(user.createdAt)} />
                <Field label="最後更新" value={formatDateTime(user.updatedAt)} />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/Pages/Admin/AdminUserDetailPage.ts resources/js/Pages/Admin/Users/Show.tsx
git commit -m "feat: [admin] 新增使用者詳細頁 + 啟用/停用操作"
```

---

### Task 5: Admin Organizations 列表頁

**Files:**
- Create: `src/Pages/Admin/AdminOrganizationsPage.ts`
- Create: `resources/js/Pages/Admin/Organizations/columns.tsx`
- Create: `resources/js/Pages/Admin/Organizations/Index.tsx`

- [ ] **Step 1: 建立頁面控制器**

Create `src/Pages/Admin/AdminOrganizationsPage.ts`:

```typescript
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import type { ListOrganizationsService } from '@/Modules/Organization/Application/Services/ListOrganizationsService'
import { requireAdmin } from './helpers/requireAdmin'

export class AdminOrganizationsPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly listService: ListOrganizationsService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const check = requireAdmin(ctx)
    if (!check.ok) return check.response!

    const page = parseInt(ctx.getQuery('page') ?? '1', 10)
    const limit = parseInt(ctx.getQuery('limit') ?? '20', 10)

    const result = await this.listService.execute(page, limit)

    return this.inertia.render(ctx, 'Admin/Organizations/Index', {
      organizations: result.success ? result.data?.organizations ?? [] : [],
      meta: result.success ? result.data?.meta : { total: 0, page: 1, limit: 20, totalPages: 0 },
      error: result.success ? null : result.message,
    })
  }
}
```

- [ ] **Step 2: 建立 columns**

Create `resources/js/Pages/Admin/Organizations/columns.tsx`:

```tsx
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Link } from '@inertiajs/react'
import { formatDateTime } from '@/lib/format'

export interface OrgRow {
  id: string
  name: string
  slug: string
  status: 'active' | 'suspended'
  memberCount: number
  createdAt: string
}

export const orgColumns: ColumnDef<OrgRow>[] = [
  {
    accessorKey: 'name',
    header: '組織名稱',
  },
  {
    accessorKey: 'slug',
    header: 'Slug',
    cell: ({ row }) => <code className="text-xs">{row.original.slug}</code>,
  },
  {
    accessorKey: 'status',
    header: '狀態',
    cell: ({ row }) =>
      row.original.status === 'active' ? (
        <Badge className="bg-green-500">啟用</Badge>
      ) : (
        <Badge variant="destructive">暫停</Badge>
      ),
  },
  {
    accessorKey: 'memberCount',
    header: '成員數',
  },
  {
    accessorKey: 'createdAt',
    header: '建立時間',
    cell: ({ row }) => formatDateTime(row.original.createdAt),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/admin/organizations/${row.original.id}`}>檢視</Link>
      </Button>
    ),
  },
]
```

- [ ] **Step 3: 建立列表頁面**

Create `resources/js/Pages/Admin/Organizations/Index.tsx`:

```tsx
import { Head } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { DataTable } from '@/components/tables/DataTable'
import { orgColumns, type OrgRow } from './columns'

interface Props {
  organizations: OrgRow[]
  meta: { total: number; page: number; limit: number; totalPages: number }
  error: string | null
}

export default function OrganizationsIndex({ organizations, error }: Props) {
  return (
    <AdminLayout>
      <Head title="組織管理" />

      <div className="space-y-6">
        <h1 className="text-2xl font-bold">組織管理</h1>

        {error && (
          <div className="rounded-md border border-destructive p-4 text-destructive">
            {error}
          </div>
        )}

        <DataTable
          columns={orgColumns}
          data={organizations}
          searchPlaceholder="搜尋組織..."
          searchColumn="name"
        />
      </div>
    </AdminLayout>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/Pages/Admin/AdminOrganizationsPage.ts resources/js/Pages/Admin/Organizations/
git commit -m "feat: [admin] 新增組織管理列表頁"
```

---

### Task 6: Admin Organization 詳細頁

**Files:**
- Create: `src/Pages/Admin/AdminOrganizationDetailPage.ts`
- Create: `resources/js/Pages/Admin/Organizations/Show.tsx`

- [ ] **Step 1: 建立頁面控制器**

Create `src/Pages/Admin/AdminOrganizationDetailPage.ts`:

```typescript
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import type { GetOrganizationService } from '@/Modules/Organization/Application/Services/GetOrganizationService'
import type { ListMembersService } from '@/Modules/Organization/Application/Services/ListMembersService'
import { requireAdmin } from './helpers/requireAdmin'

export class AdminOrganizationDetailPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly getOrgService: GetOrganizationService,
    private readonly listMembersService: ListMembersService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const check = requireAdmin(ctx)
    if (!check.ok) return check.response!
    const auth = check.auth!

    const orgId = ctx.getParam('id')
    if (!orgId) {
      return this.inertia.render(ctx, 'Admin/Organizations/Show', {
        organization: null,
        members: [],
        error: '缺少 org id',
      })
    }

    const [orgResult, membersResult] = await Promise.all([
      this.getOrgService.execute(orgId),
      this.listMembersService.execute(orgId, auth.userId, auth.role),
    ])

    return this.inertia.render(ctx, 'Admin/Organizations/Show', {
      organization: orgResult.success ? orgResult.data : null,
      members: membersResult.success ? membersResult.data?.members ?? [] : [],
      error: orgResult.success ? null : orgResult.message,
    })
  }
}
```

- [ ] **Step 2: 建立 React 詳細頁**

Create `resources/js/Pages/Admin/Organizations/Show.tsx`:

```tsx
import { Head, Link } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/tables/DataTable'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowLeft } from 'lucide-react'
import { formatDateTime } from '@/lib/format'

interface Organization {
  id: string
  name: string
  slug: string
  status: string
  createdAt: string
}

interface Member {
  userId: string
  email: string
  role: string
  joinedAt: string
}

interface Props {
  organization: Organization | null
  members: Member[]
  error: string | null
}

const memberColumns: ColumnDef<Member>[] = [
  { accessorKey: 'email', header: 'Email' },
  {
    accessorKey: 'role',
    header: '角色',
    cell: ({ row }) => <Badge variant="outline">{row.original.role}</Badge>,
  },
  {
    accessorKey: 'joinedAt',
    header: '加入時間',
    cell: ({ row }) => formatDateTime(row.original.joinedAt),
  },
]

export default function OrgShow({ organization, members, error }: Props) {
  return (
    <AdminLayout>
      <Head title="組織詳細" />

      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/organizations">
            <ArrowLeft className="mr-1 h-4 w-4" />
            返回列表
          </Link>
        </Button>

        {error && (
          <div className="rounded-md border border-destructive p-4 text-destructive">
            {error}
          </div>
        )}

        {organization && (
          <>
            <h1 className="text-2xl font-bold">{organization.name}</h1>

            <Card>
              <CardHeader>
                <CardTitle>基本資料</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">ID</span>
                  <code className="text-xs">{organization.id}</code>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Slug</span>
                  <code className="text-xs">{organization.slug}</code>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">狀態</span>
                  <Badge>{organization.status}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">建立時間</span>
                  <span>{formatDateTime(organization.createdAt)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>成員（{members.length}）</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable columns={memberColumns} data={members} />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/Pages/Admin/AdminOrganizationDetailPage.ts resources/js/Pages/Admin/Organizations/Show.tsx
git commit -m "feat: [admin] 新增組織詳細頁（基本資料 + 成員列表）"
```

---

### Task 7: Admin Contracts 列表 + 建立 + 詳細

**Files:**
- Create: `src/Pages/Admin/AdminContractsPage.ts`
- Create: `src/Pages/Admin/AdminContractCreatePage.ts`
- Create: `src/Pages/Admin/AdminContractDetailPage.ts`
- Create: `resources/js/Pages/Admin/Contracts/columns.tsx`
- Create: `resources/js/Pages/Admin/Contracts/Index.tsx`
- Create: `resources/js/Pages/Admin/Contracts/Create.tsx`
- Create: `resources/js/Pages/Admin/Contracts/Show.tsx`

- [ ] **Step 1: 建立三個頁面控制器**

Create `src/Pages/Admin/AdminContractsPage.ts`:

```typescript
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import type { ListContractsService } from '@/Modules/Contract/Application/Services/ListContractsService'
import { requireAdmin } from './helpers/requireAdmin'

export class AdminContractsPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly listService: ListContractsService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const check = requireAdmin(ctx)
    if (!check.ok) return check.response!

    const page = parseInt(ctx.getQuery('page') ?? '1', 10)
    const limit = parseInt(ctx.getQuery('limit') ?? '20', 10)
    const status = ctx.getQuery('status')

    const result = await this.listService.execute({ page, limit, status })

    return this.inertia.render(ctx, 'Admin/Contracts/Index', {
      contracts: result.success ? result.data?.contracts ?? [] : [],
      meta: result.success ? result.data?.meta : { total: 0, page: 1, limit: 20, totalPages: 0 },
      error: result.success ? null : result.message,
    })
  }
}
```

Create `src/Pages/Admin/AdminContractCreatePage.ts`:

```typescript
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import { requireAdmin } from './helpers/requireAdmin'

export class AdminContractCreatePage {
  constructor(private readonly inertia: InertiaService) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const check = requireAdmin(ctx)
    if (!check.ok) return check.response!

    return this.inertia.render(ctx, 'Admin/Contracts/Create', {})
  }
}
```

Create `src/Pages/Admin/AdminContractDetailPage.ts`:

```typescript
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import type { GetContractDetailService } from '@/Modules/Contract/Application/Services/GetContractDetailService'
import { requireAdmin } from './helpers/requireAdmin'

export class AdminContractDetailPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly getDetailService: GetContractDetailService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const check = requireAdmin(ctx)
    if (!check.ok) return check.response!

    const contractId = ctx.getParam('id')
    if (!contractId) {
      return this.inertia.render(ctx, 'Admin/Contracts/Show', {
        contract: null,
        error: '缺少 contract id',
      })
    }

    const result = await this.getDetailService.execute(contractId)

    return this.inertia.render(ctx, 'Admin/Contracts/Show', {
      contract: result.success ? result.data : null,
      error: result.success ? null : result.message,
    })
  }
}
```

- [ ] **Step 2: 建立 contract columns**

Create `resources/js/Pages/Admin/Contracts/columns.tsx`:

```tsx
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Link } from '@inertiajs/react'
import { formatDate } from '@/lib/format'

export interface AdminContractRow {
  id: string
  name: string
  status: 'draft' | 'active' | 'expired' | 'terminated'
  targetType: 'organization' | 'user'
  targetId: string
  startDate: string
  endDate: string
}

function statusBadge(status: AdminContractRow['status']) {
  const map = {
    draft: { label: '草稿', variant: 'outline' as const },
    active: { label: '生效中', variant: 'default' as const },
    expired: { label: '已過期', variant: 'secondary' as const },
    terminated: { label: '已終止', variant: 'destructive' as const },
  }
  const { label, variant } = map[status]
  return <Badge variant={variant}>{label}</Badge>
}

export const adminContractColumns: ColumnDef<AdminContractRow>[] = [
  { accessorKey: 'name', header: '合約名稱' },
  {
    accessorKey: 'status',
    header: '狀態',
    cell: ({ row }) => statusBadge(row.original.status),
  },
  {
    accessorKey: 'targetType',
    header: '對象',
    cell: ({ row }) => (row.original.targetType === 'organization' ? '組織' : '使用者'),
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
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/admin/contracts/${row.original.id}`}>檢視</Link>
      </Button>
    ),
  },
]
```

- [ ] **Step 3: 建立列表頁**

Create `resources/js/Pages/Admin/Contracts/Index.tsx`:

```tsx
import { Head, Link } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { DataTable } from '@/components/tables/DataTable'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { adminContractColumns, type AdminContractRow } from './columns'

interface Props {
  contracts: AdminContractRow[]
  meta: { total: number; page: number; limit: number; totalPages: number }
  error: string | null
}

export default function ContractsIndex({ contracts, error }: Props) {
  return (
    <AdminLayout>
      <Head title="合約管理" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">合約管理</h1>
          <Button asChild>
            <Link href="/admin/contracts/create">
              <Plus className="mr-2 h-4 w-4" />
              建立合約
            </Link>
          </Button>
        </div>

        {error && (
          <div className="rounded-md border border-destructive p-4 text-destructive">
            {error}
          </div>
        )}

        <DataTable
          columns={adminContractColumns}
          data={contracts}
          searchPlaceholder="搜尋合約..."
          searchColumn="name"
        />
      </div>
    </AdminLayout>
  )
}
```

- [ ] **Step 4: 建立建立頁**

Create `resources/js/Pages/Admin/Contracts/Create.tsx`:

```tsx
import { Head, router } from '@inertiajs/react'
import { useState } from 'react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

export default function ContractCreate() {
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [creditQuota, setCreditQuota] = useState('1000')
  const [rpm, setRpm] = useState('60')
  const [tpm, setTpm] = useState('10000')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [allowedModules, setAllowedModules] = useState('dashboard,credit,api_keys')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          term: {
            creditQuota: parseFloat(creditQuota),
            allowedModules: allowedModules.split(',').map((s) => s.trim()).filter(Boolean),
            rateLimit: { rpm: parseInt(rpm, 10), tpm: parseInt(tpm, 10) },
            validityPeriod: { startDate, endDate },
          },
        }),
      })
      const result = await res.json()
      if (result.success) {
        toast({ title: '成功', description: '合約已建立' })
        router.visit('/admin/contracts')
      } else {
        toast({ title: '失敗', description: result.message, variant: 'destructive' })
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
    <AdminLayout>
      <Head title="建立合約" />

      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">建立合約</h1>

        <Card>
          <CardHeader>
            <CardTitle>合約條款</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">合約名稱</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="creditQuota">Credit 配額</Label>
                <Input
                  id="creditQuota"
                  type="number"
                  value={creditQuota}
                  onChange={(e) => setCreditQuota(e.target.value)}
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rpm">RPM</Label>
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
                  <Label htmlFor="tpm">TPM</Label>
                  <Input
                    id="tpm"
                    type="number"
                    value={tpm}
                    onChange={(e) => setTpm(e.target.value)}
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">生效日</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">到期日</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="allowedModules">允許模組（逗號分隔）</Label>
                <Input
                  id="allowedModules"
                  value={allowedModules}
                  onChange={(e) => setAllowedModules(e.target.value)}
                  placeholder="dashboard,credit,api_keys"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? '建立中...' : '建立'}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.visit('/admin/contracts')}>
                  取消
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
```

- [ ] **Step 5: 建立詳細頁**

Create `resources/js/Pages/Admin/Contracts/Show.tsx`:

```tsx
import { Head, Link, router } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/format'

interface Contract {
  id: string
  name: string
  status: 'draft' | 'active' | 'expired' | 'terminated'
  targetType: string
  targetId: string | null
  term: {
    creditQuota: string
    allowedModules: string[]
    rateLimit: { rpm: number; tpm: number }
    validityPeriod: { startDate: string; endDate: string }
  }
  createdAt: string
}

interface Props {
  contract: Contract | null
  error: string | null
}

export default function ContractShow({ contract, error }: Props) {
  const { toast } = useToast()

  const runAction = async (action: 'activate' | 'terminate') => {
    if (!contract) return
    if (!confirm(`確定要執行「${action === 'activate' ? '啟用' : '終止'}」？`)) return

    try {
      const res = await fetch(`/api/contracts/${contract.id}/${action}`, { method: 'POST' })
      const result = await res.json()
      if (result.success) {
        toast({ title: '成功', description: '操作完成' })
        router.reload()
      } else {
        toast({ title: '失敗', description: result.message, variant: 'destructive' })
      }
    } catch (err) {
      toast({
        title: '錯誤',
        description: err instanceof Error ? err.message : '網路錯誤',
        variant: 'destructive',
      })
    }
  }

  return (
    <AdminLayout>
      <Head title="合約詳細" />

      <div className="max-w-3xl space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/contracts">
            <ArrowLeft className="mr-1 h-4 w-4" />
            返回列表
          </Link>
        </Button>

        {error && (
          <div className="rounded-md border border-destructive p-4 text-destructive">
            {error}
          </div>
        )}

        {contract && (
          <>
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">{contract.name}</h1>
              <div className="flex gap-2">
                {contract.status === 'draft' && (
                  <Button onClick={() => runAction('activate')}>啟用</Button>
                )}
                {contract.status === 'active' && (
                  <Button variant="destructive" onClick={() => runAction('terminate')}>
                    終止
                  </Button>
                )}
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>基本資料</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Field label="ID" value={<code className="text-xs">{contract.id}</code>} />
                <Field label="狀態" value={<Badge>{contract.status}</Badge>} />
                <Field label="對象類型" value={contract.targetType} />
                <Field label="對象 ID" value={contract.targetId ?? '—'} />
                <Field label="生效期間" value={`${formatDate(contract.term.validityPeriod.startDate)} — ${formatDate(contract.term.validityPeriod.endDate)}`} />
                <Field label="建立時間" value={formatDateTime(contract.createdAt)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>合約條款</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Field label="Credit 配額" value={contract.term.creditQuota} />
                <Field label="速率限制" value={`${contract.term.rateLimit.rpm} RPM / ${contract.term.rateLimit.tpm} TPM`} />
                <div>
                  <div className="mb-2 text-muted-foreground">允許模組</div>
                  <div className="flex flex-wrap gap-1">
                    {contract.term.allowedModules.map((m) => (
                      <Badge key={m} variant="outline">{m}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/Pages/Admin/AdminContracts*.ts resources/js/Pages/Admin/Contracts/
git commit -m "feat: [admin] 新增合約管理（列表 + 建立表單 + 詳細 + 啟用/終止操作）"
```

---

### Task 8: Admin Modules 列表 + 建立

**Files:**
- Create: `src/Pages/Admin/AdminModulesPage.ts`
- Create: `src/Pages/Admin/AdminModuleCreatePage.ts`
- Create: `resources/js/Pages/Admin/Modules/columns.tsx`
- Create: `resources/js/Pages/Admin/Modules/Index.tsx`
- Create: `resources/js/Pages/Admin/Modules/Create.tsx`

- [ ] **Step 1: 建立兩個頁面控制器**

Create `src/Pages/Admin/AdminModulesPage.ts`:

```typescript
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import type { ListModulesService } from '@/Modules/AppModule/Application/Services/ListModulesService'
import { requireAdmin } from './helpers/requireAdmin'

export class AdminModulesPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly listService: ListModulesService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const check = requireAdmin(ctx)
    if (!check.ok) return check.response!

    const result = await this.listService.execute()

    return this.inertia.render(ctx, 'Admin/Modules/Index', {
      modules: result.success ? result.data ?? [] : [],
      error: result.success ? null : result.message,
    })
  }
}
```

Create `src/Pages/Admin/AdminModuleCreatePage.ts`:

```typescript
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import { requireAdmin } from './helpers/requireAdmin'

export class AdminModuleCreatePage {
  constructor(private readonly inertia: InertiaService) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const check = requireAdmin(ctx)
    if (!check.ok) return check.response!

    return this.inertia.render(ctx, 'Admin/Modules/Create', {})
  }
}
```

- [ ] **Step 2: 建立 columns + 列表頁**

Create `resources/js/Pages/Admin/Modules/columns.tsx`:

```tsx
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'

export interface ModuleRow {
  id: string
  key: string
  name: string
  type: 'FREE' | 'PAID'
  description: string
}

export const moduleColumns: ColumnDef<ModuleRow>[] = [
  {
    accessorKey: 'key',
    header: '識別碼',
    cell: ({ row }) => <code className="text-xs">{row.original.key}</code>,
  },
  { accessorKey: 'name', header: '名稱' },
  {
    accessorKey: 'type',
    header: '類型',
    cell: ({ row }) =>
      row.original.type === 'FREE' ? (
        <Badge className="bg-blue-500">免費</Badge>
      ) : (
        <Badge className="bg-amber-500">付費</Badge>
      ),
  },
  {
    accessorKey: 'description',
    header: '描述',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.description}</span>
    ),
  },
]
```

Create `resources/js/Pages/Admin/Modules/Index.tsx`:

```tsx
import { Head, Link } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { DataTable } from '@/components/tables/DataTable'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { moduleColumns, type ModuleRow } from './columns'

interface Props {
  modules: ModuleRow[]
  error: string | null
}

export default function ModulesIndex({ modules, error }: Props) {
  return (
    <AdminLayout>
      <Head title="模組管理" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">模組管理</h1>
          <Button asChild>
            <Link href="/admin/modules/create">
              <Plus className="mr-2 h-4 w-4" />
              註冊模組
            </Link>
          </Button>
        </div>

        {error && (
          <div className="rounded-md border border-destructive p-4 text-destructive">
            {error}
          </div>
        )}

        <DataTable
          columns={moduleColumns}
          data={modules}
          searchPlaceholder="搜尋模組..."
          searchColumn="name"
        />
      </div>
    </AdminLayout>
  )
}
```

- [ ] **Step 3: 建立 Module Create 頁面**

Create `resources/js/Pages/Admin/Modules/Create.tsx`:

```tsx
import { Head, router } from '@inertiajs/react'
import { useState } from 'react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

export default function ModuleCreate() {
  const { toast } = useToast()
  const [key, setKey] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'FREE' | 'PAID'>('FREE')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, name, description, type }),
      })
      const result = await res.json()
      if (result.success) {
        toast({ title: '成功', description: '模組已註冊' })
        router.visit('/admin/modules')
      } else {
        toast({ title: '失敗', description: result.message, variant: 'destructive' })
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
    <AdminLayout>
      <Head title="註冊模組" />

      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">註冊模組</h1>

        <Card>
          <CardHeader>
            <CardTitle>模組資訊</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="key">識別碼（英數字）</Label>
                <Input
                  id="key"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="例如：advanced_analytics"
                  pattern="[a-z0-9_]+"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">名稱</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">描述</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">類型</Label>
                <select
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value as 'FREE' | 'PAID')}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="FREE">免費</option>
                  <option value="PAID">付費</option>
                </select>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? '註冊中...' : '註冊'}
                </Button>
                <Button type="button" variant="outline" onClick={() => router.visit('/admin/modules')}>
                  取消
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/Pages/Admin/AdminModules*.ts src/Pages/Admin/AdminModuleCreatePage.ts resources/js/Pages/Admin/Modules/
git commit -m "feat: [admin] 新增模組管理（列表 + 註冊表單）"
```

---

### Task 9: Admin API Keys 全域總覽

**Files:**
- Create: `src/Pages/Admin/AdminApiKeysPage.ts`
- Create: `resources/js/Pages/Admin/ApiKeys/columns.tsx`
- Create: `resources/js/Pages/Admin/ApiKeys/Index.tsx`

> **注意：** 目前的 `ListApiKeysService` 以 orgId 為參數；全域總覽需先選取 org 再查詢。此頁面以 `?orgId=` query 切換組織，若未指定則顯示組織選擇提示。

- [ ] **Step 1: 建立頁面控制器**

Create `src/Pages/Admin/AdminApiKeysPage.ts`:

```typescript
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import type { ListApiKeysService } from '@/Modules/ApiKey/Application/Services/ListApiKeysService'
import type { ListOrganizationsService } from '@/Modules/Organization/Application/Services/ListOrganizationsService'
import { requireAdmin } from './helpers/requireAdmin'

export class AdminApiKeysPage {
  constructor(
    private readonly inertia: InertiaService,
    private readonly listKeysService: ListApiKeysService,
    private readonly listOrgsService: ListOrganizationsService,
  ) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const check = requireAdmin(ctx)
    if (!check.ok) return check.response!
    const auth = check.auth!

    const orgId = ctx.getQuery('orgId')
    const orgsResult = await this.listOrgsService.execute(1, 100)
    const organizations = orgsResult.success ? orgsResult.data?.organizations ?? [] : []

    if (!orgId) {
      return this.inertia.render(ctx, 'Admin/ApiKeys/Index', {
        organizations,
        selectedOrgId: null,
        keys: [],
        error: null,
      })
    }

    const result = await this.listKeysService.execute(orgId, auth.userId, auth.role, 1, 100)

    return this.inertia.render(ctx, 'Admin/ApiKeys/Index', {
      organizations,
      selectedOrgId: orgId,
      keys: result.success ? result.data?.keys ?? [] : [],
      error: result.success ? null : result.message,
    })
  }
}
```

- [ ] **Step 2: 建立 columns（重用 Member 版）**

Create `resources/js/Pages/Admin/ApiKeys/columns.tsx`:

```tsx
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { formatDateTime, maskApiKey } from '@/lib/format'

export interface AdminApiKeyRow {
  id: string
  label: string
  keyPreview: string
  status: 'active' | 'revoked' | 'suspended_no_credit'
  orgId: string
  userId: string
  createdAt: string
  lastUsedAt: string | null
}

function statusBadge(status: AdminApiKeyRow['status']) {
  switch (status) {
    case 'active':
      return <Badge className="bg-green-500 hover:bg-green-600">啟用</Badge>
    case 'revoked':
      return <Badge variant="destructive">已撤銷</Badge>
    case 'suspended_no_credit':
      return <Badge variant="outline">額度不足</Badge>
  }
}

export const adminApiKeyColumns: ColumnDef<AdminApiKeyRow>[] = [
  { accessorKey: 'label', header: '名稱' },
  {
    accessorKey: 'keyPreview',
    header: 'Key',
    cell: ({ row }) => <code className="text-xs">{maskApiKey(row.original.keyPreview)}</code>,
  },
  {
    accessorKey: 'status',
    header: '狀態',
    cell: ({ row }) => statusBadge(row.original.status),
  },
  {
    accessorKey: 'userId',
    header: '擁有者',
    cell: ({ row }) => <code className="text-xs">{row.original.userId.slice(0, 8)}</code>,
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
]
```

- [ ] **Step 3: 建立頁面**

Create `resources/js/Pages/Admin/ApiKeys/Index.tsx`:

```tsx
import { Head, router } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/tables/DataTable'
import { Label } from '@/components/ui/label'
import { adminApiKeyColumns, type AdminApiKeyRow } from './columns'

interface OrgOption {
  id: string
  name: string
}

interface Props {
  organizations: OrgOption[]
  selectedOrgId: string | null
  keys: AdminApiKeyRow[]
  error: string | null
}

export default function ApiKeysIndex({ organizations, selectedOrgId, keys, error }: Props) {
  const handleOrgChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const orgId = e.target.value
    router.visit(`/admin/api-keys${orgId ? `?orgId=${orgId}` : ''}`)
  }

  return (
    <AdminLayout>
      <Head title="API Keys 總覽" />

      <div className="space-y-6">
        <h1 className="text-2xl font-bold">API Keys 總覽</h1>

        <Card>
          <CardHeader>
            <CardTitle>選擇組織</CardTitle>
          </CardHeader>
          <CardContent className="max-w-md space-y-2">
            <Label htmlFor="orgSelect">組織</Label>
            <select
              id="orgSelect"
              value={selectedOrgId ?? ''}
              onChange={handleOrgChange}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              <option value="">— 請選擇 —</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-md border border-destructive p-4 text-destructive">
            {error}
          </div>
        )}

        {selectedOrgId ? (
          <DataTable
            columns={adminApiKeyColumns}
            data={keys}
            searchPlaceholder="搜尋 Key 名稱..."
            searchColumn="label"
          />
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              請先選擇組織以查看 API Keys
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/Pages/Admin/AdminApiKeysPage.ts resources/js/Pages/Admin/ApiKeys/
git commit -m "feat: [admin] 新增 API Keys 全域總覽（組織切換 + Key 列表）"
```

---

### Task 10: Admin UsageSync 狀態頁

**Files:**
- Create: `src/Pages/Admin/AdminUsageSyncPage.ts`
- Create: `resources/js/Pages/Admin/UsageSync/Index.tsx`

> **注意：** UsageSync 模組在 Phase 4 未完成實作（見規格 Phase 4 驗收註記）。本頁面設計為靜態狀態顯示框架，資料源待 UsageSync 模組完成後接入。目前以預設值與「尚未啟用」狀態呈現。

- [ ] **Step 1: 建立頁面控制器**

Create `src/Pages/Admin/AdminUsageSyncPage.ts`:

```typescript
import type { IHttpContext } from '@/Shared/Presentation/IHttpContext'
import type { InertiaService } from '../InertiaService'
import { requireAdmin } from './helpers/requireAdmin'

interface SyncStatus {
  enabled: boolean
  lastSyncAt: string | null
  nextSyncAt: string | null
  lastCursor: string | null
  totalRecordsProcessed: number
  lastError: string | null
}

export class AdminUsageSyncPage {
  constructor(private readonly inertia: InertiaService) {}

  async handle(ctx: IHttpContext): Promise<Response> {
    const check = requireAdmin(ctx)
    if (!check.ok) return check.response!

    // UsageSync 模組尚未實作，回傳預設狀態
    const status: SyncStatus = {
      enabled: false,
      lastSyncAt: null,
      nextSyncAt: null,
      lastCursor: null,
      totalRecordsProcessed: 0,
      lastError: null,
    }

    return this.inertia.render(ctx, 'Admin/UsageSync/Index', {
      status,
      message: 'UsageSync 模組尚未啟用（Phase 4 待完成）',
    })
  }
}
```

- [ ] **Step 2: 建立 React 頁面**

Create `resources/js/Pages/Admin/UsageSync/Index.tsx`:

```tsx
import { Head } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { formatDateTime, formatNumber } from '@/lib/format'

interface SyncStatus {
  enabled: boolean
  lastSyncAt: string | null
  nextSyncAt: string | null
  lastCursor: string | null
  totalRecordsProcessed: number
  lastError: string | null
}

interface Props {
  status: SyncStatus
  message: string | null
}

export default function UsageSyncIndex({ status, message }: Props) {
  return (
    <AdminLayout>
      <Head title="用量同步狀態" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">用量同步狀態</h1>
          {status.enabled ? (
            <Badge className="bg-green-500">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              運行中
            </Badge>
          ) : (
            <Badge variant="outline">
              <AlertCircle className="mr-1 h-3 w-3" />
              未啟用
            </Badge>
          )}
        </div>

        {message && (
          <Card className="border-yellow-500">
            <CardContent className="flex items-center gap-2 pt-6 text-sm text-yellow-700 dark:text-yellow-400">
              <AlertCircle className="h-4 w-4" />
              {message}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">上次同步時間</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium">{formatDateTime(status.lastSyncAt)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">下次同步時間</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-medium">{formatDateTime(status.nextSyncAt)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">累計處理筆數</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(status.totalRecordsProcessed)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Sync Cursor</CardTitle>
            </CardHeader>
            <CardContent>
              <code className="text-xs">{status.lastCursor ?? '—'}</code>
            </CardContent>
          </Card>
        </div>

        {status.lastError && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">上次錯誤</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="overflow-auto text-xs">{status.lastError}</pre>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/Pages/Admin/AdminUsageSyncPage.ts resources/js/Pages/Admin/UsageSync/Index.tsx
git commit -m "feat: [admin] 新增 UsageSync 狀態頁面框架（待 Phase 4 UsageSync 模組完成後接資料）"
```

---

### Task 11: 註冊所有 Admin 路由

**Files:**
- Modify: `src/Pages/page-routes.ts`

- [ ] **Step 1: 新增 Admin 頁面 imports**

在 `src/Pages/page-routes.ts` 的 import 區段新增：

```typescript
import { AdminUsersPage } from './Admin/AdminUsersPage'
import { AdminUserDetailPage } from './Admin/AdminUserDetailPage'
import { AdminOrganizationsPage } from './Admin/AdminOrganizationsPage'
import { AdminOrganizationDetailPage } from './Admin/AdminOrganizationDetailPage'
import { AdminContractsPage } from './Admin/AdminContractsPage'
import { AdminContractCreatePage } from './Admin/AdminContractCreatePage'
import { AdminContractDetailPage } from './Admin/AdminContractDetailPage'
import { AdminModulesPage } from './Admin/AdminModulesPage'
import { AdminModuleCreatePage } from './Admin/AdminModuleCreatePage'
import { AdminApiKeysPage } from './Admin/AdminApiKeysPage'
import { AdminUsageSyncPage } from './Admin/AdminUsageSyncPage'
```

- [ ] **Step 2: 更新 AdminDashboardPage 建構**

在 `registerPageRoutes` 函式內，替換原有的 `const adminDashboard = new AdminDashboardPage(...)`：

```typescript
const adminDashboard = new AdminDashboardPage(
  inertia,
  core.container.make('listUsersService') as any,
  core.container.make('listOrganizationsService') as any,
  core.container.make('listContractsService') as any,
)

const adminUsers = new AdminUsersPage(
  inertia,
  core.container.make('listUsersService') as any,
)
const adminUserDetail = new AdminUserDetailPage(
  inertia,
  core.container.make('getUserProfileService') as any,
)
const adminOrgs = new AdminOrganizationsPage(
  inertia,
  core.container.make('listOrganizationsService') as any,
)
const adminOrgDetail = new AdminOrganizationDetailPage(
  inertia,
  core.container.make('getOrganizationService') as any,
  core.container.make('listMembersService') as any,
)
const adminContracts = new AdminContractsPage(
  inertia,
  core.container.make('listContractsService') as any,
)
const adminContractCreate = new AdminContractCreatePage(inertia)
const adminContractDetail = new AdminContractDetailPage(
  inertia,
  core.container.make('getContractDetailService') as any,
)
const adminModules = new AdminModulesPage(
  inertia,
  core.container.make('listModulesService') as any,
)
const adminModuleCreate = new AdminModuleCreatePage(inertia)
const adminApiKeys = new AdminApiKeysPage(
  inertia,
  core.container.make('listApiKeysService') as any,
  core.container.make('listOrganizationsService') as any,
)
const adminUsageSync = new AdminUsageSyncPage(inertia)
```

- [ ] **Step 3: 註冊路由**

替換原有的 `// Admin routes` 區塊為：

```typescript
// Admin routes
core.router.get('/admin/dashboard', withSharedData((ctx) => adminDashboard.handle(ctx)))
core.router.get('/admin/users', withSharedData((ctx) => adminUsers.handle(ctx)))
core.router.get('/admin/users/:id', withSharedData((ctx) => adminUserDetail.handle(ctx)))
core.router.get('/admin/organizations', withSharedData((ctx) => adminOrgs.handle(ctx)))
core.router.get('/admin/organizations/:id', withSharedData((ctx) => adminOrgDetail.handle(ctx)))
core.router.get('/admin/contracts', withSharedData((ctx) => adminContracts.handle(ctx)))
core.router.get('/admin/contracts/create', withSharedData((ctx) => adminContractCreate.handle(ctx)))
core.router.get('/admin/contracts/:id', withSharedData((ctx) => adminContractDetail.handle(ctx)))
core.router.get('/admin/modules', withSharedData((ctx) => adminModules.handle(ctx)))
core.router.get('/admin/modules/create', withSharedData((ctx) => adminModuleCreate.handle(ctx)))
core.router.get('/admin/api-keys', withSharedData((ctx) => adminApiKeys.handle(ctx)))
core.router.get('/admin/usage-sync', withSharedData((ctx) => adminUsageSync.handle(ctx)))
```

- [ ] **Step 4: 驗證後端 TypeScript**

```bash
bun run typecheck
```

Expected: PASS

- [ ] **Step 5: 驗證現有測試**

```bash
bun test tests/Feature/health.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/Pages/page-routes.ts
git commit -m "feat: [admin] 註冊 12 條 Admin Portal 路由"
```

---

### Task 12: E2E 測試 — Admin Portal 基本流程

**Files:**
- Create: `e2e/admin-portal.spec.ts`

- [ ] **Step 1: 建立 E2E 測試**

Create `e2e/admin-portal.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Admin Portal', () => {
  test('Admin Dashboard 頁面載入（無登入 → 重導）', async ({ page }) => {
    const response = await page.goto('/admin/dashboard')
    // 未登入應重導至 /login 或回傳 403
    expect([302, 303, 403]).toContain(response?.status() ?? 0)
  })

  test('403 頁面在非 admin 角色訪問時出現', async ({ page, request }) => {
    // 建立一般使用者並登入
    await request.post('/api/auth/register', {
      data: { email: 'user@test.com', password: 'Test1234!', name: 'Normal User' },
    })
    const loginRes = await request.post('/api/auth/login', {
      data: { email: 'user@test.com', password: 'Test1234!' },
    })
    const { data } = await loginRes.json() as any

    await page.setExtraHTTPHeaders({
      Authorization: `Bearer ${data.accessToken}`,
    })

    const response = await page.goto('/admin/users')
    expect(response?.status()).toBe(403)
  })

  test('各 Admin 頁面路由存在（不驗證渲染）', async ({ request }) => {
    const routes = [
      '/admin/dashboard',
      '/admin/users',
      '/admin/organizations',
      '/admin/contracts',
      '/admin/contracts/create',
      '/admin/modules',
      '/admin/modules/create',
      '/admin/api-keys',
      '/admin/usage-sync',
    ]

    for (const route of routes) {
      const res = await request.get(route, { maxRedirects: 0 })
      // 預期：401/403/302 或 200（若有 admin 登入）— 不應該是 404
      expect(res.status()).not.toBe(404)
    }
  })
})
```

- [ ] **Step 2: 執行 E2E 測試**

```bash
bun run build:frontend && bun run test:e2e -- --grep "Admin Portal"
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add e2e/admin-portal.spec.ts
git commit -m "test: [e2e] 新增 Admin Portal 路由存在性與權限檢查 smoke test"
```

---

## Self-Review Checklist

### 1. Spec Coverage（對照 Phase 7 規格 7.1 優先序）

| 規格需求 | 對應 Task |
|----------|-----------|
| Dashboard（系統總覽） | Task 2 |
| Users + Organizations 管理 | Task 3, 4, 5, 6 |
| Contracts + Modules 管理 | Task 7, 8 |
| ApiKeys 全域總覽 | Task 9 |
| UsageSync 狀態 | Task 10 |
| `resources/pages/Admin/**` 結構 | 所有 resources/js/Pages/Admin/ tasks |
| AdminLayout | 來自 Phase 7a Task 11 |
| 403 非 admin 權限阻擋 | Task 1 (requireAdmin) + Task 12 (E2E) |
| 所有頁面有 Loading/Empty/Error | 每個 Index 頁面皆有 error card + empty state |
| 響應式設計 | 透過 AdminLayout/AppShell（Phase 7a）繼承 |

### 2. 遺漏與延後項目

- UsageSync 資料源：Task 10 的 UsageSync 狀態頁目前為靜態框架，待 Phase 4 UsageSync 模組完成後需更新 `AdminUsageSyncPage.ts` 接入真實 Service
- Credit 管理頁（充值/退款/交易歷史）：規格 7.1 未明確列出，依 Phase 4 Credit API 存在但管理介面可在後續迭代補上
- App API Key 管理（Phase 6）：若 7c 執行時 Phase 6 已完成，可追加 `/admin/app-api-keys` 頁面；否則延後

### 3. 型別一致性

- `UserRow`、`OrgRow`、`AdminContractRow`、`ModuleRow`、`AdminApiKeyRow` 在各自的 `columns.tsx` 定義並由對應 `Index.tsx` 引用
- `SyncStatus` 介面在 `AdminUsageSyncPage.ts` 後端與 `UsageSync/Index.tsx` 前端一致
- 所有頁面控制器使用 `requireAdmin()` 回傳 `{ ok, auth?, response? }` 結構一致
- 頁面控制器的 `this.inertia.render(ctx, 'Path', props)` 第 3 參數結構與對應 React 頁面的 `Props` 介面一致

### 4. 依賴檢查

- `ListUsersService` 簽名：`execute({ page, limit, keyword, role, status })` ✓（Task 3）
- `ListOrganizationsService` 簽名：`execute(page, limit)` ✓（Task 5）
- `ListContractsService` 簽名：`execute({ page, limit, status, targetType, targetId })` ✓（Task 7）
- `ListModulesService`、`GetOrganizationService`、`ListMembersService`、`GetContractDetailService`、`GetUserProfileService`、`ListApiKeysService` — 全部在 bootstrap.ts 已註冊至容器
- `requireAdmin()` 輔助函式統一在所有 Admin 頁面控制器開頭呼叫

### 5. 風險與注意事項

- **Users API 路由格式：** Admin 檢視使用者詳細呼叫 `GET /api/users/:id`（需確認既有路由確實存在且允許 admin 存取）。若現有 API 僅開放 `users/me`，需在本計劃執行前先確認 `UserController.getById` 路由已啟用
- **Contract API 建立參數：** `POST /api/contracts` 的 payload schema 依 `CreateContractRequest` zod validator 而定。Task 7 Create 頁面的欄位組合若與現有 validator 不符，需調整為符合 validator（或反向調整 validator）
- **Module 註冊權限：** `POST /api/modules` 需檢查 admin 角色的 middleware，本計劃假設 `AppModuleController.register` 已有 admin 權限檢查；若無需在執行前先補上
