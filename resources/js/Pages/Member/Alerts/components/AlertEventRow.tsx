import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { resendDelivery } from '../api'
import DeliveryStatusBadge from './DeliveryStatusBadge'
import type { AlertEventHistoryDTO } from '../types'
import { useTranslation } from '@/lib/i18n'

interface Props {
  event: AlertEventHistoryDTO
  orgId: string
  onResent: () => void
}

export default function AlertEventRow({ event, orgId, onResent }: Props) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [pendingDeliveryId, setPendingDeliveryId] = useState<string | null>(null)

  async function handleResend(deliveryId: string) {
    setPendingDeliveryId(deliveryId)
    try {
      await resendDelivery(orgId, deliveryId)
      toast({
        title: t('ui.member.alerts.toast.deliveryResent'),
        description: t('ui.member.alerts.toast.deliveryQueued'),
      })
      onResent()
    } catch (error_) {
      toast({
        title: t('ui.member.alerts.toast.resendFailed'),
        description: error_ instanceof Error ? error_.message : t('ui.member.alerts.toast.resendFailedBody'),
        variant: 'destructive',
      })
    } finally {
      setPendingDeliveryId(null)
    }
  }

  return (
    <details className="rounded-2xl border bg-card p-4 shadow-sm">
      <summary className="cursor-pointer list-none">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={event.tier === 'critical' ? 'destructive' : 'secondary'}>
                {event.tier === 'critical'
                  ? t('ui.member.alerts.tier.critical')
                  : t('ui.member.alerts.tier.warning')}
              </Badge>
              <span className="text-sm text-muted-foreground">{event.month}</span>
            </div>
            <h4 className="text-lg font-medium">
              {t('ui.member.alerts.event.costLine', { actual: event.actualCostUsd, budget: event.budgetUsd })}
            </h4>
            <p className="text-sm text-muted-foreground">
              {t('ui.member.alerts.event.percentLine', {
                pct: event.percentage,
                time: new Date(event.createdAt).toLocaleString(),
              })}
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            {event.deliveries.length === 1
              ? t('ui.member.alerts.event.deliveryCountOne')
              : t('ui.member.alerts.event.deliveryCount', { count: event.deliveries.length })}
          </div>
        </div>
      </summary>

      <div className="mt-4 space-y-3">
        {event.deliveries.map((delivery) => (
          <div key={delivery.id} className="rounded-xl border bg-background p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <DeliveryStatusBadge status={delivery.status} />
                  <Badge variant="outline">
                    {delivery.channel === 'email'
                      ? t('ui.member.alerts.channel.email')
                      : t('ui.member.alerts.channel.webhook')}
                  </Badge>
                </div>
                <p className="font-medium break-all">{delivery.target}</p>
                {delivery.targetUrl ? (
                  <p className="text-xs text-muted-foreground break-all">{delivery.targetUrl}</p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {t('ui.member.alerts.event.attemptsLine', {
                    attempts: delivery.attempts,
                    dispatched: new Date(delivery.dispatchedAt).toLocaleString(),
                  })}
                </p>
                {delivery.deliveredAt ? (
                  <p className="text-xs text-muted-foreground">
                    {t('ui.member.alerts.event.deliveredAt', {
                      time: new Date(delivery.deliveredAt).toLocaleString(),
                    })}
                  </p>
                ) : null}
                {delivery.errorMessage ? (
                  <p className="text-xs text-destructive">{delivery.errorMessage}</p>
                ) : null}
              </div>

              {delivery.status === 'failed' ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void handleResend(delivery.id)}
                  disabled={pendingDeliveryId === delivery.id}
                >
                  {pendingDeliveryId === delivery.id
                    ? t('ui.member.alerts.event.resending')
                    : t('ui.member.alerts.event.resend')}
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </details>
  )
}
