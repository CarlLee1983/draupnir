import { Head, Link, router } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, FileText, Calendar, Clock, Shield, Tag } from 'lucide-react'
import { formatDateTime, formatDate } from '@/lib/format'
import { useToast } from '@/hooks/use-toast'
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'

interface ContractDetail {
  id: string
  name: string
  status: 'draft' | 'active' | 'expired' | 'terminated'
  targetType: 'organization' | 'user'
  targetId: string | null
  terms: {
    creditQuota: number
    rpm: number
    tpm: number
    startDate: string
    endDate: string
    allowedModules: string[]
  }
  createdAt: string
  updatedAt: string
}

interface Props {
  contract: ContractDetail | null
  error: I18nMessage | null
}

export default function ContractShow({ contract, error }: Props) {
  const { toast } = useToast()
  const { t } = useTranslation()

  if (error || !contract) {
    return (
      <AdminLayout>
        <Head title={t('ui.admin.contracts.detailTitle')} />
        <div className="rounded-md border border-destructive p-4 text-destructive">
          {error ? t(error.key, error.params) : t('admin.contracts.loadFailed')}
        </div>
      </AdminLayout>
    )
  }

  const runAction = (action: 'activate' | 'terminate') => {
    const confirmMsg = action === 'activate' ? t('ui.admin.contracts.confirmActivate') : t('ui.admin.contracts.confirmTerminate')
    if (!confirm(confirmMsg)) return

    router.post(`/admin/contracts/${contract.id}/${action}`, {}, {
      onSuccess: () => toast({ title: t('ui.common.success'), description: t('ui.common.actions') + ' ' + t('ui.common.success') }),
      onError: () => toast({ title: t('ui.common.failed'), description: t('ui.common.failed'), variant: 'destructive' }),
    })
  }

  return (
    <AdminLayout>
      <Head title={t('ui.admin.contracts.detailTitle')} />

      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/contracts">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('ui.common.backToList')}
            </Link>
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2 text-primary">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t('ui.admin.contracts.contract')} {contract.id.slice(0, 8)}…</h1>
              <p className="text-muted-foreground">{contract.name}</p>
            </div>
          </div>

          <div className="flex gap-2">
            {contract.status === 'draft' && (
              <Button onClick={() => runAction('activate')}>{t('ui.common.status.active')}</Button>
            )}
            {contract.status === 'active' && (
              <Button variant="destructive" onClick={() => runAction('terminate')}>
                {t('ui.common.status.terminated')}
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('ui.admin.users.basicInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label={t('ui.common.status')} value={<Badge>{contract.status}</Badge>} icon={<Shield className="h-4 w-4" />} />
              <Field label={t('ui.admin.contracts.create.targetTypeLabel')} value={contract.targetType} icon={<Tag className="h-4 w-4" />} />
              <Field label={t('ui.admin.contracts.create.targetIdLabel')} value={contract.targetId ?? '—'} />
              <Field
                label={t('ui.admin.contracts.activePeriod')}
                value={`${formatDate(contract.terms.startDate)} ~ ${formatDate(contract.terms.endDate)}`}
                icon={<Calendar className="h-4 w-4" />}
              />
              <Field label={t('ui.common.createdAt')} value={formatDateTime(contract.createdAt)} icon={<Clock className="h-4 w-4" />} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('ui.admin.contracts.termsTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label={t('ui.admin.contracts.create.creditQuotaLabel')} value={String(contract.terms.creditQuota)} />
              <Field
                label={t('ui.admin.contracts.create.rpmLabel') + ' / ' + t('ui.admin.contracts.create.tpmLabel')}
                value={`RPM: ${contract.terms.rpm} / TPM: ${contract.terms.tpm}`}
              />
              <div className="space-y-2">
                <div className="mb-2 text-muted-foreground">{t('ui.admin.contracts.allowedModules')}</div>
                <div className="flex flex-wrap gap-2">
                  {contract.terms.allowedModules.map((m) => (
                    <Badge key={m} variant="secondary">
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
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
