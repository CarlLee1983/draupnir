import { Head, Link } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { DataTable } from '@/components/tables/DataTable'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { moduleColumns, type ModuleRow } from './columns'
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'

interface Props {
  modules: ModuleRow[]
  error: I18nMessage | null
}

export default function ModulesIndex({ modules, error }: Props) {
  const { t } = useTranslation()
  return (
    <AdminLayout>
      <Head title={t('ui.admin.modules.title')} />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('ui.admin.modules.title')}</h1>
          <Button asChild>
            <Link href="/admin/modules/create">
              <Plus className="mr-2 h-4 w-4" />
              {t('ui.admin.modules.createButton')}
            </Link>
          </Button>
        </div>

        {error && (
          <div className="rounded-md border border-destructive p-4 text-destructive">{t(error.key, error.params)}</div>
        )}

        <DataTable
          columns={moduleColumns}
          data={modules}
          searchPlaceholder={t('ui.admin.modules.searchPlaceholder')}
          searchColumn="name"
        />
      </div>
    </AdminLayout>
  )
}
