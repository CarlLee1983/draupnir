import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { resendDelivery } from '../api'
import DeliveryStatusBadge from './DeliveryStatusBadge'
import type { AlertEventHistoryDTO } from '../types'

interface Props {
  event: AlertEventHistoryDTO
  orgId: string
  onResent: () => void
}

export default function AlertEventRow({ event, orgId, onResent }: Props) {
  const { toast } = useToast()
  const [pendingDeliveryId, setPendingDeliveryId] = useState<string | null>(null)

  async function handleResend(deliveryId: string) {
    setPendingDeliveryId(deliveryId)
    try {
      await resendDelivery(orgId, deliveryId)
      toast({ title: 'Resent', description: 'Delivery queued for retry.' })
      onResent()
    } catch (error_) {
      toast({
        title: 'Resend failed',
        description: error_ instanceof Error ? error_.message : 'Unable to resend delivery',
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
                {event.tier}
              </Badge>
              <span className="text-sm text-muted-foreground">{event.month}</span>
            </div>
            <h4 className="text-lg font-medium">${event.actualCostUsd} of ${event.budgetUsd}</h4>
            <p className="text-sm text-muted-foreground">
              {event.percentage}% of budget • {new Date(event.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            {event.deliveries.length} delivery{event.deliveries.length === 1 ? '' : 'ies'}
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
                  <Badge variant="outline">{delivery.channel}</Badge>
                </div>
                <p className="font-medium break-all">{delivery.target}</p>
                {delivery.targetUrl ? (
                  <p className="text-xs text-muted-foreground break-all">{delivery.targetUrl}</p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Attempts: {delivery.attempts} • Sent {new Date(delivery.dispatchedAt).toLocaleString()}
                </p>
                {delivery.deliveredAt ? (
                  <p className="text-xs text-muted-foreground">
                    Delivered {new Date(delivery.deliveredAt).toLocaleString()}
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
                  {pendingDeliveryId === delivery.id ? 'Resending…' : 'Resend'}
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </details>
  )
}
