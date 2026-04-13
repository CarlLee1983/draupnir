import type { AlertDelivery } from '../Entities/AlertDelivery'
import type { DeliveryChannel } from '../ValueObjects/DeliveryStatus'

/**
 * Key usage row rendered in alert emails (matches AlertEmailTemplates shape).
 */
export interface AlertKeyBreakdownItem {
  readonly label: string
  readonly costUsd: string
  readonly percentage: string
}

/**
 * Payload passed to all alert notifiers after an {@link AlertEvent} is persisted.
 */
export interface AlertPayload {
  readonly orgId: string
  readonly orgName: string
  readonly alertEventId: string
  readonly tier: 'warning' | 'critical'
  readonly budgetUsd: string
  readonly actualCostUsd: string
  readonly percentage: string
  readonly month: string
  readonly keyBreakdown: readonly AlertKeyBreakdownItem[]
  readonly emails: readonly string[]
  /**
   * When set (webhook resend), only this endpoint id is dispatched — mirrors
   * ResendDeliveryService’s prior single-endpoint behavior.
   */
  readonly resendWebhookEndpointId?: string
  /**
   * Invoked from ResendDeliveryService; notifiers must set {@link DeliveryResult.primaryDelivery}.
   */
  readonly forResend?: boolean
}

export interface DeliveryResult {
  readonly channel: DeliveryChannel
  readonly successes: number
  readonly failures: number
  /** Set when {@link AlertPayload.forResend} is true (single logical resend row). */
  readonly primaryDelivery?: AlertDelivery
}

/**
 * Channel strategy for alert fan-out (email vs webhook).
 */
export interface IAlertNotifier {
  readonly channel: DeliveryChannel
  notify(payload: AlertPayload): Promise<DeliveryResult>
}
