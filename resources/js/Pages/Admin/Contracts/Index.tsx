import { Head, Link } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { DataTable } from '@/components/tables/DataTable'
import { createAdminContractColumns, type AdminContractRow } from './columns'
import { Button } from '@/components/ui/button'
import { Plus, FileText } from 'lucide-react'
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface Props {
  contracts: AdminContractRow[]
  error: I18nMessage | null
}

export default function ContractsIndex({ contracts, error }: Props) {
  const { t } = useTranslation()
  const columns = createAdminContractColumns(t)

  return (
    <AdminLayout>
      <Head title={t('ui.admin.contracts.title')} />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('ui.admin.contracts.title')}</h1>
            <p className="text-muted-foreground mt-1">{t('ui.admin.contracts.pageDescription')}</p>
          </div>
          <Button asChild size="lg" className="gap-2 shadow-sm transition-all active:scale-95">
            <Link href="/admin/contracts/create">
              <Plus className="h-4 w-4" />
              {t('ui.admin.contracts.createButton')}
            </Link>
          </Button>
        </div>

        {error && (
          <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm font-medium">
            {t(error.key, error.params)}
          </div>
        )}

        <Card className="shadow-sm border-muted/60 overflow-hidden">
          <CardHeader className="pb-3 border-b border-muted/40">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>{t('ui.admin.contracts.listTitle')}</CardTitle>
            </div>
            <CardDescription>{t('ui.admin.contracts.listDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <DataTable
              columns={columns}
              data={contracts}
              searchPlaceholder={t('ui.admin.contracts.searchPlaceholder')}
              searchColumn="name"
            />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
