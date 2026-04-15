import { useState } from 'react'
import { Head } from '@inertiajs/react'
import { MemberLayout } from '@/layouts/MemberLayout'
import { Card, CardContent } from '@/components/ui/card'
import type { AlertsPageProps, AlertsTab } from './types'
import BudgetsTab from './tabs/BudgetsTab'
import WebhooksTab from './tabs/WebhooksTab'
import HistoryTab from './tabs/HistoryTab'
import { Banner } from '@/components/ui/banner'
import { useTranslation } from '@/lib/i18n'

const TAB_LABELS: Record<AlertsTab, string> = {
  budgets: 'Budgets',
  webhooks: 'Webhooks',
  history: 'History',
}

export default function AlertsIndex(props: AlertsPageProps) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<AlertsTab>('budgets')

  return (
    <MemberLayout>
      <Head title={t('ui.member.alerts.title')} />

      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_32%),linear-gradient(180deg,_rgba(255,255,255,1),_rgba(248,250,252,1))] p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="space-y-3 rounded-3xl border bg-background/90 p-6 shadow-sm backdrop-blur">
            <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">Member alerts</p>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight">{t('ui.member.alerts.heading')}</h1>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Manage budgets, webhook endpoints, and alert delivery history from one place.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="rounded-full border bg-muted/40 px-3 py-1.5 text-sm">
                  {props.webhookEndpoints.length} webhooks
                </div>
                <div className="rounded-full border bg-muted/40 px-3 py-1.5 text-sm">
                  {props.alertHistory.length} events
                </div>
              </div>
            </div>

            {props.error && (
              <Banner
                tone={props.error.key.endsWith('.selectOrg') ? 'warning' : 'destructive'}
                message={t(props.error.key, props.error.params)}
              />
            )}
          </div>

          <Card className="border-muted/60">
            <CardContent className="space-y-6 p-4 sm:p-6">
              <div className="flex flex-wrap gap-2 rounded-2xl bg-muted/50 p-2">
                {(Object.keys(TAB_LABELS) as AlertsTab[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setTab(item)}
                    className={[
                      'rounded-xl px-4 py-2 text-sm font-medium transition-colors',
                      tab === item
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    ].join(' ')}
                  >
                    {TAB_LABELS[item]}
                  </button>
                ))}
              </div>

              {tab === 'budgets' ? (
                <BudgetsTab orgId={props.orgId ?? ''} initial={props.budget} />
              ) : null}
              {tab === 'webhooks' ? (
                <WebhooksTab orgId={props.orgId ?? ''} initial={props.webhookEndpoints} />
              ) : null}
              {tab === 'history' ? (
                <HistoryTab orgId={props.orgId ?? ''} initial={props.alertHistory} />
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </MemberLayout>
  )
}
