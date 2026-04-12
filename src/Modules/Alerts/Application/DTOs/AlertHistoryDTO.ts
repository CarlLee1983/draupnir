import type { AlertEvent } from '../../Domain/Entities/AlertEvent'
import type { AlertDelivery } from '../../Domain/Entities/AlertDelivery'

export interface AlertDeliveryDTO {
  id: string
  channel: 'email' | 'webhook'
  target: string
  targetUrl: string | null
  status: 'pending' | 'sent' | 'failed'
  attempts: number
  statusCode: number | null
  errorMessage: string | null
  dispatchedAt: string
  deliveredAt: string | null
}

export interface AlertEventHistoryDTO {
  id: string
  orgId: string
  tier: 'warning' | 'critical'
  month: string
  budgetUsd: string
  actualCostUsd: string
  percentage: string
  createdAt: string
  deliveries: AlertDeliveryDTO[]
}

export function toDeliveryDTO(delivery: AlertDelivery): AlertDeliveryDTO {
  return {
    id: delivery.id,
    channel: delivery.channel,
    target: delivery.target,
    targetUrl: delivery.targetUrl,
    status: delivery.status,
    attempts: delivery.attempts,
    statusCode: delivery.statusCode,
    errorMessage: delivery.errorMessage,
    dispatchedAt: delivery.dispatchedAt,
    deliveredAt: delivery.deliveredAt,
  }
}

export function toHistoryDTO(
  event: AlertEvent,
  deliveries: readonly AlertDelivery[],
): AlertEventHistoryDTO {
  return {
    id: event.id,
    orgId: event.orgId,
    tier: event.tier,
    month: event.month,
    budgetUsd: event.budgetUsd,
    actualCostUsd: event.actualCostUsd,
    percentage: event.percentage,
    createdAt: event.createdAt,
    deliveries: deliveries.map(toDeliveryDTO),
  }
}
