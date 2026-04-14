import type { ReactNode } from 'react'
import { Head, Link } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/tables/DataTable'
import type { ColumnDef } from '@tanstack/react-table'
import { ArrowLeft } from 'lucide-react'
import { formatDateTime } from '@/lib/format'
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'

interface Organization {
  id: string
  name: string
  slug: string
  status: string
  createdAt: string
}

interface Member {
  userId: string
  role: string
  joinedAt: string
}

interface Props {
  organization: Organization | null
  members: Member[]
  error: I18nMessage | null
}

const memberColumns: ColumnDef<Member>[] = [
  {
    accessorKey: 'userId',
    header: '使用者 ID',
    cell: ({ row }) => <code className="text-xs">{row.original.userId}</code>,
  },
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
  const { t } = useTranslation()
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
          <div className="rounded-md border border-destructive p-4 text-destructive">{t(error.key, error.params)}</div>
        )}

        {organization && (
          <>
            <h1 className="text-2xl font-bold">{organization.name}</h1>

            <Card>
              <CardHeader>
                <CardTitle>基本資料</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row label="ID" value={<code className="text-xs">{organization.id}</code>} />
                <Row label="Slug" value={<code className="text-xs">{organization.slug}</code>} />
                <Row label="狀態" value={<Badge>{organization.status}</Badge>} />
                <Row label="建立時間" value={formatDateTime(organization.createdAt)} />
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

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between border-b pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  )
}
