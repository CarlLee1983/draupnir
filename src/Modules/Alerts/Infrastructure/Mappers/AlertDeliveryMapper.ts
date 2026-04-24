import { AlertDelivery, type AlertDeliveryProps } from '../../Domain/Entities/AlertDelivery'

export interface AlertDeliveriesInsert {
  id: string
  alert_event_id: string
  channel: AlertDeliveryProps['channel']
  target: string
  target_url: string | null
  status: AlertDeliveryProps['status']
  attempts: number
  status_code: number | null
  error_message: string | null
  dispatched_at: string
  delivered_at: string | null
  created_at: string
  org_id: string
  month: string
  tier: string
}

export const AlertDeliveryMapper = {
  toDomain(row: Record<string, unknown>): AlertDelivery {
    const orgId = row.org_id
    const month = row.month
    const tier = row.tier
    if (orgId === null || orgId === undefined || orgId === '') {
      throw new Error(`AlertDeliveryMapper: row ${String(row.id)} missing denormalized org_id`)
    }
    if (month === null || month === undefined || month === '') {
      throw new Error(`AlertDeliveryMapper: row ${String(row.id)} missing denormalized month`)
    }
    if (tier === null || tier === undefined || tier === '') {
      throw new Error(`AlertDeliveryMapper: row ${String(row.id)} missing denormalized tier`)
    }

    return AlertDelivery.rehydrate({
      id: String(row.id),
      alertEventId: String(row.alert_event_id),
      channel: String(row.channel) as AlertDeliveryProps['channel'],
      target: String(row.target),
      targetUrl:
        row.target_url === null || row.target_url === undefined ? null : String(row.target_url),
      status: String(row.status) as AlertDeliveryProps['status'],
      attempts: Number(row.attempts ?? 0),
      statusCode:
        row.status_code === null || row.status_code === undefined ? null : Number(row.status_code),
      errorMessage:
        row.error_message === null || row.error_message === undefined
          ? null
          : String(row.error_message),
      dispatchedAt: String(row.dispatched_at),
      deliveredAt:
        row.delivered_at === null || row.delivered_at === undefined
          ? null
          : String(row.delivered_at),
      createdAt: String(row.created_at),
      orgId: String(orgId),
      month: String(month),
      tier: String(tier),
    } satisfies AlertDeliveryProps)
  },

  toPersistence(delivery: AlertDelivery): AlertDeliveriesInsert {
    return {
      id: delivery.id,
      alert_event_id: delivery.alertEventId,
      channel: delivery.channel,
      target: delivery.target,
      target_url: delivery.targetUrl,
      status: delivery.status,
      attempts: delivery.attempts,
      status_code: delivery.statusCode,
      error_message: delivery.errorMessage,
      dispatched_at: delivery.dispatchedAt,
      delivered_at: delivery.deliveredAt,
      created_at: delivery.createdAt,
      org_id: delivery.orgId,
      month: delivery.month,
      tier: delivery.tier,
    }
  },
}
