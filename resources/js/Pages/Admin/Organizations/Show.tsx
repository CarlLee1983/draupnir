import { Head, Link } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Building2, Calendar, Globe, Users } from 'lucide-react'
import { formatDateTime } from '@/lib/format'
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'

interface MemberRow {
  userId: string
  role: string
  joinedAt: string
}

interface OrganizationDetail {
  id: string
  name: string
  slug: string
  status: string
  createdAt: string
  updatedAt: string
}

interface Props {
  organization: OrganizationDetail | null
  members: MemberRow[]
  error: I18nMessage | null
}

export default function OrganizationShow({ organization, members, error }: Props) {
  const { t } = useTranslation()

  if (error || !organization) {
    return (
      <AdminLayout>
        <Head title={t('ui.admin.organizations.detailTitle')} />
        <div className="rounded-md border border-destructive p-4 text-destructive">
          {error ? t(error.key, error.params) : t('admin.organizations.loadFailed')}
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <Head title={t('ui.admin.organizations.detailTitle')} />

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/organizations">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('ui.common.backToList')}
            </Link>
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{organization.name}</h1>
              <p className="text-muted-foreground">{organization.id}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>{t('ui.admin.organizations.detailTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Row label="Slug" value={<code className="text-xs">{organization.slug}</code>} icon={<Globe className="h-4 w-4" />} />
              <Row label={t('ui.common.status')} value={<Badge>{organization.status}</Badge>} />
              <Row label={t('ui.common.createdAt')} value={formatDateTime(organization.createdAt)} icon={<Calendar className="h-4 w-4" />} />
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>{t('ui.admin.organizations.membersTitle', { count: members.length })}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>{t('ui.common.role')}</TableHead>
                    <TableHead>{t('ui.common.joinedAt')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.userId}>
                      <TableCell><code className="text-xs">{m.userId}</code></TableCell>
                      <TableCell><Badge variant="outline">{m.role}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDateTime(m.joinedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  )
}

function Row({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
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
