import { useMemo, useState } from 'react'
import { Head } from '@inertiajs/react'
import { MemberLayout } from '@/layouts/MemberLayout'
import { DataTable } from '@/components/tables/DataTable'
import { createApiKeyColumns, type ApiKeyRow } from './columns'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { BalanceCard } from '../Dashboard/components/BalanceCard'
import { CreateOrganizationModal } from '../Dashboard/components/CreateOrganizationModal'
import { InvitationCard, type PendingInvitation } from '../Dashboard/components/InvitationCard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, AlertTriangle } from 'lucide-react'
import type { I18nMessage } from '@/lib/i18n'
import { useTranslation } from '@/lib/i18n'

interface Balance {
  balance: string
  lowBalanceThreshold: string
  status: string
}

interface Props {
  orgId: string | null
  balance: Balance | null
  hasOrganization: boolean
  pendingInvitations: PendingInvitation[]
  keys: ApiKeyRow[]
  meta: { total: number; page: number; limit: number; totalPages: number }
  error: I18nMessage | null
}

export default function ApiKeysIndex({ 
  orgId, 
  balance, 
  hasOrganization, 
  pendingInvitations, 
  keys, 
  error 
}: Props) {
  const { t } = useTranslation()
  const columns = useMemo(() => createApiKeyColumns(t), [t])
  const [createOrgOpen, setCreateOrgOpen] = useState(false)
  const [invitations, setInvitations] = useState<PendingInvitation[]>(pendingInvitations)

  return (
    <MemberLayout>
      <Head title={t('ui.member.apiKeys.title')} />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('ui.member.apiKeys.title')}</h1>
        </div>

        {error && (
          <Alert variant={error.key.endsWith('.selectOrg') ? 'warning' : 'destructive'}>
            {error.key.endsWith('.selectOrg') ? (
              <AlertTriangle className="size-4" />
            ) : (
              <AlertCircle className="size-4" />
            )}
            <AlertDescription>{t(error.key, error.params)}</AlertDescription>
          </Alert>
        )}

        {!hasOrganization ? (
          <div className="space-y-6">
            <CreateOrganizationModal open={createOrgOpen} onOpenChange={setCreateOrgOpen} />

            {invitations.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-white/60">你有待處理的組織邀請：</p>
                {invitations.map((inv) => (
                  <InvitationCard
                    key={inv.id}
                    invitation={inv}
                    onDeclined={(id) => setInvitations((prev) => prev.filter((i) => i.id !== id))}
                  />
                ))}
              </div>
            )}

            {invitations.length === 0 && (
              <Card className="border-border rounded-lg bg-white/[0.02] shadow-indigo-500/5 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base text-white">尚無組織</CardTitle>
                  <CardDescription className="text-white/40">
                    建立組織以開始使用 API Key、帳單與儀表板功能
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    type="button"
                    onClick={() => setCreateOrgOpen(true)}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                  >
                    建立我的組織
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] print:hidden">
              <BalanceCard balance={balance} />
            </div>

            <DataTable 
              columns={columns} 
              data={keys} 
              searchPlaceholder={t('ui.member.apiKeys.searchPlaceholder')} 
              searchColumn="label" 
            />
          </>
        )}
      </div>
    </MemberLayout>
  )
}
