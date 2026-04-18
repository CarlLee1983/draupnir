import { Head, router } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { DataTable } from '@/components/tables/DataTable'
import { createUserColumns, type UserRow } from './columns'
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Shield, Search } from 'lucide-react'

interface Props {
  users: UserRow[]
  meta: { total: number; page: number; limit: number; totalPages: number }
  filters: { keyword: string; role: string; status: string }
  error: I18nMessage | null
}

export default function UsersIndex({ users, filters, error }: Props) {
  const { t } = useTranslation()
  const columns = createUserColumns(t)

  const roles = [
    { value: '', label: '全部角色' },
    { value: 'admin', label: t('ui.common.role.admin') },
    { value: 'manager', label: t('ui.common.role.manager') },
    { value: 'member', label: t('ui.common.role.member') },
  ]

  const updateFilter = (role: string) => {
    router.get('/admin/users', { ...filters, role }, {
      preserveState: true,
      replace: true,
    })
  }

  return (
    <AdminLayout>
      <Head title={t('ui.admin.users.title')} />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('ui.admin.users.title')}</h1>
            <p className="text-muted-foreground mt-1">
              管理系統中的所有使用者及其權限角色與狀態。
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive p-4 text-destructive">
            {t(error.key, error.params)}
          </div>
        )}

        <Card className="shadow-sm border-muted/60 overflow-hidden">
          <CardHeader className="pb-3 border-b border-muted/40">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>使用者清單</CardTitle>
            </div>
            <CardDescription>管理系統中的帳號存取權限。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-4 sm:p-6">
            <div className="flex flex-wrap gap-2 rounded-2xl bg-muted/50 p-2 w-fit">
              {roles.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => updateFilter(r.value)}
                  className={[
                    'rounded-xl px-4 py-2 text-sm font-medium transition-colors',
                    (filters.role ?? '') === r.value
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  ].join(' ')}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <DataTable
              columns={columns}
              data={users}
              searchPlaceholder={t('ui.admin.users.searchPlaceholder')}
              searchColumn="email"
            />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
