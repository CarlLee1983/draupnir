import { useMemo } from 'react'
import { Head, Link } from '@inertiajs/react'
import { MemberLayout } from '@/layouts/MemberLayout'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/tables/DataTable'
import { createApiKeyColumns, type ApiKeyRow } from './columns'
import { Plus } from 'lucide-react'

interface Props {
  orgId: string | null
  keys: ApiKeyRow[]
  meta: { total: number; page: number; limit: number; totalPages: number }
  error: string | null
}

export default function ApiKeysIndex({ orgId, keys, error }: Props) {
  const columns = useMemo(() => createApiKeyColumns(orgId), [orgId])
  const createQuery = orgId ? `?orgId=${encodeURIComponent(orgId)}` : ''

  return (
    <MemberLayout>
      <Head title="API Keys" />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">API Keys</h1>
          <Button asChild>
            <Link href={`/member/api-keys/create${createQuery}`}>
              <Plus className="mr-2 h-4 w-4" />
              建立 Key
            </Link>
          </Button>
        </div>

        {error && <div className="rounded-md border border-destructive p-4 text-destructive">{error}</div>}

        <DataTable columns={columns} data={keys} searchPlaceholder="搜尋 Key 名稱..." searchColumn="label" />
      </div>
    </MemberLayout>
  )
}
