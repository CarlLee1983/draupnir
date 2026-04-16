import { useMemo } from 'react'
import { Head } from '@inertiajs/react'
import { MemberLayout } from '@/layouts/MemberLayout'
import { DataTable } from '@/components/tables/DataTable'
import { createApiKeyColumns, type ApiKeyRow } from './columns'
import { Banner } from '@/components/ui/banner'
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'

interface Props {
  orgId: string | null
  keys: ApiKeyRow[]
  meta: { total: number; page: number; limit: number; totalPages: number }
  error: I18nMessage | null
}

export default function ApiKeysIndex({ keys, error }: Props) {
  const { t } = useTranslation()
  const columns = useMemo(() => createApiKeyColumns(t), [t])

  return (
    <MemberLayout>
      <Head title={t('ui.member.apiKeys.title')} />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('ui.member.apiKeys.title')}</h1>
        </div>

        {error && (
          <Banner
            tone={error.key.endsWith('.selectOrg') ? 'warning' : 'destructive'}
            message={t(error.key, error.params)}
          />
        )}

        <DataTable columns={columns} data={keys} searchPlaceholder={t('ui.member.apiKeys.searchPlaceholder')} searchColumn="label" />
      </div>
    </MemberLayout>
  )
}
