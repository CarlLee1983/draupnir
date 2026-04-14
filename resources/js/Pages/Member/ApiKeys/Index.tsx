import { useMemo } from 'react'
import { Head, Link } from '@inertiajs/react'
import { MemberLayout } from '@/layouts/MemberLayout'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/tables/DataTable'
import { createApiKeyColumns, type ApiKeyRow } from './columns'
import { Plus } from 'lucide-react'
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'

interface Props {
  orgId: string | null
  keys: ApiKeyRow[]
  meta: { total: number; page: number; limit: number; totalPages: number }
  error: I18nMessage | null
}

export default function ApiKeysIndex({ orgId, keys, error }: Props) {
  const { t } = useTranslation()
  const columns = useMemo(() => createApiKeyColumns(orgId), [orgId])
  const createQuery = orgId ? `?orgId=${encodeURIComponent(orgId)}` : ''

  return (
    <MemberLayout>
      <Head title={t('ui.member.apiKeys.title')} />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('ui.member.apiKeys.title')}</h1>
          <Button asChild>
            <Link href={`/member/api-keys/create${createQuery}`}>
              <Plus className="mr-2 h-4 w-4" />
              {t('ui.member.apiKeys.createButton')}
            </Link>
          </Button>
        </div>

        {error && <div className="rounded-md border border-destructive p-4 text-destructive">{t(error.key, error.params)}</div>}

        <DataTable columns={columns} data={keys} searchPlaceholder={t('ui.member.apiKeys.searchPlaceholder')} searchColumn="label" />
      </div>
    </MemberLayout>
  )
}
