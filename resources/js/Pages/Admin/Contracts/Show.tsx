import type { ReactNode } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import { AdminLayout } from '@/layouts/AdminLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/format'

interface ContractTerms {
  creditQuota: number
  allowedModules: string[]
  rateLimit: { rpm: number; tpm: number }
  validityPeriod: { startDate: string; endDate: string }
}

interface Contract {
  id: string
  status: 'draft' | 'active' | 'expired' | 'terminated'
  targetType: string
  targetId: string | null
  terms: ContractTerms
  createdAt: string
}

interface Props {
  contract: Contract | null
  error: string | null
}

export default function ContractShow({ contract, error }: Props) {
  const { toast } = useToast()

  const runAction = (action: 'activate' | 'terminate') => {
    if (!contract) return
    if (!confirm(`確定要執行「${action === 'activate' ? '啟用' : '終止'}」？`)) return

    router.post(
      `/admin/contracts/${contract.id}/action`,
      { action },
      {
        preserveScroll: true,
        onSuccess: () => toast({ title: '成功', description: '操作完成' }),
        onError: () => toast({ title: '失敗', description: '操作失敗', variant: 'destructive' }),
      },
    )
  }

  return (
    <AdminLayout>
      <Head title="合約詳細" />

      <div className="max-w-3xl space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/contracts">
            <ArrowLeft className="mr-1 h-4 w-4" />
            返回列表
          </Link>
        </Button>

        {error && (
          <div className="rounded-md border border-destructive p-4 text-destructive">{error}</div>
        )}

        {contract && (
          <>
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">合約 {contract.id.slice(0, 8)}…</h1>
              <div className="flex gap-2">
                {contract.status === 'draft' && (
                  <Button onClick={() => runAction('activate')}>啟用</Button>
                )}
                {contract.status === 'active' && (
                  <Button variant="destructive" onClick={() => runAction('terminate')}>
                    終止
                  </Button>
                )}
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>基本資料</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Field label="ID" value={<code className="text-xs">{contract.id}</code>} />
                <Field label="狀態" value={<Badge>{contract.status}</Badge>} />
                <Field label="對象類型" value={contract.targetType} />
                <Field label="對象 ID" value={contract.targetId ?? '—'} />
                <Field
                  label="生效期間"
                  value={`${formatDate(contract.terms.validityPeriod.startDate)} — ${formatDate(contract.terms.validityPeriod.endDate)}`}
                />
                <Field label="建立時間" value={formatDateTime(contract.createdAt)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>合約條款</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Field label="Credit 配額" value={String(contract.terms.creditQuota)} />
                <Field
                  label="速率限制"
                  value={`${contract.terms.rateLimit.rpm} RPM / ${contract.terms.rateLimit.tpm} TPM`}
                />
                <div>
                  <div className="mb-2 text-muted-foreground">允許模組</div>
                  <div className="flex flex-wrap gap-1">
                    {contract.terms.allowedModules.map((m) => (
                      <Badge key={m} variant="outline">
                        {m}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  )
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  )
}
