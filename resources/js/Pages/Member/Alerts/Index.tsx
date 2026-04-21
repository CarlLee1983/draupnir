import { Head } from '@inertiajs/react'
import { MemberLayout } from '@/layouts/MemberLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { AlertsPageProps } from './types'
import BudgetsTab from './tabs/BudgetsTab'
import WebhooksTab from './tabs/WebhooksTab'
import HistoryTab from './tabs/HistoryTab'
import { AlertCircle, AlertTriangle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTranslation } from '@/lib/i18n'

export default function AlertsIndex(props: AlertsPageProps) {
  const { t } = useTranslation()

  return (
    <MemberLayout>
      <Head title={t('ui.member.alerts.title')} />

      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_32%),linear-gradient(180deg,_rgba(255,255,255,1),_rgba(248,250,252,1))] p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="space-y-3 rounded-3xl border bg-background/90 p-6 shadow-sm backdrop-blur">
            <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">
              {t('ui.member.alerts.eyebrow')}
            </p>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight">{t('ui.member.alerts.heading')}</h1>
                <p className="max-w-2xl text-sm text-muted-foreground">{t('ui.member.alerts.intro')}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="rounded-full border bg-muted/40 px-3 py-1.5 text-sm">
                  {t('ui.member.alerts.webhooksCount', { count: props.webhookEndpoints.length })}
                </div>
                <div className="rounded-full border bg-muted/40 px-3 py-1.5 text-sm">
                  {t('ui.member.alerts.eventsCount', { count: props.alertHistory.length })}
                </div>
              </div>
            </div>

            {props.error && (
              <Alert
                variant={props.error.key.endsWith('.selectOrg') ? 'warning' : 'destructive'}
              >
                {props.error.key.endsWith('.selectOrg') ? (
                  <AlertTriangle className="size-4" />
                ) : (
                  <AlertCircle className="size-4" />
                )}
                <AlertDescription>{t(props.error.key, props.error.params)}</AlertDescription>
              </Alert>
            )}
          </div>

          <Card className="border-muted/60">
            <CardContent className="p-4 sm:p-6">
              <Tabs defaultValue="budgets">
                <TabsList className="flex-wrap rounded-2xl bg-muted/50 p-2">
                  <TabsTrigger value="budgets" className="rounded-xl">
                    {t('ui.member.alerts.tab.budgets')}
                  </TabsTrigger>
                  <TabsTrigger value="webhooks" className="rounded-xl">
                    {t('ui.member.alerts.tab.webhooks')}
                  </TabsTrigger>
                  <TabsTrigger value="history" className="rounded-xl">
                    {t('ui.member.alerts.tab.history')}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="budgets">
                  <BudgetsTab orgId={props.orgId ?? ''} initial={props.budget} />
                </TabsContent>
                <TabsContent value="webhooks">
                  <WebhooksTab orgId={props.orgId ?? ''} initial={props.webhookEndpoints} />
                </TabsContent>
                <TabsContent value="history">
                  <HistoryTab orgId={props.orgId ?? ''} initial={props.alertHistory} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </MemberLayout>
  )
}
