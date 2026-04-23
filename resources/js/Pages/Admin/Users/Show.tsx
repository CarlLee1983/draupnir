import { Head, Link, router } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, User, Mail, Calendar, Shield, Activity } from 'lucide-react'
import { formatDateTime } from '@/lib/format'
import { useToast } from '@/hooks/use-toast'
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'
import { RoleBadge, StatusBadge } from '@/components/badges'

interface UserDetail {
  id: string
  email: string
  name: string | null
  role: string
  status: string
  createdAt: string
  updatedAt: string
}

interface Props {
  user: UserDetail | null
  error: I18nMessage | null
}

export default function UserShow({ user, error }: Props) {
  const { toast } = useToast()
  const { t } = useTranslation()

  if (error || !user) {
    return (
      <AdminLayout>
        <Head title={t('ui.admin.users.detailTitle')} />
        <div className="rounded-md border border-destructive p-4 text-destructive">
          {error ? t(error.key, error.params) : t('admin.users.loadFailed')}
        </div>
      </AdminLayout>
    )
  }

  const updateStatus = (newStatus: string) => {
    const statusLabel = newStatus === 'active' ? t('ui.common.status.active') : t('ui.common.status.inactive')
    if (!confirm(t('ui.admin.users.confirmStatusChange', { status: statusLabel }))) return

    router.put(`/admin/users/${user.id}/status`, { status: newStatus }, {
      onSuccess: () => toast({ title: t('ui.common.success'), description: t('ui.common.status') + ' ' + t('ui.common.success') }),
      onError: () => toast({ title: t('ui.common.failed'), description: t('ui.common.failed'), variant: 'destructive' }),
    })
  }

  return (
    <AdminLayout>
      <Head title={t('ui.admin.users.detailTitle')} />

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/users">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('ui.common.backToList')}
            </Link>
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{user.name || user.email}</h1>
              <p className="text-muted-foreground">{user.id}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant={user.status === 'active' ? 'outline' : 'default'}
              onClick={() => updateStatus(user.status === 'active' ? 'inactive' : 'active')}
            >
              {user.status === 'active' ? t('ui.common.status.inactive') : t('ui.common.status.active')}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('ui.admin.users.basicInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label={t('ui.common.email')} value={user.email} icon={<Mail className="h-4 w-4" />} />
              <Field label={t('ui.common.name')} value={user.name || '—'} />
              <Field label={t('ui.common.role')} value={<RoleBadge role={user.role} t={t} />} icon={<Shield className="h-4 w-4" />} />
              <Field
                label={t('ui.common.status')}
                value={<StatusBadge status={user.status} t={t} />}
                icon={<Activity className="h-4 w-4" />}
              />
              <Field label={t('ui.common.createdAt')} value={formatDateTime(user.createdAt)} icon={<Calendar className="h-4 w-4" />} />
              <Field label={t('ui.common.updatedAt')} value={formatDateTime(user.updatedAt)} />
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  )
}

function Field({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      {icon && <div className="mt-0.5 text-muted-foreground">{icon}</div>}
      <div className="space-y-1">
        <p className="text-sm font-medium leading-none text-muted-foreground">{label}</p>
        <div className="text-sm">{value}</div>
      </div>
    </div>
  )
}
